import chalk from "chalk";
import { listDataflows } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import type {
    DataflowListParams,
    DataflowSort,
    DomoDataflow,
} from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";

/**
 * Lists all accessible Domo dataflows
 */
export class ListDataflowsCommand extends BaseCommand {
    public readonly name = "list-dataflows";
    public readonly description = "Lists all accessible Domo dataflows";
    private dataflows: DomoDataflow[] = [];

    /**
     * Getter for the dataflows list
     */
    public getDataflows(): DomoDataflow[] {
        return this.dataflows;
    }

    /**
     * Executes the list-dataflows command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }
            let params: DataflowListParams = { limit: 50, offset: 0 };
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
                const sortValue = String(parsedArgs.params.sort);
                // Store sort field for proper mapping with order parameter
                if (
                    sortValue === "name" ||
                    sortValue === "status" ||
                    sortValue === "lastRun" ||
                    sortValue === "owner"
                ) {
                    // Valid sort field - will be combined with order parameter later
                    params.sort = sortValue as DataflowSort;
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

            if (parsedArgs.params.order !== undefined) {
                const orderValue = String(parsedArgs.params.order);
                // Process order parameter with the corresponding sort field
                if (orderValue === "asc" || orderValue === "desc") {
                    params.order = orderValue as "asc" | "desc";

                    // If sort is "name" and order is "desc", use "nameDescending" directly
                    if (params.sort === "name" && orderValue === "desc") {
                        params.sort = "nameDescending";
                        // Clear order since it's already incorporated in the sort value
                        params.order = undefined;
                    }
                } else {
                    params.order = undefined;
                }
            }

            if (parsedArgs.params.fields !== undefined) {
                params.fields = String(parsedArgs.params.fields);
            }

            if (parsedArgs.params.tags !== undefined) {
                params.tags = String(parsedArgs.params.tags);
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

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
                // Fetch all dataflows with automatic pagination
                this.dataflows = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                console.log("Fetching all dataflows...");

                while (hasMoreData) {
                    const pageParams = {
                        ...params,
                        limit: pageSize,
                        offset: currentOffset,
                    };
                    const pageData = await listDataflows(
                        pageParams,
                        authMethod,
                    );

                    if (pageData.length === 0) {
                        hasMoreData = false;
                    } else {
                        this.dataflows.push(...pageData);

                        // If we got less than the limit, we've reached the end
                        if (pageData.length < pageSize) {
                            hasMoreData = false;
                        } else {
                            currentOffset += pageSize;
                            // Show progress
                            process.stdout.write(
                                `\rFetched ${this.dataflows.length} dataflows...`,
                            );
                        }
                    }
                }

                if (this.dataflows.length > 0) {
                    process.stdout.write("\r"); // Clear the progress line
                }
            } else {
                // Use explicit parameters
                this.dataflows = await listDataflows(params, authMethod);
            }

            // Sort results client-side for display to ensure consistent sorting
            if (params.sort && this.dataflows.length > 0) {
                const sortField =
                    params.sort === "nameDescending" ? "name" : params.sort;
                const sortDirection =
                    params.sort === "nameDescending" || params.order === "desc"
                        ? -1
                        : 1;

                this.dataflows.sort((a, b) => {
                    // Convert to lowercase for case-insensitive sorting if sorting by name
                    const valueA =
                        sortField === "name"
                            ? (a.name || "").toLowerCase()
                            : sortField === "lastRun"
                              ? a.lastRun || ""
                              : sortField === "status"
                                ? a.status || ""
                                : a.owner || "";

                    const valueB =
                        sortField === "name"
                            ? (b.name || "").toLowerCase()
                            : sortField === "lastRun"
                              ? b.lastRun || ""
                              : sortField === "status"
                                ? b.status || ""
                                : b.owner || "";

                    if (valueA < valueB) return -1 * sortDirection;
                    if (valueA > valueB) return 1 * sortDirection;
                    return 0;
                });
            }

            if (this.dataflows.length > 0) {
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.dataflows.length,
                    };

                    if (hasExplicitLimit || hasExplicitOffset) {
                        metadata.pagination = {
                            offset: params.offset || 0,
                            limit: params.limit || 50,
                            hasMore:
                                this.dataflows.length === (params.limit || 50),
                        };
                    }

                    if (params.sort) {
                        metadata.sort = params.sort;
                        if (params.order) {
                            metadata.order = params.order;
                        }
                    }

                    if (nameLike) {
                        metadata.filter = { nameLike };
                    }

                    if (params.fields) {
                        metadata.fields = params.fields;
                    }

                    if (params.tags) {
                        metadata.tags = params.tags;
                    }

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { dataflows: this.dataflows },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
                    console.log(
                        `\n${this.dataflows.length} dataflows${nameLike ? ` matching "${nameLike}"` : ""}`,
                    );

                    // Prepare data for table - Name first for better readability
                    const tableData = this.dataflows.map(dataflow => {
                        const lastRunDate = dataflow.lastRun
                            ? new Date(dataflow.lastRun).toLocaleDateString()
                            : dataflow.lastExecution?.beginTime
                              ? new Date(
                                    dataflow.lastExecution.beginTime,
                                ).toLocaleDateString()
                              : "Never";
                        const status =
                            dataflow.runState || dataflow.status || "Unknown";
                        const inputOutput = `${dataflow.inputCount || 0}/${dataflow.outputCount || 0}`;

                        return {
                            Name:
                                dataflow.name.length > 35
                                    ? dataflow.name.substring(0, 32) + "..."
                                    : dataflow.name,
                            Status: status,
                            "I/O": inputOutput,
                            "Last Run": lastRunDate,
                            ID: dataflow.id,
                        };
                    });

                    console.log(TerminalFormatter.table(tableData));

                    await CommandUtils.exportData(
                        this.dataflows,
                        `Domo Dataflows${nameLike ? ` matching "${nameLike}"` : ""}`,
                        "dataflows",
                        parsedArgs.saveOptions,
                    );

                    console.log(
                        "\nTip: get-dataflow <id> for details • list-dataflows [search] sort=name --save-md",
                    );
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { dataflows: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log("No accessible dataflows found.");
                }
            }
        } catch (error) {
            log.error("Error fetching dataflows:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch dataflows";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch dataflows."),
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
     * Shows help for the list-dataflows command
     */
    public showHelp(): void {
        console.log("Lists all accessible Domo dataflows");
        console.log(
            "\nUsage: list-dataflows [search_term] [parameters] [options]",
        );

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "search_term",
                Type: "string",
                Description: "Optional text to filter dataflows by name",
            },
            {
                Parameter: "limit",
                Type: "number",
                Description: "Maximum dataflows to return (default: 50)",
            },
            {
                Parameter: "offset",
                Type: "number",
                Description: "Offset for pagination (default: 0)",
            },
            {
                Parameter: "sort",
                Type: "string",
                Description: "Sort by (name, status, lastRun, owner)",
            },
            {
                Parameter: "order",
                Type: "string",
                Description: "Sort direction (asc, desc)",
            },
            {
                Parameter: "fields",
                Type: "string",
                Description: "Comma-separated fields to include",
            },
            {
                Parameter: "tags",
                Type: "string",
                Description: "Filter by tag names",
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
                Command: "list-dataflows",
                Description: "List all dataflows (auto-paginate)",
            },
            {
                Command: "list-dataflows etl",
                Description: "List all dataflows containing 'etl'",
            },
            {
                Command: "list-dataflows limit=50",
                Description: "List only first 50 dataflows",
            },
            {
                Command: "list-dataflows --limit 50 --offset 50",
                Description: "List second page of 50",
            },
            {
                Command: "list-dataflows --sort lastRun --order desc",
                Description: "Sort by last run time, newest first",
            },
            {
                Command: "list-dataflows etl --save-md",
                Description: "Filter and save to markdown",
            },
            {
                Command: "list-dataflows --format=json",
                Description: "Output all dataflows as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
