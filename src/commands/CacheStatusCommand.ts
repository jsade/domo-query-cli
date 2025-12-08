import { getCacheManager } from "../core/cache/CacheManager.ts";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand.ts";
import chalk from "chalk";
import type { CommandResult } from "../types/outputTypes";

export class CacheStatusCommand extends BaseCommand {
    name = "cache-status";
    description = "Display cache statistics and optionally clear the cache";

    async execute(args?: string[]): Promise<void> {
        try {
            const { config: _config } = this.parseOutputConfig(args);

            const cacheManager = getCacheManager();

            // Check if user wants to clear cache
            const shouldClear = args ? args.includes("--clear") : false;
            if (shouldClear) {
                await cacheManager.clear();
            }

            // Get cache statistics
            const stats = cacheManager.getStats();

            // Calculate average entry size
            const avgEntrySize =
                stats.memoryEntries > 0
                    ? stats.totalSize / stats.memoryEntries
                    : 0;

            // Structure data for unified output system
            const data = {
                cache: {
                    memoryEntries: stats.memoryEntries,
                    totalSize: stats.totalSize,
                    totalSizeFormatted: TerminalFormatter.fileSize(
                        stats.totalSize,
                    ),
                    status: stats.memoryEntries > 0 ? "Active" : "Empty",
                    avgEntrySize,
                    avgEntrySizeFormatted:
                        stats.memoryEntries > 0
                            ? TerminalFormatter.fileSize(avgEntrySize)
                            : "N/A",
                    cleared: shouldClear,
                },
            };

            // Build metadata
            const metadata = {
                memoryEntries: stats.memoryEntries,
                totalSize: stats.totalSize,
                cleared: shouldClear,
            };

            const result: CommandResult<typeof data> = {
                success: true,
                data,
                metadata,
            };

            // Use unified output system
            await this.output(
                result,
                () => this.displayTerminalOutput(stats, shouldClear),
                "cache-status",
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        `Failed to get cache status: ${message}`,
                    ),
                );
            });
        }
    }

    /**
     * Display terminal formatted output
     */
    private displayTerminalOutput(
        stats: ReturnType<ReturnType<typeof getCacheManager>["getStats"]>,
        shouldClear: boolean,
    ): void {
        if (shouldClear) {
            console.log(
                TerminalFormatter.success("Cache cleared successfully."),
            );
            console.log("");
        }

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
        console.log("\nUsage: " + chalk.cyan(this.name) + " [options]");

        console.log(chalk.yellow("\nCache Options:"));
        const cacheOptionsData = [
            {
                Option: "--clear",
                Description: "Clear all cached data",
            },
        ];
        console.log(TerminalFormatter.table(cacheOptionsData));

        console.log(chalk.yellow("\nOutput Options:"));
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
                Description: "Show cache statistics",
            },
            {
                Command: `${this.name} --clear`,
                Description: "Clear the cache",
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
                Command: `${this.name} --clear --export=md`,
                Description: "Clear cache and export stats as Markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--clear",
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
