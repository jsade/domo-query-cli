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
            // Parse output configuration using unified system
            const { parsed } = this.parseOutputConfig(args);

            let params: DataflowListParams = { limit: 50, offset: 0 };
            let nameLike: string | undefined;
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;

            // Handle positional argument for search
            if (parsed.positional.length > 0) {
                nameLike = parsed.positional[0];
                params.nameLike = nameLike;
            }

            // Process named parameters
            if (parsed.params.limit !== undefined) {
                const limitValue = Number(parsed.params.limit);
                if (limitValue < 1 || limitValue > 50) {
                    this.outputErrorResult({
                        message: `Invalid limit value: ${limitValue}. Must be between 1 and 50.`,
                    });
                    return;
                }
                params.limit = limitValue;
                hasExplicitLimit = true;
            }

            if (parsed.params.offset !== undefined) {
                params.offset = Number(parsed.params.offset);
                hasExplicitOffset = true;
            }

            if (parsed.params.sort !== undefined) {
                const sortValue = String(parsed.params.sort);
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
            if (parsed.params.search !== undefined) {
                params.nameLike = String(parsed.params.search);
                nameLike = params.nameLike;
            } else if (parsed.params.name !== undefined) {
                params.nameLike = String(parsed.params.name);
                nameLike = params.nameLike;
            }

            if (parsed.params.order !== undefined) {
                const orderValue = String(parsed.params.order);
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

            if (parsed.params.fields !== undefined) {
                params.fields = String(parsed.params.fields);
            }

            if (parsed.params.tags !== undefined) {
                params.tags = String(parsed.params.tags);
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // If no explicit limit/offset, fetch all data
            if (
                (!hasExplicitLimit &&
                    !hasExplicitOffset &&
                    parsed.positional.length === 0 &&
                    Object.keys(parsed.params).length === 0) ||
                (parsed.positional.length === 1 &&
                    nameLike &&
                    !hasExplicitLimit &&
                    !hasExplicitOffset)
            ) {
                // Fetch all dataflows with automatic pagination
                this.dataflows = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                if (!this.isJsonMode) {
                    console.log("Fetching all dataflows...");
                }

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
                            if (!this.isJsonMode) {
                                process.stdout.write(
                                    `\rFetched ${this.dataflows.length} dataflows...`,
                                );
                            }
                        }
                    }
                }

                if (this.dataflows.length > 0 && !this.isJsonMode) {
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

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.dataflows.length,
            };

            if (hasExplicitLimit || hasExplicitOffset) {
                metadata.pagination = {
                    offset: params.offset || 0,
                    limit: params.limit || 50,
                    hasMore: this.dataflows.length === (params.limit || 50),
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

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { dataflows: this.dataflows },
                    metadata,
                },
                () => this.displayTable(nameLike),
                "dataflows",
            );
        } catch (error) {
            log.error("Error fetching dataflows:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch dataflows",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to fetch dataflows."),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error(
                        "Check your parameters and authentication, then try again.",
                    );
                },
            );
        }
    }

    /**
     * Displays the dataflows as a table
     */
    private displayTable(nameLike?: string): void {
        if (this.dataflows.length === 0) {
            console.log("No accessible dataflows found.");
            return;
        }

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
            const status = dataflow.runState || dataflow.status || "Unknown";
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

        console.log(
            "\nTip: get-dataflow <id> for details • list-dataflows [search] sort=name --export=md",
        );
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

        console.log(chalk.cyan("\nLegacy Aliases:"));
        const legacyData = [
            {
                Legacy: "--save, --save-json",
                Equivalent: "--export",
            },
            {
                Legacy: "--save-md",
                Equivalent: "--export=md",
            },
            {
                Legacy: "--save-both",
                Equivalent: "--export=both",
            },
            {
                Legacy: "--path=<dir>",
                Equivalent: "--export-path=<dir>",
            },
        ];
        console.log(TerminalFormatter.table(legacyData));

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
                Command: "list-dataflows etl --export=md",
                Description: "Filter and export to markdown",
            },
            {
                Command: "list-dataflows --format=json",
                Description: "Output all dataflows as JSON",
            },
            {
                Command: "list-dataflows --format=json --export",
                Description: "JSON to stdout and export file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--limit",
            "--offset",
            "--sort",
            "--order",
            "--fields",
            "--tags",
            "--search",
            "--name",
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
