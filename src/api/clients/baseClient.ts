/**
 * Base client interface shared by DomoClient and DataflowClient
 */
export interface BaseClient {
    /**
     * Ensures the client is authenticated before making requests
     * @returns Authentication status
     */
    ensureAuthenticated(): Promise<boolean>;

    /**
     * Make a GET request
     * @param url - The API endpoint path
     * @param params - Optional query parameters
     * @returns The API response
     */
    get<T>(url: string, params?: Record<string, string | number>): Promise<T>;

    /**
     * Make a POST request
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    post<T>(url: string, body?: Record<string, unknown> | null): Promise<T>;

    /**
     * Make a PUT request
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    put<T>(url: string, body?: Record<string, unknown> | null): Promise<T>;

    /**
     * Make a DELETE request
     * @param url - The API endpoint path
     * @returns The API response
     */
    delete<T>(url: string): Promise<T>;

    /**
     * Get the domain of this client
     * @returns The domain
     */
    getDomain(): string;
}

/**
 * Type definition for request configuration
 */
export interface RequestConfig {
    headers?: Record<string, string>;
    [key: string]: unknown;
}
