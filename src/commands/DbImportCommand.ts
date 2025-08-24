import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";
import * as fs from "fs/promises";
import { existsSync } from "fs";

export class DbImportCommand extends BaseCommand {
    name = "db-import";
    description = "Import database from a JSON file";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        // Get import path from args
        const importPath = args?.find(a => !a.startsWith("--"));

        if (!importPath) {
            const message = "Please specify the import file path";
            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(TerminalFormatter.error(message));
                this.showHelp();
            }
            return;
        }

        // Check if file exists
        if (!existsSync(importPath)) {
            const message = `File not found: ${importPath}`;
            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(TerminalFormatter.error(message));
            }
            return;
        }

        try {
            const db = await getDatabase();

            // Get stats before import
            const statsBefore = await db.getStats();

            if (!this.isJsonOutput) {
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

            if (this.isJsonOutput) {
                // JSON output
                const output = {
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
                            statsAfter.totalEntities -
                            statsBefore.totalEntities,
                    },
                    timestamp: new Date().toISOString(),
                };

                console.log(JsonOutputFormatter.success(this.name, output));
            } else {
                // Terminal output
                console.log(
                    TerminalFormatter.success(
                        `✓ Database imported successfully`,
                    ),
                );
                console.log("");

                const importData = [
                    { Property: "Import File", Value: importPath },
                    {
                        Property: "File Size",
                        Value: TerminalFormatter.fileSize(fileSize),
                    },
                    {
                        Property: "Collections Imported",
                        Value: statsAfter.collections.length.toString(),
                    },
                    {
                        Property: "Total Entities",
                        Value: statsAfter.totalEntities.toLocaleString(),
                    },
                    {
                        Property: "New Entities Added",
                        Value: (
                            statsAfter.totalEntities - statsBefore.totalEntities
                        ).toLocaleString(),
                    },
                ];
                console.log(TerminalFormatter.table(importData));

                // Show collection details
                if (statsAfter.collections.length > 0) {
                    console.log(chalk.yellow("\nImported Collections:"));
                    const collectionData = statsAfter.collections.map(col => ({
                        Collection: col.name,
                        Entities: col.count.toLocaleString(),
                        Size: TerminalFormatter.fileSize(col.sizeBytes),
                    }));
                    console.log(TerminalFormatter.table(collectionData));
                }
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            if (this.isJsonOutput) {
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error(
                        `Failed to import database: ${message}`,
                    ),
                );
            }
        }
    }

    showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: " + chalk.cyan(this.name) + " <import-path> [options]",
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
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.yellow("\nNote:"));
        console.log(
            "The import will merge with existing data. Use 'db-clear' first to replace all data.",
        );
    }
}
