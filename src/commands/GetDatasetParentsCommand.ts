import {
    getDatasetLineage,
    DataflowLineageQueryParams,
    LineageEntity,
    getDatasetLegacy,
} from "../api/clients/domoClient";
import { getDataflow } from "../api/clients/dataflowApi";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import chalk from "chalk";
import { TerminalFormatter } from "../utils/terminalFormatter";

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
            const { parsed } = this.parseOutputConfig(args);

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

            // Check for traverse options (default to upstream-only for this command)
            const traverseUp =
                parsed.params["traverse-up"] !== undefined
                    ? parsed.params["traverse-up"]
                    : parsed.params.traverseUp;
            if (traverseUp !== undefined) {
                queryParams.traverseUp =
                    traverseUp === "true" || traverseUp === true;
            }

            const traverseDown =
                parsed.params["traverse-down"] !== undefined
                    ? parsed.params["traverse-down"]
                    : parsed.params.traverseDown;
            if (traverseDown !== undefined) {
                queryParams.traverseDown =
                    traverseDown === "true" || traverseDown === true;
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
                parsed.params.entities || parsed.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Parents of a dataset are typically DATAFLOW or DATA_SOURCE
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW";
            }

            if (!this.isJsonMode) {
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
                this.outputErrorResult(
                    {
                        message:
                            "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                        code: "CONFIG_ERROR",
                    },
                    () => {
                        console.log(
                            chalk.red("Failed to fetch dataset parents."),
                        );
                        console.log(
                            "This command requires API token and DOMO_API_HOST configuration.",
                        );
                    },
                );
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

            // Prepare data for output
            const parentsArray = Object.keys(parentsMap).map(
                key => parentsMap[key],
            );

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: {
                        datasetId,
                        parents: parentsArray,
                        parentsMap,
                    },
                    metadata: {
                        entityType: "dataset",
                        note: "Parents extracted from Domo API v1/lineage endpoint",
                    },
                },
                () => this.displayParents(minimalParents),
                "dataset-parents",
            );
        } catch (error) {
            log.error("Error fetching dataset parents:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error ? error.message : String(error),
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        chalk.red("Failed to fetch dataset parents."),
                    );
                    if (error instanceof Error) {
                        console.error(error.message);
                    }
                },
            );
        }
    }

    /**
     * Display parents in table format
     */
    private displayParents(
        minimalParents: Array<Pick<LineageEntity, "type" | "id">>,
    ): void {
        const parentsCount = minimalParents.length;
        if (parentsCount === 0) {
            console.log("No parents found for this dataset.\n");
        } else {
            console.log(chalk.cyan("Parent Entities:"));
            this.displayMinimalEntities(minimalParents, "  ");
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

        console.log(chalk.cyan("\nLineage Options:"));
        const lineageData = [
            {
                Option: "--traverse-up=<bool>",
                Description: "Traverse up the lineage graph (default: true)",
            },
            {
                Option: "--traverse-down=<bool>",
                Description: "Traverse down the lineage graph (default: false)",
            },
            {
                Option: "--entities=<types>",
                Description:
                    "Entity types to request (default: DATA_SOURCE,DATAFLOW)",
            },
        ];
        console.log(TerminalFormatter.table(lineageData));

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
            "  - Direct parent entities (dataflows and datasets) for the specified dataset",
        );
        console.log("  - Entity types and IDs");
        console.log("  - Entity names (when available)");

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "get-dataset-parents abc-123-def",
                Description: "Get direct parents for dataset",
            },
            {
                Command: "get-dataset-parents abc-123 --format=json",
                Description: "Output parents in JSON format",
            },
            {
                Command: "get-dataset-parents abc-123 --export=md",
                Description: "Get parents and save to markdown",
            },
            {
                Command: "get-dataset-parents abc-123 --format=json --export",
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
            // Lineage options
            "--traverse-up",
            "--traverse-down",
            "--entities",
            // Output flags
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
