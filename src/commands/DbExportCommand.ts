import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import chalk from "chalk";
import * as fs from "fs/promises";

/**
 * Export database to a JSON file
 *
 * This command exports the local database cache to a JSON file.
 * Note: The positional argument specifies WHERE to export the database,
 * while --export flags control WHERE to export the command's result.
 */
export class DbExportCommand extends BaseCommand {
    name = "db-export";
    description = "Export database to a JSON file";

    /**
     * Executes the db-export command
     * @param args - Command arguments (first positional is export path for database)
     */
    async execute(args?: string[]): Promise<void> {
        const { config, parsed } = this.parseOutputConfig(args);

        // Get export path from positional argument
        // This is WHERE to export the database JSON file
        const dbExportPath = parsed.positional[0];

        try {
            const db = await getDatabase();

            if (config.displayFormat !== "json") {
                console.log(chalk.cyan("Exporting database..."));
            }

            // Export database to file
            const filePath = await db.export(dbExportPath);

            // Get file stats
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Get database stats
            const dbStats = await db.getStats();

            // Prepare result data
            interface DbExportData {
                exportPath: string;
                fileSize: number;
                fileSizeFormatted: string;
                exported: {
                    collections: number;
                    totalEntities: number;
                };
                timestamp: string;
            }

            const exportData: DbExportData = {
                exportPath: filePath,
                fileSize: fileSize,
                fileSizeFormatted: TerminalFormatter.fileSize(fileSize),
                exported: {
                    collections: dbStats.collections.length,
                    totalEntities: dbStats.totalEntities,
                },
                timestamp: new Date().toISOString(),
            };

            // Use unified output system
            await this.output(
                { success: true, data: exportData },
                () => this.displaySuccess(exportData),
                "db-export",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult(
                { message: `Failed to export database: ${message}` },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            `Failed to export database: ${message}`,
                        ),
                    );
                },
            );
        }
    }

    /**
     * Display success message and export details in table format
     */
    private displaySuccess(exportData: {
        exportPath: string;
        fileSize: number;
        fileSizeFormatted: string;
        exported: { collections: number; totalEntities: number };
    }): void {
        console.log(
            TerminalFormatter.success(`✓ Database exported successfully`),
        );
        console.log("");

        const tableData = [
            { Property: "Export File", Value: exportData.exportPath },
            {
                Property: "File Size",
                Value: exportData.fileSizeFormatted,
            },
            {
                Property: "Collections",
                Value: exportData.exported.collections.toString(),
            },
            {
                Property: "Total Entities",
                Value: exportData.exported.totalEntities.toLocaleString(),
            },
        ];
        console.log(TerminalFormatter.table(tableData));

        console.log(
            chalk.gray("\nTip: Use 'db-import' to restore from this export"),
        );
    }

    /**
     * Shows help for the db-export command
     */
    showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: " + chalk.cyan(this.name) + " [export-path] [options]",
        );

        console.log(chalk.yellow("\nArguments:"));
        const argsData = [
            {
                Argument: "export-path",
                Description:
                    "Optional path where to export database JSON (default: timestamped file)",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.yellow("\nOutput Options:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output result as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export result to timestamped JSON file",
            },
            {
                Option: "--export=md",
                Description: "Export result as Markdown",
            },
            {
                Option: "--export=both",
                Description: "Export result in both formats",
            },
            {
                Option: "--export-path=<dir>",
                Description: "Custom directory for result export files",
            },
            {
                Option: "--output=<path>",
                Description: "Write result to specific file",
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
                Description:
                    "Export database to current directory with timestamp",
            },
            {
                Command: `${this.name} /path/to/backup.json`,
                Description: "Export database to specific file",
            },
            {
                Command: `${this.name} ./my-backup.json --format=json`,
                Description:
                    "Export database and output result details as JSON",
            },
            {
                Command: `${this.name} --export=md`,
                Description:
                    "Export database and save result summary as Markdown",
            },
            {
                Command: `${this.name} backup.json --export=both`,
                Description:
                    "Export database to backup.json and save result in both formats",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.yellow("\nNotes:"));
        console.log(
            "  • The first argument specifies WHERE to export the database file",
        );
        console.log(
            "  • The --export flags control WHERE to save the command's result/status",
        );
        console.log("  • Both work independently and serve different purposes");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
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
