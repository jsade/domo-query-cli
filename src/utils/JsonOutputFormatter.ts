/**
 * Utility class for formatting consistent JSON output across all commands
 */
export class JsonOutputFormatter {
    /**
     * Create a successful JSON response
     */
    public static success<T>(
        command: string,
        data: T,
        metadata?: {
            count?: number;
            pagination?: {
                offset: number;
                limit: number;
                hasMore?: boolean;
            };
            [key: string]: unknown;
        },
    ): string {
        const response = {
            success: true,
            command,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                ...metadata,
            },
        };
        return JSON.stringify(response, null, 2);
    }

    /**
     * Create an error JSON response
     */
    public static error(
        command: string,
        message: string,
        code?: string,
        details?: unknown,
        metadata?: Record<string, unknown>,
    ): string {
        const response = {
            success: false,
            command,
            error: {
                message,
                code: code || "UNKNOWN_ERROR",
                ...(details !== undefined ? { details } : {}),
            },
            metadata: {
                timestamp: new Date().toISOString(),
                ...metadata,
            },
        };
        return JSON.stringify(response, null, 2);
    }

    /**
     * Format raw data as JSON without wrapper (for backward compatibility)
     */
    public static raw<T>(data: T): string {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Check if output should be in JSON format based on args
     */
    public static shouldOutputJson(args?: string[]): boolean {
        if (!args) return false;

        // Check for --format json or --format=json
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === "--format" && i + 1 < args.length) {
                return args[i + 1].toLowerCase() === "json";
            }
            if (arg.startsWith("--format=")) {
                return arg.split("=")[1].toLowerCase() === "json";
            }
        }
        return false;
    }

    /**
     * Remove format arguments from args array
     */
    public static stripFormatArgs(args?: string[]): string[] {
        if (!args) return [];

        const result: string[] = [];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            const arg = args[i];
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
}
