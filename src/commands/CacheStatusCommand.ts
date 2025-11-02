import { getCacheManager } from "../core/cache/CacheManager.ts";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand.ts";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

export class CacheStatusCommand extends BaseCommand {
    name = "cache-status";
    description = "Display cache statistics and optionally clear the cache";

    async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        const cacheManager = getCacheManager();

        // Check if user wants to clear cache
        const shouldClear = args && args.includes("--clear");
        if (shouldClear) {
            await cacheManager.clear();
            if (!this.isJsonOutput) {
                console.log(
                    TerminalFormatter.success("Cache cleared successfully."),
                );
                console.log("");
            }
        }

        // Get cache statistics
        const stats = cacheManager.getStats();

        if (this.isJsonOutput || parsedArgs.outputOptions) {
            // JSON output - return cache statistics as structured data
            const cacheData = {
                memoryEntries: stats.memoryEntries,
                totalSize: stats.totalSize,
                totalSizeFormatted: TerminalFormatter.fileSize(stats.totalSize),
                status: stats.memoryEntries > 0 ? "Active" : "Empty",
                avgEntrySize:
                    stats.memoryEntries > 0
                        ? stats.totalSize / stats.memoryEntries
                        : 0,
                avgEntrySizeFormatted:
                    stats.memoryEntries > 0
                        ? TerminalFormatter.fileSize(
                              stats.totalSize / stats.memoryEntries,
                          )
                        : "N/A",
                cleared: shouldClear,
            };

            await this.outputData(
                { cache: cacheData },
                () => {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { cache: cacheData },
                            {
                                memoryEntries: stats.memoryEntries,
                                totalSize: stats.totalSize,
                                cleared: shouldClear,
                            },
                        ),
                    );
                },
                parsedArgs.outputOptions ?? undefined,
            );
        } else {
            // Default table output
            console.log("Cache Status:");

            const statsData = [
                {
                    Metric: "Memory Entries",
                    Value: stats.memoryEntries.toLocaleString(),
                },
                {
                    Metric: "Total Size",
                    Value: TerminalFormatter.fileSize(stats.totalSize),
                },
                {
                    Metric: "Status",
                    Value: stats.memoryEntries > 0 ? "Active" : "Empty",
                },
            ];

            if (stats.memoryEntries > 0) {
                const avgSize = stats.totalSize / stats.memoryEntries;
                statsData.push({
                    Metric: "Avg Entry Size",
                    Value: TerminalFormatter.fileSize(avgSize),
                });
            }

            console.log(TerminalFormatter.table(statsData));

            console.log("\nTip: cache-status --clear to clear all cached data");
        }
    }

    showHelp(): void {
        console.log(this.description);

        console.log("\nUsage: " + `${this.name} [options]`);

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            { Option: "--clear", Description: "Clear all cached data" },
            {
                Option: "--format=json",
                Description:
                    "Output results in JSON format for programmatic use",
            },
        ];

        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            { Command: this.name, Description: "Show cache statistics" },
            { Command: `${this.name} --clear`, Description: "Clear the cache" },
            {
                Command: `${this.name} --format=json`,
                Description: "Output cache stats as JSON",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }
}
