import { getDataflowLineage } from "../api/clients/dataflowApi";
import {
    DataflowLineageQueryParams,
    LineageEntity,
} from "../api/clients/domoClient";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Gets lineage information for a specific dataflow from the API
 */
export class GetDataflowLineageCommand extends BaseCommand {
    public readonly name = "get-dataflow-lineage";
    public readonly description =
        "Gets lineage information for a specific dataflow from the API";

    /**
     * Executes the get-dataflow-lineage command
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
            const dataflowId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            if (!dataflowId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No dataflow ID provided",
                            "MISSING_DATAFLOW_ID",
                        ),
                    );
                } else {
                    console.log(
                        "Usage: get-dataflow-lineage <dataflow-id> [options]",
                    );
                    console.log("No dataflow ID provided.");
                }
                return;
            }

            // Parse query parameters
            const queryParams: DataflowLineageQueryParams = {};

            // Check for traverse options
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

            // Default to traversing both directions if neither is specified
            if (
                queryParams.traverseUp === undefined &&
                queryParams.traverseDown === undefined
            ) {
                queryParams.traverseUp = false;
                queryParams.traverseDown = false;
            }

            // Check for entity types filter
            const entities =
                parsedArgs.params.entities || parsedArgs.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Default to requesting all entity types
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW,CARD";
            }

            if (!this.isJsonOutput) {
                console.log(
                    chalk.cyan(
                        `\nFetching lineage for dataflow: ${dataflowId}`,
                    ),
                );
                console.log(`Traverse Up: ${queryParams.traverseUp}`);
                console.log(`Traverse Down: ${queryParams.traverseDown}`);
                console.log(`Request Entities: ${queryParams.requestEntities}`);
                console.log("");
            }

            // Fetch lineage from API
            const lineageResponse = await getDataflowLineage(
                dataflowId,
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
                    console.log(chalk.red("Failed to fetch lineage."));
                    console.log(
                        "This command requires API token and DOMO_API_HOST configuration.",
                    );
                }
                return;
            }

            // Process and display the response
            const dataflowKey = `DATAFLOW${dataflowId}`;
            const lineageData = lineageResponse[dataflowKey];

            if (!lineageData) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            `No lineage data found for dataflow ${dataflowId}`,
                            "NO_LINEAGE_DATA",
                        ),
                    );
                } else {
                    console.log(
                        `No lineage data found for dataflow ${dataflowId}`,
                    );
                }
                return;
            }

            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.success(
                        this.name,
                        { lineage: lineageResponse },
                        {
                            dataflowId,
                            entityType: "dataflow",
                            note: "Lineage data from Domo API v1/lineage endpoint",
                        },
                    ),
                );
            } else {
                // Display formatted output
                console.log(chalk.cyan("Dataflow Lineage Information:"));
                console.log("=============================");
                console.log(`Type: ${lineageData.type}`);
                console.log(`ID: ${lineageData.id}`);
                console.log(`Complete: ${lineageData.complete}`);

                // Display ancestor counts
                if (Object.keys(lineageData.ancestorCounts).length > 0) {
                    console.log(chalk.cyan("\nAncestor Counts:"));
                    for (const [type, count] of Object.entries(
                        lineageData.ancestorCounts,
                    )) {
                        console.log(`  ${type}: ${count}`);
                    }
                }

                // Display descendant counts
                if (Object.keys(lineageData.descendantCounts).length > 0) {
                    console.log(chalk.cyan("\nDescendant Counts:"));
                    for (const [type, count] of Object.entries(
                        lineageData.descendantCounts,
                    )) {
                        console.log(`  ${type}: ${count}`);
                    }
                }

                // Display parents
                if (lineageData.parents && lineageData.parents.length > 0) {
                    console.log(chalk.cyan("\nParent Entities:"));
                    this.displayEntities(lineageData.parents, "  ");
                }

                // Display children
                if (lineageData.children && lineageData.children.length > 0) {
                    console.log(chalk.cyan("\nChild Entities:"));
                    this.displayEntities(lineageData.children, "  ");
                }

                // Export data if requested
                await CommandUtils.exportData(
                    [lineageResponse],
                    `Dataflow Lineage for ${dataflowId}`,
                    "lineage",
                    saveOptions,
                );

                console.log("");
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
                log.error("Error fetching dataflow lineage:", error);
                console.error(chalk.red("Failed to fetch dataflow lineage."));
                if (error instanceof Error) {
                    console.error(error.message);
                }
            }
        }
    }

    /**
     * Recursively display lineage entities
     * @param entities - Array of lineage entities
     * @param indent - Indentation string
     */
    private displayEntities(
        entities: LineageEntity[],
        indent: string = "",
    ): void {
        for (const entity of entities) {
            console.log(`${indent}• ${entity.type} (${entity.id})`);
            console.log(`${indent}  Complete: ${entity.complete}`);

            // Display nested parents
            if (entity.parents && entity.parents.length > 0) {
                console.log(`${indent}  Parents:`);
                this.displayEntities(entity.parents, indent + "    ");
            }

            // Display nested children
            if (entity.children && entity.children.length > 0) {
                console.log(`${indent}  Children:`);
                this.displayEntities(entity.children, indent + "    ");
            }
        }
    }

    /**
     * Shows help for the get-dataflow-lineage command
     */
    public showHelp(): void {
        console.log(
            "Gets lineage information for a specific dataflow from the Domo API",
        );
        console.log("\nUsage: get-dataflow-lineage <dataflow-id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataflow-id         The ID of the dataflow to get lineage for",
        );

        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --traverse-up=<true|false>    Traverse up the lineage graph (default: false)",
        );
        console.log(
            "  --traverse-down=<true|false>  Traverse down the lineage graph (default: false)",
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
        console.log("  get-dataflow-lineage 123");
        console.log("    Get basic lineage for dataflow 123");
        console.log("");
        console.log(
            "  get-dataflow-lineage 123 --traverse-up=true --traverse-down=true",
        );
        console.log("    Get complete lineage traversing both directions");
        console.log("");
        console.log(
            "  get-dataflow-lineage 123 --entities=DATA_SOURCE,DATAFLOW",
        );
        console.log("    Get lineage for specific entity types only");
        console.log("");
        console.log("  get-dataflow-lineage 123 --format=json");
        console.log("    Output lineage in JSON format");

        console.log(chalk.cyan("\nNote:"));
        console.log(
            "  This command requires API token authentication and DOMO_API_HOST",
        );
        console.log("  configuration to access the v1 lineage endpoint.");
        console.log("");
        console.log(
            "  Setting both --traverse-up and --traverse-down to true will",
        );
        console.log("  return the complete lineage graph for the dataflow.");
    }
}
