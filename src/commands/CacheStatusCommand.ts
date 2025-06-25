import { getCacheManager } from "../core/cache/CacheManager.ts";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand.ts";
import chalk from "chalk";

export class CacheStatusCommand extends BaseCommand {
    name = "cache-status";
    description = "Display cache statistics and optionally clear the cache";

    async execute(args?: string[]): Promise<void> {
        const cacheManager = getCacheManager();

        // Check if user wants to clear cache
        if (args && args.includes("--clear")) {
            await cacheManager.clear();
            console.log(
                TerminalFormatter.success("Cache cleared successfully."),
            );
            console.log("");
        }

        // Get cache statistics
        const stats = cacheManager.getStats();

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

    showHelp(): void {
        console.log(this.description);

        console.log("\nUsage: " + `${this.name} [options]`);

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            { Option: "--clear", Description: "Clear all cached data" },
        ];

        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            { Command: this.name, Description: "Show cache statistics" },
            { Command: `${this.name} --clear`, Description: "Clear the cache" },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }
}
