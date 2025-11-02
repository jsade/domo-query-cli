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
 * @returns Promise that resolves to write result with file path and bytes written
 * @throws Error if file cannot be written
 */
export async function writeJsonToFile(
    data: unknown,
    filePath: string,
): Promise<WriteResult> {
    try {
        // Resolve to absolute path if relative
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(process.cwd(), filePath);

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
