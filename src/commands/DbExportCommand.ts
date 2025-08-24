import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";
import * as fs from "fs/promises";

export class DbExportCommand extends BaseCommand {
    name = "db-export";
    description = "Export database to a JSON file";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        // Get export path from args
        const exportPath = args?.find(a => !a.startsWith("--"));

        try {
            const db = await getDatabase();

            if (!this.isJsonOutput) {
                console.log(chalk.cyan("Exporting database..."));
            }

            // Export database
            const filePath = await db.export(exportPath);

            // Get file stats
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Get database stats
            const dbStats = await db.getStats();

            if (this.isJsonOutput) {
                // JSON output
                const output = {
                    exportPath: filePath,
                    fileSize: fileSize,
                    fileSizeFormatted: TerminalFormatter.fileSize(fileSize),
                    exported: {
                        collections: dbStats.collections.length,
                        totalEntities: dbStats.totalEntities,
                    },
                    timestamp: new Date().toISOString(),
                };

                console.log(JsonOutputFormatter.success(this.name, output));
            } else {
                // Terminal output
                console.log(
                    TerminalFormatter.success(
                        `✓ Database exported successfully`,
                    ),
                );
                console.log("");

                const exportData = [
                    { Property: "Export File", Value: filePath },
                    {
                        Property: "File Size",
                        Value: TerminalFormatter.fileSize(fileSize),
                    },
                    {
                        Property: "Collections",
                        Value: dbStats.collections.length.toString(),
                    },
                    {
                        Property: "Total Entities",
                        Value: dbStats.totalEntities.toLocaleString(),
                    },
                ];
                console.log(TerminalFormatter.table(exportData));

                console.log(
                    chalk.gray(
                        "\nTip: Use 'db-import' to restore from this export",
                    ),
                );
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error(
                        `Failed to export database: ${message}`,
                    ),
                );
            }
        }
    }

    showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: " + chalk.cyan(this.name) + " [export-path] [options]",
        );

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
                Description: "Export to current directory with timestamp",
            },
            {
                Command: `${this.name} /path/to/backup.json`,
                Description: "Export to specific file",
            },
            {
                Command: `${this.name} ./my-backup.json --format=json`,
                Description: "Export and output details as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
