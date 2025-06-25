import { log } from "../../utils/logger.ts";

/**
 * Enhances logging for HTTP requests
 *
 * @param method - The HTTP method (GET, POST, etc.)
 * @param url - The API endpoint path
 * @param domain - The API domain
 * @param startTime - The start time of the request in milliseconds
 * @param status - The HTTP status code
 * @param error - Optional error if the request failed
 */
export function logRequestCompletion(
    method: string,
    url: string,
    domain: string,
    startTime: number,
    status: number,
    error?: Error,
): void {
    const requestDuration = Date.now() - startTime;

    if (error) {
        log.error(
            `${method} ${url} to ${domain} failed after ${requestDuration}ms with status ${status}:`,
            error,
        );
    } else {
        log.info(
            `${method} ${url} to ${domain} completed with status ${status} in ${requestDuration}ms`,
        );
    }
}

/**
 * Logs information about a request before it's sent
 *
 * @param method - The HTTP method (GET, POST, etc.)
 * @param url - The API endpoint path
 * @param domain - The API domain
 * @param params - Optional query parameters
 */
export function logRequestStart(
    method: string,
    url: string,
    domain: string,
    params?: Record<string, string | number>,
): void {
    log.info(`Preparing ${method} request to ${domain}${url}`);

    if (params && Object.keys(params).length > 0) {
        const queryParams = Object.keys(params);
        log.debug(
            `Request includes ${queryParams.length} query parameters: ${queryParams.join(", ")}`,
        );
    }
}

/**
 * Logs authentication status
 *
 * @param success - Whether authentication was successful
 * @returns An error to throw if authentication failed, undefined otherwise
 */
export function logAuthStatus(success: boolean): Error | undefined {
    log.debug(
        `Authentication status: ${success ? "Authenticated" : "Not authenticated"}`,
    );

    if (!success) {
        const error = new Error(
            "Authentication failed before making API request",
        );
        log.error(error.message);
        return error;
    }

    return undefined;
}

/**
 * Logs response details
 *
 * @param response - The API response
 * @param data - The response data
 */
export function logResponseDetails(response: Response, data: unknown): void {
    try {
        const contentType = response.headers.get("content-type") || "";
        log.debug(`Response content type: ${contentType}`);

        if (data && typeof data === "object") {
            const dataKeys = Object.keys(data as Record<string, unknown>);
            if (dataKeys.length > 0) {
                const keysString = dataKeys.join(", ");
                log.debug(
                    `Response data contains ${dataKeys.length} top-level keys: ${
                        keysString.length > 100
                            ? keysString.substring(0, 100) + "..."
                            : keysString
                    }`,
                );
            } else {
                log.debug("Response data is an empty object");
            }
        } else if (Array.isArray(data)) {
            log.debug(`Response data is an array with ${data.length} items`);
        } else {
            log.debug(`Response data is not an object or array`);
        }
    } catch (error) {
        log.debug("Error logging response details:", error);
    }
}
