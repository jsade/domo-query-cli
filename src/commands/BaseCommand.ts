import type { Command } from "../types/shellTypes";

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
     * Executes the command
     * @param args - Command line arguments
     */
    public abstract execute(args?: string[]): Promise<void>;

    /**
     * Shows detailed help for this command
     */
    public abstract showHelp(): void;
}
