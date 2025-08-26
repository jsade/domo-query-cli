import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { homedir } from "os";

export class DbRepairCommand extends BaseCommand {
    name = "db-repair";
    description =
        "Repair corrupted database files by recovering from temporary files";
    usage = "db-repair [--force]";
    category = "database" as const;

    showHelp(): void {
        console.log("Usage: db-repair [--force]");
        console.log("");
        console.log(
            "Repair corrupted database files by recovering from temporary files.",
        );
        console.log("");
        console.log("Options:");
        console.log(
            "  --force    Apply repairs automatically without confirmation",
        );
        console.log("");
        console.log("This command will:");
        console.log("  - Check all database files for corruption");
        console.log("  - Recover data from .tmp files when available");
        console.log("  - Clean up orphaned temporary files");
        console.log("  - Verify database integrity after repairs");
        console.log("");
        console.log("Examples:");
        console.log(
            "  db-repair            # Check and report issues (dry run)",
        );
        console.log("  db-repair --force    # Apply all possible repairs");
    }

    async execute(args?: string[]): Promise<void> {
        const forceRepair = args?.includes("--force") || false;

        console.log("🔧 Starting database repair...\n");

        try {
            // Get database path
            const basePath =
                process.env.DOMO_DB_PATH ||
                path.join(homedir(), ".domo-cli", "db");
            const dbPath = path.join(basePath, "default");

            // Check if database directory exists
            if (!fsSync.existsSync(dbPath)) {
                console.log("Database directory not found. Nothing to repair.");
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

            console.log(
                `Found ${jsonFiles.length} database files and ${tmpFiles.length} temporary files.\n`,
            );

            // Check each JSON file
            for (const file of jsonFiles) {
                const filePath = path.join(dbPath, file);
                const tmpPath = `${filePath}.tmp`;
                const hasTmp = fsSync.existsSync(tmpPath);

                console.log(`Checking ${file}...`);

                try {
                    const content = await fs.readFile(filePath, "utf-8");

                    // Check if file is empty
                    if (content.trim() === "") {
                        console.log(`  ❌ File is empty`);
                        corruptedCount++;

                        if (hasTmp) {
                            console.log(`  📄 Found temporary file`);
                            if (
                                await this.repairFile(
                                    filePath,
                                    tmpPath,
                                    forceRepair,
                                )
                            ) {
                                repairedCount++;
                            }
                        } else {
                            console.log(
                                `  ⚠️  No temporary file available for recovery`,
                            );
                        }
                    } else {
                        // Try to parse JSON
                        try {
                            JSON.parse(content);
                            console.log(`  ✅ File is valid`);

                            // Clean up tmp file if main file is valid
                            if (hasTmp) {
                                try {
                                    await fs.unlink(tmpPath);
                                    console.log(
                                        `  🗑️  Removed unnecessary temporary file`,
                                    );
                                } catch {
                                    console.log(
                                        `  ⚠️  Could not remove temporary file`,
                                    );
                                }
                            }
                        } catch {
                            console.log(`  ❌ File contains invalid JSON`);
                            corruptedCount++;

                            if (hasTmp) {
                                console.log(`  📄 Found temporary file`);
                                if (
                                    await this.repairFile(
                                        filePath,
                                        tmpPath,
                                        forceRepair,
                                    )
                                ) {
                                    repairedCount++;
                                }
                            } else {
                                console.log(
                                    `  ⚠️  No temporary file available for recovery`,
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.log(`  ❌ Could not read file: ${error}`);
                    corruptedCount++;

                    if (hasTmp) {
                        console.log(`  📄 Found temporary file`);
                        if (
                            await this.repairFile(
                                filePath,
                                tmpPath,
                                forceRepair,
                            )
                        ) {
                            repairedCount++;
                        }
                    }
                }

                console.log();
            }

            // Check for orphaned tmp files
            for (const tmpFile of tmpFiles) {
                const baseName = tmpFile.replace(".tmp", "");
                if (!jsonFiles.includes(baseName)) {
                    console.log(`Found orphaned temporary file: ${tmpFile}`);

                    if (forceRepair) {
                        const tmpPath = path.join(dbPath, tmpFile);
                        const targetPath = path.join(dbPath, baseName);

                        try {
                            const content = await fs.readFile(tmpPath, "utf-8");
                            JSON.parse(content); // Validate JSON

                            await fs.writeFile(targetPath, content, "utf-8");
                            console.log(
                                `  ✅ Restored from orphaned temporary file`,
                            );
                            repairedCount++;

                            try {
                                await fs.unlink(tmpPath);
                            } catch {
                                // Ignore cleanup errors
                            }
                        } catch {
                            console.log(
                                `  ⚠️  Orphaned file contains invalid data`,
                            );
                        }
                    } else {
                        console.log(
                            `  ℹ️  Use --force to restore from orphaned files`,
                        );
                        skippedCount++;
                    }
                    console.log();
                }
            }

            // Summary
            console.log("📊 Repair Summary:");
            console.log(`  Total files checked: ${jsonFiles.length}`);
            console.log(`  Corrupted files found: ${corruptedCount}`);
            console.log(`  Files repaired: ${repairedCount}`);
            console.log(`  Files skipped: ${skippedCount}`);

            if (corruptedCount > repairedCount) {
                console.log(
                    `\n⚠️  Some files could not be repaired. You may need to run 'db-sync' to refresh data.`,
                );
            } else if (repairedCount > 0) {
                console.log(`\n✅ Database repair completed successfully!`);
            } else {
                console.log(`\n✅ No repairs needed. Database is healthy.`);
            }

            // Try to initialize database to verify it works
            console.log("\n🔍 Verifying database integrity...");
            try {
                const db = await getDatabase();
                const stats = await db.getStats();
                console.log(
                    `✅ Database is functional. Found ${stats.totalEntities} entities across ${stats.collections.length} collections.`,
                );
            } catch (error) {
                console.error(`⚠️  Database verification failed: ${error}`);
                console.log(
                    `You may need to run 'db-sync' to rebuild the database.`,
                );
            }
        } catch (error) {
            console.error(`Failed to repair database: ${error}`);
            throw error;
        }
    }

    private async repairFile(
        filePath: string,
        tmpPath: string,
        force: boolean,
    ): Promise<boolean> {
        try {
            const tmpContent = await fs.readFile(tmpPath, "utf-8");

            // Validate JSON
            try {
                const data = JSON.parse(tmpContent);
                console.log(
                    `  📋 Temporary file contains valid JSON (${Object.keys(data).length} keys)`,
                );
            } catch {
                console.log(`  ❌ Temporary file contains invalid JSON`);
                return false;
            }

            if (!force) {
                console.log(`  ℹ️  Use --force to apply repair`);
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

            console.log(`  ✅ Successfully repaired file`);

            // Try to remove tmp file
            try {
                if (isPkg) {
                    fsSync.unlinkSync(tmpPath);
                } else {
                    await fs.unlink(tmpPath);
                }
                console.log(`  🗑️  Removed temporary file`);
            } catch {
                console.log(`  ⚠️  Could not remove temporary file`);
            }

            return true;
        } catch (error) {
            console.log(`  ❌ Failed to repair: ${error}`);
            return false;
        }
    }
}
