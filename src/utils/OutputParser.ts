/**
 * Unified output argument parser for the CLI
 *
 * This module provides centralized parsing of all output-related command line arguments,
 * replacing the fragmented parseSaveOptions/parseOutputOptions approach.
 */

import {
    type ExportFormat,
    FLAG_ALIASES,
    NUMERIC_PARAMS,
    type OutputConfig,
    type ParsedOutputArgs,
    isExportFormat,
} from "../types/outputTypes";
import { log } from "./logger";

/**
 * Parses command line arguments for output configuration
 *
 * Handles both new unified flags and legacy aliases:
 * - New: --format, --export, --export-path, --output, --quiet
 * - Legacy: --save, --save-json, --save-md, --save-both, --path
 *
 * @param args - Command line arguments
 * @returns Parsed output arguments
 */
export function parseOutputArgs(args?: string[]): ParsedOutputArgs {
    const result: ParsedOutputArgs = {
        displayFormat: "table",
        quiet: false,
        flags: new Set(),
        positional: [],
        params: {},
    };

    if (!args || args.length === 0) {
        return result;
    }

    // First pass: normalize legacy aliases
    const normalizedArgs = normalizeAliases(args);

    // Second pass: parse all arguments
    let i = 0;
    while (i < normalizedArgs.length) {
        const arg = normalizedArgs[i];
        const consumed = parseArgument(arg, normalizedArgs, i, result);
        i += consumed;
    }

    return result;
}

/**
 * Normalize legacy flag aliases to new flags
 */
function normalizeAliases(args: string[]): string[] {
    const result: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // Check for direct alias match
        if (FLAG_ALIASES[arg]) {
            result.push(FLAG_ALIASES[arg]);
            continue;
        }

        // Check for --path=value format
        if (arg.startsWith("--path=")) {
            const value = arg.slice(7);
            result.push(`--export-path=${value}`);
            continue;
        }

        // Check for --save=format
        if (arg.startsWith("--save=")) {
            const format = arg.slice(7).toLowerCase();
            const normalizedFormat = normalizeExportFormat(format);
            result.push(`--export=${normalizedFormat}`);
            continue;
        }

        result.push(arg);
    }

    return result;
}

/**
 * Normalize export format strings
 */
function normalizeExportFormat(format: string): ExportFormat {
    switch (format) {
        case "markdown":
            return "md";
        case "all":
            return "both";
        case "json":
        case "md":
        case "both":
            return format as ExportFormat;
        default:
            log.warn(`Unknown export format: ${format}, defaulting to json`);
            return "json";
    }
}

/**
 * Parse a single argument and update the result
 * @returns Number of arguments consumed (1 or 2)
 */
function parseArgument(
    arg: string,
    args: string[],
    index: number,
    result: ParsedOutputArgs,
): number {
    // Handle --format flag
    if (arg === "--format") {
        if (index + 1 < args.length && !args[index + 1].startsWith("-")) {
            const format = args[index + 1].toLowerCase();
            if (format === "json") {
                result.displayFormat = "json";
            }
            // 'table' is default, ignore other values
            return 2;
        }
        return 1;
    }

    if (arg.startsWith("--format=")) {
        const format = arg.slice(9).toLowerCase();
        if (format === "json") {
            result.displayFormat = "json";
        }
        return 1;
    }

    // Handle --export flag
    if (arg === "--export") {
        // Check if next arg is a format value
        if (
            index + 1 < args.length &&
            !args[index + 1].startsWith("-") &&
            isExportFormat(args[index + 1].toLowerCase())
        ) {
            result.export = {
                format: args[index + 1].toLowerCase() as ExportFormat,
            };
            return 2;
        }
        // --export without value means json
        result.export = { format: "json" };
        return 1;
    }

    if (arg.startsWith("--export=")) {
        const format = arg.slice(9).toLowerCase();
        result.export = { format: normalizeExportFormat(format) };
        return 1;
    }

    // Handle --export-path flag
    if (arg === "--export-path") {
        if (index + 1 < args.length && !args[index + 1].startsWith("-")) {
            if (result.export) {
                result.export.path = args[index + 1];
            } else {
                // --export-path without --export implies --export
                result.export = { format: "json", path: args[index + 1] };
            }
            return 2;
        }
        log.warn("--export-path requires a directory path");
        return 1;
    }

    if (arg.startsWith("--export-path=")) {
        const path = arg.slice(14);
        if (result.export) {
            result.export.path = path;
        } else {
            result.export = { format: "json", path };
        }
        return 1;
    }

    // Handle --output flag
    if (arg === "--output") {
        if (index + 1 < args.length && !args[index + 1].startsWith("-")) {
            result.output = args[index + 1];
            return 2;
        }
        log.warn("--output requires a file path");
        return 1;
    }

    if (arg.startsWith("--output=")) {
        const path = arg.slice(9);
        if (path) {
            result.output = path;
        } else {
            log.warn("--output requires a file path");
        }
        return 1;
    }

    // Handle --quiet flag
    if (arg === "--quiet" || arg === "-q") {
        result.quiet = true;
        return 1;
    }

    // Handle other --key or --key=value flags
    if (arg.startsWith("--")) {
        const flagContent = arg.slice(2);

        if (flagContent.includes("=")) {
            const [key, ...valueParts] = flagContent.split("=");
            const value = valueParts.join("=");
            result.params[key] = parseValue(value, key);
        } else if (
            index + 1 < args.length &&
            !args[index + 1].startsWith("-")
        ) {
            // --key value format
            result.params[flagContent] = parseValue(
                args[index + 1],
                flagContent,
            );
            return 2;
        } else {
            // Boolean flag
            result.flags.add(flagContent);
            result.params[flagContent] = true;
        }
        return 1;
    }

    // Handle key=value format (backward compatibility)
    if (arg.includes("=") && !arg.startsWith("-")) {
        const [key, ...valueParts] = arg.split("=");
        const value = valueParts.join("=");
        result.params[key] = parseValue(value, key);
        return 1;
    }

    // Positional argument
    result.positional.push(arg);
    return 1;
}

/**
 * Parse a string value to appropriate type
 */
function parseValue(value: string, key: string): string | number | boolean {
    // Check for boolean
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;

    // Only convert to number for known numeric parameters
    if (NUMERIC_PARAMS.has(key.toLowerCase())) {
        const num = Number(value);
        if (!isNaN(num) && value !== "") {
            return num;
        }
    }

    return value;
}

/**
 * Convert ParsedOutputArgs to OutputConfig
 *
 * OutputConfig is used internally by commands for output handling,
 * while ParsedOutputArgs is the raw parsing result.
 */
export function toOutputConfig(parsed: ParsedOutputArgs): OutputConfig {
    return {
        displayFormat: parsed.displayFormat,
        shouldExport: !!parsed.export,
        exportFormat: parsed.export?.format,
        exportPath: parsed.export?.path,
        outputPath: parsed.output,
        quiet: parsed.quiet,
    };
}

/**
 * Get remaining arguments with output flags stripped
 *
 * Useful for commands that need to pass arguments to other functions
 * without the output-related flags.
 */
export function getRemainingArgs(parsed: ParsedOutputArgs): string[] {
    const args: string[] = [...parsed.positional];

    // Add params back as --key=value
    for (const [key, value] of Object.entries(parsed.params)) {
        if (typeof value === "boolean" && value) {
            args.push(`--${key}`);
        } else if (typeof value !== "boolean") {
            args.push(`--${key}=${value}`);
        }
    }

    return args;
}

/**
 * Check if JSON output is requested
 * Convenience function for backward compatibility
 */
export function isJsonOutput(args?: string[]): boolean {
    const parsed = parseOutputArgs(args);
    return parsed.displayFormat === "json";
}

/**
 * Strip output format arguments from args array
 * Convenience function for backward compatibility
 */
export function stripFormatArgs(args?: string[]): string[] {
    if (!args) return [];

    const result: string[] = [];
    let skipNext = false;

    for (let i = 0; i < args.length; i++) {
        if (skipNext) {
            skipNext = false;
            continue;
        }

        const arg = args[i];

        // Skip format arguments
        if (arg === "--format") {
            skipNext = true;
            continue;
        }
        if (arg.startsWith("--format=")) {
            continue;
        }

        result.push(arg);
    }

    return result;
}
