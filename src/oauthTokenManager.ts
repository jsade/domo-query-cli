import fetch from "node-fetch";
import * as process from "node:process";
import { getFetchOptionsWithProxy } from "./api/utils/proxyUtils.ts";
import { domoConfig, initializeConfig } from "./config.ts";
import { log } from "./utils/logger.ts";

/**
 * OAuth token response structure
 */
interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
    refresh_token?: string;
}

/**
 * Manages OAuth token acquisition and renewal for Domo API
 */
export class OAuthTokenManager {
    private static instance: OAuthTokenManager;
    private accessToken: string = "";
    private _refreshToken: string = "";
    private expiryTime: Date | null = null;

    // Private constructor for singleton pattern
    private constructor() {}

    /**
     * Get the singleton instance of OAuthTokenManager
     * @returns The OAuthTokenManager instance
     */
    public static getInstance(): OAuthTokenManager {
        if (!OAuthTokenManager.instance) {
            OAuthTokenManager.instance = new OAuthTokenManager();
        }
        return OAuthTokenManager.instance;
    }

    /**
     * Set a refresh token manually (useful for Option C OAuth authentication)
     * @param refreshToken - The refresh token to use
     */
    public setRefreshToken(refreshToken: string): void {
        if (refreshToken) {
            log.debug("Manually setting OAuth refresh token");
            this._refreshToken = refreshToken;
        }
    }

    /**
     * Get the current refresh token
     * @returns The current refresh token
     */
    public getRefreshToken(): string {
        return this._refreshToken;
    }

    /**
     * Get the current access token, acquiring a new one if needed
     * @param forceRefresh - Force a token refresh even if the current token is valid
     * @returns The current valid access token
     */
    public async getAccessToken(forceRefresh = false): Promise<string> {
        // Ensure config is initialized
        if (!domoConfig.initialized) {
            log.debug("Configuration not initialized, initializing now");
            initializeConfig();
        }

        // If token is missing, expired, or force refresh is requested, get a new one
        if (!this.accessToken || this.isTokenExpired() || forceRefresh) {
            log.info(
                "OAuth token missing, expired, or force refresh requested",
            );

            // Try refresh token first if we have one
            if (this._refreshToken && !forceRefresh) {
                try {
                    log.debug(
                        "Attempting to refresh token using refresh_token",
                    );
                    await this.refreshAccessToken();
                } catch (error) {
                    log.warn(
                        "Failed to refresh token, falling back to client credentials:",
                        error,
                    );
                    await this.acquireNewToken();
                }
            } else {
                await this.acquireNewToken();
            }
        } else {
            const expiryTimeMs = this.expiryTime
                ? this.expiryTime.getTime() - Date.now()
                : 0;
            const expiryTimeMinutes = Math.floor(expiryTimeMs / (60 * 1000));
            log.debug(
                `Using existing OAuth token, expires in ~${expiryTimeMinutes} minutes`,
            );
        }

        return this.accessToken;
    }

    /**
     * Check if the current token is expired
     * @returns True if token is expired or about to expire
     */
    private isTokenExpired(): boolean {
        if (!this.expiryTime) {
            log.debug(
                "OAuth token expiry time not set, considering token expired",
            );
            return true;
        }

        // Consider token expired if less than 5 minutes remain
        const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
        const now = new Date();
        const timeUntilExpiryMs = this.expiryTime.getTime() - now.getTime();
        const timeUntilExpiryMinutes = Math.floor(
            timeUntilExpiryMs / (60 * 1000),
        );

        const isExpired = timeUntilExpiryMs <= bufferMs;

        if (isExpired) {
            log.debug(
                `OAuth token will expire soon (in ${timeUntilExpiryMinutes} minutes), needs refresh`,
            );
        } else {
            log.debug(
                `OAuth token valid for another ${timeUntilExpiryMinutes} minutes`,
            );
        }

        return isExpired;
    }

    /**
     * Refresh the access token using a refresh token (Option C in dataflow documentation)
     * @throws Error if token refresh fails
     */
    private async refreshAccessToken(): Promise<void> {
        log.info("Starting OAuth token refresh process using refresh token");

        if (!this._refreshToken) {
            throw new Error("No refresh token available for token refresh");
        }

        // Make sure configuration is initialized
        if (!domoConfig.initialized) {
            log.debug("Configuration not initialized, initializing now");
            initializeConfig();
        }

        // Verify client credentials are available
        if (!domoConfig.clientId) {
            const errorMsg = "Client ID is missing for OAuth token refresh";
            log.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Build the refresh token URL as specified in Option C of the dataflow documentation
        const refreshUrl = `https://${domoConfig.apiHost}/api/oauth2/token`;

        // Prepare form data for the refresh token request
        const formData = new URLSearchParams();
        formData.append("grant_type", "refresh_token");
        formData.append("client_id", domoConfig.clientId);
        formData.append("refresh_token", this._refreshToken);

        try {
            log.info(`Making OAuth token refresh request to ${refreshUrl}`);
            const startTime = Date.now();

            const fetchOptions = getFetchOptionsWithProxy(refreshUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
                body: formData.toString(),
            });

            const response = await fetch(refreshUrl, fetchOptions);

            const requestDuration = Date.now() - startTime;
            log.debug(
                `OAuth token refresh request completed in ${requestDuration}ms with status: ${response.status}`,
            );

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `OAuth token refresh failed: ${response.status} ${response.statusText} - ${errorText}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            const tokenData = (await response.json()) as TokenResponse;
            log.info("Successfully parsed OAuth token refresh response");

            // Store the new tokens
            this.accessToken = tokenData.access_token;

            // Save the new refresh token if provided
            if (tokenData.refresh_token) {
                this._refreshToken = tokenData.refresh_token;
            }

            const tokenPreview =
                this.accessToken.substring(0, 10) +
                "..." +
                this.accessToken.substring(this.accessToken.length - 5);

            // Set expiry time with a small buffer
            const expiresInMs = tokenData.expires_in * 1000 * 0.9; // 90% of actual expiry time
            this.expiryTime = new Date(Date.now() + expiresInMs);
            const expiryTimeFormatted = this.expiryTime.toISOString();

            log.info(
                `OAuth token refreshed successfully, token: ${tokenPreview}`,
            );
            log.debug(
                `OAuth token details: expires_in=${tokenData.expires_in}s, token_type=${tokenData.token_type}, refresh_token=${this._refreshToken ? "provided" : "not provided"}`,
            );
            log.debug(
                `Token will be considered expired at ${expiryTimeFormatted} (in ${Math.floor(expiresInMs / (60 * 1000))} minutes)`,
            );
        } catch (error) {
            log.error("Failed to refresh OAuth token:", error);
            throw error;
        }
    }

    /**
     * Acquire a new OAuth token from Domo using client credentials
     * @throws Error if token acquisition fails
     */
    private async acquireNewToken(): Promise<void> {
        log.info(
            "Starting OAuth token acquisition process using client credentials",
        );

        // Make sure configuration is initialized
        if (!domoConfig.initialized) {
            log.debug("Configuration not initialized, initializing now");
            initializeConfig();
        }

        // Check if we need to load credentials directly from environment
        if (!domoConfig.clientId || !domoConfig.clientSecret) {
            // Check again directly from environment variables as a fallback
            const clientId = process.env.DOMO_CLIENT_ID;
            const clientSecret = process.env.DOMO_CLIENT_SECRET;

            if (clientId && clientSecret) {
                log.debug(
                    "Found credentials in environment variables but not in config, updating config",
                );
                domoConfig.clientId = clientId;
                domoConfig.clientSecret = clientSecret;
            } else {
                const errorMsg =
                    "OAuth credentials are missing. Please set DOMO_CLIENT_ID and DOMO_CLIENT_SECRET environment variables.";
                log.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        // According to the API spec, this should be a GET request with query parameters
        const tokenUrl =
            "https://api.domo.com/oauth/token?grant_type=client_credentials&scope=account%20dashboard%20data%20user";

        // Show more debug information about the credentials
        const clientIdPreview =
            domoConfig.clientId.substring(0, 5) +
            "..." +
            domoConfig.clientId.substring(domoConfig.clientId.length - 3);
        const clientSecretLength = domoConfig.clientSecret.length;

        log.debug(
            `Using client ID: ${clientIdPreview} (${domoConfig.clientId.length} chars) to request OAuth token`,
        );
        log.debug(`Client secret is ${clientSecretLength} characters long`);
        log.debug(`API host configuration: ${domoConfig.apiHost}`);

        const encodedCredentials = Buffer.from(
            `${domoConfig.clientId}:${domoConfig.clientSecret}`,
        ).toString("base64");

        log.debug(
            `Basic auth credential length: ${encodedCredentials.length} chars`,
        );

        try {
            log.info(`Making OAuth token request to ${tokenUrl}`);
            const startTime = Date.now();

            const fetchOptions = getFetchOptionsWithProxy(tokenUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Basic ${encodedCredentials}`,
                },
            });

            const response = await fetch(tokenUrl, fetchOptions);

            const requestDuration = Date.now() - startTime;
            log.debug(
                `OAuth token request completed in ${requestDuration}ms with status: ${response.status}`,
            );

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `OAuth token request failed: ${response.status} ${response.statusText} - ${errorText}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            const tokenData = (await response.json()) as TokenResponse;
            log.info("Successfully parsed OAuth token response");

            // Store the new token and calculate expiry time
            this.accessToken = tokenData.access_token;

            // Store refresh token if provided
            if (tokenData.refresh_token) {
                this._refreshToken = tokenData.refresh_token;
                log.debug("Received and stored refresh token");
            }

            const tokenPreview =
                this.accessToken.substring(0, 10) +
                "..." +
                this.accessToken.substring(this.accessToken.length - 5);

            // Set expiry time with a small buffer
            const expiresInMs = tokenData.expires_in * 1000 * 0.9; // 90% of actual expiry time
            this.expiryTime = new Date(Date.now() + expiresInMs);
            const expiryTimeFormatted = this.expiryTime.toISOString();

            log.info(
                `OAuth token acquired successfully, token: ${tokenPreview}`,
            );
            log.debug(
                `OAuth token details: expires_in=${tokenData.expires_in}s, token_type=${tokenData.token_type}, scopes=${tokenData.scope || "none"}, refresh_token=${this._refreshToken ? "provided" : "not provided"}`,
            );
            log.debug(
                `Token will be considered expired at ${expiryTimeFormatted} (in ${Math.floor(expiresInMs / (60 * 1000))} minutes)`,
            );
        } catch (error) {
            log.error("Failed to acquire OAuth token:", error);
            throw error;
        }
    }

    /**
     * Force token refresh regardless of expiration
     * @returns The new access token
     */
    public async refreshToken(): Promise<string> {
        log.info("Forcing OAuth token refresh");

        if (this.accessToken && this.expiryTime) {
            const expiryTimeMs = this.expiryTime.getTime() - Date.now();
            const expiryTimeMinutes = Math.floor(expiryTimeMs / (60 * 1000));
            log.debug(
                `Current token would expire in ~${expiryTimeMinutes} minutes, but refresh was requested`,
            );
        }

        // Try refresh token first if available
        if (this._refreshToken) {
            try {
                await this.refreshAccessToken();
            } catch (error) {
                log.warn(
                    "Failed to refresh token, falling back to client credentials:",
                    error,
                );
                await this.acquireNewToken();
            }
        } else {
            await this.acquireNewToken();
        }

        log.info("OAuth token force-refreshed successfully");
        return this.accessToken;
    }

    /**
     * Force token refresh using Option C mechanism (refresh_token grant)
     * @param refreshToken - Optional refresh token to use
     * @returns The new access token
     */
    public async refreshTokenUsingRefreshToken(
        refreshToken?: string,
    ): Promise<string> {
        // Update refresh token if provided
        if (refreshToken) {
            this._refreshToken = refreshToken;
        }

        // Validate we have a refresh token to use
        if (!this._refreshToken) {
            throw new Error("No refresh token available for token refresh");
        }

        log.info("Forcing OAuth token refresh using refresh token mechanism");
        await this.refreshAccessToken();

        log.info("OAuth token refreshed successfully using refresh token");
        return this.accessToken;
    }
}

/**
 * Get an OAuth access token for Domo API
 * @param forceRefresh - Force a token refresh even if current token is valid
 * @returns A valid OAuth access token
 */
export async function getOAuthToken(forceRefresh = false): Promise<string> {
    return await OAuthTokenManager.getInstance().getAccessToken(forceRefresh);
}

/**
 * Force refresh of the OAuth token
 * @returns A new OAuth access token
 */
export async function refreshOAuthToken(): Promise<string> {
    return await OAuthTokenManager.getInstance().refreshToken();
}

/**
 * Set a refresh token for OAuth authentication
 * @param refreshToken - The refresh token to set
 */
export function setOAuthRefreshToken(refreshToken: string): void {
    OAuthTokenManager.getInstance().setRefreshToken(refreshToken);
}

/**
 * Get the currently stored refresh token
 * @returns The current refresh token
 */
export function getOAuthRefreshToken(): string {
    return OAuthTokenManager.getInstance().getRefreshToken();
}

/**
 * Force refresh of the OAuth token using the refresh token mechanism (Option C)
 * @param refreshToken - Optional refresh token to use
 * @returns A new OAuth access token
 */
export async function refreshOAuthTokenUsingRefreshToken(
    refreshToken?: string,
): Promise<string> {
    return await OAuthTokenManager.getInstance().refreshTokenUsingRefreshToken(
        refreshToken,
    );
}
