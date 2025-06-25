import { BaseCommand } from "./BaseCommand";

/**
 * Exits the shell
 */
export class ExitCommand extends BaseCommand {
    public readonly name = "exit";
    public readonly description = "Exits the shell";
    private setRunning: (running: boolean) => void;

    /**
     * Creates a new ExitCommand
     * @param setRunning - Function to change the shell's running state
     */
    constructor(setRunning: (running: boolean) => void) {
        super();
        this.setRunning = setRunning;
    }

    /**
     * Executes the exit command
     */
    public async execute(): Promise<void> {
        this.setRunning(false);
        console.log("Goodbye!");
    }

    /**
     * Shows help for the exit command
     */
    public showHelp(): void {
        console.log("Exits the interactive shell");
        console.log("Usage: exit");
        console.log("");
    }
}
