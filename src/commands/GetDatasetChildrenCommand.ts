import {
    getDatasetLineage,
    DataflowLineageQueryParams,
    LineageEntity,
    getDatasetLegacy,
    getCard,
} from "../api/clients/domoClient";
import { getDataflow } from "../api/clients/dataflowApi";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
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
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const datasetId = parsed.positional[0];

            if (!datasetId) {
                this.outputErrorResult({
                    message: "No dataset ID provided",
                    code: "MISSING_DATASET_ID",
                });
                return;
            }

            // Parse query parameters
            const queryParams: DataflowLineageQueryParams = {};

            // Check for traverse options (default to downstream-only for this command)
            const traverseUp =
                parsed.params["traverse-up"] || parsed.params.traverseUp;
            if (traverseUp !== undefined) {
                queryParams.traverseUp =
                    traverseUp === "true" || traverseUp === true;
            }

            const traverseDown =
                parsed.params["traverse-down"] || parsed.params.traverseDown;
            if (traverseDown !== undefined) {
                queryParams.traverseDown =
                    traverseDown === "true" || traverseDown === true;
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
                parsed.params.entities || parsed.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Children of a dataset can include DATA_SOURCE or CARD (and sometimes DATAFLOW)
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW,CARD";
            }

            if (config.displayFormat !== "json") {
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
                this.outputErrorResult({
                    message:
                        "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                    code: "CONFIG_ERROR",
                });
                return;
            }

            // Extract dataset node
            const datasetKey = `DATA_SOURCE${datasetId}`;
            const lineageData = lineageResponse[datasetKey];

            if (!lineageData) {
                this.outputErrorResult({
                    message: `No lineage data found for dataset ${datasetId}`,
                    code: "NO_LINEAGE_DATA",
                });
                return;
            }

            // Build a map of child keys to full child node objects from the lineage response
            const childrenMap: Record<string, unknown> = {};
            const minimalChildren: Array<Pick<LineageEntity, "type" | "id">> =
                [];

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
                                    ...(childrenMap[key] as Record<
                                        string,
                                        unknown
                                    >),
                                    name: ds.name,
                                };
                            }
                        } else if (c.type === "CARD") {
                            const card = await getCard(c.id);
                            const title = card?.title || card?.cardTitle;
                            if (title) {
                                childrenMap[key] = {
                                    ...(childrenMap[key] as Record<
                                        string,
                                        unknown
                                    >),
                                    name: title,
                                };
                            }
                        } else if (c.type === "DATAFLOW") {
                            const df = await getDataflow(c.id);
                            if (df?.name) {
                                childrenMap[key] = {
                                    ...(childrenMap[key] as Record<
                                        string,
                                        unknown
                                    >),
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

            // Prepare data for output
            const childrenArray = Object.keys(childrenMap).map(
                key => childrenMap[key],
            );

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: {
                        datasetId,
                        children: childrenArray,
                        childrenMap,
                    },
                    metadata: {
                        entityType: "dataset",
                        note: "Children extracted from Domo API v1/lineage endpoint",
                    },
                },
                () =>
                    this.displayChildren(childrenArray.length, minimalChildren),
                "dataset-children",
            );
        } catch (error) {
            log.error("Error fetching dataset children:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch dataset children",
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        chalk.red("Failed to fetch dataset children."),
                    );
                    if (error instanceof Error) {
                        console.error(error.message);
                    }
                },
            );
        }
    }

    /**
     * Display children entities in table format
     */
    private displayChildren(
        childrenCount: number,
        minimalChildren: Array<Pick<LineageEntity, "type" | "id">>,
    ): void {
        if (childrenCount === 0) {
            console.log("No children found for this dataset.\n");
        } else {
            console.log(chalk.cyan("Child Entities:"));
            this.displayMinimalEntities(minimalChildren, "  ");
            console.log("");
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

        console.log(chalk.cyan("\nQuery Options:"));
        const queryData = [
            {
                Option: "--traverse-up=<bool>",
                Description: "Traverse up the lineage graph (default: false)",
            },
            {
                Option: "--traverse-down=<bool>",
                Description: "Traverse down the lineage graph (default: true)",
            },
            {
                Option: "--entities=<types>",
                Description:
                    "Entity types to request (comma-separated, default: DATA_SOURCE,DATAFLOW,CARD)",
            },
        ];
        console.log(TerminalFormatter.table(queryData));

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
                Command: "get-dataset-children abc-123-def",
                Description: "Get direct children for dataset",
            },
            {
                Command: "get-dataset-children abc-123 --format=json",
                Description: "Output children in JSON format",
            },
            {
                Command: "get-dataset-children abc-123 --export=md",
                Description: "Get children and export to markdown",
            },
            {
                Command: "get-dataset-children abc-123 --format=json --export",
                Description: "JSON to stdout AND save to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.cyan("\nNote:"));
        console.log(
            "  This command requires API token authentication and DOMO_API_HOST",
        );
        console.log("  configuration to access the v1 lineage endpoint.");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            // Query options
            "--traverse-up",
            "--traverse-down",
            "--entities",
            // Output options (new unified flags)
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy aliases (deprecated but supported)
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
