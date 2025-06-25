import { log } from "../../utils/logger.ts";

/**
 * Utility to log request details before and after API calls
 * This is a simple middleware/interceptor pattern
 */
export class ClientLogger {
    /**
     * Log information before a request is made
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - API endpoint path
     * @param domain - API domain
     * @param params - Optional query parameters
     */
    static logRequest(
        method: string,
        url: string,
        domain: string,
        params?: Record<string, unknown>,
    ): void {
        log.info(`[${method}] ${domain}${url}`);

        if (params && Object.keys(params).length > 0) {
            const paramKeys = Object.keys(params);
            log.debug(`Request parameters: ${paramKeys.join(", ")}`);
        }
    }

    /**
     * Log authentication status
     * @param success - Whether authentication was successful
     * @param clientType - Type of client making the request
     */
    static logAuth(success: boolean, clientType: string): void {
        if (success) {
            log.debug(`${clientType} authenticated successfully`);
        } else {
            log.error(`${clientType} authentication failed`);
        }
    }

    /**
     * Log information after a request is completed
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - API endpoint path
     * @param status - HTTP status code
     * @param startTime - Request start time in milliseconds
     */
    static logResponse(
        method: string,
        url: string,
        status: number,
        startTime: number,
    ): void {
        const duration = Date.now() - startTime;
        log.info(`[${method}] ${url} - ${status} (${duration}ms)`);
    }

    /**
     * Log error information for a failed request
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - API endpoint path
     * @param error - Error object or message
     * @param startTime - Request start time in milliseconds
     */
    static logError(
        method: string,
        url: string,
        error: Error | unknown,
        startTime: number,
    ): void {
        const duration = Date.now() - startTime;
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        log.error(
            `[${method}] ${url} failed after ${duration}ms: ${errorMessage}`,
        );
    }

    /**
     * Log information about the response data
     * @param data - Response data
     */
    static logResponseData(data: unknown): void {
        if (!data) {
            log.debug("Response data: empty");
            return;
        }

        if (Array.isArray(data)) {
            log.debug(`Response data: Array with ${data.length} items`);
        } else if (typeof data === "object") {
            const keys = Object.keys(data as Record<string, unknown>);
            if (keys.length > 0) {
                log.debug(
                    `Response data: Object with keys [${keys.join(", ")}]`,
                );
            } else {
                log.debug("Response data: Empty object");
            }
        } else {
            log.debug(`Response data: ${typeof data}`);
        }
    }
}

/**
 * Instrument the clients with detailed logging
 * This function can be called during app initialization
 */
export function instrumentClients(): void {
    log.info("Instrumenting API clients with detailed logging");
}
