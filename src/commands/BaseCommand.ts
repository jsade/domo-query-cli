import type { Command, OutputOptions, SaveOptions } from "../types/shellTypes";
import type {
    CommandResult,
    OutputConfig,
    ParsedOutputArgs,
} from "../types/outputTypes";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { writeJsonToFile } from "../utils/FileOutputWriter";
import {
    parseOutputArgs,
    toOutputConfig,
    getRemainingArgs,
} from "../utils/OutputParser";
import { exportToJson, exportToMarkdown } from "../utils/utils";
import { domoConfig } from "../config";

/**
 * Base class for all shell commands
 * Implements the Command interface and provides shared functionality
 *
 * ## Output System Overview
 *
 * Commands can output data in multiple ways:
 * 1. Console output (default table format or JSON with --format=json)
 * 2. Export to timestamped files (--export, --export=md, --export=both)
 * 3. Write to specific file (--output=<path>)
 *
 * ### Preferred Method (Unified)
 * Use `parseOutputConfig()` and `output()` for consistent behavior:
 * ```typescript
 * const { config, args } = this.parseOutputConfig(args);
 * // ... process command ...
 * await this.output({ success: true, data }, () => displayTable(data), 'my-command');
 * ```
 *
 * ### Legacy Method (Deprecated)
 * The `checkJsonOutput()` and `outputData()` methods are preserved for
 * backward compatibility but should not be used in new commands.
 */
export abstract class BaseCommand implements Command {
    /**
     * The name of the command
     */
    public abstract readonly name: string;

    /**
     * Short description of the command
     */
    public abstract readonly description: string;

    /**
     * Whether the command is currently outputting in JSON format
     * @deprecated Use outputConfig.displayFormat instead
     */
    protected isJsonOutput: boolean = false;

    /**
     * Unified output configuration for the command
     * Set by parseOutputConfig() or derived from legacy methods
     */
    protected outputConfig: OutputConfig = {
        displayFormat: "table",
        shouldExport: false,
        quiet: false,
    };

    /**
     * Executes the command
     * @param args - Command line arguments
     */
    public abstract execute(args?: string[]): Promise<void>;

    /**
     * Shows detailed help for this command
     */
    public abstract showHelp(): void;

    /**
     * Parse output configuration from command arguments (unified method)
     *
     * This is the preferred method for handling output options in commands.
     * It processes all output-related flags and returns a clean config object.
     *
     * @param args - Command line arguments
     * @returns Object containing outputConfig and remaining args
     *
     * @example
     * ```typescript
     * const { config, args: remainingArgs } = this.parseOutputConfig(args);
     * // config.displayFormat: 'table' | 'json'
     * // config.shouldExport: boolean
     * // config.exportFormat: 'json' | 'md' | 'both'
     * // config.outputPath: string | undefined
     * // remainingArgs: string[] (without output flags)
     * ```
     */
    protected parseOutputConfig(args?: string[]): {
        config: OutputConfig;
        args: string[];
        parsed: ParsedOutputArgs;
    } {
        const parsed = parseOutputArgs(args);
        const config = toOutputConfig(parsed);

        // Also set legacy properties for backward compatibility
        this.outputConfig = config;
        this.isJsonOutput = config.displayFormat === "json";

        return {
            config,
            args: getRemainingArgs(parsed),
            parsed,
        };
    }

    /**
     * Output command result using unified handling (preferred method)
     *
     * Handles all output modes:
     * - JSON to stdout (--format=json)
     * - Table to stdout (default)
     * - Export to timestamped file (--export)
     * - Write to specific file (--output=<path>)
     *
     * @param result - Command result with success/data/error
     * @param tableRenderer - Function to render data as table (called for non-JSON output)
     * @param filePrefix - Prefix for export files (e.g., 'datasets', 'dataflows')
     *
     * @example
     * ```typescript
     * await this.output(
     *   { success: true, data: datasets },
     *   () => this.displayTable(datasets),
     *   'datasets'
     * );
     * ```
     */
    protected async output<T>(
        result: CommandResult<T>,
        tableRenderer: () => void | Promise<void>,
        filePrefix: string,
    ): Promise<void> {
        const config = this.outputConfig;

        // Handle --output=<path> (takes precedence)
        if (config.outputPath) {
            await this.writeToOutputPath(result, config.outputPath);
            return;
        }

        // Handle --format=json
        if (config.displayFormat === "json") {
            this.outputJson(result);
        } else {
            // Default table output
            if (result.success && result.data !== undefined) {
                await tableRenderer();
            } else if (result.error) {
                console.error(`Error: ${result.error.message}`);
            }
        }

        // Handle --export (can work with any display format)
        if (
            config.shouldExport &&
            result.success &&
            result.data !== undefined
        ) {
            await this.exportData(result.data, filePrefix);
        }
    }

    /**
     * Output an error using unified handling
     *
     * @param error - Error information
     * @param defaultHandler - Optional custom error handler for non-JSON mode
     */
    protected outputErrorResult(
        error: { message: string; code?: string; details?: unknown },
        defaultHandler?: () => void,
    ): void {
        if (this.outputConfig.displayFormat === "json") {
            console.log(
                JsonOutputFormatter.error(
                    this.name,
                    error.message,
                    error.code,
                    error.details,
                ),
            );
        } else if (defaultHandler) {
            defaultHandler();
        } else {
            console.error(`Error: ${error.message}`);
        }
    }

    /**
     * Write result to specific output path
     */
    private async writeToOutputPath<T>(
        result: CommandResult<T>,
        outputPath: string,
    ): Promise<void> {
        const writeResult = await writeJsonToFile(
            result,
            outputPath,
            domoConfig.outputPath,
        );

        if (!this.outputConfig.quiet) {
            if (this.outputConfig.displayFormat === "json") {
                console.log(
                    JsonOutputFormatter.success(this.name, {
                        success: true,
                        filePath: writeResult.filePath,
                        bytesWritten: writeResult.bytesWritten,
                    }),
                );
            } else {
                console.log(
                    `Output written to: ${writeResult.filePath} (${writeResult.bytesWritten} bytes)`,
                );
            }
        }
    }

    /**
     * Output result as JSON to stdout
     */
    private outputJson<T>(result: CommandResult<T>): void {
        if (result.success) {
            console.log(
                JsonOutputFormatter.success(this.name, result.data, {
                    ...(result.metadata || {}),
                }),
            );
        } else {
            console.log(
                JsonOutputFormatter.error(
                    this.name,
                    result.error?.message || "Unknown error",
                    result.error?.code,
                    result.error?.details,
                ),
            );
        }
    }

    /**
     * Export data to timestamped files based on config
     */
    private async exportData<T>(data: T, filePrefix: string): Promise<void> {
        const config = this.outputConfig;
        const exportPath = config.exportPath;

        try {
            if (
                config.exportFormat === "json" ||
                config.exportFormat === "both"
            ) {
                const jsonPath = await exportToJson(
                    data,
                    filePrefix,
                    exportPath,
                );
                if (!config.quiet) {
                    console.log(`Exported to JSON: ${jsonPath}`);
                }
            }

            if (
                config.exportFormat === "md" ||
                config.exportFormat === "both"
            ) {
                // Use command name as title
                const title = this.name
                    .split("-")
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                const mdPath = await exportToMarkdown(
                    data,
                    title,
                    filePrefix,
                    exportPath,
                );
                if (!config.quiet) {
                    console.log(`Exported to Markdown: ${mdPath}`);
                }
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.error(`Export failed: ${message}`);
        }
    }

    /**
     * Check if JSON output is requested (convenience getter)
     */
    protected get isJsonMode(): boolean {
        return this.outputConfig.displayFormat === "json";
    }

    // ========================================================================
    // LEGACY METHODS (preserved for backward compatibility)
    // ========================================================================

    /**
     * Check if JSON output is requested and set the flag
     * @param args - Command line arguments
     * @returns The arguments with format flags removed
     * @deprecated Use parseOutputConfig() instead
     */
    protected checkJsonOutput(args?: string[]): string[] {
        this.isJsonOutput = JsonOutputFormatter.shouldOutputJson(args);
        this.outputConfig.displayFormat = this.isJsonOutput ? "json" : "table";
        return JsonOutputFormatter.stripFormatArgs(args);
    }

    /**
     * Output data in JSON format if requested, otherwise use default formatting
     * @param jsonData - Data to output as JSON
     * @param defaultOutput - Function to call for default output
     * @param outputOptions - Optional file output options
     * @deprecated Use output() instead
     */
    protected async outputData<T>(
        jsonData: T,
        defaultOutput: () => void | Promise<void>,
        outputOptions?: OutputOptions,
    ): Promise<void> {
        // If output options are provided, write to file
        if (outputOptions) {
            // Pass domoConfig.outputPath as basePath for admin-controlled sandboxing
            const result = await writeJsonToFile(
                jsonData,
                outputOptions.path,
                domoConfig.outputPath,
            );
            // Output success message in appropriate format
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.success(this.name, {
                        success: true,
                        filePath: result.filePath,
                        bytesWritten: result.bytesWritten,
                    }),
                );
            } else {
                console.log(
                    `Output written to: ${result.filePath} (${result.bytesWritten} bytes)`,
                );
            }
        } else if (this.isJsonOutput) {
            console.log(JsonOutputFormatter.success(this.name, jsonData));
        } else {
            await defaultOutput();
        }
    }

    /**
     * Output error in JSON format if requested, otherwise use default formatting
     * @param error - Error to output
     * @param defaultOutput - Function to call for default error output
     * @deprecated Use outputErrorResult() instead
     */
    protected outputError(
        error: Error | unknown,
        defaultOutput?: () => void,
    ): void {
        if (this.isJsonOutput) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.log(JsonOutputFormatter.error(this.name, message));
        } else if (defaultOutput) {
            defaultOutput();
        } else {
            console.error(
                `Error: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    /**
     * Convert legacy SaveOptions to export config
     * @deprecated For migration use only
     */
    protected applyLegacySaveOptions(saveOptions: SaveOptions | null): void {
        if (saveOptions) {
            this.outputConfig.shouldExport = true;
            this.outputConfig.exportFormat = saveOptions.format;
            this.outputConfig.exportPath = saveOptions.path;
        }
    }

    /**
     * Convert legacy OutputOptions to output config
     * @deprecated For migration use only
     */
    protected applyLegacyOutputOptions(
        outputOptions: OutputOptions | null,
    ): void {
        if (outputOptions) {
            this.outputConfig.outputPath = outputOptions.path;
        }
    }
}
