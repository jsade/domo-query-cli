import { homedir } from "node:os";
import * as path from "node:path";
import * as process from "node:process";
import { loadEnvFiles } from "./utils/envLoader.ts";
import { log } from "./utils/logger.ts";

/**
 * Default configuration object for Domo connection.
 *
 * @remarks
 * Provides structure for settings from environment variables:
 * - `DOMO_CLIENT_ID`: Your Domo client ID (for OAuth authentication).
 * - `DOMO_CLIENT_SECRET`: Your Domo client secret (for OAuth authentication).
 * - `DOMO_REFRESH_TOKEN`: Your Domo OAuth refresh token (for Option C OAuth authentication).
 * - `DOMO_API_TOKEN`: Your Domo API token (for API token authentication, alternative to client ID/secret).
 * - `DOMO_WEBUSERNAME`: Your Domo username (for username/password authentication, specific to dataflow operations).
 * - `DOMO_WEBPASSWORD`: Your Domo password (for username/password authentication, specific to dataflow operations).
 * - `DOMO_API_HOST`: Your Domo instance hostname (e.g., 'yourcompany.domo.com').
 * - `DOMO_EXPORT_PATH`: Path to save exported files (optional, defaults to './exports').
 * - `DOMO_OUTPUT_PATH`: Base directory for file-based command output (optional, for admin control over MCP output locations).
 * - `LOG_PATH`: Path to save log files (optional, defaults to './logs').
 * - `HTTPS_PROXY`: HTTPS proxy URL (e.g., 'http://proxy.company.com:8080').
 * - `HTTP_PROXY`: HTTP proxy URL (fallback if HTTPS_PROXY not set).
 * - `NO_PROXY`: Comma-separated list of hosts to bypass proxy.
 * - `NODE_TLS_REJECT_UNAUTHORIZED`: Set to '0' to disable SSL certificate verification (for self-signed certs).
 * - `DOMO_DISABLE_SSL_VERIFICATION`: Set to 'true' to disable SSL certificate verification (alternative to NODE_TLS_REJECT_UNAUTHORIZED).
 * - `DOMO_READ_ONLY`: Set to 'true' to enable read-only mode (disables all destructive operations).
 */
export const domoConfig = {
    clientId: "",
    clientSecret: "",
    refreshToken: "", // For OAuth Option C (refresh token)
    apiToken: "",
    webUsername: "",
    webPassword: "",
    apiHost: "",
    exportPath: "./exports",
    outputPath: undefined as string | undefined,
    httpsProxy: "",
    httpProxy: "",
    noProxy: "",
    rejectUnauthorized: true,
    readOnly: false,
    initialized: false,
};

/**
 * Returns the available authentication method(s) from the config
 * @returns An array of available auth methods
 */
export function getAvailableAuthMethods(): string[] {
    const methods: string[] = [];

    if (domoConfig.apiToken) methods.push("apiToken");

    if (domoConfig.clientId && domoConfig.clientSecret) {
        methods.push("oauth");

        // Include oauthRefresh as a separate authentication method if we have a refresh token
        if (domoConfig.refreshToken) {
            methods.push("oauthRefresh");
        }
    }

    if (domoConfig.webUsername && domoConfig.webPassword)
        methods.push("usernamePassword");

    return methods;
}

/**
 * Initializes the Domo configuration from environment variables.
 * Must be called explicitly before using the API.
 *
 * @throws Error if required environment variables are missing.
 */
export function initializeConfig(): void {
    // Skip if already initialized
    if (domoConfig.initialized) {
        return;
    }

    // Load environment variables from .env file
    loadEnvFiles([path.join(process.cwd(), ".env")]);

    // Helper function to expand tilde in paths
    const expandTilde = (filepath: string): string => {
        if (filepath.startsWith("~/")) {
            return path.join(homedir(), filepath.slice(2));
        }
        return filepath;
    };

    // Set export path with environment variable handling
    if (process.env.DOMO_EXPORT_PATH) {
        // Expand tilde if present
        let expandedPath = expandTilde(process.env.DOMO_EXPORT_PATH);

        // Convert relative paths to absolute (relative to cwd)
        if (!path.isAbsolute(expandedPath)) {
            expandedPath = path.resolve(process.cwd(), expandedPath);
        }

        domoConfig.exportPath = expandedPath;
        log.debug(`DOMO_EXPORT_PATH set to: ${domoConfig.exportPath}`);
    } else {
        // Use absolute path as default - relative to current working directory
        domoConfig.exportPath = path.join(process.cwd(), "exports");
        log.debug(
            `DOMO_EXPORT_PATH not set, using default: ${domoConfig.exportPath}`,
        );
    }

    // Set output path for file-based command output (admin control for MCP)
    if (process.env.DOMO_OUTPUT_PATH) {
        // Expand tilde if present
        let expandedPath = expandTilde(process.env.DOMO_OUTPUT_PATH);

        // Convert relative paths to absolute (relative to cwd)
        if (!path.isAbsolute(expandedPath)) {
            expandedPath = path.resolve(process.cwd(), expandedPath);
        }

        domoConfig.outputPath = expandedPath;
        log.debug(`DOMO_OUTPUT_PATH set to: ${domoConfig.outputPath}`);
    }

    // Check for required API host
    if (!process.env.DOMO_API_HOST) {
        throw new Error("Missing required environment variable: DOMO_API_HOST");
    } else {
        domoConfig.apiHost = process.env.DOMO_API_HOST;
        log.debug("DOMO_API_HOST loaded successfully");
    }

    // Load API token if available
    if (process.env.DOMO_API_TOKEN) {
        domoConfig.apiToken = process.env.DOMO_API_TOKEN;
        log.debug("DOMO_API_TOKEN loaded successfully");
    }

    // Load OAuth client credentials if available
    if (process.env.DOMO_CLIENT_ID && process.env.DOMO_CLIENT_SECRET) {
        domoConfig.clientId = process.env.DOMO_CLIENT_ID;
        domoConfig.clientSecret = process.env.DOMO_CLIENT_SECRET;
        log.debug("DOMO_CLIENT_ID and DOMO_CLIENT_SECRET loaded successfully");
    }

    // Load OAuth refresh token if available
    if (process.env.DOMO_REFRESH_TOKEN) {
        domoConfig.refreshToken = process.env.DOMO_REFRESH_TOKEN;
        log.debug("DOMO_REFRESH_TOKEN loaded successfully");
    }

    // Load username/password if available
    if (process.env.DOMO_WEBUSERNAME && process.env.DOMO_WEBPASSWORD) {
        domoConfig.webUsername = process.env.DOMO_WEBUSERNAME;
        domoConfig.webPassword = process.env.DOMO_WEBPASSWORD;
        log.debug("DOMO_WEBUSERNAME and DOMO_WEBPASSWORD loaded successfully");
    }

    // Check that at least one authentication method is available
    const authMethods = getAvailableAuthMethods();
    if (authMethods.length === 0) {
        throw new Error(
            "Missing authentication credentials. Please provide one of the following:\n" +
                "1. DOMO_API_TOKEN for API token authentication\n" +
                "2. DOMO_CLIENT_ID and DOMO_CLIENT_SECRET for OAuth authentication\n" +
                "3. DOMO_CLIENT_ID and DOMO_REFRESH_TOKEN for OAuth refresh token authentication\n" +
                "4. DOMO_WEBUSERNAME and DOMO_WEBPASSWORD for username/password authentication",
        );
    }

    // Load proxy configuration if available
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        domoConfig.httpsProxy =
            process.env.HTTPS_PROXY || process.env.https_proxy || "";
        log.debug("HTTPS proxy configured:", domoConfig.httpsProxy);
    } else if (process.env.HTTP_PROXY || process.env.http_proxy) {
        domoConfig.httpProxy =
            process.env.HTTP_PROXY || process.env.http_proxy || "";
        log.debug("HTTP proxy configured:", domoConfig.httpProxy);
    }

    if (process.env.NO_PROXY || process.env.no_proxy) {
        domoConfig.noProxy = process.env.NO_PROXY || process.env.no_proxy || "";
        log.debug("NO_PROXY configured:", domoConfig.noProxy);
    }

    // Load SSL verification configuration
    if (
        process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
        process.env.DOMO_DISABLE_SSL_VERIFICATION === "true"
    ) {
        domoConfig.rejectUnauthorized = false;
        log.warn(
            "SSL certificate verification is DISABLED. This is insecure and should only be used for development/testing.",
        );

        // Also set the Node.js global flag for libraries that don't use our proxy utils
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    // Load read-only mode configuration
    if (
        process.env.DOMO_READ_ONLY?.toLowerCase() === "true" ||
        process.env.DOMO_READ_ONLY === "1"
    ) {
        domoConfig.readOnly = true;
        log.warn(
            "READ-ONLY MODE ENABLED - All destructive operations are disabled",
        );
    }

    // Mark as initialized
    domoConfig.initialized = true;
    log.info(
        `Domo configuration loaded successfully using authentication methods: ${authMethods.join(", ")}`,
    );
    if (domoConfig.readOnly) {
        log.info("Running in READ-ONLY mode");
    }
}

/**
 * Checks if the CLI is running in read-only mode
 * @returns true if read-only mode is enabled
 */
export function isReadOnlyMode(): boolean {
    return domoConfig.readOnly;
}

/**
 * Sets the read-only mode state
 * @param enabled - Whether to enable or disable read-only mode
 */
export function setReadOnlyMode(enabled: boolean): void {
    domoConfig.readOnly = enabled;
    if (enabled) {
        log.warn(
            "READ-ONLY MODE ENABLED - All destructive operations are disabled",
        );
    } else {
        log.info("Read-only mode disabled");
    }
}
