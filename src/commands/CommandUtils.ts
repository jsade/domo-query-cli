import { domoConfig } from "../config";
import { parseSaveOptions } from "../shellUtils";
import type { OutputOptions, SaveOptions } from "../types/shellTypes";
export type { OutputOptions, SaveOptions };
import {
    type OutputConfig,
    type ParsedOutputArgs,
    type ExportFormat,
    NUMERIC_PARAMS,
} from "../types/outputTypes";
import {
    parseOutputArgs,
    toOutputConfig,
    getRemainingArgs,
} from "../utils/OutputParser";
import { log } from "../utils/logger";
import {
    ensureExportDir,
    exportToJson,
    exportToMarkdown,
} from "../utils/utils";
import readline from "readline";

// Re-export new types for convenience
export type { OutputConfig, ParsedOutputArgs, ExportFormat };

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
     * Output options if present
     */
    outputOptions: OutputOptions | null;
    /**
     * Output format if specified (e.g., json)
     */
    format?: string;
}

/**
 * Multi-word command mappings
 */
const MULTI_WORD_COMMANDS: Record<string, string[]> = {
    list: [
        "datasets",
        "dataflows",
        "cards",
        "pages",
        "dataflow-executions",
        "users",
        "groups",
    ],
    get: ["dataflow", "dataflow-execution", "dataset", "card", "user", "group"],
    show: ["lineage"],
    execute: ["dataflow"],
    render: ["card"],
    cache: ["status"],
    generate: ["lineage-report"],
    update: ["dataset-properties"],
};

/**
 * Utility class with common functions for commands
 */
export class CommandUtils {
    /**
     * Normalize multi-word commands into hyphenated format
     * @param args - Command line arguments where first element is the command
     * @returns Tuple of [normalized command, remaining arguments]
     * @example
     * normalizeCommand(["list", "datasets", "--limit", "10"])
     * // Returns: ["list-datasets", ["--limit", "10"]]
     */
    public static normalizeCommand(args: string[]): [string, string[]] {
        if (args.length === 0) {
            return ["", []];
        }

        const baseCommand = args[0];
        let remainingArgs = args.slice(1);

        // Check if this is a multi-word command
        if (MULTI_WORD_COMMANDS[baseCommand] && remainingArgs.length > 0) {
            const subCommand = remainingArgs[0];
            const validSubCommands = MULTI_WORD_COMMANDS[baseCommand];

            if (validSubCommands.includes(subCommand)) {
                // Combine into hyphenated command
                const normalizedCommand = `${baseCommand}-${subCommand}`;
                remainingArgs = remainingArgs.slice(1);
                return [normalizedCommand, remainingArgs];
            }
        }

        // Return original command if no multi-word match
        return [baseCommand, remainingArgs];
    }

    /**
     * Check if a string looks like a command name (not a flag).
     * Used to detect positional commands for non-interactive mode.
     * @param arg - Argument to check
     * @returns True if arg appears to be a command name
     */
    public static isLikelyCommand(arg: string): boolean {
        if (!arg || arg.startsWith("-")) return false;

        // Check if it's a known multi-word command prefix
        if (MULTI_WORD_COMMANDS[arg]) return true;

        // Check if it's a hyphenated command (e.g., list-datasets, db-sync)
        if (arg.includes("-")) return true;

        // Check for known single-word commands/prefixes
        const singleWordCommands = ["db", "help", "exit", "quit"];
        return singleWordCommands.includes(arg);
    }

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
     * Parse command arguments for output options
     * @param args - Command arguments
     * @returns Tuple of [remaining args, output options]
     */
    public static parseOutputOptions(
        args?: string[],
    ): [string[], OutputOptions | null] {
        if (!args || args.length === 0) {
            return [[], null];
        }

        let outputOptions: OutputOptions | null = null;
        const remainingArgs: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg.startsWith("--output=")) {
                // --output=/path/to/file.json format
                const filePath = arg.slice(9);
                if (filePath) {
                    outputOptions = { format: "json", path: filePath };
                } else {
                    log.warn("--output flag requires a file path");
                }
            } else if (arg === "--output") {
                // --output /path/to/file.json format
                if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                    outputOptions = { format: "json", path: args[i + 1] };
                    i++; // Skip the next argument as we've consumed it
                } else {
                    log.warn("--output flag requires a file path argument");
                }
            } else {
                // Not an output option, keep as a regular argument
                remainingArgs.push(arg);
            }
        }

        return [remainingArgs, outputOptions];
    }

    /**
     * Export data to files based on save options
     * @param data - Data to export
     * @param title - Title for markdown export
     * @param fileNamePrefix - Prefix for export file names
     * @param saveOptions - Save options
     * @param isJsonOutput - Whether output is in JSON format (suppresses console messages)
     * @returns Promise resolving when export is complete
     */
    public static async exportData<T>(
        data: T[],
        title: string,
        fileNamePrefix: string,
        saveOptions: SaveOptions | null,
        isJsonOutput = false,
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
                if (!isJsonOutput) {
                    console.log(`${title} saved to JSON: ${jsonPath}`);
                }
            }
            if (saveOptions.format === "md" || saveOptions.format === "both") {
                const mdPath = await exportToMarkdown(
                    data,
                    title,
                    fileNamePrefix,
                );
                if (!isJsonOutput) {
                    console.log(`${title} saved to Markdown: ${mdPath}`);
                }
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
                outputOptions: null,
            };
        }

        const result: ParsedArgs = {
            positional: [],
            params: {},
            flags: new Set(),
            saveOptions: null,
            outputOptions: null,
        };

        // First, extract save options
        let [remainingArgs, saveOptions] = this.parseSaveOptions(args);
        result.saveOptions = saveOptions;

        // Then, extract output options
        const [finalArgs, outputOptions] =
            this.parseOutputOptions(remainingArgs);
        result.outputOptions = outputOptions;
        remainingArgs = finalArgs;

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
                        result.params[key] = this.parseValue(value, key);
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
                            flagName,
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
                result.params[key] = this.parseValue(value, key);
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
     * @param key - Optional parameter key for context-aware parsing
     * @returns Parsed value as string, number, or boolean
     */
    private static parseValue(
        value: string,
        key?: string,
    ): string | number | boolean {
        // Check for boolean
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;

        // Only convert to number for known numeric parameters
        // This prevents IDs and other string values from being incorrectly converted
        if (key && NUMERIC_PARAMS.has(key.toLowerCase())) {
            const num = Number(value);
            if (!isNaN(num) && value !== "") {
                return num;
            }
        }

        // Return as string by default
        return value;
    }

    /**
     * Prompt user for input
     * @param prompt - The prompt message to display
     * @returns Promise resolving to user input
     */
    public static async promptUser(prompt: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise(resolve => {
            rl.question(prompt, answer => {
                rl.close();
                resolve(answer);
            });
        });
    }

    /**
     * Prompt user for confirmation (yes/no)
     * @param message - The confirmation message to display
     * @param defaultValue - Default value if user presses enter (default: false)
     * @returns Promise resolving to true if user confirms, false otherwise
     */
    public static async promptConfirmation(
        message: string,
        defaultValue = false,
    ): Promise<boolean> {
        const defaultHint = defaultValue ? "(Y/n)" : "(y/N)";
        const prompt = `${message} ${defaultHint}: `;
        const response = await this.promptUser(prompt);

        if (response.trim() === "") {
            return defaultValue;
        }

        const normalizedResponse = response.toLowerCase().trim();
        return normalizedResponse === "y" || normalizedResponse === "yes";
    }

    /**
     * Check if confirmation should be skipped
     * @param parsedArgs - Parsed command arguments
     * @param isJsonOutput - Whether output is in JSON format
     * @returns True if confirmation should be skipped
     */
    public static shouldSkipConfirmation(
        parsedArgs: ParsedArgs,
        isJsonOutput: boolean,
    ): boolean {
        return isJsonOutput || parsedArgs.flags.has("no-confirm");
    }

    // ========================================================================
    // UNIFIED OUTPUT SYSTEM METHODS
    // ========================================================================

    /**
     * Parse command arguments using the unified output parser
     *
     * This is the recommended method for parsing arguments in new commands.
     * It handles all output-related flags and provides a clean interface.
     *
     * @param args - Command arguments
     * @returns Object containing outputConfig, remaining args, and parsed details
     *
     * @example
     * ```typescript
     * const { config, args, parsed } = CommandUtils.parseUnifiedArgs(args);
     * // config.displayFormat: 'table' | 'json'
     * // config.shouldExport: boolean
     * // args: string[] (without output flags)
     * // parsed.positional: string[]
     * // parsed.params: Record<string, string | number | boolean>
     * ```
     */
    public static parseUnifiedArgs(args?: string[]): {
        config: OutputConfig;
        args: string[];
        parsed: ParsedOutputArgs;
    } {
        const parsed = parseOutputArgs(args);
        return {
            config: toOutputConfig(parsed),
            args: getRemainingArgs(parsed),
            parsed,
        };
    }

    /**
     * Export data using unified output configuration
     *
     * This method respects the new unified output config while providing
     * the same functionality as the legacy exportData method.
     *
     * @param data - Data to export
     * @param title - Title for markdown export
     * @param fileNamePrefix - Prefix for export file names
     * @param config - Output configuration from parseUnifiedArgs
     * @returns Promise resolving when export is complete
     */
    public static async exportWithConfig<T>(
        data: T[],
        title: string,
        fileNamePrefix: string,
        config: OutputConfig,
    ): Promise<void> {
        if (!config.shouldExport || !config.exportFormat) return;

        try {
            const exportPath = config.exportPath || domoConfig.exportPath;
            await ensureExportDir(exportPath);

            if (
                config.exportFormat === "json" ||
                config.exportFormat === "both"
            ) {
                const jsonPath = await exportToJson(data, fileNamePrefix);
                if (!config.quiet) {
                    console.log(`${title} saved to JSON: ${jsonPath}`);
                }
            }
            if (
                config.exportFormat === "md" ||
                config.exportFormat === "both"
            ) {
                const mdPath = await exportToMarkdown(
                    data,
                    title,
                    fileNamePrefix,
                );
                if (!config.quiet) {
                    console.log(`${title} saved to Markdown: ${mdPath}`);
                }
            }
        } catch (exportError) {
            log.error(`Error saving ${fileNamePrefix} to file:`, exportError);
        }
    }

    /**
     * Convert legacy ParsedArgs to unified OutputConfig
     *
     * Useful for commands migrating from the old system.
     *
     * @param parsedArgs - Legacy parsed arguments
     * @param isJsonOutput - Whether JSON output was detected
     * @returns Unified output configuration
     */
    public static toOutputConfig(
        parsedArgs: ParsedArgs,
        isJsonOutput: boolean,
    ): OutputConfig {
        const config: OutputConfig = {
            displayFormat: isJsonOutput ? "json" : "table",
            shouldExport: !!parsedArgs.saveOptions,
            quiet: false,
        };

        if (parsedArgs.saveOptions) {
            config.exportFormat = parsedArgs.saveOptions.format;
            config.exportPath = parsedArgs.saveOptions.path;
        }

        if (parsedArgs.outputOptions) {
            config.outputPath = parsedArgs.outputOptions.path;
        }

        return config;
    }
}
