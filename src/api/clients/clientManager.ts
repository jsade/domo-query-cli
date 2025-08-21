import {
    DomoClient,
    createApiTokenClient,
    createOAuthClient,
} from "./domoClient";
import { log } from "../../utils/logger";
import { domoConfig } from "../../config";

/**
 * Manages singleton instances of API clients to avoid redundant authentication
 */
class ClientManager {
    private static instance: ClientManager;
    private clients: Map<string, DomoClient> = new Map();

    private constructor() {}

    public static getInstance(): ClientManager {
        if (!ClientManager.instance) {
            ClientManager.instance = new ClientManager();
        }
        return ClientManager.instance;
    }

    /**
     * Get or create a singleton DomoClient for the specified configuration
     * @param useOAuth - Whether to use OAuth authentication
     * @param domain - Optional domain override (defaults to api.domo.com for OAuth, customer domain for API token)
     */
    public getDomoClient(
        useOAuth: boolean = true,
        domain?: string,
    ): DomoClient {
        // Determine the domain to use
        let clientDomain: string;
        if (domain) {
            clientDomain = domain;
        } else if (useOAuth) {
            clientDomain = "api.domo.com"; // OAuth typically uses generic domain
        } else {
            // API token auth should use customer domain for v3 endpoints
            clientDomain = domoConfig.apiHost || "api.domo.com";
        }

        const authType = useOAuth ? "oauth" : "token";
        const cacheKey = `${clientDomain}_${authType}`;

        // Return existing client if available
        if (this.clients.has(cacheKey)) {
            log.debug(
                `Reusing existing ${authType} client for ${clientDomain}`,
            );
            return this.clients.get(cacheKey)!;
        }

        // Create new client and cache it
        log.debug(`Creating new ${authType} client for ${clientDomain}`);
        let client: DomoClient;

        if (useOAuth) {
            client = createOAuthClient(clientDomain);
        } else if (domoConfig.apiToken) {
            client = createApiTokenClient(domoConfig.apiToken, clientDomain);
        } else {
            throw new Error("API token requested but not configured");
        }

        this.clients.set(cacheKey, client);
        return client;
    }

    /**
     * Clear all cached clients (useful for testing or credential changes)
     */
    public clearClients(): void {
        log.debug("Clearing all cached API clients");
        this.clients.clear();
    }
}

// Export convenience function
export function getDomoClient(
    useOAuth: boolean = true,
    domain?: string,
): DomoClient {
    return ClientManager.getInstance().getDomoClient(useOAuth, domain);
}

/**
 * Get a client specifically configured for v3 API endpoints
 * V3 endpoints require API token authentication and the customer's domain
 * @returns DomoClient configured for v3 endpoints, or null if requirements not met
 */
export function getV3Client(): DomoClient | null {
    if (!domoConfig.apiToken || !domoConfig.apiHost) {
        log.debug(
            "V3 client not available - missing API token or customer domain",
        );
        return null;
    }

    // V3 endpoints require API token auth and customer domain
    return ClientManager.getInstance().getDomoClient(false, domoConfig.apiHost);
}

// Export function to clear cached clients
export function clearCachedClients(): void {
    ClientManager.getInstance().clearClients();
}
