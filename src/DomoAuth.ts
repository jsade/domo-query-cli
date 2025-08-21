// Import BaseClient and RequestConfig interfaces from a common module
import fetch from "node-fetch";
import { BaseClient, RequestConfig } from "./api/clients/baseClient.ts";
import { getFetchOptionsWithProxy } from "./api/utils/proxyUtils.ts";
import {
    getOAuthRefreshToken,
    getOAuthToken,
    refreshOAuthTokenUsingRefreshToken,
    setOAuthRefreshToken,
} from "./oauthTokenManager.ts";
import { log } from "./utils/logger.ts";

/**
 * Utility function to mask sensitive information for logging
 * @param value - The sensitive string to mask
 * @param visibleChars - Number of characters to show at the beginning and end
 * @returns The masked string
 */
export function maskSensitiveValue(value: string, visibleChars = 3): string {
    if (!value || value.length <= visibleChars * 2) {
        return "***masked***";
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    return `${start}...${end}`;
}

/**
 * Base authentication class for Domo
 */
export abstract class DomoAuth {
    protected authenticated: boolean = false;

    /**
     * Ensures that the client is authenticated
     * @param client - The client (DomoClient or DataflowClient)
     * @returns Promise resolving to authentication status
     */
    abstract ensureAuthenticated(client: BaseClient): Promise<boolean>;

    /**
     * Gets the authentication interceptor for requests
     * @param client - The client (DomoClient or DataflowClient)
     * @returns A function that adds authentication to request config
     */
    abstract getAuthInterceptor(
        client: BaseClient,
    ): (config: RequestConfig) => RequestConfig;

    /**
     * Checks if the client is currently authenticated
     * @returns Authentication status
     */
    isAuthenticated(): boolean {
        return this.authenticated;
    }
}

/**
 * API Token Authentication for Domo
 */
export class DomoApiTokenAuth extends DomoAuth {
    /**
     * Constructor
     * @param apiToken - The Domo API token
     */
    constructor(private apiToken: string) {
        super();
        this.authenticated = !!apiToken; // Authenticated if token exists
    }

    /**
     * Always considered authenticated with API token
     * @returns True if the API token exists
     */
    async ensureAuthenticated(): Promise<boolean> {
        if (!this.apiToken) {
            log.error(
                "DomoApiTokenAuth: No API token available for authentication",
            );
            this.authenticated = false;
            return false;
        }

        if (!this.authenticated) {
            const maskedToken = maskSensitiveValue(this.apiToken, 5);
            log.debug(
                `DomoApiTokenAuth: Using API token (${maskedToken}) for authentication`,
            );
            this.authenticated = true;
        }

        return this.authenticated;
    }

    /**
     * Adds the API token header to requests
     * @returns Function that adds API token header
     */
    getAuthInterceptor(): (config: RequestConfig) => RequestConfig {
        return (config: RequestConfig) => {
            log.debug("DomoApiTokenAuth: Adding API token to request headers");

            if (!config.headers) {
                config.headers = {};
                log.debug("DomoApiTokenAuth: Created new headers object");
            }

            if (!this.apiToken) {
                log.error(
                    "DomoApiTokenAuth: Cannot add API token header - token is missing",
                );
            } else {
                config.headers["X-DOMO-Developer-Token"] = this.apiToken;
                const maskedToken = maskSensitiveValue(this.apiToken, 5);
                log.debug(
                    `DomoApiTokenAuth: Added X-DOMO-Developer-Token header with token ${maskedToken}`,
                );
            }

            return config;
        };
    }
}

/**
 * Username/Password Authentication for Domo
 * Uses the /api/domoweb/auth/login endpoint to get a session ID
 */
export class DomoUsernamePasswordAuth extends DomoAuth {
    private sessionId: string = "";

    /**
     * Constructor
     * @param username - The Domo username
     * @param password - The Domo password
     */
    constructor(
        private username: string,
        private password: string,
    ) {
        super();
        this.authenticated = false; // Will authenticate on demand
    }

    /**
     * Performs username/password authentication to get a session ID
     * @param client - The client to authenticate
     * @returns Authentication status
     */
    async ensureAuthenticated(client: BaseClient): Promise<boolean> {
        // If already authenticated with a valid session ID, return true
        if (this.authenticated && this.sessionId) {
            log.debug(
                "DomoUsernamePasswordAuth: Already authenticated with existing session ID",
            );
            return true;
        }

        if (!this.username || !this.password) {
            log.error("DomoUsernamePasswordAuth: Missing username or password");
            this.authenticated = false;
            return false;
        }

        try {
            const maskedUsername = maskSensitiveValue(this.username, 2);
            log.debug(
                `DomoUsernamePasswordAuth: Authenticating with username ${maskedUsername} and password ***masked***`,
            );

            const domain = client.getDomain();
            const loginUrl = `https://${domain}/api/domoweb/auth/login`;

            log.debug(
                `DomoUsernamePasswordAuth: Making login request to ${loginUrl}`,
            );

            const fetchOptions = getFetchOptionsWithProxy(loginUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: this.username,
                    password: this.password,
                }),
            });

            const response = await fetch(loginUrl, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text();
                log.error(
                    `DomoUsernamePasswordAuth: Login failed with status ${response.status}: ${errorText}`,
                );
                this.authenticated = false;
                return false;
            }

            // Get session ID from cookies
            const cookies = response.headers.get("set-cookie");
            if (!cookies) {
                log.error(
                    "DomoUsernamePasswordAuth: No cookies returned from login response",
                );
                this.authenticated = false;
                return false;
            }

            // Extract DA-SID cookie value
            const daSidMatch = cookies.match(/DA-SID=([^;]+)/);
            if (!daSidMatch || !daSidMatch[1]) {
                log.error(
                    "DomoUsernamePasswordAuth: DA-SID cookie not found in response",
                );
                this.authenticated = false;
                return false;
            }

            this.sessionId = daSidMatch[1];
            log.debug(
                `DomoUsernamePasswordAuth: Successfully authenticated, received session ID`,
            );

            this.authenticated = true;
            return true;
        } catch (error) {
            log.error(
                "DomoUsernamePasswordAuth: Authentication failed:",
                error,
            );
            this.authenticated = false;
            return false;
        }
    }

    /**
     * Adds the session ID header to requests
     * @returns Function that adds X-DOMO-Authentication header
     */
    getAuthInterceptor(): (config: RequestConfig) => RequestConfig {
        return (config: RequestConfig) => {
            log.debug(
                "DomoUsernamePasswordAuth: Adding session ID to request headers",
            );

            if (!config.headers) {
                config.headers = {};
                log.debug(
                    "DomoUsernamePasswordAuth: Created new headers object",
                );
            }

            if (!this.sessionId) {
                log.error(
                    "DomoUsernamePasswordAuth: Cannot add session ID header - not authenticated",
                );
            } else {
                config.headers["X-DOMO-Authentication"] = this.sessionId;
                log.debug(
                    "DomoUsernamePasswordAuth: Added X-DOMO-Authentication header with session ID",
                );
            }

            return config;
        };
    }
}

/**
 * OAuth Token Authentication for Domo (Option B in dataflow documentation)
 */
export class DomoOAuthAuth extends DomoAuth {
    private accessToken: string;
    private tokenExpiryTime: Date | null = null;
    private readonly TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer

    /**
     * Constructor
     * @param accessToken - Optional initial OAuth access token, can be empty as it will be retrieved when needed
     */
    constructor(accessToken: string = "") {
        super();
        this.accessToken = accessToken;
        this.authenticated = false; // Will authenticate on demand
    }

    /**
     * Check if the current token is still valid
     */
    private isTokenValid(): boolean {
        if (!this.accessToken || !this.tokenExpiryTime) {
            return false;
        }

        // Check if token expires in more than 5 minutes
        const now = Date.now();
        const expiryTime = this.tokenExpiryTime.getTime();
        return expiryTime - now > this.TOKEN_BUFFER_MS;
    }

    /**
     * Ensures authentication by getting or refreshing the OAuth token
     * @returns Authentication status
     */
    async ensureAuthenticated(): Promise<boolean> {
        try {
            // Skip if we already have a valid token
            if (this.authenticated && this.isTokenValid()) {
                log.debug("DomoOAuthAuth: Using existing valid OAuth token");
                return true;
            }

            log.debug("DomoOAuthAuth: Acquiring OAuth token");
            // Use the OAuth token manager to get a valid token
            // The token manager already handles caching and expiry internally
            this.accessToken = await getOAuthToken();

            if (!this.accessToken) {
                log.error(
                    "DomoOAuthAuth: Failed to get a valid OAuth token - token is empty",
                );
                this.authenticated = false;
                return false;
            }

            // Set expiry time (OAuth tokens typically expire in 3600 seconds)
            // Note: The OAuthTokenManager handles this internally, but we track it here too
            // to avoid unnecessary calls to the token manager
            this.tokenExpiryTime = new Date(Date.now() + 3600 * 1000);

            const maskedToken = maskSensitiveValue(this.accessToken, 10);
            log.debug(
                `DomoOAuthAuth: Successfully authenticated with OAuth token: ${maskedToken}`,
            );

            this.authenticated = true;
            return true;
        } catch (error) {
            log.error("DomoOAuthAuth: OAuth authentication failed:", error);
            this.authenticated = false;
            return false;
        }
    }

    /**
     * Adds the OAuth Bearer token header to requests
     * @returns Function that adds Bearer token header
     */
    getAuthInterceptor(): (config: RequestConfig) => RequestConfig {
        return (config: RequestConfig) => {
            log.debug(
                "DomoOAuthAuth: Adding OAuth bearer token to request headers",
            );

            if (!config.headers) {
                config.headers = {};
                log.debug("DomoOAuthAuth: Created new headers object");
            }

            if (!this.accessToken) {
                log.error(
                    "DomoOAuthAuth: Cannot add Authorization header - access token is missing",
                );
            } else {
                const maskedToken = maskSensitiveValue(this.accessToken, 10);
                config.headers["Authorization"] = `Bearer ${this.accessToken}`;
                log.debug(
                    `DomoOAuthAuth: Added Authorization header with bearer token: ${maskedToken}`,
                );
            }

            return config;
        };
    }
}

/**
 * OAuth Refresh Token Authentication for Domo (Option C in dataflow documentation)
 * Uses the refresh token to obtain access tokens
 */
export class DomoOAuthRefreshAuth extends DomoAuth {
    private accessToken: string = "";
    private refreshToken: string;

    /**
     * Constructor
     * @param refreshToken - The OAuth refresh token (required)
     * @param accessToken - Optional initial OAuth access token, can be empty as it will be obtained using the refresh token
     */
    constructor(refreshToken: string, accessToken: string = "") {
        super();

        this.refreshToken = refreshToken;
        this.accessToken = accessToken;

        // Store the refresh token in the OAuthTokenManager for future use
        setOAuthRefreshToken(refreshToken);

        this.authenticated = false; // Will authenticate on demand
    }

    /**
     * Ensures authentication by obtaining an access token using the refresh token
     * @returns Authentication status
     */
    async ensureAuthenticated(): Promise<boolean> {
        try {
            log.debug(
                "DomoOAuthRefreshAuth: Ensuring OAuth authentication with refresh token",
            );

            // If we don't have a refresh token, we can't authenticate
            if (!this.refreshToken) {
                log.error(
                    "DomoOAuthRefreshAuth: No refresh token available for authentication",
                );
                this.authenticated = false;
                return false;
            }

            // Use the refresh token to get a valid access token
            // First, check if we need to update our refresh token from the token manager
            // (in case it was updated elsewhere)
            const currentRefreshToken = getOAuthRefreshToken();
            if (
                currentRefreshToken &&
                currentRefreshToken !== this.refreshToken
            ) {
                log.debug(
                    "DomoOAuthRefreshAuth: Updating refresh token from token manager",
                );
                this.refreshToken = currentRefreshToken;
            }

            // Now use the refresh token to get an access token
            this.accessToken = await refreshOAuthTokenUsingRefreshToken(
                this.refreshToken,
            );

            if (!this.accessToken) {
                log.error(
                    "DomoOAuthRefreshAuth: Failed to get a valid access token using refresh token",
                );
                this.authenticated = false;
                return false;
            }

            const maskedToken = maskSensitiveValue(this.accessToken, 10);
            const maskedRefreshToken = maskSensitiveValue(this.refreshToken, 8);
            log.debug(
                `DomoOAuthRefreshAuth: Successfully obtained access token: ${maskedToken} using refresh token: ${maskedRefreshToken}`,
            );

            this.authenticated = true;
            return true;
        } catch (error) {
            log.error(
                "DomoOAuthRefreshAuth: OAuth authentication with refresh token failed:",
                error,
            );
            this.authenticated = false;
            return false;
        }
    }

    /**
     * Adds the OAuth Bearer token header to requests
     * @returns Function that adds Bearer token header
     */
    getAuthInterceptor(): (config: RequestConfig) => RequestConfig {
        return (config: RequestConfig) => {
            log.debug(
                "DomoOAuthRefreshAuth: Adding OAuth bearer token to request headers",
            );

            if (!config.headers) {
                config.headers = {};
                log.debug("DomoOAuthRefreshAuth: Created new headers object");
            }

            if (!this.accessToken) {
                log.error(
                    "DomoOAuthRefreshAuth: Cannot add Authorization header - access token is missing",
                );
            } else {
                const maskedToken = maskSensitiveValue(this.accessToken, 10);
                config.headers["Authorization"] = `Bearer ${this.accessToken}`;
                log.debug(
                    `DomoOAuthRefreshAuth: Added Authorization header with bearer token: ${maskedToken}`,
                );
            }

            return config;
        };
    }
}
