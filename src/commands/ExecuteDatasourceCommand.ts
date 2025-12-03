import { executeDatasources } from "../api/clients/datasourceApi.ts";
import { log } from "../utils/logger.ts";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter.ts";
import { BaseCommand } from "./BaseCommand.ts";
import { CommandUtils } from "./CommandUtils.ts";
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

            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract dataset IDs from positional arguments
            const datasetIds = parsedArgs.positional;

            if (datasetIds.length === 0) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "At least one dataset ID is required",
                            "MISSING_DATASET_IDS",
                        ),
                    );
                } else {
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
                }
                return;
            }

            // Parse options
            const shouldWait = parsedArgs.flags.has("wait");
            const pollInterval =
                typeof parsedArgs.params.interval === "number"
                    ? parsedArgs.params.interval
                    : 5000;
            const timeout =
                typeof parsedArgs.params.timeout === "number"
                    ? parsedArgs.params.timeout
                    : 600000;

            // Execute datasources
            if (!this.isJsonOutput) {
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

            // Output results
            this.outputResults(results, shouldWait);
        } catch (error) {
            log.error("Error executing datasource:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to execute datasource";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                throw error;
            }
        }
    }

    /**
     * Outputs execution results
     */
    private outputResults(
        results: ExecuteDatasourceResult[],
        waited: boolean,
    ): void {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        if (this.isJsonOutput) {
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
                error: r.error,
                errorCode: r.errorCode,
            }));

            console.log(
                JsonOutputFormatter.success(
                    this.name,
                    { executions: executionData },
                    {
                        count: results.length,
                        successCount,
                        failCount,
                        waited,
                    },
                ),
            );
        } else {
            console.log(chalk.cyan("\nDatasource Execution Results:"));
            console.log("─".repeat(60));

            for (const result of results) {
                const statusIcon = result.success ? "✓" : "✗";
                const statusColor = result.success ? chalk.green : chalk.red;

                console.log(
                    statusColor(`\n${statusIcon} Dataset: ${result.datasetId}`),
                );

                if (result.execution) {
                    console.log(
                        `  Execution ID: ${result.execution.executionId}`,
                    );
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
    }

    /**
     * Shows help for the execute-datasource command
     */
    public showHelp(): void {
        console.log(
            "Executes one or more datasource-based datasets (triggers connector updates)",
        );
        console.log(
            "Usage: execute-datasource <dataset_id> [dataset_id2...] [options]",
        );

        console.log(chalk.cyan("\nParameters:"));
        console.log("  dataset_id          One or more dataset IDs to execute");

        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --wait              Wait for execution(s) to complete before returning",
        );
        console.log(
            "  --interval=<ms>     Polling interval in milliseconds (default: 5000)",
        );
        console.log(
            "  --timeout=<ms>      Maximum wait time in milliseconds (default: 600000)",
        );
        console.log("  --format=json       Output results in JSON format");

        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  execute-datasource abc123                      Fire and forget single dataset",
        );
        console.log(
            "  execute-datasource abc123 def456               Execute multiple datasets",
        );
        console.log(
            "  execute-datasource abc123 --wait               Wait for completion",
        );
        console.log(
            "  execute-datasource abc123 def456 --wait        Execute multiple and wait",
        );
        console.log(
            "  execute-datasource abc123 --wait --timeout=300000  Wait with 5 minute timeout",
        );
        console.log(
            "  execute-datasource abc123 --format=json        JSON output for automation",
        );

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
        // Could be enhanced to suggest dataset IDs from the database
        return ["--wait", "--format=json", "--timeout=", "--interval="];
    }
}
