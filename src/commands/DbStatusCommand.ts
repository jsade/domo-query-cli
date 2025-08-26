import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { CommandUtils } from "./CommandUtils";
import { logPath } from "../utils/logger";
import chalk from "chalk";

export class DbStatusCommand extends BaseCommand {
    name = "db-status";
    description = "Display database statistics and information";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        try {
            const db = await getDatabase();
            const stats = await db.getStats();
            const dbPath = db.getDbPath();

            if (this.isJsonOutput) {
                // JSON output
                const output = {
                    paths: {
                        database: dbPath,
                        logs: logPath,
                    },
                    database: {
                        version: stats.metadata.version,
                        created: stats.metadata.createdAt,
                        updated: stats.metadata.updatedAt,
                        lastSync: stats.metadata.lastSync,
                    },
                    collections: stats.collections.map(col => ({
                        name: col.name,
                        count: col.count,
                        sizeBytes: col.sizeBytes,
                        sizeFormatted: TerminalFormatter.fileSize(
                            col.sizeBytes,
                        ),
                        lastSync: col.lastSync,
                    })),
                    summary: {
                        totalCollections: stats.collections.length,
                        totalEntities: stats.totalEntities,
                        totalSizeBytes: stats.totalSizeBytes,
                        totalSizeFormatted: TerminalFormatter.fileSize(
                            stats.totalSizeBytes,
                        ),
                    },
                };

                console.log(
                    JsonOutputFormatter.success(this.name, output, {
                        totalEntities: stats.totalEntities,
                        totalSize: stats.totalSizeBytes,
                    }),
                );
            } else {
                // Terminal output
                console.log(chalk.cyan("Database Status"));
                console.log("═".repeat(50));

                // Paths info
                console.log(chalk.yellow("\nFile Paths:"));
                const pathsInfo = [
                    { Location: "Database", Path: dbPath },
                    { Location: "Logs", Path: logPath },
                ];
                console.log(TerminalFormatter.table(pathsInfo));

                // Database info
                console.log(chalk.yellow("\nDatabase Information:"));
                const dbInfo = [
                    { Property: "Version", Value: stats.metadata.version },
                    {
                        Property: "Created",
                        Value: new Date(
                            stats.metadata.createdAt,
                        ).toLocaleString(),
                    },
                    {
                        Property: "Updated",
                        Value: new Date(
                            stats.metadata.updatedAt,
                        ).toLocaleString(),
                    },
                    {
                        Property: "Last Sync",
                        Value: stats.metadata.lastSync
                            ? new Date(stats.metadata.lastSync).toLocaleString()
                            : "Never",
                    },
                ];
                console.log(TerminalFormatter.table(dbInfo));

                // Collection statistics
                if (stats.collections.length > 0) {
                    console.log(chalk.yellow("\nCollection Statistics:"));
                    const collectionData = stats.collections.map(col => ({
                        Collection: col.name,
                        Entities: col.count.toLocaleString(),
                        Size: TerminalFormatter.fileSize(col.sizeBytes),
                        "Last Sync": col.lastSync
                            ? new Date(col.lastSync).toLocaleString()
                            : "Never",
                    }));
                    console.log(TerminalFormatter.table(collectionData));
                } else {
                    console.log(
                        chalk.gray(
                            "\nNo collections found. Run 'db-sync' to populate the database.",
                        ),
                    );
                }

                // Summary
                console.log(chalk.yellow("\nSummary:"));
                const summaryData = [
                    {
                        Metric: "Total Collections",
                        Value: stats.collections.length.toString(),
                    },
                    {
                        Metric: "Total Entities",
                        Value: stats.totalEntities.toLocaleString(),
                    },
                    {
                        Metric: "Total Size",
                        Value: TerminalFormatter.fileSize(stats.totalSizeBytes),
                    },
                ];
                console.log(TerminalFormatter.table(summaryData));

                // Tips
                console.log(chalk.gray("\nTips:"));
                console.log(
                    chalk.gray("• Use 'db-sync' to synchronize with Domo API"),
                );
                console.log(
                    chalk.gray("• Use 'db-export' to export the database"),
                );
                console.log(chalk.gray("• Use 'db-clear' to clear all data"));
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error(
                        `Failed to get database status: ${message}`,
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
                Option: "--format=json",
                Description: "Output results in JSON format",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.yellow("\nExamples:"));
        const examplesData = [
            {
                Command: this.name,
                Description: "Show database statistics",
            },
            {
                Command: `${this.name} --format=json`,
                Description: "Output stats as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
