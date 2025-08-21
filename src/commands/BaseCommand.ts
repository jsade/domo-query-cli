import type { Command } from "../types/shellTypes";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";

/**
 * Base class for all shell commands
 * Implements the Command interface and provides shared functionality
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
     */
    protected isJsonOutput: boolean = false;

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
     * Check if JSON output is requested and set the flag
     * @param args - Command line arguments
     * @returns The arguments with format flags removed
     */
    protected checkJsonOutput(args?: string[]): string[] {
        this.isJsonOutput = JsonOutputFormatter.shouldOutputJson(args);
        return JsonOutputFormatter.stripFormatArgs(args);
    }

    /**
     * Output data in JSON format if requested, otherwise use default formatting
     * @param jsonData - Data to output as JSON
     * @param defaultOutput - Function to call for default output
     */
    protected async outputData<T>(
        jsonData: T,
        defaultOutput: () => void | Promise<void>,
    ): Promise<void> {
        if (this.isJsonOutput) {
            console.log(JsonOutputFormatter.success(this.name, jsonData));
        } else {
            await defaultOutput();
        }
    }

    /**
     * Output error in JSON format if requested, otherwise use default formatting
     * @param error - Error to output
     * @param defaultOutput - Function to call for default error output
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
}
