import type {
    DatasetListParams,
    DatasetSort,
    DomoDataset,
} from "../api/clients/domoClient";
import { listDatasets } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
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
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }
            let params: DatasetListParams = { limit: 50, offset: 0 };
            let nameLike: string | undefined;
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;

            // Handle positional argument for search
            if (parsedArgs.positional.length > 0) {
                nameLike = parsedArgs.positional[0];
                params.nameLike = nameLike;
            }

            // Process named parameters
            if (parsedArgs.params.limit !== undefined) {
                const limitValue = Number(parsedArgs.params.limit);
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
            }

            if (parsedArgs.params.offset !== undefined) {
                params.offset = Number(parsedArgs.params.offset);
                hasExplicitOffset = true;
            }

            if (parsedArgs.params.sort !== undefined) {
                const validSorts = [
                    "name",
                    "nameDescending",
                    "lastTouched",
                    "lastTouchedAscending",
                    "lastUpdated",
                ];
                const sortValue = String(parsedArgs.params.sort);
                if (validSorts.includes(sortValue)) {
                    params.sort = sortValue as DatasetSort;
                } else {
                    console.log(
                        `Invalid sort value: "${sortValue}". Valid options are: ${validSorts.join(", ")}`,
                    );
                }
            }

            // Handle search/name parameters (override positional if specified)
            if (parsedArgs.params.search !== undefined) {
                params.nameLike = String(parsedArgs.params.search);
                nameLike = params.nameLike;
            } else if (parsedArgs.params.name !== undefined) {
                params.nameLike = String(parsedArgs.params.name);
                nameLike = params.nameLike;
            }

            // If no explicit limit/offset, fetch all data
            if (
                (!hasExplicitLimit &&
                    !hasExplicitOffset &&
                    parsedArgs.positional.length === 0 &&
                    Object.keys(parsedArgs.params).length === 0) ||
                (parsedArgs.positional.length === 1 &&
                    nameLike &&
                    !hasExplicitLimit &&
                    !hasExplicitOffset)
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
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.datasets.length,
                    };

                    if (hasExplicitLimit || hasExplicitOffset) {
                        metadata.pagination = {
                            offset: params.offset || 0,
                            limit: params.limit || 50,
                            hasMore:
                                this.datasets.length === (params.limit || 50),
                        };
                    }

                    if (params.sort) {
                        metadata.sort = params.sort;
                    }

                    if (nameLike) {
                        metadata.filter = { nameLike };
                    }

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { datasets: this.datasets },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
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
                        Updated: new Date(
                            dataset.updatedAt,
                        ).toLocaleDateString(),
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
                            Math.floor(params.offset / (params.limit || 50)) +
                            1;
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
                        parsedArgs.saveOptions,
                    );

                    console.log(
                        "\nTip: list-datasets [search] limit=n sort=name --save-md",
                    );
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { datasets: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log(
                        TerminalFormatter.warning(
                            "No accessible datasets found.",
                        ),
                    );
                }
            }
        } catch (error) {
            log.error("Error fetching datasets:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch datasets";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch datasets."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error(
                    "Check your parameters and authentication, then try again.",
                );
            }
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

        console.log(
            chalk.cyan(
                "\nParameters (both --key value and key=value formats supported):",
            ),
        );
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
            {
                Option: "--format=json",
                Description:
                    "Output results in JSON format for programmatic use",
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
                Command: "list-datasets --limit 10",
                Description: "List only first 10 datasets",
            },
            {
                Command: "list-datasets limit=50",
                Description: "List only first 50 datasets (old format)",
            },
            {
                Command: "list-datasets --limit 50 --offset 50",
                Description: "List second page of 50",
            },
            {
                Command: "list-datasets --sort lastUpdated",
                Description: "Sort by last update time",
            },
            {
                Command: "list-datasets sales --save-md",
                Description: "Filter and save to markdown",
            },
            {
                Command: "list-datasets --format=json",
                Description: "Output all datasets as JSON",
            },
        ];

        console.log(TerminalFormatter.table(examplesData));
    }
}
