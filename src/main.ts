import isInteractive from "is-interactive";

// Import logger with suppressed console output
import { log } from "./utils/logger.ts";
import { version } from "./version.ts";

// Interface for logger-style objects
interface LoggerOutput {
    _meta: unknown;
    [key: number]: unknown;
    [key: string]: unknown;
}

// Helper to check if an object is likely a logger output
function isLoggerOutput(obj: unknown): obj is LoggerOutput {
    return (
        obj !== null && typeof obj === "object" && "_meta" in obj && 0 in obj
    );
}

// Patch console methods to prevent tslog output
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Capture and filter console output - only allow real app output, not log JSON
console.log = function (...args: unknown[]) {
    // Check if this is a JSON object that looks like our logger output
    if (
        args.length === 1 &&
        typeof args[0] === "object" &&
        isLoggerOutput(args[0])
    ) {
        // Silently discard logger output
        return;
    }
    // Pass through regular output
    originalConsoleLog.apply(console, args);
};

// Apply similar filters to other console methods
console.info = function (...args: unknown[]) {
    if (
        args.length === 1 &&
        typeof args[0] === "object" &&
        isLoggerOutput(args[0])
    ) {
        return;
    }
    originalConsoleInfo.apply(console, args);
};

console.warn = function (...args: unknown[]) {
    if (
        args.length === 1 &&
        typeof args[0] === "object" &&
        isLoggerOutput(args[0])
    ) {
        return;
    }
    originalConsoleWarn.apply(console, args);
};

console.error = function (...args: unknown[]) {
    if (
        args.length === 1 &&
        typeof args[0] === "object" &&
        isLoggerOutput(args[0])
    ) {
        return;
    }
    originalConsoleError.apply(console, args);
};

import { selectAndStartShell } from "./shellSelector.ts";
import { NonInteractiveExecutor } from "./NonInteractiveExecutor.ts";
import { setReadOnlyMode, initializeConfig } from "./config.ts";

/**
 * Main application function.
 *
 * @remarks
 * Initializes and starts the interactive Domo shell or executes non-interactive commands.
 * Handles potential errors during execution.
 */
async function main(): Promise<void> {
    // Check for version arguments
    const args = process.argv.slice(2);
    if (args.includes("--version") || args.includes("-v")) {
        console.log(version);
        process.exit(0);
    }

    // Check for non-interactive mode
    const hasCommandFlag = args.includes("--command") || args.includes("-c");
    const hasHelpFlag = args.includes("--help") || args.includes("-h");
    const hasReadOnlyFlag = args.includes("--read-only") || args.includes("-r");

    // If there are any arguments and we're not in an interactive terminal,
    // automatically switch to non-interactive mode
    const shouldUseNonInteractive =
        hasCommandFlag || hasHelpFlag || (!isInteractive() && args.length > 0);

    if (shouldUseNonInteractive) {
        // Non-interactive mode
        const executor = new NonInteractiveExecutor();

        if (hasHelpFlag && !hasCommandFlag && args.length === 1) {
            executor.showHelp();
            process.exit(0);
        }

        try {
            // Initialize configuration first to load environment variables
            try {
                initializeConfig();
            } catch (error) {
                // Config errors are not fatal in non-interactive mode for help/version
                log.debug("Config initialization warning:", error);
            }

            // If we have direct command arguments (no --command flag),
            // parse them as a command
            if (!hasCommandFlag && !hasHelpFlag && args.length > 0) {
                // Apply read-only mode if specified
                if (hasReadOnlyFlag) {
                    setReadOnlyMode(true);
                    // Remove the read-only flag from args for command parsing
                    const readOnlyIndex = args.findIndex(
                        a => a === "--read-only" || a === "-r",
                    );
                    if (readOnlyIndex >= 0) {
                        args.splice(readOnlyIndex, 1);
                    }
                }

                // Handle multi-word commands like "list datasets" -> "list-datasets"
                let command = args[0];
                let commandArgs = args.slice(1);

                // Check if this is a multi-word command
                if (command === "list" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (
                        [
                            "datasets",
                            "dataflows",
                            "cards",
                            "pages",
                            "dataflow-executions",
                        ].includes(subCommand)
                    ) {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "get" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (
                        ["dataflow", "dataflow-execution"].includes(subCommand)
                    ) {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "show" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (subCommand === "lineage") {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "execute" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (subCommand === "dataflow") {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "render" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (subCommand === "card") {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "cache" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (subCommand === "status") {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                } else if (command === "generate" && commandArgs.length > 0) {
                    const subCommand = commandArgs[0];
                    if (subCommand === "lineage-report") {
                        command = `${command}-${subCommand}`;
                        commandArgs = commandArgs.slice(1);
                    }
                }

                await executor.execute(command, commandArgs);
                process.exit(0);
            } else {
                // Use the existing parsing logic for --command flag
                const parsedArgs = executor.parseArgs(args);

                if (parsedArgs.help) {
                    executor.showHelp();
                    process.exit(0);
                }

                // Apply read-only mode if specified via CLI flag (overrides env var)
                if (parsedArgs.readOnly) {
                    setReadOnlyMode(true);
                }

                if (parsedArgs.command) {
                    await executor.execute(
                        parsedArgs.command,
                        parsedArgs.commandArgs,
                        parsedArgs.format,
                    );
                    process.exit(0);
                } else {
                    console.error(
                        "Error: --command flag specified but no command provided",
                    );
                    executor.showHelp();
                    process.exit(1);
                }
            }
        } catch (error) {
            console.error(
                `Error: ${error instanceof Error ? error.message : error}`,
            );
            process.exit(1);
        }
    } else {
        // Interactive mode - check for read-only flag
        if (hasReadOnlyFlag) {
            setReadOnlyMode(true);
        }
        // Interactive mode
        log.info("Starting Domo Interactive Shell...");

        // Check if the session is interactive
        if (!isInteractive()) {
            console.error("This CLI tool requires an interactive terminal.");
            console.error(
                "For non-interactive use, provide a command as arguments",
            );
            console.error("Example: domo-query-cli list datasets --limit 1");
            process.exit(1);
        }

        try {
            // Start the shell with Tab Completion
            await selectAndStartShell();
        } catch (error) {
            log.error("An error occurred:", error);
            process.exit(1); // Exit with an error code
        }
    }
}

// Execute the main function
main().catch(error => {
    log.error("Unhandled exception:", error);
    process.exit(1);
});
