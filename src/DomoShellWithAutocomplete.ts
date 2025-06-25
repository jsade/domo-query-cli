import inquirer from "inquirer";
import AutocompletePrompt from "inquirer-autocomplete-prompt";
import chalk from "chalk";
import { CommandFactory } from "./commands/CommandFactory.ts";
import { initializeConfig } from "./config.ts";
import { log } from "./utils/logger.ts";

// Register the autocomplete prompt type
inquirer.registerPrompt("autocomplete", AutocompletePrompt);

/**
 * Enhanced interactive shell for Domo app with autocomplete support
 */
export default class DomoShellWithAutocomplete {
    private running = false;
    private commandFactory: CommandFactory;
    private commandHistory: string[] = [];

    constructor() {
        this.commandFactory = new CommandFactory((running: boolean) => {
            this.running = running;
        });
    }

    /**
     * Gets all available command names and their descriptions
     */
    private getCommandSuggestions(): Array<{
        name: string;
        value: string;
        description?: string;
    }> {
        const commands = this.commandFactory.getAllCommands();
        const suggestions: Array<{
            name: string;
            value: string;
            description?: string;
        }> = [];

        for (const [name, command] of commands) {
            suggestions.push({
                name: `${name.padEnd(26)} ${command.description}`,
                value: name,
                description: command.description,
            });
        }

        return suggestions.sort((a, b) => a.value.localeCompare(b.value));
    }

    /**
     * Gets parameter suggestions for a specific command
     */
    private getCommandParameterSuggestions(
        commandName: string,
    ): Array<{ name: string; value: string }> {
        const suggestions: Array<{ name: string; value: string }> = [];

        // Common options available for most commands
        const commonOptions = [
            {
                name: "--save".padEnd(26) + "Save results to JSON file",
                value: "--save",
            },
            {
                name: "--save-json".padEnd(26) + "Save results to JSON file",
                value: "--save-json",
            },
            {
                name: "--save-md".padEnd(26) + "Save results to Markdown",
                value: "--save-md",
            },
            {
                name: "--save-both".padEnd(26) + "Save to both formats",
                value: "--save-both",
            },
            {
                name: "--path=<dir>".padEnd(26) + "Custom export directory",
                value: "--path=",
            },
        ];

        // Command-specific parameters
        const commandParams: Record<
            string,
            Array<{ name: string; value: string }>
        > = {
            "list-datasets": [
                {
                    name: "limit=50".padEnd(26) + "Maximum datasets to return",
                    value: "limit=",
                },
                {
                    name: "offset=0".padEnd(26) + "Offset for pagination",
                    value: "offset=",
                },
                { name: "sort=name".padEnd(26) + "Sort order", value: "sort=" },
                {
                    name: "[search term]".padEnd(26) + "Filter by name",
                    value: "",
                },
            ],
            "list-dataflows": [
                {
                    name: "limit=50".padEnd(26) + "Maximum dataflows",
                    value: "limit=",
                },
                {
                    name: "offset=0".padEnd(26) + "Offset for pagination",
                    value: "offset=",
                },
                { name: "sort=name".padEnd(26) + "Sort field", value: "sort=" },
                {
                    name: "order=asc".padEnd(26) + "Sort direction",
                    value: "order=",
                },
                {
                    name: "tags=tag1,tag2".padEnd(26) + "Filter by tags",
                    value: "tags=",
                },
                {
                    name: "[search term]".padEnd(26) + "Filter by name",
                    value: "",
                },
            ],
            "list-cards": [
                {
                    name: "limit=35".padEnd(26) + "Maximum cards",
                    value: "limit=",
                },
                {
                    name: "offset=0".padEnd(26) + "Offset for pagination",
                    value: "offset=",
                },
            ],
            "get-dataflow": [
                {
                    name: "<dataflow-id>".padEnd(26) + "Required: Dataflow ID",
                    value: "",
                },
            ],
            "show-lineage": [
                {
                    name:
                        "<entity-id>".padEnd(26) +
                        "Required: Dataset or dataflow ID",
                    value: "",
                },
                {
                    name: "--diagram".padEnd(26) + "Generate Mermaid diagram",
                    value: "--diagram",
                },
                {
                    name:
                        "--max-depth=3".padEnd(26) +
                        "Maximum depth for diagram",
                    value: "--max-depth=",
                },
            ],
            "render-card": [
                {
                    name:
                        "<card-id>".padEnd(26) + "Optional: Card ID to render",
                    value: "",
                },
            ],
            "cache-status": [
                {
                    name: "--clear".padEnd(26) + "Clear all cached data",
                    value: "--clear",
                },
            ],
            "execute-dataflow": [
                {
                    name: "<dataflow-id>".padEnd(26) + "Required: Dataflow ID",
                    value: "",
                },
            ],
            "list-dataflow-executions": [
                {
                    name: "<dataflow-id>".padEnd(26) + "Required: Dataflow ID",
                    value: "",
                },
                {
                    name: "limit=10".padEnd(26) + "Maximum executions",
                    value: "limit=",
                },
            ],
            "get-dataflow-execution": [
                {
                    name: "<dataflow-id>".padEnd(26) + "Required: Dataflow ID",
                    value: "",
                },
                {
                    name:
                        "<execution-id>".padEnd(26) + "Required: Execution ID",
                    value: "",
                },
            ],
        };

        // Get command-specific parameters
        const params = commandParams[commandName] || [];

        // Add common options for commands that support export
        const exportCommands = [
            "list-datasets",
            "list-dataflows",
            "list-cards",
            "show-lineage",
            "get-dataflow",
        ];
        if (exportCommands.includes(commandName)) {
            suggestions.push(...params, ...commonOptions);
        } else {
            suggestions.push(...params);
        }

        return suggestions;
    }

    /**
     * Filters command suggestions based on input
     */
    private searchCommands(
        input: string,
    ): Array<{ name: string; value: string }> {
        if (!input) {
            // Show all commands if no input
            return this.getCommandSuggestions();
        }

        const trimmedInput = input.trim();
        const parts = trimmedInput.split(/\s+/);

        // Check if the first part is a valid command
        const commands = this.commandFactory.getAllCommands();
        const firstWord = parts[0].toLowerCase();

        if (commands.has(firstWord)) {
            // User typed a valid command
            const suggestions: Array<{ name: string; value: string }> = [];

            // Check if user added a space or started typing a parameter
            const hasSpace = trimmedInput.endsWith(" ") || parts.length > 1;

            if (hasSpace && parts.length > 1 && parts[1].length > 0) {
                // Filter parameters based on what they're typing
                const typedParam = parts.slice(1).join(" ");
                const params = this.getCommandParameterSuggestions(firstWord);

                const filtered = params.filter(
                    p =>
                        p.value
                            .toLowerCase()
                            .includes(typedParam.toLowerCase()) ||
                        p.name.toLowerCase().includes(typedParam.toLowerCase()),
                );

                if (filtered.length > 0) {
                    suggestions.push(
                        ...filtered.map(p => ({
                            name: p.name,
                            value: `${firstWord} ${p.value}`,
                        })),
                    );
                } else {
                    // No matches, just show what they typed
                    suggestions.push({
                        name: trimmedInput,
                        value: trimmedInput,
                    });
                }
            } else if (hasSpace) {
                // User added a space, show all parameters
                const params = this.getCommandParameterSuggestions(firstWord);

                if (params.length > 0) {
                    suggestions.push(
                        ...params.map(p => ({
                            name: p.name,
                            value: `${firstWord} ${p.value}`,
                        })),
                    );
                } else {
                    // No parameters available
                    suggestions.push({
                        name: `${firstWord} (no options available)`,
                        value: firstWord,
                    });
                }
            } else {
                // Just the command, show it with hint
                const params = this.getCommandParameterSuggestions(firstWord);
                if (params.length > 0) {
                    suggestions.push({
                        name:
                            `${firstWord}`.padEnd(26) +
                            "← add space to see options",
                        value: firstWord + " ",
                    });
                } else {
                    suggestions.push({
                        name: firstWord,
                        value: firstWord,
                    });
                }
            }

            return suggestions;
        } else {
            // Search for commands
            const suggestions = this.getCommandSuggestions();
            const searchTerm = trimmedInput.toLowerCase();

            return suggestions.filter(
                suggestion =>
                    suggestion.value.toLowerCase().includes(searchTerm) ||
                    (suggestion.description &&
                        suggestion.description
                            .toLowerCase()
                            .includes(searchTerm)),
            );
        }
    }

    /**
     * Starts the interactive shell with autocomplete
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
        // Initialize configuration
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
        console.log(
            "Start typing to search commands • Use arrow keys to navigate • Tab to autocomplete",
        );
        console.log(
            "After typing a command, continue typing to see available options",
        );
        console.log("Type 'exit' to quit\n");

        // Main shell loop
        while (this.running) {
            try {
                const { command } = await inquirer.prompt([
                    {
                        type: "autocomplete",
                        name: "command",
                        message: chalk.green("domo>"),
                        source: async (
                            _answersSoFar: unknown,
                            input: string,
                        ) => {
                            return this.searchCommands(input || "");
                        },
                        pageSize: 10,
                        emptyText: "No matching commands found",
                        suggestOnly: true,
                        validate: (input: string) => {
                            if (!input || input.trim() === "") {
                                return "Please enter a command";
                            }
                            return true;
                        },
                    },
                ]);

                // Parse the command
                const fullCommand = command.trim();
                if (!fullCommand) continue;

                // Add to history
                this.commandHistory.push(fullCommand);

                // Parse the input
                const args = fullCommand.split(/\s+/);
                const commandName = args.shift()?.toLowerCase();

                if (!commandName) continue;

                // Execute the command
                const cmd = this.commandFactory.getCommand(commandName);
                if (cmd) {
                    console.log(
                        `Executing command: ${commandName} with args:`,
                        args,
                    );
                    try {
                        await cmd.execute(args);
                    } catch (executeError) {
                        console.error(
                            `Error executing command ${commandName}:`,
                            executeError,
                        );
                    }
                } else {
                    console.log(
                        `Unknown command: ${commandName}. Type 'help' or start typing to see available commands.`,
                    );
                }
            } catch (error) {
                if (
                    error &&
                    typeof error === "object" &&
                    "name" in error &&
                    error.name === "ExitPromptError"
                ) {
                    // User pressed Ctrl+C
                    console.log("\nUse 'exit' command to quit the shell.");
                } else {
                    console.error("An error occurred:", error);
                }
            }
        }
    }
}
