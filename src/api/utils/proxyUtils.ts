import type { AgentOptions } from "https";
import { Agent as HttpsAgent } from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { RequestInit as NodeFetchRequestInit } from "node-fetch";
import { domoConfig } from "../../config.ts";
import { log } from "../../utils/logger.ts";

/**
 * Checks if a hostname should bypass the proxy based on NO_PROXY configuration
 * @param hostname - The hostname to check
 * @returns True if the hostname should bypass the proxy
 */
function shouldBypassProxy(hostname: string): boolean {
    if (!domoConfig.noProxy) {
        return false;
    }

    const noProxyList = domoConfig.noProxy.split(",").map(host => host.trim());

    for (const noProxyHost of noProxyList) {
        // Handle wildcard patterns (*.example.com)
        if (noProxyHost.startsWith("*.")) {
            const domain = noProxyHost.substring(2);
            if (hostname.endsWith(domain)) {
                return true;
            }
        }
        // Handle exact matches
        else if (
            hostname === noProxyHost ||
            hostname.endsWith(`.${noProxyHost}`)
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Gets the appropriate proxy agent for HTTPS requests
 * @param url - The target URL (used to check NO_PROXY rules)
 * @returns HttpsProxyAgent instance or undefined if no proxy is configured
 */
export function getProxyAgent(
    url: string,
): HttpsProxyAgent<string> | undefined {
    const proxyUrl = domoConfig.httpsProxy || domoConfig.httpProxy;

    if (!proxyUrl) {
        return undefined;
    }

    try {
        const targetUrl = new URL(url);

        // Check if this host should bypass the proxy
        if (shouldBypassProxy(targetUrl.hostname)) {
            log.debug(
                `Bypassing proxy for ${targetUrl.hostname} based on NO_PROXY configuration`,
            );
            return undefined;
        }

        log.debug(`Using proxy ${proxyUrl} for ${targetUrl.hostname}`);

        // Create agent options with SSL verification settings
        const agentOptions: AgentOptions = {
            rejectUnauthorized: domoConfig.rejectUnauthorized,
        };

        return new HttpsProxyAgent(proxyUrl, agentOptions);
    } catch (error) {
        log.warn(`Failed to create proxy agent: ${error}`);
        return undefined;
    }
}

/**
 * Gets fetch options with proxy support
 * @param url - The target URL
 * @param options - Base fetch options
 * @returns Fetch options with proxy agent if configured
 */
export function getFetchOptionsWithProxy(
    url: string,
    options: NodeFetchRequestInit = {},
): NodeFetchRequestInit {
    const proxyAgent = getProxyAgent(url);

    if (proxyAgent) {
        return {
            ...options,
            agent: proxyAgent,
        } as NodeFetchRequestInit;
    }

    // If no proxy but SSL verification is disabled, create a custom HTTPS agent
    if (!domoConfig.rejectUnauthorized) {
        const httpsAgent = new HttpsAgent({
            rejectUnauthorized: false,
        });

        return {
            ...options,
            agent: httpsAgent,
        } as NodeFetchRequestInit;
    }

    return options;
}
