import { config } from "dotenv";
import { existsSync } from "node:fs";

/**
 * Loads environment variables from the given file paths.
 * Uses quiet mode to suppress dotenv v17 verbose console output,
 * which is critical for MCP mode where stdout is reserved for JSON-RPC.
 */
export function loadEnvFiles(paths: string[]): void {
    for (const envPath of paths) {
        if (existsSync(envPath)) {
            config({ path: envPath, quiet: true });
        }
    }
}
