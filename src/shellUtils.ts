import { SaveOptions } from "./types/shellTypes";
import { log } from "./utils/logger.ts";
import { ExportFileFormat } from "./utils/utils.ts";

/**
 * Parse command arguments for save options
 * @param args - Command arguments array
 * @returns Tuple of [remaining args, save options]
 */
export function parseSaveOptions(
    args: string[],
): [string[], SaveOptions | null] {
    let saveOptions: SaveOptions | null = null;
    const remainingArgs: string[] = [];

    // Default format when --save is specified without format
    const defaultFormat: SaveOptions["format"] = "json";

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--save") {
            // Basic --save with default format
            saveOptions = { format: defaultFormat };
        } else if (arg === "--save-json") {
            saveOptions = { format: "json" };
        } else if (arg === "--save-md" || arg === "--save-markdown") {
            saveOptions = { format: "md" };
        } else if (arg === "--save-all" || arg === "--save-both") {
            saveOptions = { format: "both" };
        } else if (arg.startsWith("--save=")) {
            // Format specified like --save=json or --save=md
            const format = arg.slice(7).toLowerCase();
            if (
                format === "json" ||
                format === "md" ||
                format === "markdown" ||
                format === "both" ||
                format === "all"
            ) {
                saveOptions = {
                    format:
                        format === "markdown"
                            ? "md"
                            : format === "all"
                              ? "both"
                              : (format as ExportFileFormat),
                };
            } else {
                log.warn(
                    `Unknown save format: ${format}, defaulting to ${defaultFormat}`,
                );
                saveOptions = { format: defaultFormat };
            }
        } else if (arg.startsWith("--path=") && saveOptions) {
            // Custom path like --path=/custom/path
            saveOptions.path = arg.slice(7);
        } else {
            // Not a save option, keep as a regular argument
            remainingArgs.push(arg);
        }
    }

    return [remainingArgs, saveOptions];
}
