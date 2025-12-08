import { executeDatasources } from "../api/clients/datasourceApi.ts";
import { log } from "../utils/logger.ts";
import { TerminalFormatter } from "../utils/terminalFormatter.ts";
import { BaseCommand } from "./BaseCommand.ts";
import { checkReadOnlyMode } from "../utils/readOnlyGuard.ts";
import chalk from "chalk";
import type { ExecuteDatasourceResult } from "../api/clients/domoClient.ts";

/**
 * Executes one or more datasource-based datasets (connector updates)
 */
export class ExecuteDatasourceCommand extends BaseCommand {
    public readonly name = "execute-datasource";
    public readonly description =
        "Executes one or more datasource-based datasets (triggers connector updates)";

    /**
     * Executes the execute-datasource command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode before attempting to execute
            checkReadOnlyMode("execute-datasource");

            const { config, parsed } = this.parseOutputConfig(args);

            // Extract dataset IDs from positional arguments
            const datasetIds = parsed.positional;

            if (datasetIds.length === 0) {
                this.outputErrorResult(
                    {
                        message: "At least one dataset ID is required",
                        code: "MISSING_DATASET_IDS",
                    },
                    () => {
                        console.log(
                            chalk.red(
                                "\nError: At least one dataset ID is required.",
                            ),
                        );
                        console.log(
                            chalk.yellow(
                                "Usage: execute-datasource <dataset_id> [dataset_id2...] [--wait]",
                            ),
                        );
                    },
                );
                return;
            }

            // Parse options
            const shouldWait = parsed.flags.has("wait");
            const pollInterval =
                typeof parsed.params.interval === "number"
                    ? parsed.params.interval
                    : 5000;
            const timeout =
                typeof parsed.params.timeout === "number"
                    ? parsed.params.timeout
                    : 600000;

            // Execute datasources
            if (config.displayFormat !== "json") {
                console.log(
                    chalk.cyan(
                        `\nExecuting ${datasetIds.length} datasource(s)...`,
                    ),
                );
                if (shouldWait) {
                    console.log(chalk.gray("Waiting for completion..."));
                }
            }

            const results = await executeDatasources(datasetIds, {
                wait: shouldWait,
                pollInterval,
                timeout,
            });

            // Prepare execution data
            const executionData = results.map(r => ({
                datasetId: r.datasetId,
                success: r.success,
                executionId: r.execution?.executionId,
                state: r.execution?.state,
                startTime: r.execution?.startTime,
                endTime: r.execution?.endTime,
                duration:
                    r.execution?.endTime && r.execution?.startTime
                        ? (r.execution.endTime - r.execution.startTime) / 1000
                        : null,
                rowsProcessed: r.execution?.rowsProcessed,
                error: r.error,
                errorCode: r.errorCode,
            }));

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { executions: executionData },
                    metadata: {
                        count: results.length,
                        successCount,
                        failCount,
                        waited: shouldWait,
                    },
                },
                () => this.displayResults(results, shouldWait),
                "datasource-executions",
            );
        } catch (error) {
            log.error("Error executing datasource:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to execute datasource",
                },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            "Failed to execute datasource.",
                        ),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error("Check your parameters and try again.");
                },
            );
        }
    }

    /**
     * Display execution results as terminal output
     */
    private displayResults(
        results: ExecuteDatasourceResult[],
        _waited: boolean,
    ): void {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        console.log(chalk.cyan("\nDatasource Execution Results:"));
        console.log("─".repeat(60));

        for (const result of results) {
            const statusIcon = result.success ? "✓" : "✗";
            const statusColor = result.success ? chalk.green : chalk.red;

            console.log(
                statusColor(`\n${statusIcon} Dataset: ${result.datasetId}`),
            );

            if (result.execution) {
                console.log(`  Execution ID: ${result.execution.executionId}`);
                console.log(`  State: ${result.execution.state}`);

                if (result.execution.startTime) {
                    console.log(
                        `  Start Time: ${new Date(result.execution.startTime).toLocaleString()}`,
                    );
                }

                if (result.execution.endTime) {
                    console.log(
                        `  End Time: ${new Date(result.execution.endTime).toLocaleString()}`,
                    );

                    if (result.execution.startTime) {
                        const duration =
                            (result.execution.endTime -
                                result.execution.startTime) /
                            1000;
                        console.log(
                            `  Duration: ${duration.toFixed(2)} seconds`,
                        );
                    }
                }

                if (result.execution.rowsProcessed !== undefined) {
                    console.log(
                        `  Rows Processed: ${result.execution.rowsProcessed}`,
                    );
                }
            }

            if (result.error) {
                console.log(chalk.red(`  Error: ${result.error}`));
            }
        }

        console.log("\n" + "─".repeat(60));
        console.log(
            `Total: ${results.length} | ` +
                chalk.green(`Success: ${successCount}`) +
                ` | ` +
                chalk.red(`Failed: ${failCount}`),
        );
        console.log("");
    }

    /**
     * Shows help for the execute-datasource command
     */
    public showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: execute-datasource <dataset_id> [dataset_id2...] [options]",
        );

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "dataset_id",
                Description: "One or more dataset IDs to execute",
            },
        ];
        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--wait",
                Description: "Wait for execution(s) to complete",
            },
            {
                Option: "--interval=<ms>",
                Description: "Polling interval (default: 5000)",
            },
            {
                Option: "--timeout=<ms>",
                Description: "Maximum wait time (default: 600000)",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nOutput Options:"));
        const outputOptionsData = [
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
        console.log(TerminalFormatter.table(outputOptionsData));

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
                Command: "execute-datasource abc123",
                Description: "Fire and forget single dataset",
            },
            {
                Command: "execute-datasource abc123 def456",
                Description: "Execute multiple datasets",
            },
            {
                Command: "execute-datasource abc123 --wait",
                Description: "Wait for completion",
            },
            {
                Command: "execute-datasource abc123 def456 --wait",
                Description: "Execute multiple and wait",
            },
            {
                Command: "execute-datasource abc123 --wait --timeout=300000",
                Description: "Wait with 5 minute timeout",
            },
            {
                Command: "execute-datasource abc123 --format=json",
                Description: "JSON output for automation",
            },
            {
                Command: "execute-datasource abc123 --export=both",
                Description: "Export results to JSON and MD",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.cyan("\nNotes:"));
        console.log(
            "  - Requires API token authentication (DOMO_API_TOKEN and DOMO_API_HOST)",
        );
        console.log(
            "  - Only works with connector-based datasets (e.g., Google Sheets)",
        );
        console.log(
            "  - Standard datasets and dataflow outputs cannot be executed directly",
        );
        console.log("");
    }

    /**
     * Provides autocomplete suggestions for the execute-datasource command
     * @returns Array of suggestion strings
     */
    public async autocomplete(): Promise<string[]> {
        return [
            "--wait",
            "--timeout=",
            "--interval=",
            // Unified output flags
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy flags
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
    }
}
