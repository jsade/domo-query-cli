import * as fs from "fs/promises";
import * as path from "path";
import { log } from "./logger";

/**
 * Result of writing JSON to a file
 */
export interface WriteResult {
    filePath: string;
    bytesWritten: number;
}

/**
 * Writes JSON data to a file at the specified path
 *
 * @param data - Data to write as JSON
 * @param filePath - Path to write the file to (can be relative or absolute)
 * @param basePath - Optional base directory that sandboxes all output paths inside it (for admin control)
 * @returns Promise that resolves to write result with file path and bytes written
 * @throws Error if file cannot be written
 */
export async function writeJsonToFile(
    data: unknown,
    filePath: string,
    basePath?: string,
): Promise<WriteResult> {
    try {
        let absolutePath: string;

        if (basePath) {
            // When basePath is provided, ALL paths (even absolute ones) are placed inside it
            // This provides admin control over where files can be written (e.g., for MCP security)

            // Strip leading path separator from filePath to ensure proper joining
            const strippedPath = filePath.replace(/^[/\\]+/, "");

            // Join basePath with the stripped path
            absolutePath = path.join(basePath, strippedPath);

            log.debug(`Sandboxing output path: ${filePath} -> ${absolutePath}`);
        } else {
            // No basePath - use standard path resolution
            absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.resolve(process.cwd(), filePath);
        }

        // Create parent directories if they don't exist
        const parentDir = path.dirname(absolutePath);
        await fs.mkdir(parentDir, { recursive: true });

        // Write JSON to file
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(absolutePath, jsonString, "utf-8");

        // Get file stats to return bytes written
        const stats = await fs.stat(absolutePath);

        log.info(`Output written to ${absolutePath}`);

        return {
            filePath: absolutePath,
            bytesWritten: stats.size,
        };
    } catch (error) {
        log.error(`Error writing output to file: ${filePath}`, error);
        throw error;
    }
}
