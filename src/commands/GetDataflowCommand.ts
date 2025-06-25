import { getDataflow } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Gets detailed information about a specific dataflow
 */
export class GetDataflowCommand extends BaseCommand {
    public readonly name = "get-dataflow";
    public readonly description =
        "Gets detailed information about a specific dataflow";

    /**
     * Executes the get-dataflow command
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

            const dataflow = await getDataflow(id, authMethod);

            if (dataflow) {
                console.log(chalk.cyan("\nDataflow Details:"));
                console.log("----------------");
                console.log(`ID: ${dataflow.id}`);
                console.log(`Name: ${dataflow.name}`);
                console.log(`Description: ${dataflow.description || "N/A"}`);
                console.log(
                    `Status: ${dataflow.status || dataflow.runState || "N/A"}`,
                );
                console.log(
                    `Last Run: ${dataflow.lastExecution?.endTime ? new Date(dataflow.lastExecution?.endTime || dataflow.lastExecution?.endTime).toLocaleString() : "N/A"}`,
                );
                console.log(
                    `Created: ${new Date(dataflow.createdAt).toLocaleString()}`,
                );
                console.log(
                    `Updated: ${dataflow.modified ? new Date(dataflow.modified).toLocaleString() : "N/A"}`,
                );
                console.log(`Owner: ${dataflow.responsibleUserId || "N/A"}`);
                console.log(
                    `Enabled: ${dataflow.enabled !== undefined ? dataflow.enabled.toString() : "N/A"}`,
                );
                console.log(
                    `Input Count: ${dataflow.inputCount || 0}${dataflow.inputs && dataflow.inputs.length > 0 ? "\n" + dataflow.inputs.map(input => "- " + input.name + "\n").join("") + "" : ""}`,
                );
                console.log(
                    `Output Count: ${dataflow.outputCount || 0}${dataflow.outputs && dataflow.outputs.length > 0 ? "\n" + dataflow.outputs.map(output => "- " + output.name + "\n").join("") + "" : ""}`,
                );
                console.log(`Execution Count: ${dataflow.executionCount || 0}`);

                // Display inputs if available
                if (dataflow.inputs && dataflow.inputs.length > 0) {
                    console.log(chalk.cyan("\nInputs:"));
                    console.log("-------");
                    const inputNames = dataflow.inputs
                        .map(input => input.name)
                        .join(", ");
                    console.log(`Names: ${inputNames}`);
                    console.log(chalk.cyan("\nInput Details:"));
                    dataflow.inputs.forEach(input => {
                        console.log(
                            `ID: ${input.dataSourceId}, Name: ${input.name}`,
                        );
                    });
                }

                // Display outputs if available
                if (dataflow.outputs && dataflow.outputs.length > 0) {
                    console.log(chalk.cyan("\nOutputs:"));
                    console.log("--------");
                    const outputNames = dataflow.outputs
                        .map(output => output.name)
                        .join(", ");
                    console.log(`Names: ${outputNames}`);
                    console.log(chalk.cyan("\nOutput Details:"));
                    dataflow.outputs.forEach(output => {
                        console.log(
                            `ID: ${output.dataSourceId}, Name: ${output.name}`,
                        );
                    });
                }

                await CommandUtils.exportData(
                    [dataflow],
                    `Domo Dataflow ${dataflow.name}`,
                    "dataflow",
                    saveOptions,
                );

                console.log("");
            } else {
                console.log("No dataflow found.");
            }
        } catch (error) {
            log.error("Error fetching dataflow:", error);
        }
    }

    /**
     * Shows help for the get-dataflow command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific dataflow");
        console.log("Usage: get-dataflow [dataflow_id] [options]");
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID to view. If not provided, you will be prompted to select a dataflow",
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
        console.log(chalk.cyan("\nInfo Displayed:"));
        console.log(
            "  - Basic dataflow properties: ID, Name, Description, Status, etc.",
        );
        console.log("  - Timestamps: Last Run, Created, Updated");
        console.log(
            "  - Usage stats: Input/Output Count (with dataset names), Execution Count",
        );
        console.log("  - Detailed list of inputs with their IDs and names");
        console.log("  - Detailed list of outputs with their IDs and names");
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  get-dataflow                   Prompt for dataflow selection",
        );
        console.log(
            "  get-dataflow abc123            Get details for dataflow with ID abc123",
        );
        console.log(
            "  get-dataflow abc123 --save-md  Get details and save to markdown",
        );
        console.log("");
    }
}
