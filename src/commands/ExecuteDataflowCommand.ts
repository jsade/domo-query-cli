import { executeDataflow } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { checkReadOnlyMode } from "../utils/readOnlyGuard";
import { TerminalFormatter } from "../utils/terminalFormatter";
import chalk from "chalk";

/**
 * Executes a dataflow
 */
export class ExecuteDataflowCommand extends BaseCommand {
    public readonly name = "execute-dataflow";
    public readonly description = "Executes a dataflow";

    /**
     * Executes the execute-dataflow command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode before attempting to execute
            checkReadOnlyMode("execute-dataflow");

            const { parsed } = this.parseOutputConfig(args);

            // Get dataflow ID from positional argument
            const id = parsed.positional[0];

            if (!id) {
                this.outputErrorResult({
                    message: "No dataflow selected",
                    code: "MISSING_DATAFLOW_ID",
                });
                return;
            }

            // Parse execution parameters
            const execParams: {
                mode?: "NORMAL" | "DEBUG" | "PROFILE";
                comment?: string;
            } = {};

            // Parse mode parameter
            if (parsed.params.mode !== undefined) {
                const modeValue = String(parsed.params.mode).toUpperCase();
                if (["NORMAL", "DEBUG", "PROFILE"].includes(modeValue)) {
                    execParams.mode = modeValue as
                        | "NORMAL"
                        | "DEBUG"
                        | "PROFILE";
                } else {
                    this.outputErrorResult({
                        message: `Invalid mode value: ${modeValue}. Must be NORMAL, DEBUG, or PROFILE.`,
                        code: "INVALID_MODE",
                    });
                    return;
                }
            }

            // Parse comment parameter
            if (parsed.params.comment !== undefined) {
                execParams.comment = String(parsed.params.comment);
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const execution = await executeDataflow(id, execParams, authMethod);

            if (!execution) {
                this.outputErrorResult({
                    message: "No execution result received",
                    code: "NO_EXECUTION_RESULT",
                });
                return;
            }

            // Prepare execution data
            const executionData = {
                id: execution.id,
                state: execution.state,
                beginTime: execution.beginTime,
                endTime: execution.endTime,
                duration:
                    execution.endTime && execution.beginTime
                        ? (execution.endTime - execution.beginTime) / 1000
                        : null,
                dataflowId: id,
                params: execParams,
            };

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { execution: executionData },
                    metadata: {
                        dataflowId: id,
                        executionId: execution.id,
                        state: execution.state,
                    },
                },
                () => this.displayExecutionResult(execution, id),
                "dataflow-execution",
            );
        } catch (error) {
            log.error("Error executing dataflow:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to execute dataflow",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to execute dataflow."),
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
     * Display execution result in terminal format
     */
    private displayExecutionResult(
        execution: {
            id: number;
            state?: string;
            beginTime?: number;
            endTime?: number;
        },
        dataflowId: string,
    ): void {
        console.log(chalk.cyan("\nDataflow Execution Result:"));
        console.log("------------------------");
        console.log(`Dataflow ID: ${dataflowId}`);
        console.log(`Execution ID: ${execution.id}`);
        console.log(`State: ${execution.state || "N/A"}`);
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
     * Shows help for the execute-dataflow command
     */
    public showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: execute-dataflow [dataflow_id] [options]");

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            { Parameter: "dataflow_id", Description: "Dataflow ID to execute" },
            {
                Parameter: "mode",
                Description: "NORMAL, DEBUG, or PROFILE (default: NORMAL)",
            },
            { Parameter: "comment", Description: "Comment for the execution" },
        ];
        console.log(TerminalFormatter.table(paramsData));

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
                Command: "execute-dataflow abc123",
                Description: "Execute dataflow in NORMAL mode",
            },
            {
                Command: "execute-dataflow abc123 mode=DEBUG",
                Description: "Execute in DEBUG mode",
            },
            {
                Command: 'execute-dataflow abc123 comment="Monthly refresh"',
                Description: "Execute with comment",
            },
            {
                Command: "execute-dataflow abc123 --format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Command: "execute-dataflow abc123 --export=md",
                Description: "Export result as Markdown",
            },
            {
                Command: "execute-dataflow abc123 --format=json --export",
                Description: "JSON to stdout AND save to file",
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
            "--mode=NORMAL",
            "--mode=DEBUG",
            "--mode=PROFILE",
            "--comment",
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
