import { getDataflowExecution } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
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
            const [dataflowId, executionId, saveOptionsRaw] =
                args && args.length > 0
                    ? CommandUtils.parseSaveOptions(args)
                    : [undefined, undefined, null];

            const saveOptions = saveOptionsRaw ?? null;

            let dataflowIdToUse: string | undefined;
            let executionIdToUse: number | string | undefined;

            if (typeof dataflowId === "string") {
                dataflowIdToUse = dataflowId;
            } else if (
                Array.isArray(dataflowId) &&
                typeof dataflowId[0] === "string"
            ) {
                dataflowIdToUse = dataflowId[0];
            }

            if (
                typeof executionId === "string" ||
                typeof executionId === "number"
            ) {
                executionIdToUse = executionId;
            } else if (
                Array.isArray(executionId) &&
                (typeof executionId[0] === "string" ||
                    typeof executionId[0] === "number")
            ) {
                executionIdToUse = executionId[0];
            }

            if (!dataflowIdToUse || !executionIdToUse) {
                console.log("No dataflow or execution selected.");
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const execution = await getDataflowExecution(
                dataflowIdToUse,
                executionIdToUse,
                authMethod,
            );

            if (execution) {
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
            } else {
                console.log("No execution found.");
            }
        } catch (error) {
            log.error("Error fetching dataflow execution:", error);
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
        console.log("");
    }
}
