import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";
import * as readline from "readline";

export class DbClearCommand extends BaseCommand {
    name = "db-clear";
    description = "Clear database contents";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        // Check for force flag
        const force = args?.includes("--force") || false;

        // Parse what to clear
        const clearAll =
            args?.includes("--all") ||
            !args ||
            args.filter(a => !a.startsWith("--")).length === 0;
        const collections = args?.filter(a => !a.startsWith("--")) || [];

        try {
            const db = await getDatabase();

            // Get current stats before clearing
            const statsBefore = await db.getStats();

            // Confirm with user unless force flag is set
            if (!force && !this.isJsonOutput) {
                const confirmed = await this.confirmAction(
                    clearAll
                        ? "Are you sure you want to clear ALL database contents?"
                        : `Are you sure you want to clear: ${collections.join(", ")}?`,
                );

                if (!confirmed) {
                    console.log(chalk.yellow("Operation cancelled"));
                    return;
                }
            }

            // Perform clearing
            const clearedCollections: string[] = [];

            if (clearAll) {
                await db.clearAll();
                clearedCollections.push("all");

                if (!this.isJsonOutput) {
                    console.log(
                        TerminalFormatter.success(
                            "✓ Cleared all database contents",
                        ),
                    );
                }
            } else {
                for (const collection of collections) {
                    try {
                        await db.clear(collection);
                        clearedCollections.push(collection);

                        if (!this.isJsonOutput) {
                            console.log(
                                TerminalFormatter.success(
                                    `✓ Cleared collection: ${collection}`,
                                ),
                            );
                        }
                    } catch (error) {
                        const message =
                            error instanceof Error
                                ? error.message
                                : "Unknown error";

                        if (!this.isJsonOutput) {
                            console.error(
                                TerminalFormatter.error(
                                    `✗ Failed to clear ${collection}: ${message}`,
                                ),
                            );
                        }
                    }
                }
            }

            // Get stats after clearing
            const statsAfter = await db.getStats();

            if (this.isJsonOutput) {
                // JSON output
                const output = {
                    cleared: clearedCollections,
                    before: {
                        totalEntities: statsBefore.totalEntities,
                        totalSize: statsBefore.totalSizeBytes,
                    },
                    after: {
                        totalEntities: statsAfter.totalEntities,
                        totalSize: statsAfter.totalSizeBytes,
                    },
                    removed: {
                        entities:
                            statsBefore.totalEntities -
                            statsAfter.totalEntities,
                        bytes:
                            statsBefore.totalSizeBytes -
                            statsAfter.totalSizeBytes,
                    },
                };

                console.log(JsonOutputFormatter.success(this.name, output));
            } else {
                // Terminal output - Summary
                console.log(chalk.cyan("\n" + "═".repeat(50)));
                console.log(chalk.cyan("Clear Operation Complete"));

                const summaryData = [
                    {
                        Metric: "Entities Removed",
                        Value: (
                            statsBefore.totalEntities - statsAfter.totalEntities
                        ).toLocaleString(),
                    },
                    {
                        Metric: "Space Freed",
                        Value: TerminalFormatter.fileSize(
                            statsBefore.totalSizeBytes -
                                statsAfter.totalSizeBytes,
                        ),
                    },
                    {
                        Metric: "Remaining Entities",
                        Value: statsAfter.totalEntities.toLocaleString(),
                    },
                ];
                console.log(TerminalFormatter.table(summaryData));
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error(
                        `Failed to clear database: ${message}`,
                    ),
                );
            }
        }
    }

    private async confirmAction(message: string): Promise<boolean> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise(resolve => {
            rl.question(chalk.yellow(`${message} (yes/no): `), answer => {
                rl.close();
                resolve(
                    answer.toLowerCase() === "yes" ||
                        answer.toLowerCase() === "y",
                );
            });
        });
    }

    showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: " + chalk.cyan(this.name) + " [collections...] [options]",
        );

        console.log(chalk.yellow("\nOptions:"));
        const optionsData = [
            {
                Option: "--all",
                Description:
                    "Clear all collections (default if no collections specified)",
            },
            {
                Option: "--force",
                Description: "Skip confirmation prompt",
            },
            {
                Option: "--format=json",
                Description: "Output results in JSON format",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.yellow("\nExamples:"));
        const examplesData = [
            {
                Command: this.name,
                Description: "Clear all collections (with confirmation)",
            },
            {
                Command: `${this.name} datasets`,
                Description: "Clear only datasets collection",
            },
            {
                Command: `${this.name} dataflows cards`,
                Description: "Clear dataflows and cards collections",
            },
            {
                Command: `${this.name} --all --force`,
                Description: "Clear all without confirmation",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(
            chalk.red("\n⚠️  Warning: This operation cannot be undone!"),
        );
    }
}
