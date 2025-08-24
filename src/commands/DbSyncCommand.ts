import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { DatasetRepository } from "../core/database/repositories/DatasetRepository";
import { DataflowRepository } from "../core/database/repositories/DataflowRepository";
import { CardRepository } from "../core/database/repositories/CardRepository";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

export class DbSyncCommand extends BaseCommand {
    name = "db-sync";
    description = "Synchronize database with Domo API";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        // Parse sync options
        const syncAll = !args || args.length === 0 || args.includes("--all");
        const syncDatasets = syncAll || args?.includes("--datasets");
        const syncDataflows = syncAll || args?.includes("--dataflows");
        const syncCards = syncAll || args?.includes("--cards");

        if (!syncDatasets && !syncDataflows && !syncCards) {
            const message =
                "Please specify what to sync: --all, --datasets, --dataflows, or --cards";
            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(TerminalFormatter.error(message));
                this.showHelp();
            }
            return;
        }

        try {
            const db = await getDatabase();
            const results: Record<
                string,
                { success: boolean; count?: number; error?: string }
            > = {};

            if (!this.isJsonOutput) {
                console.log(chalk.cyan("Starting database synchronization..."));
                console.log("═".repeat(50));
            }

            // Sync datasets
            if (syncDatasets) {
                if (!this.isJsonOutput) {
                    console.log(chalk.yellow("\nSyncing datasets..."));
                }

                try {
                    const datasetRepo = new DatasetRepository(db);
                    await datasetRepo.sync();
                    const count = await datasetRepo.count();
                    results.datasets = { success: true, count };

                    if (!this.isJsonOutput) {
                        console.log(
                            TerminalFormatter.success(
                                `✓ Synced ${count} datasets`,
                            ),
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    results.datasets = { success: false, error: message };

                    if (!this.isJsonOutput) {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync datasets: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Sync dataflows
            if (syncDataflows) {
                if (!this.isJsonOutput) {
                    console.log(chalk.yellow("\nSyncing dataflows..."));
                }

                try {
                    const dataflowRepo = new DataflowRepository(db);
                    await dataflowRepo.sync();
                    const count = await dataflowRepo.count();
                    results.dataflows = { success: true, count };

                    if (!this.isJsonOutput) {
                        console.log(
                            TerminalFormatter.success(
                                `✓ Synced ${count} dataflows`,
                            ),
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    results.dataflows = { success: false, error: message };

                    if (!this.isJsonOutput) {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync dataflows: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Sync cards
            if (syncCards) {
                if (!this.isJsonOutput) {
                    console.log(chalk.yellow("\nSyncing cards..."));
                }

                try {
                    const cardRepo = new CardRepository(db);
                    await cardRepo.sync();
                    const count = await cardRepo.count();
                    results.cards = { success: true, count };

                    if (!this.isJsonOutput) {
                        console.log(
                            TerminalFormatter.success(
                                `✓ Synced ${count} cards`,
                            ),
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    results.cards = { success: false, error: message };

                    if (!this.isJsonOutput) {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync cards: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Get updated stats
            const stats = await db.getStats();

            if (this.isJsonOutput) {
                // JSON output
                const output = {
                    syncResults: results,
                    database: {
                        totalEntities: stats.totalEntities,
                        totalSize: stats.totalSizeBytes,
                        totalSizeFormatted: TerminalFormatter.fileSize(
                            stats.totalSizeBytes,
                        ),
                    },
                };

                const allSuccess = Object.values(results).every(r => r.success);

                if (allSuccess) {
                    console.log(JsonOutputFormatter.success(this.name, output));
                } else {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Some syncs failed",
                        ),
                    );
                }
            } else {
                // Terminal output - Summary
                console.log(chalk.cyan("\n" + "═".repeat(50)));
                console.log(chalk.cyan("Synchronization Complete"));

                const summaryData = [
                    {
                        Entity: "Total Entities",
                        Count: stats.totalEntities.toLocaleString(),
                    },
                    {
                        Entity: "Database Size",
                        Count: TerminalFormatter.fileSize(stats.totalSizeBytes),
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
                        `Failed to sync database: ${message}`,
                    ),
                );
            }
        }
    }

    showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: " + chalk.cyan(this.name) + " [options]");

        console.log(chalk.yellow("\nOptions:"));
        const optionsData = [
            {
                Option: "--all",
                Description:
                    "Sync all entity types (default if no options specified)",
            },
            {
                Option: "--datasets",
                Description: "Sync only datasets",
            },
            {
                Option: "--dataflows",
                Description: "Sync only dataflows",
            },
            {
                Option: "--cards",
                Description: "Sync only cards",
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
                Description: "Sync all entities",
            },
            {
                Command: `${this.name} --datasets`,
                Description: "Sync only datasets",
            },
            {
                Command: `${this.name} --dataflows --cards`,
                Description: "Sync dataflows and cards",
            },
            {
                Command: `${this.name} --all --format=json`,
                Description: "Sync all and output as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
