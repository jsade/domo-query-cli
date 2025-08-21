import { isReadOnlyMode } from "../config.ts";
import chalk from "chalk";

/**
 * Error thrown when a destructive operation is attempted in read-only mode
 */
export class ReadOnlyError extends Error {
    constructor(operation: string) {
        super(`Operation '${operation}' is not allowed in read-only mode`);
        this.name = "ReadOnlyError";
    }
}

/**
 * Guards against destructive operations when in read-only mode
 * @param operation - The name of the operation being attempted
 * @throws ReadOnlyError if read-only mode is enabled
 */
export function checkReadOnlyMode(operation: string): void {
    if (isReadOnlyMode()) {
        console.error(chalk.red(`\n❌ Operation blocked: ${operation}`));
        console.error(
            chalk.yellow(
                "This operation is not allowed in read-only mode.\n" +
                    "To disable read-only mode, either:\n" +
                    "  1. Unset the DOMO_READ_ONLY environment variable\n" +
                    "  2. Restart the CLI without the --read-only flag\n",
            ),
        );
        throw new ReadOnlyError(operation);
    }
}

/**
 * Returns a user-friendly message for read-only mode
 * @returns A formatted message string
 */
export function getReadOnlyModeMessage(): string {
    return chalk.yellow(
        "🔒 Read-Only Mode Active - Destructive operations are disabled",
    );
}
