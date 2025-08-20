import { getDataflow } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
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
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract ID from positional args
            const dataflowId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            if (!dataflowId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No dataflow ID provided",
                            "MISSING_DATAFLOW_ID",
                        ),
                    );
                } else {
                    console.log("No dataflow selected.");
                }
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const dataflow = await getDataflow(dataflowId, authMethod);

            if (dataflow) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { dataflow: dataflow },
                            { entityType: "dataflow" },
                        ),
                    );
                } else {
                    console.log(chalk.cyan("\nDataflow Details:"));
                    console.log("----------------");
                    console.log(`ID: ${dataflow.id}`);
                    console.log(`Name: ${dataflow.name}`);
                    console.log(
                        `Description: ${dataflow.description || "N/A"}`,
                    );
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
                    console.log(
                        `Owner: ${dataflow.responsibleUserId || "N/A"}`,
                    );
                    console.log(
                        `Enabled: ${dataflow.enabled !== undefined ? dataflow.enabled.toString() : "N/A"}`,
                    );
                    console.log(
                        `Input Count: ${dataflow.inputCount || 0}${dataflow.inputs && dataflow.inputs.length > 0 ? "\n" + dataflow.inputs.map(input => "- " + input.name + "\n").join("") + "" : ""}`,
                    );
                    console.log(
                        `Output Count: ${dataflow.outputCount || 0}${dataflow.outputs && dataflow.outputs.length > 0 ? "\n" + dataflow.outputs.map(output => "- " + output.name + "\n").join("") + "" : ""}`,
                    );
                    console.log(
                        `Execution Count: ${dataflow.executionCount || 0}`,
                    );

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
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Dataflow not found",
                            "DATAFLOW_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log("No dataflow found.");
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
                log.error("Error fetching dataflow:", error);
            }
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
        console.log("  --format=json       Output results in JSON format");
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
        console.log(
            "  get-dataflow abc123 --format=json  Get details in JSON format",
        );
        console.log("");
    }
}
