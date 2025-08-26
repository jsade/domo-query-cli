import { ILogObj, Logger } from "tslog";

// Define the structure of _meta based on tslog's output
interface LogMeta {
    date?: Date | string;
    logLevelName?: string;
    logLevelId?: number;
    [key: string]: unknown;
}

import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

// Detect if running from pkg executable
// Check if the script is running from a snapshot (pkg compiled executable)
const isPkg =
    process.execPath.includes("snapshot") ||
    (process as unknown as Record<string, unknown>).pkg !== undefined;

// Get LOG_PATH from environment variable with smart defaults
// When running as packaged executable, use absolute path in home directory
// When running in development, use configured path or relative path
const defaultLogPath = isPkg
    ? path.join(homedir(), ".domo-cli", "logs")
    : "./logs";

// Allow absolute path override via environment variable
const configuredPath = process.env.LOG_PATH;
const logPath =
    configuredPath && path.isAbsolute(configuredPath)
        ? configuredPath
        : defaultLogPath;

// The log directory will be created in the transport function if needed

// Track if logging is disabled due to permission errors
let loggingDisabled = false;

// Create a direct file transport function based on tslog structure
const logToFile = (logObject: ILogObj) => {
    // Skip if logging has been disabled due to permission errors
    if (loggingDisabled) {
        return;
    }

    try {
        // Create log directory if needed
        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }

        const now = new Date();
        const dateStr = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const logFilePath = path.join(logPath, `domo-app-${dateStr}.log`);

        // Extract timestamp from logObject or use current time
        const meta = logObject._meta as LogMeta | undefined;
        const timestamp = meta?.date
            ? new Date(meta.date).toISOString()
            : now.toISOString();

        // Extract log level from _meta (reference shows it's in _meta)
        const logLevel = meta?.logLevelName || "INFO";

        // Extract log message from numbered keys (reference shows '0': 'Test')
        // Find all numbered keys and join their values
        let messageText = "";
        const numericKeys = Object.keys(logObject).filter(key =>
            /^\d+$/.test(key),
        );

        if (numericKeys.length > 0) {
            // Sort keys numerically
            numericKeys.sort((a, b) => parseInt(a) - parseInt(b));

            // Build message from numeric keys
            messageText = numericKeys
                .map(key => {
                    const value = logObject[key];
                    if (value instanceof Error) {
                        return `${value.message}\n${value.stack || ""}`;
                    } else if (value === null) {
                        return "null";
                    } else if (value === undefined) {
                        return "undefined";
                    } else if (typeof value === "object") {
                        try {
                            return JSON.stringify(value, null, 2);
                        } catch {
                            return "[Object]";
                        }
                    } else {
                        return String(value);
                    }
                })
                .join(" ");
        }

        // Format the log message
        const fullMessage = `${timestamp} [${logLevel}] ${messageText}\n`;

        // Append to log file (no console output)
        // Use writeFileSync with append flag for better compatibility with pkg
        fs.writeFileSync(logFilePath, fullMessage, {
            encoding: "utf8",
            flag: "a",
        });
    } catch (error: unknown) {
        // If we get a permission error, disable logging to prevent repeated errors
        const errorCode = (error as { code?: string })?.code;
        if (errorCode === "EPERM" || errorCode === "EACCES") {
            // Disable logging and show error only once
            if (!loggingDisabled) {
                loggingDisabled = true;
                // Silently fail - packaged executables may not have write permissions
                // Don't spam console with errors
            }
        }
        // For non-permission errors in development, show them
        else if (!isPkg) {
            console.error("Error writing to log file:", error);
        }
    }
};

/**
 * Application logger instance based on tslog.
 *
 * @remarks
 * Configured for file-only logging, no console output.
 * Uses LOG_PATH environment variable to write logs to filesystem.
 * Default log path is ./logs if LOG_PATH is not specified.
 * Each day gets a new log file with format domo-app-YYYY-MM-DD.log
 */
// Create a logger with hidden output
export const log = new Logger<ILogObj>({
    name: "domo-app",
    prettyLogTemplate:
        "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} [{{logLevelName}}] {{name}} {{logMessage}}",
    prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\n{{errorStack}}",
    prettyLogTimeZone: "local",
    // Set logging level and type
    minLevel: 0, // debug level
    type: "hidden", // Hide all output (no console logging)
});

// Attach file transport
log.attachTransport(logToFile);

// Log logger initialization (this will only go to file, not console)
log.info(`Logger initialized with log path: ${logPath}`);
