/**
 * Unified output type definitions for the CLI
 *
 * This module provides standardized types for all output and export operations,
 * replacing the fragmented SaveOptions/OutputOptions approach.
 */

/**
 * Display format for console output
 * - 'table': Human-readable tabular output (default)
 * - 'json': Structured JSON to stdout
 */
export type DisplayFormat = "table" | "json";

/**
 * Export format for file output
 * - 'json': Export as JSON file
 * - 'md': Export as Markdown file
 * - 'both': Export as both JSON and Markdown
 */
export type ExportFormat = "json" | "md" | "both";

/**
 * Unified configuration for all output operations
 */
export interface OutputConfig {
    /**
     * Display format for console output
     * @default 'table'
     */
    displayFormat: DisplayFormat;

    /**
     * Whether to export data to file(s)
     */
    shouldExport: boolean;

    /**
     * Format for file export (when shouldExport is true)
     */
    exportFormat?: ExportFormat;

    /**
     * Custom directory for export files
     * Uses domoConfig.exportPath when not specified
     */
    exportPath?: string;

    /**
     * Specific file path for --output flag
     * Takes precedence over export options
     */
    outputPath?: string;

    /**
     * Suppress informational messages (export confirmations, etc.)
     * @default false
     */
    quiet?: boolean;
}

/**
 * Standardized command result structure
 * Used for JSON output and internal data passing
 */
export interface CommandResult<T> {
    /**
     * Whether the command succeeded
     */
    success: boolean;

    /**
     * Command data payload (when success is true)
     */
    data?: T;

    /**
     * Error information (when success is false)
     */
    error?: {
        message: string;
        code?: string;
        details?: unknown;
    };

    /**
     * Optional metadata about the result
     */
    metadata?: Record<string, unknown>;
}

/**
 * Parsed output arguments from command line
 * Returned by OutputParser.parse()
 */
export interface ParsedOutputArgs {
    /**
     * Display format for console output
     */
    displayFormat: DisplayFormat;

    /**
     * Export configuration (if export was requested)
     */
    export?: {
        format: ExportFormat;
        path?: string;
    };

    /**
     * Specific output file path (--output flag)
     */
    output?: string;

    /**
     * Whether quiet mode is enabled
     */
    quiet: boolean;

    /**
     * Boolean flags detected (excluding output-related)
     */
    flags: Set<string>;

    /**
     * Positional arguments (non-flag arguments)
     */
    positional: string[];

    /**
     * Named parameters (--key value or key=value)
     */
    params: Record<string, string | number | boolean>;
}

/**
 * Legacy SaveOptions for backward compatibility
 * @deprecated Use OutputConfig instead
 */
export interface LegacySaveOptions {
    format: "json" | "md" | "both";
    path?: string;
}

/**
 * Legacy OutputOptions for backward compatibility
 * @deprecated Use OutputConfig instead
 */
export interface LegacyOutputOptions {
    format: "json";
    path: string;
}

/**
 * Flag aliases mapping legacy flags to new flags
 */
export const FLAG_ALIASES: Record<string, string> = {
    // Legacy save flags → export flags
    "--save": "--export",
    "--save-json": "--export=json",
    "--save-md": "--export=md",
    "--save-markdown": "--export=md",
    "--save-both": "--export=both",
    "--save-all": "--export=both",
    // Legacy path flag
    "--path": "--export-path",
};

/**
 * All output-related flags (both new and legacy)
 */
export const OUTPUT_FLAGS = new Set([
    // New unified flags
    "--format",
    "--export",
    "--export-path",
    "--output",
    "--quiet",
    "-q", // Short form of --quiet
    // Legacy flags (deprecated but supported)
    "--save",
    "--save-json",
    "--save-md",
    "--save-markdown",
    "--save-both",
    "--save-all",
    "--path",
]);

/**
 * Parameters that should be parsed as numbers
 * Shared constant to avoid duplication across parsing utilities
 */
export const NUMERIC_PARAMS = new Set([
    "limit",
    "offset",
    "page",
    "size",
    "count",
    "max",
    "min",
    "timeout",
    "interval",
    "retries",
    "delay",
    "port",
]);

/**
 * Type guard for DisplayFormat
 */
export function isDisplayFormat(value: unknown): value is DisplayFormat {
    return value === "table" || value === "json";
}

/**
 * Type guard for ExportFormat
 */
export function isExportFormat(value: unknown): value is ExportFormat {
    return value === "json" || value === "md" || value === "both";
}

/**
 * Convert OutputConfig to legacy SaveOptions (for backward compatibility)
 */
export function toLegacySaveOptions(
    config: OutputConfig,
): LegacySaveOptions | null {
    if (!config.shouldExport || !config.exportFormat) {
        return null;
    }
    return {
        format: config.exportFormat,
        path: config.exportPath,
    };
}

/**
 * Convert OutputConfig to legacy OutputOptions (for backward compatibility)
 */
export function toLegacyOutputOptions(
    config: OutputConfig,
): LegacyOutputOptions | null {
    if (!config.outputPath) {
        return null;
    }
    return {
        format: "json",
        path: config.outputPath,
    };
}
