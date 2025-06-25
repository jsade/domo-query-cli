import { BaseCommand } from "./BaseCommand";

/**
 * Clears the terminal screen
 */
export class ClearCommand extends BaseCommand {
    public readonly name = "clear";
    public readonly description = "Clears the terminal screen";

    /**
     * Executes the clear command
     */
    public async execute(): Promise<void> {
        console.clear();
    }

    /**
     * Shows help for the clear command
     */
    public showHelp(): void {
        console.log("Clears the terminal screen");
        console.log("Usage: clear");
        console.log("");
    }
}
