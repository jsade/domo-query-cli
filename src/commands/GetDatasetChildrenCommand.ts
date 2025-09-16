import {
    getDatasetLineage,
    DataflowLineageQueryParams,
    LineageEntity,
    getDatasetLegacy,
    getCard,
} from "../api/clients/domoClient";
import { getDataflow } from "../api/clients/dataflowApi";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Gets direct child entities for a specific dataset from the API
 */
export class GetDatasetChildrenCommand extends BaseCommand {
    public readonly name = "get-dataset-children";
    public readonly description =
        "Gets direct children for a dataset from the API";

    /**
     * Executes the get-dataset-children command
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
                        "Usage: get-dataset-children <dataset-id> [options]",
                    );
                    console.log("No dataset ID provided.");
                }
                return;
            }

            // Parse query parameters
            const queryParams: DataflowLineageQueryParams = {};

            // Check for traverse options (default to downstream-only for this command)
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

            // If neither specified, default to downstream-only to minimize payload
            if (
                queryParams.traverseUp === undefined &&
                queryParams.traverseDown === undefined
            ) {
                queryParams.traverseUp = false;
                queryParams.traverseDown = true;
            }

            // Check for entity types filter
            const entities =
                parsedArgs.params.entities || parsedArgs.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Children of a dataset can include DATA_SOURCE or CARD (and sometimes DATAFLOW)
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW,CARD";
            }

            if (!this.isJsonOutput) {
                console.log(
                    chalk.cyan(`\nFetching children for dataset: ${datasetId}`),
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
                    console.log(chalk.red("Failed to fetch dataset children."));
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

            // Build a map of child keys to full child node objects from the lineage response
            const childrenMap: Record<string, unknown> = {};
            const minimalChildren: Array<Pick<LineageEntity, "type" | "id">> = [];

            for (const c of lineageData.children || []) {
                const key = `${c.type}${c.id}`;
                minimalChildren.push({ type: c.type, id: c.id });

                if (lineageResponse[key]) {
                    childrenMap[key] = lineageResponse[key];
                } else {
                    // Fallback to minimal object if full node isn't present
                    childrenMap[key] = { type: c.type, id: c.id };
                }
            }

            // Enrich with names where possible
            await Promise.all(
                (lineageData.children || []).map(async c => {
                    const key = `${c.type}${c.id}`;
                    try {
                        if (c.type === "DATA_SOURCE") {
                            const ds = await getDatasetLegacy(c.id);
                            if (ds?.name) {
                                childrenMap[key] = {
                                    ...(childrenMap[key] as Record<string, unknown>),
                                    name: ds.name,
                                };
                            }
                        } else if (c.type === "CARD") {
                            const card = await getCard(c.id);
                            const title = card?.title || card?.cardTitle;
                            if (title) {
                                childrenMap[key] = {
                                    ...(childrenMap[key] as Record<string, unknown>),
                                    name: title,
                                };
                            }
                        } else if (c.type === "DATAFLOW") {
                            const df = await getDataflow(c.id);
                            if (df?.name) {
                                childrenMap[key] = {
                                    ...(childrenMap[key] as Record<string, unknown>),
                                    name: df.name,
                                };
                            }
                        }
                    } catch (e) {
                        // Non-fatal: continue without name if lookup fails
                        log.debug(
                            `Name lookup failed for ${c.type} ${c.id}: ${e instanceof Error ? e.message : String(e)}`,
                        );
                    }
                }),
            );

            if (this.isJsonOutput) {
                const childrenArray = Object.keys(childrenMap).map(
                    key => childrenMap[key],
                );
                console.log(
                    JsonOutputFormatter.success(
                        this.name,
                        { children: childrenArray, ...childrenMap },
                        {
                            datasetId,
                            entityType: "dataset",
                            note: "Children extracted from Domo API v1/lineage endpoint",
                        },
                    ),
                );
            } else {
                const childrenCount = Object.keys(childrenMap).length;
                if (childrenCount === 0) {
                    console.log("No children found for this dataset.\n");
                } else {
                    console.log(chalk.cyan("Child Entities:"));
                    this.displayMinimalEntities(minimalChildren, "  ");
                    console.log("");
                }

                // Export data if requested
                await CommandUtils.exportData(
                    [
                        {
                            datasetId,
                            children: Object.keys(childrenMap).map(
                                key => childrenMap[key],
                            ),
                            childrenMap,
                        },
                    ],
                    `Dataset Children for ${datasetId}`,
                    "dataset-children",
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
                log.error("Error fetching dataset children:", error);
                console.error(chalk.red("Failed to fetch dataset children."));
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
     * Shows help for the get-dataset-children command
     */
    public showHelp(): void {
        console.log(
            "Gets direct children for a specific dataset from the Domo API",
        );
        console.log("\nUsage: get-dataset-children <dataset-id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataset-id          The ID of the dataset to get children for",
        );

        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --traverse-up=<true|false>    Traverse up the lineage graph (default: false)",
        );
        console.log(
            "  --traverse-down=<true|false>  Traverse down the lineage graph (default: true)",
        );
        console.log(
            "  --entities=<types>            Entity types to request (comma-separated)",
        );
        console.log(
            "                                Default: DATA_SOURCE,DATAFLOW,CARD",
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
        console.log("  get-dataset-children abc-123-def");
        console.log(
            "    Get direct children (datasets/cards) for dataset abc-123-def",
        );
        console.log("");
        console.log("  get-dataset-children abc-123 --format=json");
        console.log("    Output children in JSON format");

        console.log(chalk.cyan("\nNote:"));
        console.log(
            "  This command requires API token authentication and DOMO_API_HOST",
        );
        console.log("  configuration to access the v1 lineage endpoint.");
    }
}
