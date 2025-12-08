import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import type { CommandResult } from "../types/outputTypes";
import chalk from "chalk";
import * as readline from "readline";

/**
 * Clear database contents
 */
export class DbClearCommand extends BaseCommand {
    name = "db-clear";
    description = "Clear database contents";

    async execute(args?: string[]): Promise<void> {
        const { config, parsed } = this.parseOutputConfig(args);

        // Check for force flag
        const force = parsed.flags.has("--force");

        // Parse what to clear
        const clearAll =
            parsed.flags.has("--all") || parsed.positional.length === 0;
        const collections = parsed.positional;

        try {
            const db = await getDatabase();

            // Get current stats before clearing
            const statsBefore = await db.getStats();

            // Confirm with user unless force flag is set or JSON mode
            if (!force && config.displayFormat !== "json") {
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

                if (config.displayFormat !== "json") {
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

                        if (config.displayFormat !== "json") {
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

                        if (config.displayFormat !== "json") {
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

            // Build result data
            const resultData = {
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
                        statsBefore.totalEntities - statsAfter.totalEntities,
                    bytes:
                        statsBefore.totalSizeBytes - statsAfter.totalSizeBytes,
                },
            };

            const result: CommandResult<typeof resultData> = {
                success: true,
                data: resultData,
            };

            // Use unified output system
            await this.output(
                result,
                () => {
                    // Terminal output - Summary
                    console.log(chalk.cyan("\n" + "═".repeat(50)));
                    console.log(chalk.cyan("Clear Operation Complete"));

                    const summaryData = [
                        {
                            Metric: "Entities Removed",
                            Value: (
                                statsBefore.totalEntities -
                                statsAfter.totalEntities
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
                },
                "db-clear",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        `Failed to clear database: ${message}`,
                    ),
                );
            });
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
                Description: "Output as JSON to stdout",
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

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
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
                Command: `${this.name} users`,
                Description: "Clear users collection",
            },
            {
                Command: `${this.name} groups`,
                Description: "Clear groups collection",
            },
            {
                Command: `${this.name} users groups`,
                Description: "Clear both users and groups collections",
            },
            {
                Command: `${this.name} --all --force`,
                Description: "Clear all without confirmation",
            },
            {
                Command: `${this.name} --format=json`,
                Description: "Clear with JSON output",
            },
            {
                Command: `${this.name} datasets --export`,
                Description: "Clear datasets and export results",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(
            chalk.red("\n⚠️  Warning: This operation cannot be undone!"),
        );
    }

    public autocomplete(partial: string): string[] {
        const flags = [
            "--all",
            "--force",
            // Unified output flags
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
