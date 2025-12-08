import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import type { CommandResult } from "../types/outputTypes";
import chalk from "chalk";
import * as fs from "fs/promises";
import { existsSync } from "fs";

/**
 * Import result data structure
 */
interface DbImportResult {
    importPath: string;
    fileSize: number;
    fileSizeFormatted: string;
    before: {
        collections: number;
        totalEntities: number;
    };
    after: {
        collections: number;
        totalEntities: number;
    };
    imported: {
        collections: number;
        entities: number;
    };
    timestamp: string;
    collections: Array<{
        name: string;
        count: number;
        sizeBytes: number;
    }>;
}

/**
 * Command to import database from a JSON file
 */
export class DbImportCommand extends BaseCommand {
    name = "db-import";
    description = "Import database from a JSON file";

    /**
     * Executes the db-import command
     * @param args - Command arguments
     */
    async execute(args?: string[]): Promise<void> {
        const { config, parsed } = this.parseOutputConfig(args);

        // Get import path from positional args
        const importPath = parsed.positional[0];

        if (!importPath) {
            this.outputErrorResult(
                { message: "Please specify the import file path" },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            "Please specify the import file path",
                        ),
                    );
                    this.showHelp();
                },
            );
            return;
        }

        // Check if file exists
        if (!existsSync(importPath)) {
            this.outputErrorResult(
                { message: `File not found: ${importPath}` },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            `File not found: ${importPath}`,
                        ),
                    );
                },
            );
            return;
        }

        try {
            const db = await getDatabase();

            // Get stats before import
            const statsBefore = await db.getStats();

            if (config.displayFormat !== "json") {
                console.log(
                    chalk.cyan(`Importing database from ${importPath}...`),
                );
            }

            // Get file stats
            const fileStats = await fs.stat(importPath);
            const fileSize = fileStats.size;

            // Import database
            await db.import(importPath);

            // Get stats after import
            const statsAfter = await db.getStats();

            // Build result data
            const resultData: DbImportResult = {
                importPath: importPath,
                fileSize: fileSize,
                fileSizeFormatted: TerminalFormatter.fileSize(fileSize),
                before: {
                    collections: statsBefore.collections.length,
                    totalEntities: statsBefore.totalEntities,
                },
                after: {
                    collections: statsAfter.collections.length,
                    totalEntities: statsAfter.totalEntities,
                },
                imported: {
                    collections:
                        statsAfter.collections.length -
                        statsBefore.collections.length,
                    entities:
                        statsAfter.totalEntities - statsBefore.totalEntities,
                },
                timestamp: new Date().toISOString(),
                collections: statsAfter.collections,
            };

            const result: CommandResult<DbImportResult> = {
                success: true,
                data: resultData,
                metadata: {
                    command: this.name,
                    timestamp: resultData.timestamp,
                },
            };

            // Use unified output system
            await this.output(
                result,
                () => this.displayTerminalOutput(resultData),
                "db-import",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult(
                { message: `Failed to import database: ${message}` },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            `Failed to import database: ${message}`,
                        ),
                    );
                },
            );
        }
    }

    /**
     * Display import results in terminal format
     */
    private displayTerminalOutput(resultData: DbImportResult): void {
        console.log(
            TerminalFormatter.success(`✓ Database imported successfully`),
        );
        console.log("");

        const importData = [
            { Property: "Import File", Value: resultData.importPath },
            {
                Property: "File Size",
                Value: resultData.fileSizeFormatted,
            },
            {
                Property: "Collections Imported",
                Value: resultData.after.collections.toString(),
            },
            {
                Property: "Total Entities",
                Value: resultData.after.totalEntities.toLocaleString(),
            },
            {
                Property: "New Entities Added",
                Value: resultData.imported.entities.toLocaleString(),
            },
        ];
        console.log(TerminalFormatter.table(importData));

        // Show collection details
        if (resultData.collections.length > 0) {
            console.log(chalk.yellow("\nImported Collections:"));
            const collectionData = resultData.collections.map(col => ({
                Collection: col.name,
                Entities: col.count.toLocaleString(),
                Size: TerminalFormatter.fileSize(col.sizeBytes),
            }));
            console.log(TerminalFormatter.table(collectionData));
        }
    }

    /**
     * Shows help for the db-import command
     */
    showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: " + chalk.cyan(this.name) + " <import-path> [options]",
        );

        console.log(chalk.yellow("\nOptions:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
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
                Description: "Custom export directory for result",
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
                Command: `${this.name} ./backup.json`,
                Description: "Import from backup file",
            },
            {
                Command: `${this.name} /path/to/export.json`,
                Description: "Import from specific path",
            },
            {
                Command: `${this.name} ./data.json --format=json`,
                Description: "Import and output details as JSON",
            },
            {
                Command: `${this.name} ./data.json --export=md`,
                Description: "Import and export report to Markdown",
            },
            {
                Command: `${this.name} ./data.json --format=json --export`,
                Description: "Output JSON to stdout AND save to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.yellow("\nNote:"));
        console.log(
            "The import will merge with existing data. Use 'db-clear' first to replace all data.",
        );
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
