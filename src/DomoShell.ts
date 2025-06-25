import inquirer from "inquirer";
import chalk from "chalk";
import { CommandFactory } from "./commands/CommandFactory.ts";
import { initializeConfig } from "./config.ts";
import { log } from "./utils/logger.ts";

/**
 * The interactive shell for Domo app
 */
export default class DomoShell {
    private running = false;
    private commandFactory: CommandFactory;

    constructor() {
        this.commandFactory = new CommandFactory((running: boolean) => {
            this.running = running;
        });
    }

    /**
     * Starts the interactive shell
     */
    public async start(): Promise<void> {
        // Set up signal handlers for graceful shutdown
        process.on("SIGINT", () => {
            console.log("\nGoodbye!");
            process.exit(0);
        });

        process.on("SIGTERM", () => {
            console.log("\nGoodbye!");
            process.exit(0);
        });
        // Initialize configuration explicitly when shell starts
        try {
            initializeConfig();
        } catch (error) {
            log.warn(
                "Failed to initialize configuration. You'll need to set credentials before using API functions.",
                error,
            );
        }

        this.running = true;

        console.log("\nWelcome to Domo Interactive Shell");
        console.log("Type 'help' to see available commands.");
        console.log("Type 'exit' to quit.\n");

        // Main shell loop
        while (this.running) {
            const { input } = await inquirer.prompt([
                {
                    type: "input",
                    name: "input",
                    message: chalk.green("domo>"),
                },
            ]);

            // Parse the input
            const args = input.trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();

            if (!commandName) continue;

            // Execute the command if it exists
            const command = this.commandFactory.getCommand(commandName);
            if (command) {
                await command.execute(args);
            } else {
                console.log(
                    `Unknown command: ${commandName}. Type 'help' for available commands.`,
                );
            }
        }
    }
}
