import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { DatasetRepository } from "../core/database/repositories/DatasetRepository";
import { DataflowRepository } from "../core/database/repositories/DataflowRepository";
import { CardRepository } from "../core/database/repositories/CardRepository";
import { UserRepository } from "../core/database/repositories/UserRepository";
import { GroupRepository } from "../core/database/repositories/GroupRepository";
import { TerminalFormatter } from "../utils/terminalFormatter";
import type { CommandResult } from "../types/outputTypes";
import chalk from "chalk";

export class DbSyncCommand extends BaseCommand {
    name = "db-sync";
    description = "Synchronize database with Domo API";

    async execute(args?: string[]): Promise<void> {
        const { config, parsed } = this.parseOutputConfig(args);

        // Parse sync options using parsed.flags
        const syncAll =
            !args ||
            args.length === 0 ||
            parsed.flags.has("--all") ||
            (!parsed.flags.has("--datasets") &&
                !parsed.flags.has("--dataflows") &&
                !parsed.flags.has("--cards") &&
                !parsed.flags.has("--users") &&
                !parsed.flags.has("--groups"));
        const syncDatasets = syncAll || parsed.flags.has("--datasets");
        const syncDataflows = syncAll || parsed.flags.has("--dataflows");
        const syncCards = syncAll || parsed.flags.has("--cards");
        const syncUsers = syncAll || parsed.flags.has("--users");
        const syncGroups = syncAll || parsed.flags.has("--groups");

        // Check if at least one entity type is selected for sync
        const syncFlags = [
            syncDatasets,
            syncDataflows,
            syncCards,
            syncUsers,
            syncGroups,
        ];
        if (!syncFlags.some(flag => flag)) {
            const message =
                "Please specify what to sync: --all, --datasets, --dataflows, --cards, --users, or --groups";
            this.outputErrorResult({ message }, () => {
                console.error(TerminalFormatter.error(message));
                this.showHelp();
            });
            return;
        }

        try {
            const db = await getDatabase();
            const results: Record<
                string,
                { success: boolean; count?: number; error?: string }
            > = {};

            if (config.displayFormat !== "json") {
                console.log(chalk.cyan("Starting database synchronization..."));
                console.log("═".repeat(50));
            }

            // Sync datasets
            if (syncDatasets) {
                if (config.displayFormat !== "json") {
                    console.log(chalk.yellow("\nSyncing datasets..."));
                }

                try {
                    const datasetRepo = new DatasetRepository(db);
                    await datasetRepo.sync(config.displayFormat === "json");
                    const count = await datasetRepo.count();
                    results.datasets = { success: true, count };

                    if (config.displayFormat !== "json") {
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

                    if (config.displayFormat !== "json") {
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
                if (config.displayFormat !== "json") {
                    console.log(chalk.yellow("\nSyncing dataflows..."));
                }

                try {
                    const dataflowRepo = new DataflowRepository(db);
                    await dataflowRepo.sync(config.displayFormat === "json");
                    const count = await dataflowRepo.count();
                    results.dataflows = { success: true, count };

                    if (config.displayFormat !== "json") {
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

                    if (config.displayFormat !== "json") {
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
                if (config.displayFormat !== "json") {
                    console.log(chalk.yellow("\nSyncing cards..."));
                }

                try {
                    const cardRepo = new CardRepository(db);
                    await cardRepo.sync(config.displayFormat === "json");
                    const count = await cardRepo.count();
                    results.cards = { success: true, count };

                    if (config.displayFormat !== "json") {
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

                    if (config.displayFormat !== "json") {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync cards: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Sync users
            if (syncUsers) {
                if (config.displayFormat !== "json") {
                    console.log(chalk.yellow("\nSyncing users..."));
                }

                try {
                    const userRepo = new UserRepository(db);
                    await userRepo.sync(config.displayFormat === "json");
                    const count = await userRepo.count();
                    results.users = { success: true, count };

                    if (config.displayFormat !== "json") {
                        console.log(
                            TerminalFormatter.success(
                                `✓ Synced ${count} users`,
                            ),
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    results.users = { success: false, error: message };

                    if (config.displayFormat !== "json") {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync users: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Sync groups
            if (syncGroups) {
                if (config.displayFormat !== "json") {
                    console.log(chalk.yellow("\nSyncing groups..."));
                }

                try {
                    const groupRepo = new GroupRepository(db);
                    await groupRepo.sync(config.displayFormat === "json");
                    const count = await groupRepo.count();
                    results.groups = { success: true, count };

                    if (config.displayFormat !== "json") {
                        console.log(
                            TerminalFormatter.success(
                                `✓ Synced ${count} groups`,
                            ),
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    results.groups = { success: false, error: message };

                    if (config.displayFormat !== "json") {
                        console.error(
                            TerminalFormatter.error(
                                `✗ Failed to sync groups: ${message}`,
                            ),
                        );
                    }
                }
            }

            // Update the database-level last sync time if any sync was successful
            const hasSuccessfulSync = Object.values(results).some(
                r => r.success,
            );
            if (hasSuccessfulSync) {
                await db.updateDatabaseLastSync();
            }

            // Get updated stats
            const stats = await db.getStats();

            // Prepare result data
            const allSuccess = Object.values(results).every(r => r.success);
            const resultData = {
                status: allSuccess ? "success" : "partial_failure",
                syncResults: results,
                database: {
                    totalEntities: stats.totalEntities,
                    totalSize: stats.totalSizeBytes,
                    totalSizeFormatted: TerminalFormatter.fileSize(
                        stats.totalSizeBytes,
                    ),
                },
            };

            // Use unified output system
            const commandResult: CommandResult<typeof resultData> = {
                success: allSuccess,
                data: resultData,
                metadata: {
                    syncedEntities: Object.keys(results).filter(
                        key => results[key].success,
                    ),
                    failedEntities: Object.keys(results).filter(
                        key => !results[key].success,
                    ),
                },
            };

            await this.output(
                commandResult,
                () => this.displaySummary(stats),
                "db-sync",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        `Failed to sync database: ${message}`,
                    ),
                );
            });
        }
    }

    /**
     * Display summary in terminal format
     */
    private displaySummary(stats: {
        totalEntities: number;
        totalSizeBytes: number;
    }): void {
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

    showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: " + chalk.cyan(this.name) + " [options]");

        console.log(chalk.yellow("\nSync Options:"));
        const syncOptionsData = [
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
                Option: "--users",
                Description: "Sync only users",
            },
            {
                Option: "--groups",
                Description: "Sync only groups",
            },
        ];
        console.log(TerminalFormatter.table(syncOptionsData));

        console.log(chalk.yellow("\nOutput Options:"));
        const outputOptionsData = [
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
        console.log(TerminalFormatter.table(outputOptionsData));

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
                Command: `${this.name} --users`,
                Description: "Sync only users",
            },
            {
                Command: `${this.name} --groups`,
                Description: "Sync only groups",
            },
            {
                Command: `${this.name} --users --groups`,
                Description: "Sync users and groups",
            },
            {
                Command: `${this.name} --all --format=json`,
                Description: "Sync all and output as JSON",
            },
            {
                Command: `${this.name} --datasets --export=md`,
                Description: "Sync datasets and export as Markdown",
            },
            {
                Command: `${this.name} --all --export=both`,
                Description: "Sync all and export both JSON and Markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    public autocomplete(partial: string): string[] {
        const flags = [
            "--all",
            "--datasets",
            "--dataflows",
            "--cards",
            "--users",
            "--groups",
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
