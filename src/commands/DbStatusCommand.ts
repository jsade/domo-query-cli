import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { logPath } from "../utils/logger";
import chalk from "chalk";
import type { CommandResult } from "../types/outputTypes";

export class DbStatusCommand extends BaseCommand {
    name = "db-status";
    description = "Display database statistics and information";

    async execute(args?: string[]): Promise<void> {
        try {
            const { config: _config } = this.parseOutputConfig(args);

            const db = await getDatabase();
            const stats = await db.getStats();
            const dbPath = db.getDbPath();

            // Structure data for unified output system
            const data = {
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
                    sizeFormatted: TerminalFormatter.fileSize(col.sizeBytes),
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

            // Build metadata
            const metadata = {
                totalEntities: stats.totalEntities,
                totalSize: stats.totalSizeBytes,
            };

            const result: CommandResult<typeof data> = {
                success: true,
                data,
                metadata,
            };

            // Use unified output system
            await this.output(
                result,
                () => this.displayTerminalOutput(dbPath, stats),
                "db-status",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        `Failed to get database status: ${message}`,
                    ),
                );
            });
        }
    }

    /**
     * Display terminal formatted output
     */
    private displayTerminalOutput(
        dbPath: string,
        stats: Awaited<
            ReturnType<Awaited<ReturnType<typeof getDatabase>>["getStats"]>
        >,
    ): void {
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
                Value: new Date(stats.metadata.createdAt).toLocaleString(),
            },
            {
                Property: "Updated",
                Value: new Date(stats.metadata.updatedAt).toLocaleString(),
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
        console.log(chalk.gray("• Use 'db-sync' to synchronize with Domo API"));
        console.log(chalk.gray("• Use 'db-export' to export the database"));
        console.log(chalk.gray("• Use 'db-clear' to clear all data"));
    }

    showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: " + chalk.cyan(this.name) + " [options]");

        console.log(chalk.yellow("\nOptions:"));
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
                Command: this.name,
                Description: "Show database statistics",
            },
            {
                Command: `${this.name} --format=json`,
                Description: "Output stats as JSON to stdout",
            },
            {
                Command: `${this.name} --export`,
                Description: "Export to timestamped JSON file",
            },
            {
                Command: `${this.name} --format=json --export`,
                Description: "Output JSON to stdout AND save to file",
            },
            {
                Command: `${this.name} --export=md`,
                Description: "Export as Markdown",
            },
            {
                Command: `${this.name} --export=both`,
                Description: "Export both JSON and Markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
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
