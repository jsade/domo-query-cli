import chalk from "chalk";
import * as readline from "readline";
import { CommandFactory } from "./commands/CommandFactory.ts";
import { initializeConfig, isReadOnlyMode } from "./config.ts";
import { getReadOnlyModeMessage } from "./utils/readOnlyGuard.ts";
import { log } from "./utils/logger.ts";
import { version } from "./version.ts";

/**
 * Interactive shell for Domo app with traditional tab completion
 */
export default class DomoShellWithTabComplete {
    private running = false;
    private commandFactory: CommandFactory;
    private rl: readline.Interface;
    private commandHistory: string[] = [];

    constructor() {
        this.commandFactory = new CommandFactory((running: boolean) => {
            this.running = running;
        });

        // Create readline interface
        const prompt = isReadOnlyMode()
            ? chalk.yellow("domo [read-only]> ")
            : chalk.green("domo> ");

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: prompt,
            completer: this.completer.bind(this),
            historySize: 100,
        });
    }

    /**
     * Tab completion function
     */
    private completer(line: string): [string[], string] {
        const parts = line.trim().split(/\s+/);
        const commands = Array.from(
            this.commandFactory.getAllCommands().keys(),
        );

        if (parts.length === 1) {
            // Complete command names
            const matches = commands.filter(cmd => cmd.startsWith(parts[0]));
            return [matches, parts[0]];
        } else {
            // Complete command parameters
            const commandName = parts[0];
            const currentParam = parts[parts.length - 1];

            // If user is typing a value (has = in it), don't autocomplete
            if (currentParam.includes("=") && currentParam.split("=")[1]) {
                // User is typing a value, don't interfere
                return [[], line];
            }

            // Get parameter suggestions for this command
            const paramSuggestions = this.getParameterCompletions(
                commandName,
                currentParam,
            );

            if (paramSuggestions.length > 0) {
                // Show suggestions as hints, not completions
                return [paramSuggestions, currentParam];
            }

            return [[], line];
        }
    }

    /**
     * Get parameter completions for a command
     */
    private getParameterCompletions(
        commandName: string,
        partial: string,
    ): string[] {
        // Check if user is already typing a parameter with a value
        if (partial.includes("=")) {
            // Don't suggest anything, let them complete the value
            return [];
        }

        // Command-specific parameters
        const commandParams: Record<string, string[]> = {
            "list-datasets": [
                "limit=",
                "offset=",
                "sort=name",
                "sort=nameDescending",
                "sort=lastTouched",
                "sort=lastUpdated",
                "--save",
                "--save-json",
                "--save-md",
                "--save-both",
                "--path=",
            ],
            "list-dataflows": [
                "limit=",
                "offset=",
                "sort=",
                "order=",
                "tags=",
                "--save",
                "--save-json",
                "--save-md",
                "--save-both",
                "--path=",
            ],
            "list-cards": [
                "limit=",
                "offset=",
                "--save",
                "--save-json",
                "--save-md",
                "--save-both",
                "--path=",
            ],
            "show-lineage": [
                "--diagram",
                "--max-depth=",
                "--save",
                "--save-json",
                "--save-md",
                "--save-both",
                "--path=",
            ],
            "cache-status": ["--clear"],
            "render-card": ["--path="],
            "get-dataflow": [
                "--save",
                "--save-json",
                "--save-md",
                "--save-both",
                "--path=",
            ],
            "list-dataflow-executions": ["limit="],
        };

        const params = commandParams[commandName] || [];

        // Filter based on partial input
        return params.filter(param => param.startsWith(partial));
    }

    /**
     * Starts the interactive shell
     */
    public async start(): Promise<void> {
        // Set up signal handlers for graceful shutdown
        process.on("SIGTERM", () => {
            console.log("\nGoodbye!");
            this.rl.close();
            process.exit(0);
        });
        // Initialize configuration
        try {
            initializeConfig();
        } catch (error) {
            console.log(
                chalk.red(
                    "Failed to initialize configuration. Please set your credentials.",
                ),
            );
            log.warn(
                "Failed to initialize configuration. You'll need to set credentials before using API functions.",
                error,
            );
        }

        this.running = true;

        console.log(
            chalk.green(`\nWelcome to Domo Interactive Shell v${version} 🪶`),
        );
        console.log(
            chalk.gray("Type 'help' for command list, 'exit' to quit\n"),
        );

        // Show read-only mode message if enabled
        if (isReadOnlyMode()) {
            console.log(getReadOnlyModeMessage());
            console.log("");
        }

        // Set up line event handler
        this.rl.on("line", async input => {
            const trimmedInput = input.trim();

            if (!trimmedInput) {
                this.rl.prompt();
                return;
            }

            // Add to history
            this.commandHistory.push(trimmedInput);

            // Parse command and arguments
            const args = trimmedInput.split(/\s+/);
            const commandName = args.shift()?.toLowerCase();

            if (!commandName) {
                this.rl.prompt();
                return;
            }

            // Execute command
            const command = this.commandFactory.getCommand(commandName);
            if (command) {
                try {
                    await command.execute(args);
                } catch (error) {
                    console.error(
                        `Error executing command ${commandName}:`,
                        error,
                    );
                }
            } else {
                console.log(
                    `Unknown command: ${commandName}. Type 'help' for available commands.`,
                );
            }

            if (this.running) {
                this.rl.prompt();
            } else {
                this.rl.close();
            }
        });

        // Set up close event handler
        this.rl.on("close", () => {
            console.log("\nGoodbye!");
            process.exit(0);
        });

        // Set up SIGINT handler (Ctrl+C)
        let sigintCount = 0;
        this.rl.on("SIGINT", () => {
            sigintCount++;
            if (sigintCount === 1) {
                console.log('\n(To exit, type "exit" or press Ctrl+C again)');
                this.rl.prompt();
                // Reset count after 2 seconds
                setTimeout(() => {
                    sigintCount = 0;
                }, 2000);
            } else {
                console.log("\nGoodbye!");
                this.rl.close();
                process.exit(0);
            }
        });

        // Set up completion display event
        this.rl.on("line", () => {
            // This ensures the prompt is shown after command execution
        });

        // Override the default completion display to show options nicely
        const originalWrite = process.stdout.write.bind(process.stdout);
        (
            process.stdout as unknown as { write: typeof process.stdout.write }
        ).write = function (
            chunk: string | Buffer,
            encoding?: BufferEncoding | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): boolean {
            // Check if this is readline showing completions
            if (
                typeof chunk === "string" &&
                chunk.includes("\n") &&
                chunk.split("\n").length > 2
            ) {
                const lines = chunk
                    .split("\n")
                    .filter((line: string) => line.trim());
                if (
                    lines.length > 1 &&
                    lines.every((line: string) => !line.includes("domo>"))
                ) {
                    // This looks like completion output
                    //console.log("\nAvailable options:");
                    const options = lines
                        .map((line: string) => line.trim())
                        .filter(Boolean);

                    // Format in columns
                    const columnWidth =
                        Math.max(...options.map(opt => opt.length)) + 4;
                    const columns =
                        Math.floor(
                            (process.stdout.columns || 80) / columnWidth,
                        ) || 1;

                    for (let i = 0; i < options.length; i += columns) {
                        const row = options.slice(i, i + columns);
                        console.log(
                            row.map(opt => opt.padEnd(columnWidth)).join(""),
                        );
                    }

                    // Return true but don't write the original chunk
                    return true;
                }
            }

            // For normal output, use the original write
            if (typeof encoding === "function") {
                callback = encoding;
                encoding = undefined;
            }
            return originalWrite(chunk, encoding, callback);
        };

        // Start the prompt
        this.rl.prompt();
    }
}
