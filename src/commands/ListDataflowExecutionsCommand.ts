import { listDataflowExecutions } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Lists the execution history of a specific dataflow
 */
export class ListDataflowExecutionsCommand extends BaseCommand {
    public readonly name = "list-dataflow-executions";
    public readonly description =
        "Lists the execution history of a specific dataflow";

    /**
     * Executes the list-dataflow-executions command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const [dataflowId, saveOptions] = CommandUtils.parseSaveOptions(
                args || [],
            );

            let id: string | undefined;
            if (typeof dataflowId === "string") {
                id = dataflowId;
            } else if (
                Array.isArray(dataflowId) &&
                typeof dataflowId[0] === "string"
            ) {
                id = dataflowId[0];
            }

            if (!id) {
                console.log("No dataflow selected.");
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const executions = await listDataflowExecutions(id, {}, authMethod);

            if (executions.length > 0) {
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

                executions.forEach(execution => {
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

                await CommandUtils.exportData(
                    executions,
                    `Domo Dataflow Execution History for ${id}`,
                    "dataflow-executions",
                    saveOptions,
                );

                console.log(
                    "\nUse 'list-dataflow-executions [dataflow_id]' to filter by status",
                );
                console.log(
                    "Additional parameters: limit=n offset=n fromDate=YYYY-MM-DD toDate=YYYY-MM-DD",
                );
                console.log(
                    "To save results: --save, --save-json, --save-md, or --save-both",
                );
                console.log("");
            } else {
                console.log("No executions found for the selected dataflow.");
            }
        } catch (error) {
            log.error("Error fetching dataflow executions:", error);
        }
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
        console.log(
            "  --save              Save results to JSON file (default)",
        );
        console.log("  --save-json         Save results to JSON file");
        console.log("  --save-md           Save results to Markdown file");
        console.log(
            "  --save-both         Save results to both JSON and Markdown files",
        );
        console.log("  --path=<directory>  Specify custom export directory");
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
        console.log("");
    }
}
