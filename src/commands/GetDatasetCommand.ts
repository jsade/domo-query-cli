import { getDataset, DomoDataset } from "../api/clients/domoClient";
import { ApiResponseMerger } from "../utils/apiResponseMerger";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import {
    DatasetRepository,
    DatasetEntity,
} from "../core/database/repositories/DatasetRepository";
import chalk from "chalk";
import { TerminalFormatter } from "../utils/terminalFormatter";

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
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const datasetId = parsed.positional[0];

            // Check for database options
            const forceSync = parsed.flags.has("sync");
            const offlineMode = parsed.flags.has("offline");

            if (!datasetId) {
                this.outputErrorResult({
                    message: "No dataset ID provided",
                    code: "MISSING_DATASET_ID",
                });
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
                        if (config.displayFormat !== "json" && !offlineMode) {
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
                        this.outputErrorResult({
                            message:
                                "Dataset not found in local database (offline mode)",
                            code: "NOT_FOUND_OFFLINE",
                        });
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
                        if (config.displayFormat !== "json") {
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
                // For JSON output, return complete v1, v3, and merged data if available
                const formattedOutput = datasetResponse
                    ? ApiResponseMerger.formatForOutput(datasetResponse)
                    : { merged: dataset, source };

                await this.output(
                    {
                        success: true,
                        data: { dataset: formattedOutput },
                        metadata: { entityType: "dataset", source },
                    },
                    () => this.displayDataset(dataset, datasetResponse),
                    "dataset",
                );
            } else {
                this.outputErrorResult({
                    message: "Dataset not found",
                    code: "DATASET_NOT_FOUND",
                });
            }
        } catch (error) {
            log.error("Error fetching dataset:", error);
            this.outputErrorResult({
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch dataset",
                code: "FETCH_ERROR",
            });
        }
    }

    /**
     * Display dataset details in table format
     */
    private displayDataset(
        dataset: DomoDataset,
        _datasetResponse: unknown,
    ): void {
        console.log(chalk.cyan("\nDataset Details:"));
        console.log("----------------");
        console.log(`ID: ${dataset.id}`);
        console.log(`Name: ${dataset.name}`);
        console.log(`Description: ${dataset.description || "N/A"}`);
        console.log(`Rows: ${dataset.rows.toLocaleString()}`);
        console.log(`Columns: ${dataset.columns}`);
        console.log(`Created: ${new Date(dataset.createdAt).toLocaleString()}`);
        console.log(`Updated: ${new Date(dataset.updatedAt).toLocaleString()}`);
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
            console.log(`State: ${dataset.certification.state || "N/A"}`);
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

        console.log("");
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

        console.log(chalk.cyan("\nDatabase Options:"));
        const databaseData = [
            {
                Option: "--sync",
                Description: "Force refresh from API, update local cache",
            },
            {
                Option: "--offline",
                Description: "Use only cached data, no API calls",
            },
        ];
        console.log(TerminalFormatter.table(databaseData));

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
        const examplesData = [
            {
                Command: "get-dataset abc-123-def",
                Description: "Get details for dataset with ID",
            },
            {
                Command: "get-dataset abc-123 --sync",
                Description: "Force refresh from API",
            },
            {
                Command: "get-dataset abc-123 --offline",
                Description: "Use cached data only",
            },
            {
                Command: "get-dataset abc-123 --export=md",
                Description: "Get details and export to markdown",
            },
            {
                Command: "get-dataset abc-123 --format=json",
                Description: "Output in JSON format",
            },
            {
                Command: "get-dataset abc-123 --format=json --export",
                Description: "JSON to stdout AND save to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--sync",
            "--offline",
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
