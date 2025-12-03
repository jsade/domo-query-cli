import { getDataflow, getDataflowDual } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { DomoDataflow } from "../api/clients/domoClient";
import { ApiResponseMerger } from "../utils/apiResponseMerger";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
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
            const { parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const dataflowId = parsed.positional[0];

            if (!dataflowId) {
                this.outputErrorResult({
                    message: "No dataflow ID provided",
                    code: "MISSING_DATAFLOW_ID",
                });
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // Fetch both responses (needed for both JSON and table modes)
            const dualResponse = await getDataflowDual(dataflowId, authMethod);
            const formattedResponse =
                ApiResponseMerger.formatForOutput(dualResponse);

            // Check if dataflow was found
            if (
                !formattedResponse.v1 &&
                !formattedResponse.v2 &&
                !formattedResponse.merged
            ) {
                this.outputErrorResult({
                    message: "Dataflow not found",
                    code: "DATAFLOW_NOT_FOUND",
                });
                return;
            }

            // For table mode, also get merged data
            const mergedDataflow = await getDataflow(dataflowId, authMethod);

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { dataflow: formattedResponse },
                    metadata: {
                        entityType: "dataflow",
                        note: "Response includes v1 (transformation details), v2 (current API), and merged data when available with API token and DOMO_API_HOST",
                    },
                },
                () => this.displayDataflow(mergedDataflow),
                "dataflow",
            );
        } catch (error) {
            log.error("Error fetching dataflow:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error ? error.message : String(error),
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to fetch dataflow."),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error(
                        "Check your authentication and dataflow ID, then try again.",
                    );
                },
            );
        }
    }

    /**
     * Display dataflow details in table format
     */
    private displayDataflow(dataflow: DomoDataflow | null): void {
        if (!dataflow) {
            console.log("No dataflow found.");
            return;
        }

        console.log(chalk.cyan("\nDataflow Details:"));
        console.log("----------------");
        console.log(`ID: ${dataflow.id}`);
        console.log(`Name: ${dataflow.name}`);
        console.log(`Description: ${dataflow.description || "N/A"}`);
        console.log(`Status: ${dataflow.status || dataflow.runState || "N/A"}`);
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
            `Input Count: ${dataflow.inputCount || 0}${dataflow.inputs && dataflow.inputs.length > 0 ? "\n" + dataflow.inputs.map((input: { name: string }) => "- " + input.name + "\n").join("") + "" : ""}`,
        );
        console.log(
            `Output Count: ${dataflow.outputCount || 0}${dataflow.outputs && dataflow.outputs.length > 0 ? "\n" + dataflow.outputs.map((output: { name: string }) => "- " + output.name + "\n").join("") + "" : ""}`,
        );
        console.log(`Execution Count: ${dataflow.executionCount || 0}`);

        // Display additional v1 fields if available
        if (
            dataflow.triggerSettings?.triggers &&
            dataflow.triggerSettings.triggers.length > 0
        ) {
            console.log(chalk.cyan("\nTriggers:"));
            console.log("---------");
            dataflow.triggerSettings.triggers.forEach(
                (trigger: {
                    title?: string;
                    triggerEvents?: Array<{
                        type?: string;
                        datasetId?: string;
                    }>;
                }) => {
                    console.log(`  - ${trigger.title || "Unnamed trigger"}`);
                    if (trigger.triggerEvents) {
                        trigger.triggerEvents.forEach(event => {
                            console.log(
                                `    Event: ${event.type} on dataset ${event.datasetId}`,
                            );
                        });
                    }
                },
            );
        }

        if (dataflow.engineProperties) {
            console.log(chalk.cyan("\nEngine Properties:"));
            console.log("------------------");
            Object.entries(dataflow.engineProperties).forEach(
                ([key, value]) => {
                    console.log(`  ${key}: ${value}`);
                },
            );
        }

        if (dataflow.settings?.sqlDialect) {
            console.log(`SQL Dialect: ${dataflow.settings.sqlDialect}`);
        }

        if (dataflow.hydrationState) {
            console.log(`Hydration State: ${dataflow.hydrationState}`);
        }

        if (dataflow.magic !== undefined) {
            console.log(`Magic ETL: ${dataflow.magic}`);
        }

        if (dataflow.subsetProcessing !== undefined) {
            console.log(`Subset Processing: ${dataflow.subsetProcessing}`);
        }

        if (dataflow.onboardFlowVersionDetails) {
            const version = dataflow.onboardFlowVersionDetails;
            console.log(chalk.cyan("\nVersion Details:"));
            console.log("----------------");
            console.log(`  Version Number: ${version.versionNumber || "N/A"}`);
            if (version.description) {
                console.log(`  Description: ${version.description}`);
            }
            if (version.timeStamp) {
                console.log(
                    `  Timestamp: ${new Date(version.timeStamp).toLocaleString()}`,
                );
            }
        }

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
                console.log(`ID: ${input.dataSourceId}, Name: ${input.name}`);
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
                console.log(`ID: ${output.dataSourceId}, Name: ${output.name}`);
            });
        }

        console.log("");
    }

    /**
     * Shows help for the get-dataflow command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific dataflow");
        console.log("\nUsage: get-dataflow [dataflow_id] [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID to view. If not provided, you will be prompted to select a dataflow",
        );

        console.log(chalk.cyan("\nOutput Options:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            { Option: "--export=md", Description: "Export as Markdown" },
            { Option: "--export=both", Description: "Export both formats" },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            { Option: "--quiet", Description: "Suppress export messages" },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

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
        console.log(
            chalk.cyan("\nWith API Token and DOMO_API_HOST configured:"),
        );
        console.log("  - Trigger configurations and schedules");
        console.log("  - Engine properties and SQL dialect");
        console.log("  - Version history with descriptions");
        console.log(
            "  - Transformation steps and dataflow logic (in JSON output)",
        );
        console.log(
            "  - GUI canvas structure for visual representation (in JSON output)",
        );

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "get-dataflow",
                Description: "Prompt for dataflow selection",
            },
            {
                Command: "get-dataflow abc123",
                Description: "Get details for dataflow with ID abc123",
            },
            {
                Command: "get-dataflow abc123 --export=md",
                Description: "Get details and save to markdown",
            },
            {
                Command: "get-dataflow abc123 --format=json",
                Description: "Get details in JSON format",
            },
            {
                Command: "get-dataflow abc123 --format=json --export",
                Description: "Output JSON to stdout AND save to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
