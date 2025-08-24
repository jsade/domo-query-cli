import { getDataset, DomoDataset } from "../api/clients/domoClient";
import { ApiResponseMerger } from "../utils/apiResponseMerger";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { getDatabase } from "../core/database/JsonDatabase";
import {
    DatasetRepository,
    DatasetEntity,
} from "../core/database/repositories/DatasetRepository";
import chalk from "chalk";

/**
 * Gets detailed information about a specific dataset
 */
export class GetDatasetCommand extends BaseCommand {
    public readonly name = "get-dataset";
    public readonly description =
        "Gets detailed information about a specific dataset";

    /**
     * Executes the get-dataset command
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
            const datasetId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            // Check for database options
            const forceSync = args?.includes("--sync");
            const offlineMode = args?.includes("--offline");

            if (!datasetId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No dataset ID provided",
                            "MISSING_DATASET_ID",
                        ),
                    );
                } else {
                    console.log("No dataset selected.");
                }
                return;
            }

            let datasetResponse = null;
            let dataset: DomoDataset | null = null;
            let source = "api";

            // Try to use database first if not forcing sync
            if (!forceSync) {
                try {
                    const db = await getDatabase();
                    const datasetRepo = new DatasetRepository(db);

                    // Check if dataset exists in database
                    dataset = await datasetRepo.get(datasetId);

                    if (dataset) {
                        source = "database";
                        if (!this.isJsonOutput && !offlineMode) {
                            console.log(
                                chalk.gray(
                                    "(Using cached data. Use --sync to refresh from API)",
                                ),
                            );
                        }
                    } else if (!offlineMode) {
                        // Dataset not in database and not offline mode, fetch from API
                        datasetResponse = await getDataset(datasetId);

                        // Save to database for future use
                        const apiDataset = ApiResponseMerger.getBestData(
                            datasetResponse,
                        ) as DomoDataset;
                        if (apiDataset) {
                            await datasetRepo.save(apiDataset as DatasetEntity);
                        }
                    } else {
                        // Offline mode and dataset not in database
                        if (this.isJsonOutput) {
                            console.log(
                                JsonOutputFormatter.error(
                                    this.name,
                                    "Dataset not found in local database (offline mode)",
                                    "NOT_FOUND_OFFLINE",
                                ),
                            );
                        } else {
                            console.log(
                                chalk.yellow(
                                    "Dataset not found in local database (offline mode)",
                                ),
                            );
                        }
                        return;
                    }
                } catch (dbError) {
                    // Database error, fall back to API if not offline
                    if (!offlineMode) {
                        log.debug(
                            "Database error, falling back to API:",
                            dbError,
                        );
                        datasetResponse = await getDataset(datasetId);
                    } else {
                        throw dbError;
                    }
                }
            } else {
                // Force sync from API
                datasetResponse = await getDataset(datasetId);

                // Update database
                try {
                    const db = await getDatabase();
                    const datasetRepo = new DatasetRepository(db);
                    const apiDataset = ApiResponseMerger.getBestData(
                        datasetResponse,
                    ) as DomoDataset;
                    if (apiDataset) {
                        await datasetRepo.save(apiDataset as DatasetEntity);
                        if (!this.isJsonOutput) {
                            console.log(chalk.gray("(Updated local database)"));
                        }
                    }
                } catch (dbError) {
                    log.debug("Failed to update database:", dbError);
                }
            }

            // If we don't have dataset from database, get it from API response
            if (!dataset && datasetResponse) {
                dataset = ApiResponseMerger.getBestData(
                    datasetResponse,
                ) as DomoDataset | null;
            }

            if (dataset) {
                if (this.isJsonOutput) {
                    // For JSON output, return complete v1, v3, and merged data if available
                    const formattedOutput = datasetResponse
                        ? ApiResponseMerger.formatForOutput(datasetResponse)
                        : { merged: dataset, source };
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { dataset: formattedOutput },
                            { entityType: "dataset", source },
                        ),
                    );
                } else {
                    console.log(chalk.cyan("\nDataset Details:"));
                    console.log("----------------");
                    console.log(`ID: ${dataset.id}`);
                    console.log(`Name: ${dataset.name}`);
                    console.log(`Description: ${dataset.description || "N/A"}`);
                    console.log(`Rows: ${dataset.rows.toLocaleString()}`);
                    console.log(`Columns: ${dataset.columns}`);
                    console.log(
                        `Created: ${new Date(dataset.createdAt).toLocaleString()}`,
                    );
                    console.log(
                        `Updated: ${new Date(dataset.updatedAt).toLocaleString()}`,
                    );
                    console.log(
                        `Data Current At: ${dataset.dataCurrentAt ? new Date(dataset.dataCurrentAt).toLocaleString() : "N/A"}`,
                    );
                    const ownerDisplay =
                        typeof dataset.owner === "object" && dataset.owner
                            ? (
                                  dataset.owner as {
                                      displayName?: string;
                                      name?: string;
                                  }
                              ).displayName ||
                              (
                                  dataset.owner as {
                                      displayName?: string;
                                      name?: string;
                                  }
                              ).name ||
                              JSON.stringify(dataset.owner)
                            : dataset.owner || "N/A";
                    console.log(`Owner: ${ownerDisplay}`);
                    console.log(
                        `PDP Enabled: ${dataset.pdpEnabled !== undefined ? dataset.pdpEnabled.toString() : "N/A"}`,
                    );

                    // Display certification status if available
                    if (dataset.certification) {
                        console.log(chalk.cyan("\nCertification:"));
                        console.log("--------------");
                        console.log(
                            `State: ${dataset.certification.state || "N/A"}`,
                        );
                        if (dataset.certification.certifiedBy) {
                            console.log(
                                `Certified By: ${dataset.certification.certifiedBy}`,
                            );
                        }
                        if (dataset.certification.certifiedAt) {
                            console.log(
                                `Certified At: ${new Date(dataset.certification.certifiedAt).toLocaleString()}`,
                            );
                        }
                    }

                    // Display schema if available
                    if (dataset.schema && dataset.schema.length > 0) {
                        console.log(chalk.cyan("\nSchema:"));
                        console.log("-------");
                        const maxNameLength = Math.max(
                            ...dataset.schema.map(col => col.name.length),
                        );
                        dataset.schema.forEach(column => {
                            const name = column.name.padEnd(maxNameLength);
                            const type = column.type.padEnd(10);
                            const visible =
                                column.visible !== undefined
                                    ? column.visible
                                        ? "visible"
                                        : "hidden"
                                    : "";
                            console.log(`  ${name} ${type} ${visible}`.trim());
                        });
                    }

                    // Display policies if available and PDP is enabled
                    if (
                        dataset.pdpEnabled &&
                        dataset.policies &&
                        dataset.policies.length > 0
                    ) {
                        console.log(chalk.cyan("\nPDP Policies:"));
                        console.log("-------------");
                        dataset.policies.forEach(policy => {
                            console.log(
                                `  - ${policy.name || "Unnamed"} (${policy.type || "unknown"})`,
                            );
                            if (policy.filters && policy.filters.length > 0) {
                                policy.filters.forEach(filter => {
                                    const notPrefix = filter.not ? "NOT " : "";
                                    console.log(
                                        `    ${notPrefix}${filter.column} ${filter.operator} [${filter.values.join(", ")}]`,
                                    );
                                });
                            }
                        });
                    }

                    // Display tags if available
                    if (dataset.tags && dataset.tags.length > 0) {
                        console.log(chalk.cyan("\nTags:"));
                        console.log("-----");
                        console.log(`  ${dataset.tags.join(", ")}`);
                    }

                    await CommandUtils.exportData(
                        [dataset],
                        `Domo Dataset ${dataset.name}`,
                        "dataset",
                        saveOptions,
                    );

                    console.log("");
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Dataset not found",
                            "DATASET_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log("No dataset found.");
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
                log.error("Error fetching dataset:", error);
            }
        }
    }

    /**
     * Shows help for the get-dataset command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific dataset");
        console.log("Usage: get-dataset [dataset_id] [options]");
        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataset_id          Optional dataset ID to view. If not provided, you will be prompted to select a dataset",
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
            "  - Basic dataset properties: ID, Name, Description, Row/Column counts",
        );
        console.log("  - Timestamps: Created, Updated, Data Current At");
        console.log("  - Certification status and details");
        console.log("  - Schema with column names, types, and visibility");
        console.log(
            "  - PDP (Personalized Data Permissions) policies if enabled",
        );
        console.log("  - Associated tags");
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  get-dataset                     Prompt for dataset selection",
        );
        console.log(
            "  get-dataset abc-123-def         Get details for dataset with ID abc-123-def",
        );
        console.log(
            "  get-dataset abc-123 --save-md   Get details and save to markdown",
        );
        console.log(
            "  get-dataset abc-123 --format=json  Get details in JSON format",
        );
        console.log("");
    }
}
