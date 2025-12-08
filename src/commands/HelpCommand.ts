import chalk from "chalk";
import type { Command } from "../types/shellTypes";
import type { CommandResult } from "../types/outputTypes";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { isReadOnlyMode } from "../config";

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
        try {
            const { config: _config, parsed } = this.parseOutputConfig(args);

            // Extract command name from remaining args
            const commandName =
                parsed.positional && parsed.positional.length > 0
                    ? parsed.positional[0].toLowerCase()
                    : null;

            // If specific command help is requested
            if (commandName && this.commands.has(commandName)) {
                const commandHelp = this.getCommandHelpData(commandName);

                const result: CommandResult<typeof commandHelp> = {
                    success: true,
                    data: commandHelp,
                    metadata: {
                        command: commandName,
                    },
                };

                await this.output(
                    result,
                    () => this.displayCommandHelp(commandName),
                    `help-${commandName}`,
                );
            } else {
                // General help
                const generalHelp = this.getGeneralHelpData();

                const result: CommandResult<typeof generalHelp> = {
                    success: true,
                    data: generalHelp,
                    metadata: {
                        totalCommands: this.commands.size,
                    },
                };

                await this.output(
                    result,
                    () => this.displayGeneralHelp(),
                    "help",
                );
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        `Failed to display help: ${message}`,
                    ),
                );
            });
        }
    }

    /**
     * Gets structured general help data for JSON output
     */
    private getGeneralHelpData() {
        const commandGroups = this.groupCommandsByCategory();

        // Build commands array by category
        const commands: Array<{
            name: string;
            description: string;
            category: string;
        }> = [];

        for (const [category, categoryCommands] of commandGroups) {
            for (const [name, cmd] of categoryCommands) {
                commands.push({
                    name,
                    description: cmd.description,
                    category,
                });
            }
        }

        return {
            commands,
            commonOptions: [
                {
                    option: "--format=json",
                    description: "Output as JSON to stdout",
                },
                {
                    option: "--export",
                    description: "Export to timestamped JSON file",
                },
                {
                    option: "--export=md",
                    description: "Export as Markdown file",
                },
                {
                    option: "--export=both",
                    description: "Export both JSON and Markdown",
                },
                {
                    option: "--export-path=<dir>",
                    description: "Custom export directory",
                },
                {
                    option: "--output=<path>",
                    description: "Write to specific file",
                },
                {
                    option: "--quiet",
                    description: "Suppress export messages",
                },
            ],
            legacyAliases: [
                { flag: "--save", mapsTo: "--export" },
                { flag: "--save-json", mapsTo: "--export=json" },
                { flag: "--save-md", mapsTo: "--export=md" },
                { flag: "--save-both", mapsTo: "--export=both" },
                { flag: "--path", mapsTo: "--export-path" },
            ],
            readOnlyMode: {
                active: isReadOnlyMode(),
                message: isReadOnlyMode()
                    ? "Read-only mode is currently active. All destructive operations are disabled."
                    : "Enable with DOMO_READ_ONLY=true environment variable or --read-only CLI flag",
            },
        };
    }

    /**
     * Gets structured help data for a specific command
     */
    private getCommandHelpData(commandName: string) {
        const command = this.commands.get(commandName);

        if (
            !command ||
            !("showHelp" in command) ||
            typeof command.showHelp !== "function"
        ) {
            return {
                command: commandName,
                description: command?.description || "No description available",
                helpAvailable: false,
                message: `No detailed help available for '${commandName}'`,
            };
        }

        // For commands with showHelp, provide basic info
        // The command's own showHelp will be called for terminal display
        return {
            command: commandName,
            description: command.description,
            helpAvailable: true,
            message: `Detailed help for '${commandName}'`,
        };
    }

    /**
     * Display general help in terminal format
     */
    private displayGeneralHelp(): void {
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

        console.log(`\n${TerminalFormatter.bold("Output Options")}`);
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            {
                Option: "--export=md",
                Description: "Export as Markdown file",
            },
            {
                Option: "--export=both",
                Description: "Export both JSON and Markdown",
            },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            {
                Option: "--quiet",
                Description: "Suppress export messages",
            },
        ];

        console.log(
            TerminalFormatter.table(optionsData, {
                showHeaders: false,
                borderless: true,
                colWidths: [26, 60],
            }),
        );

        console.log(`\n${chalk.dim("Legacy Aliases (still supported)")}`);
        const legacyData = [
            { Option: "--save", Description: "→ --export" },
            { Option: "--save-json", Description: "→ --export=json" },
            { Option: "--save-md", Description: "→ --export=md" },
            { Option: "--save-both", Description: "→ --export=both" },
            { Option: "--path", Description: "→ --export-path" },
        ];

        console.log(
            TerminalFormatter.table(legacyData, {
                showHeaders: false,
                borderless: true,
                colWidths: [26, 60],
            }),
        );

        // Show read-only mode information if active
        if (isReadOnlyMode()) {
            console.log(`\n${chalk.yellow.bold("Read-Only Mode")}`);
            console.log(
                chalk.yellow(
                    "  🔒 Read-only mode is currently active. All destructive operations are disabled.\n" +
                        "  To disable: Unset DOMO_READ_ONLY environment variable or restart without --read-only flag.",
                ),
            );
        } else {
            console.log(`\n${chalk.dim("Read-Only Mode")}`);
            console.log(
                chalk.dim(
                    "  Enable with DOMO_READ_ONLY=true environment variable or --read-only CLI flag",
                ),
            );
        }

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
     * Display detailed help for a specific command in terminal format
     * @param commandName - The command to show help for
     */
    private displayCommandHelp(commandName: string): void {
        console.log(`\nHelp for '${commandName}':\n`);

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
        console.log("\nUsage: " + chalk.cyan("help [command] [options]"));

        console.log(chalk.yellow("\nParameters:"));
        const paramsData = [
            {
                Parameter: "command",
                Type: "string",
                Required: "No",
                Description: "Command name to get detailed help for",
            },
        ];

        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.yellow("\nOutput Options:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output help as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            {
                Option: "--export=md",
                Description: "Export as Markdown",
            },
            {
                Option: "--export=both",
                Description: "Export both formats",
            },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            {
                Option: "--quiet",
                Description: "Suppress export messages",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.yellow("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

        console.log(chalk.yellow("\nExamples:"));
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
                Command: "help --format=json",
                Description: "Output general help as JSON",
            },
            {
                Command: "help list-datasets --format=json",
                Description: "Output specific command help as JSON",
            },
            {
                Command: "help --export",
                Description: "Export help to timestamped JSON file",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        // If partial looks like a command name (no dashes), suggest command names
        if (!partial.startsWith("-")) {
            const commandNames = Array.from(this.commands.keys());
            return commandNames.filter(name => name.startsWith(partial));
        }

        // Otherwise suggest output flags
        const flags = [
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy flags
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
