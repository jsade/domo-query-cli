import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { homedir } from "os";
import { TerminalFormatter } from "../utils/terminalFormatter";
import chalk from "chalk";

/**
 * Database repair result structure
 */
interface RepairResult {
    databasePath: string;
    filesChecked: number;
    corruptedFound: number;
    repaired: number;
    skipped: number;
    operations: Array<{
        file: string;
        status: "valid" | "corrupted" | "repaired" | "skipped";
        details?: string;
    }>;
    verification: {
        success: boolean;
        totalEntities?: number;
        totalCollections?: number;
        error?: string;
    };
}

/**
 * Repair corrupted database files by recovering from temporary files
 */
export class DbRepairCommand extends BaseCommand {
    name = "db-repair";
    description =
        "Repair corrupted database files by recovering from temporary files";

    showHelp(): void {
        console.log(
            "Repair corrupted database files by recovering from temporary files.",
        );

        console.log("\nUsage: db-repair [--force] [options]");

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--force",
                Description: "Apply repairs automatically without confirmation",
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

        console.log(chalk.cyan("\nWhat This Command Does:"));
        const actionsData = [
            { Action: "Check all database files for corruption" },
            { Action: "Recover data from .tmp files when available" },
            { Action: "Clean up orphaned temporary files" },
            { Action: "Verify database integrity after repairs" },
        ];

        console.log(TerminalFormatter.table(actionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "db-repair",
                Description: "Check and report issues (dry run)",
            },
            {
                Command: "db-repair --force",
                Description: "Apply all possible repairs",
            },
            {
                Command: "db-repair --format=json",
                Description: "Output repair results as JSON",
            },
            {
                Command: "db-repair --force --export",
                Description: "Repair and save results to file",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));
    }

    async execute(args?: string[]): Promise<void> {
        const { config, parsed } = this.parseOutputConfig(args);
        const forceRepair = parsed.flags.has("--force");

        if (config.displayFormat !== "json") {
            console.log("Starting database repair...\n");
        }

        try {
            // Get database path
            const basePath =
                process.env.DOMO_DB_PATH ||
                path.join(homedir(), ".domo-cli", "db");
            const dbPath = path.join(basePath, "default");

            // Check if database directory exists
            if (!fsSync.existsSync(dbPath)) {
                const result: RepairResult = {
                    databasePath: dbPath,
                    filesChecked: 0,
                    corruptedFound: 0,
                    repaired: 0,
                    skipped: 0,
                    operations: [],
                    verification: {
                        success: false,
                        error: "Database directory not found",
                    },
                };

                await this.output(
                    { success: false, data: result },
                    () => {
                        console.log(
                            "Database directory not found. Nothing to repair.",
                        );
                    },
                    "db-repair",
                );
                return;
            }

            // Find all JSON files and their corresponding .tmp files
            const files = await fs.readdir(dbPath);
            const jsonFiles = files.filter(
                f => f.endsWith(".json") && !f.endsWith(".tmp.json"),
            );
            const tmpFiles = files.filter(f => f.endsWith(".json.tmp"));

            let repairedCount = 0;
            let corruptedCount = 0;
            let skippedCount = 0;
            const operations: RepairResult["operations"] = [];

            if (config.displayFormat !== "json") {
                console.log(
                    `Found ${jsonFiles.length} database files and ${tmpFiles.length} temporary files.\n`,
                );
            }

            // Check each JSON file
            for (const file of jsonFiles) {
                const filePath = path.join(dbPath, file);
                const tmpPath = `${filePath}.tmp`;
                const hasTmp = fsSync.existsSync(tmpPath);

                if (config.displayFormat !== "json") {
                    console.log(`Checking ${file}...`);
                }

                try {
                    const content = await fs.readFile(filePath, "utf-8");

                    // Check if file is empty
                    if (content.trim() === "") {
                        if (config.displayFormat !== "json") {
                            console.log(
                                `  ${chalk.red("[ERROR]")} File is empty`,
                            );
                        }
                        corruptedCount++;

                        if (hasTmp) {
                            if (config.displayFormat !== "json") {
                                console.log(`  [INFO] Found temporary file`);
                            }
                            const repaired = await this.repairFile(
                                filePath,
                                tmpPath,
                                forceRepair,
                                config.displayFormat !== "json",
                            );
                            if (repaired) {
                                repairedCount++;
                                operations.push({
                                    file,
                                    status: "repaired",
                                    details: "Recovered from temporary file",
                                });
                            } else {
                                skippedCount++;
                                operations.push({
                                    file,
                                    status: "skipped",
                                    details: "Use --force to apply repair",
                                });
                            }
                        } else {
                            if (config.displayFormat !== "json") {
                                console.log(
                                    `  ${chalk.yellow("[WARN]")} No temporary file available for recovery`,
                                );
                            }
                            operations.push({
                                file,
                                status: "corrupted",
                                details: "No temporary file available",
                            });
                        }
                    } else {
                        // Try to parse JSON
                        try {
                            JSON.parse(content);
                            if (config.displayFormat !== "json") {
                                console.log(
                                    `  ${chalk.green("[OK]")} File is valid`,
                                );
                            }
                            operations.push({
                                file,
                                status: "valid",
                            });

                            // Clean up tmp file if main file is valid
                            if (hasTmp) {
                                try {
                                    await fs.unlink(tmpPath);
                                    if (config.displayFormat !== "json") {
                                        console.log(
                                            `  [INFO] Removed unnecessary temporary file`,
                                        );
                                    }
                                } catch {
                                    if (config.displayFormat !== "json") {
                                        console.log(
                                            `  ${chalk.yellow("[WARN]")} Could not remove temporary file`,
                                        );
                                    }
                                }
                            }
                        } catch {
                            if (config.displayFormat !== "json") {
                                console.log(
                                    `  ${chalk.red("[ERROR]")} File contains invalid JSON`,
                                );
                            }
                            corruptedCount++;

                            if (hasTmp) {
                                if (config.displayFormat !== "json") {
                                    console.log(
                                        `  [INFO] Found temporary file`,
                                    );
                                }
                                const repaired = await this.repairFile(
                                    filePath,
                                    tmpPath,
                                    forceRepair,
                                    config.displayFormat !== "json",
                                );
                                if (repaired) {
                                    repairedCount++;
                                    operations.push({
                                        file,
                                        status: "repaired",
                                        details:
                                            "Recovered from temporary file",
                                    });
                                } else {
                                    skippedCount++;
                                    operations.push({
                                        file,
                                        status: "skipped",
                                        details: "Use --force to apply repair",
                                    });
                                }
                            } else {
                                if (config.displayFormat !== "json") {
                                    console.log(
                                        `  ${chalk.yellow("[WARN]")} No temporary file available for recovery`,
                                    );
                                }
                                operations.push({
                                    file,
                                    status: "corrupted",
                                    details: "No temporary file available",
                                });
                            }
                        }
                    }
                } catch (error) {
                    if (config.displayFormat !== "json") {
                        console.log(
                            `  ${chalk.red("[ERROR]")} Could not read file: ${error}`,
                        );
                    }
                    corruptedCount++;

                    if (hasTmp) {
                        if (config.displayFormat !== "json") {
                            console.log(`  [INFO] Found temporary file`);
                        }
                        const repaired = await this.repairFile(
                            filePath,
                            tmpPath,
                            forceRepair,
                            config.displayFormat !== "json",
                        );
                        if (repaired) {
                            repairedCount++;
                            operations.push({
                                file,
                                status: "repaired",
                                details: "Recovered from temporary file",
                            });
                        } else {
                            skippedCount++;
                            operations.push({
                                file,
                                status: "skipped",
                                details: "Use --force to apply repair",
                            });
                        }
                    } else {
                        operations.push({
                            file,
                            status: "corrupted",
                            details: `Read error: ${error}`,
                        });
                    }
                }

                if (config.displayFormat !== "json") {
                    console.log();
                }
            }

            // Check for orphaned tmp files
            for (const tmpFile of tmpFiles) {
                const baseName = tmpFile.replace(".tmp", "");
                if (!jsonFiles.includes(baseName)) {
                    if (config.displayFormat !== "json") {
                        console.log(
                            `Found orphaned temporary file: ${tmpFile}`,
                        );
                    }

                    if (forceRepair) {
                        const tmpPath = path.join(dbPath, tmpFile);
                        const targetPath = path.join(dbPath, baseName);

                        try {
                            const content = await fs.readFile(tmpPath, "utf-8");
                            JSON.parse(content); // Validate JSON

                            await fs.writeFile(targetPath, content, "utf-8");
                            if (config.displayFormat !== "json") {
                                console.log(
                                    `  ${chalk.green("[OK]")} Restored from orphaned temporary file`,
                                );
                            }
                            repairedCount++;
                            operations.push({
                                file: baseName,
                                status: "repaired",
                                details:
                                    "Restored from orphaned temporary file",
                            });

                            try {
                                await fs.unlink(tmpPath);
                            } catch {
                                // Ignore cleanup errors
                            }
                        } catch {
                            if (config.displayFormat !== "json") {
                                console.log(
                                    `  ${chalk.yellow("[WARN]")} Orphaned file contains invalid data`,
                                );
                            }
                            operations.push({
                                file: baseName,
                                status: "corrupted",
                                details: "Orphaned file contains invalid data",
                            });
                        }
                    } else {
                        if (config.displayFormat !== "json") {
                            console.log(
                                `  [INFO] Use --force to restore from orphaned files`,
                            );
                        }
                        skippedCount++;
                        operations.push({
                            file: baseName,
                            status: "skipped",
                            details:
                                "Use --force to restore from orphaned file",
                        });
                    }

                    if (config.displayFormat !== "json") {
                        console.log();
                    }
                }
            }

            // Try to initialize database to verify it works
            let verification: RepairResult["verification"] = {
                success: false,
            };

            if (config.displayFormat !== "json") {
                console.log("Verifying database integrity...");
            }

            try {
                const db = await getDatabase();
                const stats = await db.getStats();
                verification = {
                    success: true,
                    totalEntities: stats.totalEntities,
                    totalCollections: stats.collections.length,
                };

                if (config.displayFormat !== "json") {
                    console.log(
                        `${chalk.green("[OK]")} Database is functional. Found ${stats.totalEntities} entities across ${stats.collections.length} collections.`,
                    );
                }
            } catch (error) {
                verification = {
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                };

                if (config.displayFormat !== "json") {
                    console.error(
                        `${chalk.yellow("[WARN]")} Database verification failed: ${error}`,
                    );
                    console.log(
                        `You may need to run 'db-sync' to rebuild the database.`,
                    );
                }
            }

            // Build result
            const result: RepairResult = {
                databasePath: dbPath,
                filesChecked: jsonFiles.length,
                corruptedFound: corruptedCount,
                repaired: repairedCount,
                skipped: skippedCount,
                operations,
                verification,
            };

            // Output result
            await this.output(
                { success: true, data: result },
                () => this.displaySummary(result),
                "db-repair",
            );
        } catch (error) {
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to repair database",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to repair database."),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                },
            );
        }
    }

    /**
     * Display repair summary in table format
     */
    private displaySummary(result: RepairResult): void {
        console.log("\nRepair Summary:");

        const summaryData = [
            { Metric: "Total files checked", Value: result.filesChecked },
            { Metric: "Corrupted files found", Value: result.corruptedFound },
            { Metric: "Files repaired", Value: result.repaired },
            { Metric: "Files skipped", Value: result.skipped },
        ];

        console.log(TerminalFormatter.table(summaryData));

        if (result.corruptedFound > result.repaired) {
            console.log(
                `\n${chalk.yellow("[WARN]")} Some files could not be repaired. You may need to run 'db-sync' to refresh data.`,
            );
        } else if (result.repaired > 0) {
            console.log(
                `\n${chalk.green("[OK]")} Database repair completed successfully!`,
            );
        } else {
            console.log(
                `\n${chalk.green("[OK]")} No repairs needed. Database is healthy.`,
            );
        }
    }

    /**
     * Repair a single file by copying from temporary file
     */
    private async repairFile(
        filePath: string,
        tmpPath: string,
        force: boolean,
        showMessages: boolean,
    ): Promise<boolean> {
        try {
            const tmpContent = await fs.readFile(tmpPath, "utf-8");

            // Validate JSON
            try {
                const data = JSON.parse(tmpContent);
                if (showMessages) {
                    console.log(
                        `  [INFO] Temporary file contains valid JSON (${Object.keys(data).length} keys)`,
                    );
                }
            } catch {
                if (showMessages) {
                    console.log(
                        `  ${chalk.red("[ERROR]")} Temporary file contains invalid JSON`,
                    );
                }
                return false;
            }

            if (!force) {
                if (showMessages) {
                    console.log(`  [INFO] Use --force to apply repair`);
                }
                return false;
            }

            // Apply repair
            // @ts-expect-error - process.pkg is set by pkg when running in compiled executable
            const isPkg = process.pkg !== undefined;

            if (isPkg) {
                // Use synchronous write for pkg
                fsSync.writeFileSync(filePath, tmpContent, "utf-8");
            } else {
                await fs.writeFile(filePath, tmpContent, "utf-8");
            }

            if (showMessages) {
                console.log(
                    `  ${chalk.green("[OK]")} Successfully repaired file`,
                );
            }

            // Try to remove tmp file
            try {
                if (isPkg) {
                    fsSync.unlinkSync(tmpPath);
                } else {
                    await fs.unlink(tmpPath);
                }
                if (showMessages) {
                    console.log(`  [INFO] Removed temporary file`);
                }
            } catch {
                if (showMessages) {
                    console.log(
                        `  ${chalk.yellow("[WARN]")} Could not remove temporary file`,
                    );
                }
            }

            return true;
        } catch (error) {
            if (showMessages) {
                console.log(
                    `  ${chalk.red("[ERROR]")} Failed to repair: ${error}`,
                );
            }
            return false;
        }
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
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
            // Legacy flags (still supported)
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
