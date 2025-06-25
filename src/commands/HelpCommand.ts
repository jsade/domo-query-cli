import chalk from "chalk";
import type { Command } from "../types/shellTypes";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Displays help information for available commands
 */
export class HelpCommand extends BaseCommand {
    public readonly name = "help";
    public readonly description = "Shows available commands and their options";
    private commands: Map<string, Command>;

    /**
     * Creates a new HelpCommand
     * @param commands - Map of available commands
     */
    constructor(commands: Map<string, Command>) {
        super();
        this.commands = commands;
    }

    /**
     * Executes the help command
     * @param args - Command arguments, optionally specifying which command to show help for
     */
    public async execute(args?: string[]): Promise<void> {
        const command = args && args.length > 0 ? args[0].toLowerCase() : null;

        // If specific command help is requested
        if (command && this.commands.has(command)) {
            console.log(`\nHelp for '${command}':\n`);
            this.showCommandHelp(command);
            return;
        }

        // Otherwise show general help
        this.showGeneralHelp();
    }

    /**
     * Shows help for all commands
     */
    private showGeneralHelp(): void {
        console.log(`${chalk.bold("Domo Query CLI Commands:")}`);

        // Group commands by category
        const commandGroups = this.groupCommandsByCategory();

        // Display each group
        for (const [category, commands] of commandGroups) {
            console.log(`\n${chalk.blue(TerminalFormatter.bold(category))}`);

            const commandData = commands.map(([name, cmd]) => ({
                Command: name,
                Description: cmd.description,
            }));

            try {
                console.log(
                    TerminalFormatter.table(commandData, {
                        showHeaders: false,
                        borderless: true,
                        colWidths: [26, 60],
                    }),
                );
            } catch (error) {
                console.error("Error rendering table:", error);
                // Fallback to simple display
                commandData.forEach(item => {
                    console.log(
                        `  ${item.Command.padEnd(26)} - ${item.Description}`,
                    );
                });
            }
        }

        console.log(`\n${TerminalFormatter.bold("Common Options")}`);
        const optionsData = [
            {
                Option: "--save",
                Description: "Save results to JSON file (default)",
            },
            { Option: "--save-json", Description: "Save results to JSON file" },
            {
                Option: "--save-md",
                Description: "Save results to Markdown file",
            },
            {
                Option: "--save-both",
                Description: "Save to both JSON and Markdown",
            },
            {
                Option: "--save=<format>",
                Description: "Specify format (json, md, both)",
            },
            {
                Option: "--path=<directory>",
                Description: "Specify custom export directory",
            },
        ];

        console.log(
            TerminalFormatter.table(optionsData, {
                showHeaders: false,
                borderless: true,
                colWidths: [26, 60],
            }),
        );

        console.log(
            "\nTips: help <command> for details • Tab completion available",
        );
    }

    /**
     * Groups commands by category for organized display
     */
    private groupCommandsByCategory(): Map<string, Array<[string, Command]>> {
        const groups = new Map<string, Array<[string, Command]>>();

        // Define command categories
        const categories: Record<string, string[]> = {
            "Data Exploration": [
                "list-cards",
                "list-datasets",
                "list-dataflows",
                "get-dataflow",
                "show-lineage",
                "generate-lineage-report",
            ],
            "Dataflow Operations": [
                // Dataflow management commands
                "list-dataflow-executions",
                "get-dataflow-execution",
                "execute-dataflow",
            ],
            Visualization: ["render-card"],
            "Cache Management": ["cache-status"],
            System: ["help", "clear", "exit"],
        };

        // Categorize commands
        for (const [category, commandNames] of Object.entries(categories)) {
            const categoryCommands: Array<[string, Command]> = [];
            for (const commandName of commandNames) {
                const cmd = this.commands.get(commandName);
                if (cmd) {
                    categoryCommands.push([commandName, cmd]);
                }
            }
            if (categoryCommands.length > 0) {
                groups.set(category, categoryCommands);
            }
        }

        // Add any uncategorized commands
        const categorizedCommands = new Set(Object.values(categories).flat());
        const uncategorized: Array<[string, Command]> = [];
        for (const [name, cmd] of this.commands) {
            if (!categorizedCommands.has(name)) {
                uncategorized.push([name, cmd]);
            }
        }
        if (uncategorized.length > 0) {
            groups.set("Other", uncategorized);
        }

        return groups;
    }

    /**
     * Shows detailed help for a specific command
     * @param commandName - The command to show help for
     */
    private showCommandHelp(commandName: string): void {
        const command = this.commands.get(commandName);
        if (
            command &&
            "showHelp" in command &&
            typeof command.showHelp === "function"
        ) {
            command.showHelp();
        } else {
            console.log(`No detailed help available for '${commandName}'`);
            console.log("");
        }
    }

    /**
     * Shows help for the help command itself
     */
    public showHelp(): void {
        console.log("Shows help information about available commands");
        console.log("\nUsage: help [command]");

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "command",
                Type: "string",
                Required: "No",
                Description: "Command name to get detailed help for",
            },
        ];

        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "help",
                Description: "Shows general help with all commands",
            },
            {
                Command: "help list-datasets",
                Description: "Shows detailed help for list-datasets",
            },
            {
                Command: "help show-lineage",
                Description: "Shows detailed help for show-lineage",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }
}
