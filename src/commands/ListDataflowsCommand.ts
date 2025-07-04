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
            const [_, saveOptions] = CommandUtils.parseSaveOptions(args || []);
            let params: DataflowListParams = { limit: 50, offset: 0 };
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
                            // Store sort field for proper mapping with order parameter
                            if (
                                value === "name" ||
                                value === "status" ||
                                value === "lastRun" ||
                                value === "owner"
                            ) {
                                // Valid sort field - will be combined with order parameter later
                                params.sort = value as DataflowSort;
                            }
                        } else if (key === "search" || key === "name") {
                            params.nameLike = value;
                        } else if (key === "order") {
                            // Process order parameter with the corresponding sort field
                            if (value === "asc" || value === "desc") {
                                params.order = value as "asc" | "desc";

                                // If sort is "name" and order is "desc", use "nameDescending" directly
                                if (
                                    params.sort === "name" &&
                                    value === "desc"
                                ) {
                                    params.sort = "nameDescending";
                                    // Clear order since it's already incorporated in the sort value
                                    params.order = undefined;
                                }
                            } else {
                                params.order = undefined;
                            }
                        } else if (key === "fields") {
                            params.fields = value;
                        } else if (key === "tags") {
                            params.tags = value;
                        }
                    }
                }
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // If no explicit limit/offset, fetch all data
            if (
                (!hasExplicitLimit && !hasExplicitOffset && _.length === 0) ||
                (_.length === 1 && nameLike)
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
                    saveOptions,
                );

                console.log(
                    "\nTip: get-dataflow <id> for details • list-dataflows [search] sort=name --save-md",
                );
            } else {
                console.log("No accessible dataflows found.");
            }
        } catch (error) {
            log.error("Error fetching dataflows:", error);
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
                Command: "list-dataflows limit=50 offset=50",
                Description: "List second page of 50",
            },
            {
                Command: "list-dataflows sort=lastRun",
                Description: "Sort by last run time",
            },
            {
                Command: "list-dataflows etl --save-md",
                Description: "Filter and save to markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
