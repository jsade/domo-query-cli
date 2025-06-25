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

// Get LOG_PATH from environment variable
const logPath = process.env.LOG_PATH || "./logs";

// The log directory will be created in the transport function if needed

// Create a direct file transport function based on tslog structure
const logToFile = (logObject: ILogObj) => {
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
        fs.appendFileSync(logFilePath, fullMessage, "utf8");
    } catch (error) {
        // Last resort error handling that won't break the app
        console.error("Error writing to log file:", error);
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
