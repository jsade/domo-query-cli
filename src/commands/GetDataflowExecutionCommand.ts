import { getDataflowExecution } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import chalk from "chalk";

/**
 * Gets detailed information about a specific dataflow execution
 */
export class GetDataflowExecutionCommand extends BaseCommand {
    public readonly name = "get-dataflow-execution";
    public readonly description =
        "Gets detailed information about a specific dataflow execution";

    /**
     * Executes the get-dataflow-execution command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract IDs from positional args
            const dataflowId = parsedArgs.positional[0];
            const executionId = parsedArgs.positional[1];
            const saveOptions = parsedArgs.saveOptions;

            if (!dataflowId || !executionId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Both dataflow ID and execution ID are required",
                            "MISSING_PARAMETERS",
                        ),
                    );
                } else {
                    console.log("No dataflow or execution selected.");
                }
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const execution = await getDataflowExecution(
                dataflowId,
                executionId,
                authMethod,
            );

            if (execution) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { execution: execution },
                            { entityType: "execution" },
                        ),
                    );
                } else {
                    console.log(chalk.cyan("\nDataflow Execution Details:"));
                    console.log("------------------------");
                    console.log(`ID: ${execution.id}`);
                    console.log(`State: ${execution.state}`);
                    console.log(
                        `Begin Time: ${execution.beginTime ? new Date(execution.beginTime).toLocaleString() : "N/A"}`,
                    );
                    console.log(
                        `End Time: ${execution.endTime ? new Date(execution.endTime).toLocaleString() : "N/A"}`,
                    );
                    console.log(
                        `Duration: ${execution.endTime && execution.beginTime ? ((execution.endTime - execution.beginTime) / 1000).toFixed(2) : "N/A"} seconds`,
                    );

                    if (CommandUtils.isSaveOptions(saveOptions)) {
                        await CommandUtils.exportData(
                            [execution],
                            `Domo Dataflow Execution Details for ${execution.id}`,
                            "dataflow-execution",
                            saveOptions,
                        );
                    }

                    console.log("");
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Execution not found",
                            "EXECUTION_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log("No execution found.");
                }
            }
        } catch (error) {
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        error instanceof Error ? error.message : String(error),
                        "FETCH_ERROR",
                    ),
                );
            } else {
                log.error("Error fetching dataflow execution:", error);
            }
        }
    }

    /**
     * Shows help for the get-dataflow-execution command
     */
    public showHelp(): void {
        console.log(
            "Gets detailed information about a specific dataflow execution",
        );
        console.log(
            "Usage: get-dataflow-execution [dataflow_id] [execution_id] [options]",
        );
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID. If not provided, you will be prompted to select a dataflow",
        );
        console.log(
            "  execution_id        Optional execution ID. If not provided, you will be prompted to select an execution",
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
        console.log("  --format=json       Output results in JSON format");
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  get-dataflow-execution                   Prompt for dataflow and execution selection",
        );
        console.log(
            "  get-dataflow-execution abc123            Select dataflow abc123 and prompt for execution",
        );
        console.log(
            "  get-dataflow-execution abc123 12345      Get details for execution 12345 of dataflow abc123",
        );
        console.log(
            "  get-dataflow-execution abc123 12345 --save-md  Get execution details and save to markdown",
        );
        console.log(
            "  get-dataflow-execution abc123 12345 --format=json  Get execution details in JSON format",
        );
        console.log("");
    }
}
