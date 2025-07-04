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

/**
 * Main application function.
 *
 * @remarks
 * Initializes and starts the interactive Domo shell.
 * Handles potential errors during execution.
 */
async function main(): Promise<void> {
    // Check for version arguments
    const args = process.argv.slice(2);
    if (args.includes("--version") || args.includes("-v")) {
        console.log(version);
        process.exit(0);
    }

    log.info("Starting Domo Interactive Shell...");

    // Check if the session is interactive
    if (!isInteractive()) {
        console.error("This CLI tool requires an interactive terminal.");
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

// Execute the main function
main().catch(error => {
    log.error("Unhandled exception:", error);
    process.exit(1);
});
