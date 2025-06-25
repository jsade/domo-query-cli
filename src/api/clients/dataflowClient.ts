import fetch, { HeadersInit, RequestInit } from "node-fetch";
import {
    domoConfig,
    getAvailableAuthMethods,
    initializeConfig,
} from "../../config.ts";
import {
    DomoApiTokenAuth,
    DomoAuth,
    DomoOAuthAuth,
    DomoOAuthRefreshAuth,
    DomoUsernamePasswordAuth,
    maskSensitiveValue,
} from "../../DomoAuth.ts";
import { log } from "../../utils/logger.ts";
import { getFetchOptionsWithProxy } from "../utils/proxyUtils.ts";
import { BaseClient } from "./baseClient.ts";

/**
 * Authentication method to use for dataflow operations
 */
export type DataflowAuthMethod =
    | "apiToken"
    | "oauth"
    | "oauthRefresh"
    | "usernamePassword";

/**
 * Client specifically for making authenticated requests to the Domo Dataflow API
 * This client uses DOMO_API_HOST for all requests, which is required for dataflow operations
 */
export class DataflowClient implements BaseClient {
    private domain: string;
    private auth: DomoAuth;

    /**
     * Constructor
     * @param auth - The authentication handler
     * @param domain - The Domo instance domain
     */
    constructor(auth: DomoAuth, domain: string) {
        this.auth = auth;
        this.domain = domain;
    }

    /**
     * Ensures the client is authenticated before making requests
     * @returns Authentication status
     */
    async ensureAuthenticated(): Promise<boolean> {
        return await this.auth.ensureAuthenticated(this);
    }

    /**
     * Make a GET request to the Domo Dataflow API
     * @param url - The API endpoint path
     * @param params - Optional query parameters
     * @returns The API response
     */
    async get<T>(
        url: string,
        params: Record<string, string | number> = {},
    ): Promise<T> {
        await this.ensureAuthenticated();

        // Build query string
        const queryString =
            Object.keys(params).length > 0
                ? "?" +
                  new URLSearchParams(
                      Object.entries(params).map(([key, value]) => [
                          key,
                          String(value),
                      ]),
                  ).toString()
                : "";

        const requestUrl = `https://${this.domain}${url}${queryString}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        // Log request details with parameters
        log.debug(`Making GET request to ${requestUrl}`);
        if (Object.keys(params).length > 0) {
            log.debug(`Request parameters: ${JSON.stringify(params)}`);
        }

        // Log headers with sensitive information masked
        if (config.headers) {
            const maskedHeaders = this.maskSensitiveHeaders(
                config.headers as Record<string, string>,
            );
            log.debug(`Request headers: ${JSON.stringify(maskedHeaders)}`);
        }

        const fetchOptions = getFetchOptionsWithProxy(requestUrl, {
            method: "GET",
            headers: config.headers,
        });

        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `Dataflow API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `Dataflow API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        log.debug(
            `GET request to ${url} succeeded with status ${response.status}`,
        );
        const data = await response.json();

        // Log the complete response for debugging
        log.debug(`GET ${url} response: ${JSON.stringify(data, null, 2)}`);

        return data as T;
    }

    /**
     * Make a POST request to the Domo Dataflow API
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    async post<T>(
        url: string,
        body: Record<string, unknown> | null = null,
    ): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making POST request to ${requestUrl}`);

        // Create the complete request object
        const requestOptions: RequestInit = {
            method: "POST",
            headers: config.headers,
        };

        // Add body if provided and log it BEFORE adding to request
        if (body) {
            // Log request body with sensitive values masked BEFORE any response data can be mixed in
            const maskedRequestBody = this.maskSensitiveFields({ ...body }); // Create a new object to avoid mutations
            log.debug(
                `Request payload: ${JSON.stringify(maskedRequestBody, null, 2)}`,
            );

            requestOptions.body = JSON.stringify(body);
        }

        // Log headers with sensitive information masked
        if (config.headers) {
            const maskedHeaders = this.maskSensitiveHeaders(
                config.headers as Record<string, string>,
            );
            log.debug(`Request headers: ${JSON.stringify(maskedHeaders)}`);
        }

        const fetchOptions = getFetchOptionsWithProxy(
            requestUrl,
            requestOptions,
        );
        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `Dataflow API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `Dataflow API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        log.debug(
            `POST request to ${url} succeeded with status ${response.status}`,
        );
        const data = await response.json();

        // Log the response separately with its own label
        log.debug(`POST ${url} response: ${JSON.stringify(data, null, 2)}`);

        return data as T;
    }

    /**
     * Helper method to mask sensitive fields in request payload
     * @param obj - Object to mask sensitive fields in
     * @returns Cloned object with sensitive fields masked
     */
    private maskSensitiveFields(
        obj: Record<string, unknown>,
    ): Record<string, unknown> {
        // Create a deep clone to avoid modifying the original object
        const cloned = JSON.parse(JSON.stringify(obj));

        // List of sensitive field names (case-insensitive)
        const sensitiveFields = [
            "password",
            "token",
            "key",
            "secret",
            "auth",
            "credentials",
            "apiKey",
            "api_key",
            "apiToken",
            "api_token",
            "accessToken",
            "access_token",
            "refreshToken",
            "refresh_token",
        ];

        // Recursive function to mask sensitive fields
        const processObject = (obj: Record<string, unknown>): void => {
            for (const key in obj) {
                // Check if the current key is sensitive
                const lowerKey = key.toLowerCase();
                const isSensitive = sensitiveFields.some(field =>
                    lowerKey.includes(field.toLowerCase()),
                );

                if (isSensitive && typeof obj[key] === "string") {
                    // Mask sensitive string values
                    obj[key] = maskSensitiveValue(obj[key] as string);
                } else if (typeof obj[key] === "object" && obj[key] !== null) {
                    // Recursively process nested objects
                    processObject(obj[key] as Record<string, unknown>);
                }
            }
        };

        processObject(cloned);
        return cloned;
    }

    /**
     * Helper method to mask sensitive headers for logging
     * @param headers - Headers object to mask
     * @returns New headers object with sensitive values masked
     */
    private maskSensitiveHeaders(
        headers: Record<string, string>,
    ): Record<string, string> {
        // Create a copy to avoid modifying the original
        const maskedHeaders: Record<string, string> = {};

        // List of sensitive header names (case-insensitive)
        const sensitiveHeaderNames = [
            "authorization",
            "x-domo-developer-token",
            "x-domo-authentication",
            "cookie",
            "set-cookie",
            "x-api-key",
            "api-key",
        ];

        for (const key in headers) {
            const lowerKey = key.toLowerCase();
            const isSensitive = sensitiveHeaderNames.some(name =>
                lowerKey.includes(name.toLowerCase()),
            );

            if (isSensitive) {
                maskedHeaders[key] = maskSensitiveValue(headers[key], 5);
            } else {
                maskedHeaders[key] = headers[key];
            }
        }

        return maskedHeaders;
    }

    /**
     * Make a PUT request to the Domo Dataflow API
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    async put<T>(
        url: string,
        body: Record<string, unknown> | null = null,
    ): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making PUT request to ${requestUrl}`);

        // Log request body with sensitive values masked
        if (body) {
            const maskedBody = this.maskSensitiveFields(body);
            log.debug(`Request payload: ${JSON.stringify(maskedBody)}`);
        }

        // Log headers with sensitive information masked
        if (config.headers) {
            const maskedHeaders = this.maskSensitiveHeaders(
                config.headers as Record<string, string>,
            );
            log.debug(`Request headers: ${JSON.stringify(maskedHeaders)}`);
        }

        const requestOptions: RequestInit = {
            method: "PUT",
            headers: config.headers,
        };

        // Add body if provided
        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        const fetchOptions = getFetchOptionsWithProxy(
            requestUrl,
            requestOptions,
        );
        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `Dataflow API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `Dataflow API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        log.debug(
            `PUT request to ${url} succeeded with status ${response.status}`,
        );
        const data = await response.json();

        // Log the complete response for debugging
        log.debug(`PUT ${url} response: ${JSON.stringify(data, null, 2)}`);

        return data as T;
    }

    /**
     * Make a DELETE request to the Domo Dataflow API
     * @param url - The API endpoint path
     * @returns The API response
     */
    async delete<T>(url: string): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making DELETE request to ${requestUrl}`);

        // Log headers with sensitive information masked
        if (config.headers) {
            const maskedHeaders = this.maskSensitiveHeaders(
                config.headers as Record<string, string>,
            );
            log.debug(`Request headers: ${JSON.stringify(maskedHeaders)}`);
        }

        const fetchOptions = getFetchOptionsWithProxy(requestUrl, {
            method: "DELETE",
            headers: config.headers,
        });

        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `Dataflow API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `Dataflow API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        log.debug(
            `DELETE request to ${url} succeeded with status ${response.status}`,
        );

        try {
            const data = await response.json();

            // Log the complete response for debugging
            log.debug(
                `DELETE ${url} response: ${JSON.stringify(data, null, 2)}`,
            );

            return data as T;
        } catch {
            // Some DELETE endpoints might not return JSON
            log.debug(
                `DELETE request to ${url} did not return JSON, returning empty object`,
            );
            return {} as T;
        }
    }

    /**
     * Get the domain of this client
     * @returns The domain
     */
    getDomain(): string {
        return this.domain;
    }
}

/**
 * Creates an authenticated Dataflow client based on the configuration and specified auth method
 * Always uses DOMO_API_HOST for dataflow operations
 * Default authentication preference order:
 * 1. API Token (Option A) - Recommended for dataflow operations
 * 2. OAuth Refresh Token (Option C)
 * 3. OAuth Standard
 * 4. Username/Password
 * @param authMethod - Optional specific authentication method to use
 * @returns A new DataflowClient instance
 */
export function createDataflowClient(
    authMethod?: DataflowAuthMethod,
): DataflowClient {
    if (!domoConfig.initialized) {
        initializeConfig();
    }

    const availableAuthMethods = getAvailableAuthMethods();
    let auth: DomoAuth;

    // If specific auth method is requested, use it if available
    if (authMethod) {
        switch (authMethod) {
            case "apiToken":
                if (!domoConfig.apiToken) {
                    throw new Error(
                        "API token authentication requested but DOMO_API_TOKEN is not set",
                    );
                }
                log.debug("Using API token authentication for dataflow client");
                auth = new DomoApiTokenAuth(domoConfig.apiToken);
                break;
            case "oauth":
                if (!domoConfig.clientId || !domoConfig.clientSecret) {
                    throw new Error(
                        "OAuth authentication requested but DOMO_CLIENT_ID or DOMO_CLIENT_SECRET is not set",
                    );
                }
                log.debug("Using OAuth authentication for dataflow client");
                auth = new DomoOAuthAuth();
                break;
            case "oauthRefresh":
                if (!domoConfig.clientId) {
                    throw new Error(
                        "OAuth refresh token authentication requested but DOMO_CLIENT_ID is not set",
                    );
                }
                if (!domoConfig.refreshToken) {
                    throw new Error(
                        "OAuth refresh token authentication requested but DOMO_REFRESH_TOKEN is not set",
                    );
                }
                log.debug(
                    "Using OAuth refresh token authentication for dataflow client (Option C)",
                );
                auth = new DomoOAuthRefreshAuth(domoConfig.refreshToken);
                break;
            case "usernamePassword":
                if (!domoConfig.webUsername || !domoConfig.webPassword) {
                    throw new Error(
                        "Username/password authentication requested but DOMO_WEBUSERNAME or DOMO_WEBPASSWORD is not set",
                    );
                }
                log.debug(
                    "Using username/password authentication for dataflow client",
                );
                auth = new DomoUsernamePasswordAuth(
                    domoConfig.webUsername,
                    domoConfig.webPassword,
                );
                break;
            default:
                throw new Error(
                    `Unsupported authentication method: ${authMethod}`,
                );
        }
    }
    // Otherwise, select the best available method with API Token as the default (Option A)
    else {
        // First preference is API Token (Option A)
        if (availableAuthMethods.includes("apiToken")) {
            log.debug(
                "Using API token authentication for dataflow client (Option A)",
            );
            auth = new DomoApiTokenAuth(domoConfig.apiToken);
        }
        // Second preference is OAuth refresh token (Option C)
        else if (availableAuthMethods.includes("oauthRefresh")) {
            log.debug(
                "Using OAuth refresh token authentication for dataflow client (Option C)",
            );
            auth = new DomoOAuthRefreshAuth(domoConfig.refreshToken);
        }
        // Third preference is OAuth standard
        else if (availableAuthMethods.includes("oauth")) {
            log.debug("Using OAuth authentication for dataflow client");
            auth = new DomoOAuthAuth();
        }
        // Last resort is username/password auth
        else if (availableAuthMethods.includes("usernamePassword")) {
            log.debug(
                "Using username/password authentication for dataflow client",
            );
            auth = new DomoUsernamePasswordAuth(
                domoConfig.webUsername,
                domoConfig.webPassword,
            );
        }
        // No auth method available
        else {
            throw new Error("No authentication method available");
        }
    }

    // Always use DOMO_API_HOST for dataflow operations
    return new DataflowClient(auth, domoConfig.apiHost);
}

/**
 * Create a Dataflow client with API token authentication
 * @param apiToken - The Domo API token
 * @param domain - The Domo instance domain
 * @returns A new DataflowClient instance
 */
export function createDataflowApiTokenClient(
    apiToken: string,
    domain: string,
): DataflowClient {
    return new DataflowClient(new DomoApiTokenAuth(apiToken), domain);
}

/**
 * Create a Dataflow client with standard OAuth authentication
 * @param domain - The Domo instance domain
 * @returns A new DataflowClient instance
 */
export function createDataflowOAuthClient(domain: string): DataflowClient {
    return new DataflowClient(new DomoOAuthAuth(), domain);
}

/**
 * Create a Dataflow client with OAuth refresh token authentication (Option C)
 * @param refreshToken - The OAuth refresh token
 * @param domain - The Domo instance domain
 * @returns A new DataflowClient instance
 */
export function createDataflowOAuthRefreshClient(
    refreshToken: string,
    domain: string,
): DataflowClient {
    return new DataflowClient(new DomoOAuthRefreshAuth(refreshToken), domain);
}

/**
 * Create a Dataflow client with username/password authentication
 * @param username - The Domo username
 * @param password - The Domo password
 * @param domain - The Domo instance domain
 * @returns A new DataflowClient instance
 */
export function createDataflowUsernamePasswordClient(
    username: string,
    password: string,
    domain: string,
): DataflowClient {
    return new DataflowClient(
        new DomoUsernamePasswordAuth(username, password),
        domain,
    );
}
