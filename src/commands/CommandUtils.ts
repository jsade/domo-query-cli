import { domoConfig } from "../config";
import { parseSaveOptions } from "../shellUtils";
import type { SaveOptions } from "../types/shellTypes";
export type { SaveOptions };
import { log } from "../utils/logger";
import {
    ensureExportDir,
    exportToJson,
    exportToMarkdown,
} from "../utils/utils";

/**
 * Utility class with common functions for commands
 */
export class CommandUtils {
    /**
     * Parse command arguments for save options
     * @param args - Command arguments
     * @returns Tuple of [remaining args, save options]
     */
    public static parseSaveOptions(
        args?: string[],
    ): [string[], SaveOptions | null] {
        if (!args || args.length === 0) {
            return [[], null];
        }
        return parseSaveOptions(args);
    }

    /**
     * Export data to files based on save options
     * @param data - Data to export
     * @param title - Title for markdown export
     * @param fileNamePrefix - Prefix for export file names
     * @param saveOptions - Save options
     * @returns Promise resolving when export is complete
     */
    public static async exportData<T>(
        data: T[],
        title: string,
        fileNamePrefix: string,
        saveOptions: SaveOptions | null,
    ): Promise<void> {
        if (!saveOptions) return;

        try {
            // Ensure export directory exists
            const exportPath = saveOptions.path || domoConfig.exportPath;
            await ensureExportDir(exportPath);

            if (
                saveOptions.format === "json" ||
                saveOptions.format === "both"
            ) {
                const jsonPath = await exportToJson(data, fileNamePrefix);
                console.log(`${title} saved to JSON: ${jsonPath}`);
            }
            if (saveOptions.format === "md" || saveOptions.format === "both") {
                const mdPath = await exportToMarkdown(
                    data,
                    title,
                    fileNamePrefix,
                );
                console.log(`${title} saved to Markdown: ${mdPath}`);
            }
        } catch (exportError) {
            log.error(`Error saving ${fileNamePrefix} to file:`, exportError);
        }
    }

    /**
     * Type guard for SaveOptions
     * @param obj - Object to check
     * @returns True if obj is SaveOptions
     */
    public static isSaveOptions(obj: unknown): obj is SaveOptions {
        if (
            typeof obj === "object" &&
            obj !== null &&
            "format" in obj &&
            typeof (obj as Record<string, unknown>)["format"] === "string"
        ) {
            return true;
        }
        return false;
    }
}
