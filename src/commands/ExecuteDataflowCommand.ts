import { executeDataflow } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
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
            const [dataflowId, mode, comment, saveOptionsRaw] =
                args && args.length > 0
                    ? [...CommandUtils.parseSaveOptions(args), null]
                    : [undefined, "NORMAL", undefined, null];

            const saveOptions = saveOptionsRaw ?? null;

            let id: string | undefined;
            if (typeof dataflowId === "string") {
                id = dataflowId;
            } else if (
                Array.isArray(dataflowId) &&
                typeof dataflowId[0] === "string"
            ) {
                id = dataflowId[0];
            }

            const execParams: {
                mode?: "NORMAL" | "DEBUG" | "PROFILE";
                comment?: string;
            } = {};

            if (
                typeof mode === "string" &&
                ["NORMAL", "DEBUG", "PROFILE"].includes(mode)
            ) {
                execParams.mode = mode as "NORMAL" | "DEBUG" | "PROFILE";
            }

            if (typeof comment === "string") {
                execParams.comment = comment;
            }

            if (!id) {
                console.log("No dataflow selected.");
                return;
            }

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            const execution = await executeDataflow(id, execParams, authMethod);

            if (execution) {
                console.log(chalk.cyan("\nDataflow Execution Result:"));
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
                console.log("No execution result.");
            }
        } catch (error) {
            log.error("Error executing dataflow:", error);
        }
    }

    /**
     * Shows help for the execute-dataflow command
     */
    public showHelp(): void {
        console.log("Executes a dataflow");
        console.log("Usage: execute-dataflow [dataflow_id] [parameters]");
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow_id         Optional dataflow ID. If not provided, you will be prompted to select a dataflow",
        );
        console.log(
            "  mode=<mode>         Execution mode: NORMAL, DEBUG, or PROFILE (default: NORMAL)",
        );
        console.log("  comment=<text>      Optional comment for the execution");
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  execute-dataflow                       Prompt for dataflow and execution options",
        );
        console.log(
            "  execute-dataflow abc123                Execute dataflow abc123 in NORMAL mode",
        );
        console.log(
            "  execute-dataflow abc123 mode=DEBUG     Execute dataflow abc123 in DEBUG mode",
        );
        console.log(
            '  execute-dataflow abc123 comment="Monthly refresh"  Execute with comment',
        );
        console.log("");
    }
}
