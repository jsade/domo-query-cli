import type {
    DatasetListParams,
    DatasetSort,
    DomoDataset,
} from "../api/clients/domoClient";
import { listDatasets } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Lists all accessible Domo datasets
 */
export class ListDatasetsCommand extends BaseCommand {
    public readonly name = "list-datasets";
    public readonly description = "Lists all accessible Domo datasets";
    private datasets: DomoDataset[] = [];

    /**
     * Getter for the datasets list
     */
    public getDatasets(): DomoDataset[] {
        return this.datasets;
    }

    /**
     * Executes the list-datasets command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const [_, saveOptions] = CommandUtils.parseSaveOptions(args || []);
            let params: DatasetListParams = { limit: 50, offset: 0 };
            let nameLike: string | undefined;
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;

            if (_.length > 0) {
                if (!_[0].includes("=")) {
                    nameLike = _[0];
                    params.nameLike = nameLike;
                }

                for (const arg of _) {
                    if (arg.includes("=")) {
                        const [key, value] = arg.split("=");
                        if (key === "limit" && !isNaN(Number(value))) {
                            const limitValue = Number(value);
                            if (limitValue < 1 || limitValue > 50) {
                                console.log(
                                    TerminalFormatter.error(
                                        `Invalid limit value: ${limitValue}. Must be between 1 and 50.`,
                                    ),
                                );
                                return; // Exit early
                            }
                            params.limit = limitValue;
                            hasExplicitLimit = true;
                        } else if (key === "offset" && !isNaN(Number(value))) {
                            params.offset = Number(value);
                            hasExplicitOffset = true;
                        } else if (key === "sort") {
                            const validSorts = [
                                "name",
                                "nameDescending",
                                "lastTouched",
                                "lastTouchedAscending",
                                "lastUpdated",
                            ];
                            if (validSorts.includes(value)) {
                                params.sort = value as DatasetSort;
                            } else {
                                console.log(
                                    `Invalid sort value: "${value}". Valid options are: ${validSorts.join(", ")}`,
                                );
                            }
                        } else if (key === "search" || key === "name") {
                            params.nameLike = value;
                        }
                    }
                }
            }

            // If no explicit limit/offset, fetch all data
            if (
                (!hasExplicitLimit && !hasExplicitOffset && _.length === 0) ||
                (_.length === 1 && nameLike)
            ) {
                // Fetch all datasets with automatic pagination
                this.datasets = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                console.log("Fetching all datasets...");

                while (hasMoreData) {
                    const pageParams = {
                        ...params,
                        limit: pageSize,
                        offset: currentOffset,
                    };
                    const pageData = await listDatasets(pageParams);

                    if (pageData.length === 0) {
                        hasMoreData = false;
                    } else {
                        this.datasets.push(...pageData);

                        // If we got less than the limit, we've reached the end
                        if (pageData.length < pageSize) {
                            hasMoreData = false;
                        } else {
                            currentOffset += pageSize;
                            // Show progress
                            process.stdout.write(
                                `\rFetched ${this.datasets.length} datasets...`,
                            );
                        }
                    }
                }

                if (this.datasets.length > 0) {
                    process.stdout.write("\r"); // Clear the progress line
                }
            } else {
                // Use explicit parameters
                this.datasets = await listDatasets(params);
            }

            if (this.datasets.length > 0) {
                console.log(
                    `${this.datasets.length} datasets${nameLike ? ` matching "${nameLike}"` : ""}`,
                );

                // Prepare data for terminal-columns - Name first for better readability
                const tableData = this.datasets.map(dataset => ({
                    Name:
                        dataset.name.length > 40
                            ? dataset.name.substring(0, 37) + "..."
                            : dataset.name,
                    Rows: dataset.rows.toLocaleString(),
                    Cols: dataset.columns.toString(),
                    Updated: new Date(dataset.updatedAt).toLocaleDateString(),
                    ID: dataset.id,
                }));

                console.log(TerminalFormatter.table(tableData));

                if (params.sort) {
                    console.log(
                        `\n${TerminalFormatter.info(`Sorted by: ${params.sort}`)}`,
                    );
                }

                // Show pagination info if applicable
                if (params.offset && params.offset > 0) {
                    const pageNum =
                        Math.floor(params.offset / (params.limit || 50)) + 1;
                    console.log(
                        TerminalFormatter.info(
                            `Page ${pageNum} (offset: ${params.offset})`,
                        ),
                    );
                }

                await CommandUtils.exportData(
                    this.datasets,
                    `Domo Datasets${nameLike ? ` matching "${nameLike}"` : ""}`,
                    "datasets",
                    saveOptions,
                );

                console.log(
                    "\nTip: list-datasets [search] limit=n sort=name --save-md",
                );
            } else {
                console.log(
                    TerminalFormatter.warning("No accessible datasets found."),
                );
            }
        } catch (error) {
            log.error("Error fetching datasets:", error);
            console.error(TerminalFormatter.error("Failed to fetch datasets."));
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
            console.error(
                "Check your parameters and authentication, then try again.",
            );
        }
    }

    /**
     * Shows help for the list-datasets command
     */
    public showHelp(): void {
        console.log("Lists all accessible Domo datasets");

        console.log(
            "\nUsage: list-datasets [search_term] [parameters] [options]",
        );

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "search_term",
                Type: "string",
                Description: "Optional text to filter datasets by name",
            },
            {
                Parameter: "limit",
                Type: "number",
                Description: "Maximum datasets to return (1-50, default: 50)",
            },
            {
                Parameter: "offset",
                Type: "number",
                Description: "Offset for pagination (default: 0)",
            },
            {
                Parameter: "sort",
                Type: "string",
                Description:
                    "Sort by: name, nameDescending, lastTouched, lastUpdated",
            },
            {
                Parameter: "search",
                Type: "string",
                Description: "Alternative way to filter by name",
            },
            {
                Parameter: "name",
                Type: "string",
                Description: "Alternative way to filter by name",
            },
        ];

        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--save",
                Description: "Save results to JSON file (default)",
            },
            { Option: "--save-json", Description: "Save results to JSON file" },
            {
                Option: "--save-md",
                Description: "Save results to Markdown file",
            },
            {
                Option: "--save-both",
                Description: "Save to both JSON and Markdown",
            },
            {
                Option: "--path=<directory>",
                Description: "Specify custom export directory",
            },
        ];

        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-datasets",
                Description: "List all datasets (auto-paginate)",
            },
            {
                Command: "list-datasets sales",
                Description: "List all datasets containing 'sales'",
            },
            {
                Command: "list-datasets limit=50",
                Description: "List only first 50 datasets",
            },
            {
                Command: "list-datasets limit=50 offset=50",
                Description: "List second page of 50",
            },
            {
                Command: "list-datasets sort=lastUpdated",
                Description: "Sort by last update time",
            },
            {
                Command: "list-datasets sales --save-md",
                Description: "Filter and save to markdown",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }
}
