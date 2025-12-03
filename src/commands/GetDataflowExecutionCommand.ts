import { getDataflowExecution } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import type { DomoDataflowExecution } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { TerminalFormatter } from "../utils/terminalFormatter";
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
            const { parsed } = this.parseOutputConfig(args);

            // Extract IDs from positional args
            const dataflowId = parsed.positional[0];
            const executionId = parsed.positional[1];

            if (!dataflowId || !executionId) {
                this.outputErrorResult({
                    message: "Both dataflow ID and execution ID are required",
                    code: "MISSING_PARAMETERS",
                });
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const execution = await getDataflowExecution(
                dataflowId,
                executionId,
                authMethod,
            );

            if (!execution) {
                this.outputErrorResult({
                    message: "Execution not found",
                    code: "EXECUTION_NOT_FOUND",
                });
                return;
            }

            await this.output(
                {
                    success: true,
                    data: { execution },
                    metadata: { entityType: "execution" },
                },
                () => this.displayExecution(execution),
                "dataflow-execution",
            );
        } catch (error) {
            log.error("Error fetching dataflow execution:", error);
            this.outputErrorResult({
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch dataflow execution",
                code: "FETCH_ERROR",
            });
        }
    }

    /**
     * Display execution details as formatted output
     */
    private displayExecution(execution: DomoDataflowExecution): void {
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
        console.log("");
    }

    /**
     * Shows help for the get-dataflow-execution command
     */
    public showHelp(): void {
        console.log(
            "Gets detailed information about a specific dataflow execution",
        );
        console.log(
            "\nUsage: get-dataflow-execution [dataflow_id] [execution_id] [options]",
        );
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID. If not provided, you will be prompted to select a dataflow",
        );
        console.log(
            "  execution_id        Optional execution ID. If not provided, you will be prompted to select an execution",
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

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "get-dataflow-execution",
                Description: "Prompt for dataflow and execution selection",
            },
            {
                Command: "get-dataflow-execution abc123",
                Description: "Select dataflow abc123 and prompt for execution",
            },
            {
                Command: "get-dataflow-execution abc123 12345",
                Description:
                    "Get details for execution 12345 of dataflow abc123",
            },
            {
                Command: "get-dataflow-execution abc123 12345 --export=md",
                Description: "Get execution details and save to markdown",
            },
            {
                Command: "get-dataflow-execution abc123 12345 --format=json",
                Description: "Get execution details in JSON format",
            },
            {
                Command:
                    "get-dataflow-execution abc123 12345 --format=json --export",
                Description: "Output JSON to stdout AND save to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
        console.log("");
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
