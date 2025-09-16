import {
    getDatasetLineage,
    DataflowLineageQueryParams,
    LineageEntity,
    getDatasetLegacy,
} from "../api/clients/domoClient";
import { getDataflow } from "../api/clients/dataflowApi";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Gets direct parent entities for a specific dataset from the API
 */
export class GetDatasetParentsCommand extends BaseCommand {
    public readonly name = "get-dataset-parents";
    public readonly description =
        "Gets direct parents for a dataset from the API";

    /**
     * Executes the get-dataset-parents command
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
                    console.log(
                        "Usage: get-dataset-parents <dataset-id> [options]",
                    );
                    console.log("No dataset ID provided.");
                }
                return;
            }

            // Parse query parameters
            const queryParams: DataflowLineageQueryParams = {};

            // Check for traverse options (default to upstream-only for this command)
            const traverseUp =
                parsedArgs.params["traverse-up"] ||
                parsedArgs.params.traverseUp;
            if (traverseUp === "true" || traverseUp === true) {
                queryParams.traverseUp = true;
            }

            const traverseDown =
                parsedArgs.params["traverse-down"] ||
                parsedArgs.params.traverseDown;
            if (traverseDown === "true" || traverseDown === true) {
                queryParams.traverseDown = true;
            }

            // If neither specified, default to upstream-only to minimize payload
            if (
                queryParams.traverseUp === undefined &&
                queryParams.traverseDown === undefined
            ) {
                queryParams.traverseUp = true;
                queryParams.traverseDown = false;
            }

            // Check for entity types filter
            const entities =
                parsedArgs.params.entities || parsedArgs.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Parents of a dataset are typically DATAFLOW or DATA_SOURCE
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW";
            }

            if (!this.isJsonOutput) {
                console.log(
                    chalk.cyan(`\nFetching parents for dataset: ${datasetId}`),
                );
                console.log(`Traverse Up: ${queryParams.traverseUp}`);
                console.log(`Traverse Down: ${queryParams.traverseDown}`);
                console.log(`Request Entities: ${queryParams.requestEntities}`);
                console.log("");
            }

            // Fetch lineage from API
            const lineageResponse = await getDatasetLineage(
                datasetId,
                queryParams,
            );

            if (!lineageResponse) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                            "CONFIG_ERROR",
                        ),
                    );
                } else {
                    console.log(chalk.red("Failed to fetch dataset parents."));
                    console.log(
                        "This command requires API token and DOMO_API_HOST configuration.",
                    );
                }
                return;
            }

            // Extract dataset node
            const datasetKey = `DATA_SOURCE${datasetId}`;
            const lineageData = lineageResponse[datasetKey];

            if (!lineageData) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            `No lineage data found for dataset ${datasetId}`,
                            "NO_LINEAGE_DATA",
                        ),
                    );
                } else {
                    console.log(
                        `No lineage data found for dataset ${datasetId}`,
                    );
                }
                return;
            }

            // Build a map of parent keys to full parent node objects from the lineage response
            const parentsMap: Record<string, unknown> = {};
            const minimalParents: Array<Pick<LineageEntity, "type" | "id">> =
                [];

            // First populate map with existing nodes or minimal placeholders
            for (const p of lineageData.parents || []) {
                const key = `${p.type}${p.id}`;
                minimalParents.push({ type: p.type, id: p.id });

                const baseNode = lineageResponse[key]
                    ? { ...(lineageResponse[key] as Record<string, unknown>) }
                    : { type: p.type, id: p.id };
                parentsMap[key] = baseNode;
            }

            // Enrich with names where possible
            await Promise.all(
                (lineageData.parents || []).map(async p => {
                    const key = `${p.type}${p.id}`;
                    try {
                        if (p.type === "DATAFLOW") {
                            const df = await getDataflow(p.id);
                            if (df?.name) {
                                parentsMap[key] = {
                                    ...(parentsMap[key] as Record<
                                        string,
                                        unknown
                                    >),
                                    name: df.name,
                                };
                            }
                        } else if (p.type === "DATA_SOURCE") {
                            const ds = await getDatasetLegacy(p.id);
                            if (ds?.name) {
                                parentsMap[key] = {
                                    ...(parentsMap[key] as Record<
                                        string,
                                        unknown
                                    >),
                                    name: ds.name,
                                };
                            }
                        }
                    } catch (e) {
                        // Non-fatal: if name fetch fails, continue without name
                        log.debug(
                            `Name lookup failed for ${p.type} ${p.id}: ${e instanceof Error ? e.message : String(e)}`,
                        );
                    }
                }),
            );

            if (this.isJsonOutput) {
                const parentsArray = Object.keys(parentsMap).map(
                    key => parentsMap[key],
                );
                console.log(
                    JsonOutputFormatter.success(
                        this.name,
                        { parents: parentsArray, ...parentsMap },
                        {
                            datasetId,
                            entityType: "dataset",
                            note: "Parents extracted from Domo API v1/lineage endpoint",
                        },
                    ),
                );
            } else {
                const parentsCount = Object.keys(parentsMap).length;
                if (parentsCount === 0) {
                    console.log("No parents found for this dataset.\n");
                } else {
                    console.log(chalk.cyan("Parent Entities:"));
                    this.displayMinimalEntities(minimalParents, "  ");
                    console.log("");
                }

                // Export data if requested
                await CommandUtils.exportData(
                    [
                        {
                            datasetId,
                            parents: Object.keys(parentsMap).map(
                                key => parentsMap[key],
                            ),
                            parentsMap,
                        },
                    ],
                    `Dataset Parents for ${datasetId}`,
                    "dataset-parents",
                    saveOptions,
                );
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
                log.error("Error fetching dataset parents:", error);
                console.error(chalk.red("Failed to fetch dataset parents."));
                if (error instanceof Error) {
                    console.error(error.message);
                }
            }
        }
    }

    /**
     * Display minimal entities (type, id)
     */
    private displayMinimalEntities(
        entities: Array<Pick<LineageEntity, "type" | "id">>,
        indent: string = "",
    ): void {
        for (const entity of entities) {
            console.log(`${indent}• ${entity.type} (${entity.id})`);
        }
    }

    /**
     * Shows help for the get-dataset-parents command
     */
    public showHelp(): void {
        console.log(
            "Gets direct parents for a specific dataset from the Domo API",
        );
        console.log("\nUsage: get-dataset-parents <dataset-id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataset-id          The ID of the dataset to get parents for",
        );

        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --traverse-up=<true|false>    Traverse up the lineage graph (default: true)",
        );
        console.log(
            "  --traverse-down=<true|false>  Traverse down the lineage graph (default: false)",
        );
        console.log(
            "  --entities=<types>            Entity types to request (comma-separated)",
        );
        console.log(
            "                                Default: DATA_SOURCE,DATAFLOW",
        );
        console.log(
            "  --format=json                 Output results in JSON format",
        );
        console.log(
            "  --save                        Save results to JSON file",
        );
        console.log(
            "  --save-json                   Save results to JSON file",
        );
        console.log(
            "  --save-md                     Save results to Markdown file",
        );
        console.log(
            "  --save-both                   Save to both JSON and Markdown",
        );
        console.log(
            "  --path=<directory>            Specify custom export directory",
        );

        console.log(chalk.cyan("\nExamples:"));
        console.log("  get-dataset-parents abc-123-def");
        console.log(
            "    Get direct parents (dataflows/datasets) for dataset abc-123-def",
        );
        console.log("");
        console.log("  get-dataset-parents abc-123 --format=json");
        console.log("    Output parents in JSON format");

        console.log(chalk.cyan("\nNote:"));
        console.log(
            "  This command requires API token authentication and DOMO_API_HOST",
        );
        console.log("  configuration to access the v1 lineage endpoint.");
    }
}
