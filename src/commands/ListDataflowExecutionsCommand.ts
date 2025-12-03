import { listDataflowExecutions } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import chalk from "chalk";

interface DataflowExecution {
    id: number | string;
    state?: string;
    beginTime?: number;
    endTime?: number;
}

/**
 * Lists the execution history of a specific dataflow
 */
export class ListDataflowExecutionsCommand extends BaseCommand {
    public readonly name = "list-dataflow-executions";
    public readonly description =
        "Lists the execution history of a specific dataflow";

    private executions: DataflowExecution[] = [];

    /**
     * Executes the list-dataflow-executions command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Parse output configuration
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract dataflow ID from positional arguments
            const id = parsed.positional[0];

            if (!id) {
                if (config.displayFormat === "json") {
                    this.outputErrorResult({
                        message: "No dataflow ID provided",
                        code: "MISSING_DATAFLOW_ID",
                    });
                } else {
                    console.log("No dataflow selected.");
                }
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // Fetch executions from API
            this.executions = await listDataflowExecutions(id, {}, authMethod);

            // Build metadata for JSON output
            const metadata: Record<string, unknown> = {
                count: this.executions.length,
                dataflowId: id,
            };

            // Output results using unified system
            await this.output(
                {
                    success: true,
                    data: { executions: this.executions },
                    metadata,
                },
                () => this.displayTable(),
                "dataflow-executions",
            );

            // Show usage hints for table output only
            if (
                config.displayFormat === "table" &&
                this.executions.length > 0
            ) {
                console.log(
                    "\nUse 'list-dataflow-executions [dataflow_id]' to filter by status",
                );
                console.log(
                    "Additional parameters: limit=n offset=n fromDate=YYYY-MM-DD toDate=YYYY-MM-DD",
                );
                console.log("");
            }
        } catch (error) {
            log.error("Error fetching dataflow executions:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch dataflow executions";

            this.outputErrorResult(
                {
                    message,
                    code: "FETCH_FAILED",
                    details: error instanceof Error ? error.stack : undefined,
                },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            "Failed to fetch dataflow executions.",
                        ),
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
     * Display execution history as a table
     */
    private displayTable(): void {
        if (this.executions.length === 0) {
            console.log("No executions found for the selected dataflow.");
            return;
        }

        console.log(chalk.cyan("\nDataflow Execution History:"));
        console.log("------------------------");
        console.log(
            "ID".padEnd(12) +
                "Status".padEnd(10) +
                "Start Time".padEnd(24) +
                "End Time".padEnd(24) +
                "Duration".padEnd(10),
        );
        console.log("-".repeat(95));

        this.executions.forEach(execution => {
            const status =
                execution.state === "RUNNING"
                    ? "Running"
                    : execution.state === "FAILED"
                      ? "Failed"
                      : execution.state || "Completed";
            const startTime = execution.beginTime
                ? new Date(execution.beginTime).toLocaleString()
                : "N/A";
            const endTime = execution.endTime
                ? new Date(execution.endTime).toLocaleString()
                : "N/A";
            const duration =
                execution.endTime && execution.beginTime
                    ? (
                          (execution.endTime - execution.beginTime) /
                          1000
                      ).toFixed(2)
                    : "N/A";

            console.log(
                `${String(execution.id).padEnd(12)}${status.padEnd(10)}${startTime.padEnd(24)}${endTime.padEnd(24)}${String(duration).padEnd(10)}`,
            );
        });
    }

    /**
     * Shows help for the list-dataflow-executions command
     */
    public showHelp(): void {
        console.log("Lists the execution history of a specific dataflow");
        console.log(
            "Usage: list-dataflow-executions [dataflow_id] [parameters] [options]",
        );
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID. If not provided, you will be prompted to select a dataflow",
        );
        console.log(
            "  limit=<number>      Maximum number of executions to return (default: 50)",
        );
        console.log("  offset=<number>     Offset for pagination (default: 0)");
        console.log(
            "  status=<status>     Filter by status: SUCCESS, FAILED, or RUNNING",
        );
        console.log(
            "  fromDate=<date>     Filter executions after this date (YYYY-MM-DD format)",
        );
        console.log(
            "  toDate=<date>       Filter executions before this date (YYYY-MM-DD format)",
        );
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
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  list-dataflow-executions                       Prompt for dataflow selection",
        );
        console.log(
            "  list-dataflow-executions abc123                List all executions for dataflow abc123",
        );
        console.log(
            "  list-dataflow-executions abc123 status=FAILED  List failed executions for dataflow abc123",
        );
        console.log(
            "  list-dataflow-executions abc123 fromDate=2023-01-01 toDate=2023-12-31  List executions from 2023",
        );
        console.log(
            "  list-dataflow-executions abc123 --format=json                           Output executions as JSON",
        );
        console.log(
            "  list-dataflow-executions abc123 --format=json --export                   Output JSON and export to file",
        );
        console.log("");
    }

    /**
     * Provides autocomplete suggestions for command arguments
     * @param _args - Current command arguments
     * @returns Array of autocomplete suggestions
     */
    public autocomplete(_args?: string[]): string[] {
        // Basic autocomplete for common options
        const suggestions = [
            "--format=json",
            "--export",
            "--export=md",
            "--export=both",
            "--export-path=",
            "--output=",
            "--quiet",
            "limit=",
            "offset=",
            "status=",
            "fromDate=",
            "toDate=",
        ];
        return suggestions;
    }
}
