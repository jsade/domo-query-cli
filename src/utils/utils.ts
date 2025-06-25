import * as fs from "fs/promises";
import * as path from "path";
import { domoConfig } from "../config.ts";
import { log } from "./logger.ts";

/**
 * Supported file formats for exporting data
 */
export type ExportFileFormat = "json" | "md";

/**
 * Returns a timestamped filename with the given prefix and extension
 *
 * @param prefix - Prefix for the filename (e.g., "datasets")
 * @param format - File format extension
 * @returns Timestamped filename (e.g., "datasets_20250506_123045.json")
 */
export function getTimestampedFilename(
    prefix: string,
    format: ExportFileFormat,
): string {
    const now = new Date();
    const timestamp = now
        .toISOString()
        .replace(/[T:.-]/g, "_")
        .replace(/Z.*/, "");

    return `${prefix}_${timestamp}.${format}`;
}

/**
 * Ensures the export directory exists
 *
 * @param dirPath - Directory path to ensure
 * @returns Promise that resolves to the directory path
 */
export async function ensureExportDir(
    dirPath = domoConfig.exportPath,
): Promise<string> {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return dirPath;
    } catch (error) {
        log.error(`Error creating export directory: ${dirPath}`, error);
        throw error;
    }
}

/**
 * Exports data to a JSON file
 *
 * @param data - Data to export
 * @param filePrefix - Prefix for the filename
 * @returns Promise that resolves to the file path
 */
export async function exportToJson<T>(
    data: T,
    filePrefix: string,
): Promise<string> {
    const exportDir = await ensureExportDir();
    const filename = getTimestampedFilename(filePrefix, "json");
    const filePath = path.join(exportDir, filename);

    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonString);
        log.info(`Data exported to ${filePath}`);
        return filePath;
    } catch (error) {
        log.error(`Error exporting data to JSON: ${filePath}`, error);
        throw error;
    }
}

/**
 * Converts an array of objects to a markdown table
 *
 * @param data - Array of objects to convert
 * @returns Markdown table string
 */
export function objectsToMarkdownTable<T extends Record<string, unknown>>(
    data: T[],
): string {
    if (data.length === 0) return "No data to display";

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);

    // Generate header row
    let table = `| ${headers.join(" | ")} |\n`;

    // Generate separator row
    table += `| ${headers.map(() => "---").join(" | ")} |\n`;

    // Generate data rows
    data.forEach(item => {
        const values = headers.map(header => {
            const value = item[header];
            // Format the value based on its type
            if (value === undefined || value === null) {
                return "";
            } else if (typeof value === "object") {
                return JSON.stringify(value);
            } else {
                return String(value);
            }
        });

        table += `| ${values.join(" | ")} |\n`;
    });

    return table;
}

/**
 * Exports data to a markdown file
 *
 * @param data - Data to export (object or array of objects)
 * @param title - Title of the markdown document
 * @param filePrefix - Prefix for the filename
 * @returns Promise that resolves to the file path
 */
export async function exportToMarkdown<T>(
    data: T,
    title: string,
    filePrefix: string,
): Promise<string> {
    const exportDir = await ensureExportDir();
    const filename = getTimestampedFilename(filePrefix, "md");
    const filePath = path.join(exportDir, filename);

    try {
        let markdown = `# ${title}\n\n`;
        markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

        if (Array.isArray(data)) {
            if (data.length > 0 && typeof data[0] === "object") {
                // If it's an array of objects, convert to markdown table
                markdown += objectsToMarkdownTable(
                    data as Record<string, unknown>[],
                );
            } else {
                // If it's an array of primitives, just list them
                markdown += data.map(item => `- ${String(item)}`).join("\n");
            }
        } else if (data && typeof data === "object") {
            // If it's a single object, format as a list of properties
            markdown += "## Properties\n\n";
            for (const [key, value] of Object.entries(
                data as Record<string, unknown>,
            )) {
                markdown += `**${key}**: ${typeof value === "object" ? JSON.stringify(value) : String(value)}\n\n`;
            }
        } else {
            // For simple types
            markdown += String(data);
        }

        await fs.writeFile(filePath, markdown);
        log.info(`Data exported to ${filePath}`);
        return filePath;
    } catch (error) {
        log.error(`Error exporting data to Markdown: ${filePath}`, error);
        throw error;
    }
}
