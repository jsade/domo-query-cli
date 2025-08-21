import { CommandFactory } from "./commands/CommandFactory.ts";
import chalk from "chalk";

/**
 * Handles non-interactive command execution
 */
export class NonInteractiveExecutor {
    private commandFactory: CommandFactory;
    private jsonOutput: boolean = false;

    constructor() {
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
            // Capture console output if JSON format is requested
            if (this.jsonOutput) {
                const originalLog = console.log;
                const originalError = console.error;
                const output: string[] = [];
                const errors: string[] = [];

                console.log = (...args: unknown[]) => {
                    output.push(args.map(a => String(a)).join(" "));
                };
                console.error = (...args: unknown[]) => {
                    errors.push(args.map(a => String(a)).join(" "));
                };

                try {
                    await command.execute(commandArgs);

                    // Restore console and output JSON
                    console.log = originalLog;
                    console.error = originalError;

                    console.log(
                        JSON.stringify(
                            {
                                success: true,
                                command: commandName,
                                output: output.join("\n"),
                                errors:
                                    errors.length > 0
                                        ? errors.join("\n")
                                        : undefined,
                            },
                            null,
                            2,
                        ),
                    );
                } catch (error) {
                    // Restore console
                    console.log = originalLog;
                    console.error = originalError;

                    console.log(
                        JSON.stringify(
                            {
                                success: false,
                                command: commandName,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                                output:
                                    output.length > 0
                                        ? output.join("\n")
                                        : undefined,
                                errors:
                                    errors.length > 0
                                        ? errors.join("\n")
                                        : undefined,
                            },
                            null,
                            2,
                        ),
                    );
                    process.exit(1);
                }
            } else {
                // Normal execution
                await command.execute(commandArgs);
            }
        } catch (error) {
            if (this.jsonOutput) {
                console.log(
                    JSON.stringify(
                        {
                            success: false,
                            command: commandName,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                        null,
                        2,
                    ),
                );
            } else {
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

        this.commandFactory.getAllCommands().forEach((cmd, name) => {
            console.log(`  ${chalk.cyan(name.padEnd(25))} ${cmd.description}`);
        });

        console.log("\nFor interactive mode, run without any arguments.");
    }
}
