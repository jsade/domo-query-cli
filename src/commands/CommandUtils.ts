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
 * Parsed command arguments
 */
export interface ParsedArgs {
    /**
     * Positional arguments (non-flag arguments)
     */
    positional: string[];
    /**
     * Named parameters (e.g., --limit 10 or limit=10)
     */
    params: Record<string, string | number | boolean>;
    /**
     * Boolean flags (e.g., --verbose)
     */
    flags: Set<string>;
    /**
     * Save options if present
     */
    saveOptions: SaveOptions | null;
    /**
     * Output format if specified (e.g., json)
     */
    format?: string;
}

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

    /**
     * Parse command arguments supporting both --key value and key=value formats
     * @param args - Command arguments
     * @returns Parsed arguments object
     */
    public static parseCommandArgs(args?: string[]): ParsedArgs {
        if (!args || args.length === 0) {
            return {
                positional: [],
                params: {},
                flags: new Set(),
                saveOptions: null,
            };
        }

        const result: ParsedArgs = {
            positional: [],
            params: {},
            flags: new Set(),
            saveOptions: null,
        };

        // First, extract save options
        const [remainingArgs, saveOptions] = this.parseSaveOptions(args);
        result.saveOptions = saveOptions;

        // Parse remaining arguments
        let i = 0;
        while (i < remainingArgs.length) {
            const arg = remainingArgs[i];

            if (arg.startsWith("--")) {
                // Handle --key or --key=value format
                const flagName = arg.slice(2);

                if (flagName.includes("=")) {
                    // --key=value format
                    const [key, ...valueParts] = flagName.split("=");
                    const value = valueParts.join("="); // Handle values with = in them

                    // Special handling for format flag
                    if (key === "format") {
                        result.format = value;
                    } else {
                        result.params[key] = this.parseValue(value);
                    }
                } else if (
                    i + 1 < remainingArgs.length &&
                    !remainingArgs[i + 1].startsWith("-")
                ) {
                    // --key value format (next arg is the value)
                    if (flagName === "format") {
                        result.format = remainingArgs[i + 1];
                        i++; // Skip the next argument as we've consumed it
                    } else {
                        result.params[flagName] = this.parseValue(
                            remainingArgs[i + 1],
                        );
                        i++; // Skip the next argument as we've consumed it
                    }
                } else {
                    // Boolean flag
                    result.flags.add(flagName);
                    result.params[flagName] = true;
                }
            } else if (arg.includes("=") && !arg.startsWith("-")) {
                // key=value format (backward compatibility)
                const [key, ...valueParts] = arg.split("=");
                const value = valueParts.join("="); // Handle values with = in them
                result.params[key] = this.parseValue(value);
            } else {
                // Positional argument
                result.positional.push(arg);
            }
            i++;
        }

        return result;
    }

    /**
     * Parse a string value to appropriate type
     * @param value - String value to parse
     * @returns Parsed value as string, number, or boolean
     */
    private static parseValue(value: string): string | number | boolean {
        // Check for boolean
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;

        // Check for number
        if (!isNaN(Number(value)) && value !== "") {
            return Number(value);
        }

        // Return as string
        return value;
    }
}
