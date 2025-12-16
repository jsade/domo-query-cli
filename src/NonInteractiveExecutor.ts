import { CommandFactory } from "./commands/CommandFactory.ts";
import chalk from "chalk";
import { initializeConfig } from "./config.ts";

/**
 * Handles non-interactive command execution
 */
export class NonInteractiveExecutor {
    private commandFactory: CommandFactory;
    private jsonOutput: boolean = false;

    constructor() {
        // Initialize configuration to ensure domoConfig is populated
        // This is essential for MCP server execution where the config
        // needs to be loaded from environment variables
        try {
            initializeConfig();
        } catch (error) {
            // Log warning but don't fail - some commands might not need config
            console.warn(
                "Warning: Configuration initialization failed:",
                error,
            );
        }

        // Create command factory with no-op for setRunning since we're non-interactive
        this.commandFactory = new CommandFactory(() => {});
    }

    /**
     * Parse command line arguments for non-interactive mode
     */
    public parseArgs(args: string[]): {
        command?: string;
        commandArgs: string[];
        format?: string;
        help?: boolean;
        readOnly?: boolean;
    } {
        const result: {
            command?: string;
            commandArgs: string[];
            format?: string;
            help?: boolean;
            readOnly?: boolean;
        } = {
            commandArgs: [],
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];

            if (arg === "--command" || arg === "-c") {
                if (i + 1 < args.length) {
                    result.command = args[i + 1];
                    i += 2;
                } else {
                    throw new Error("--command requires a value");
                }
            } else if (arg === "--format" || arg === "-f") {
                if (i + 1 < args.length) {
                    result.format = args[i + 1];
                    i += 2;
                } else {
                    throw new Error("--format requires a value");
                }
            } else if (arg === "--help" || arg === "-h") {
                result.help = true;
                i++;
            } else if (arg === "--read-only" || arg === "-r") {
                result.readOnly = true;
                i++;
            } else {
                // Remaining args are command arguments
                result.commandArgs = args.slice(i);
                break;
            }
        }

        return result;
    }

    /**
     * Execute a command in non-interactive mode
     */
    public async execute(
        commandString: string,
        args: string[],
        format?: string,
    ): Promise<void> {
        this.jsonOutput = format === "json";

        // Parse the command string
        // Handle multi-word commands (e.g., "list datasets" -> "list-datasets")
        const parts = commandString.split(" ");
        let commandName = parts[0];
        let commandArgs = [...parts.slice(1), ...args];

        // If the command is "list" and next arg is "datasets", combine them
        if (
            commandName === "list" &&
            parts.length > 1 &&
            parts[1] === "datasets"
        ) {
            commandName = "list-datasets";
            commandArgs = [...parts.slice(2), ...args];
        }

        // Add format flag to command args if JSON output is requested
        // This lets commands handle their own JSON formatting
        if (this.jsonOutput && !commandArgs.includes("--format")) {
            commandArgs.push("--format", "json");
        }

        // Get the command
        const command = this.commandFactory.getCommand(commandName);

        if (!command) {
            if (this.jsonOutput) {
                console.log(
                    JSON.stringify(
                        {
                            error: `Unknown command: ${commandName}`,
                            availableCommands: Array.from(
                                this.commandFactory.getAllCommands().keys(),
                            ),
                        },
                        null,
                        2,
                    ),
                );
            } else {
                console.error(chalk.red(`Unknown command: ${commandName}`));
                console.log("\nAvailable commands:");
                this.commandFactory.getAllCommands().forEach((cmd, name) => {
                    console.log(`  ${chalk.cyan(name)}: ${cmd.description}`);
                });
            }
            process.exit(1);
        }

        try {
            // Let commands handle their own JSON output
            // The commands check for --format json in their args and output proper JSON
            await command.execute(commandArgs);
        } catch (error) {
            // Commands handle their own JSON error output when --format json is passed
            // So we only need to handle non-JSON errors here
            if (!this.jsonOutput) {
                console.error(
                    chalk.red(
                        `Error executing command: ${error instanceof Error ? error.message : error}`,
                    ),
                );
            }
            process.exit(1);
        }
    }

    /**
     * Show help for non-interactive mode
     */
    public showHelp(): void {
        console.log(chalk.bold("\nDomo Query CLI - Non-Interactive Mode\n"));
        console.log("Usage: domo-query-cli [options] [command-arguments]");
        console.log("\nOptions:");
        console.log("  --command, -c <command>  Execute a specific command");
        console.log(
            "  --format, -f <format>    Output format (text|json), default: text",
        );
        console.log(
            "  --read-only, -r          Enable read-only mode (disables destructive operations)",
        );
        console.log("  --help, -h               Show this help message");
        console.log("  --version, -v            Show version information");
        console.log("\nExamples:");
        console.log("  domo-query-cli --command list-datasets");
        console.log('  domo-query-cli --command "list-datasets" --format json');
        console.log('  domo-query-cli -c "get-dataflow" 12345');
        console.log(
            '  domo-query-cli -c "show-lineage" datasetId --format json',
        );
        console.log("\nAvailable Commands:");

        // Filter out interactive-only commands
        const interactiveOnly = new Set(["exit", "clear"]);

        this.commandFactory.getAllCommands().forEach((cmd, name) => {
            if (!interactiveOnly.has(name)) {
                console.log(
                    `  ${chalk.cyan(name.padEnd(25))} ${cmd.description}`,
                );
            }
        });

        // Show interactive-only commands with note
        console.log(
            chalk.dim(
                "\nInteractive Shell Commands (not available in non-interactive mode):",
            ),
        );
        this.commandFactory.getAllCommands().forEach((cmd, name) => {
            if (interactiveOnly.has(name)) {
                console.log(
                    `  ${chalk.dim(name.padEnd(25))} ${cmd.description}`,
                );
            }
        });

        console.log("\nFor interactive mode, run without any arguments.");
    }
}
