import {
    getDatasetLineage,
    DataflowLineageQueryParams,
    LineageEntity,
} from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import chalk from "chalk";
import { TerminalFormatter } from "../utils/terminalFormatter";

/**
 * Gets lineage information for a specific dataset from the API
 */
export class GetDatasetLineageCommand extends BaseCommand {
    public readonly name = "get-dataset-lineage";
    public readonly description =
        "Gets lineage information for a specific dataset from the API";

    /**
     * Executes the get-dataset-lineage command
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

            // Check for traverse options
            const traverseUp =
                parsed.params["traverse-up"] ?? parsed.params.traverseUp;
            if (traverseUp !== undefined) {
                queryParams.traverseUp =
                    traverseUp === "true" || traverseUp === true;
            }

            const traverseDown =
                parsed.params["traverse-down"] ?? parsed.params.traverseDown;
            if (traverseDown !== undefined) {
                queryParams.traverseDown =
                    traverseDown === "true" || traverseDown === true;
            }

            // Default to traversing both directions if neither is specified
            // This provides more useful data by default
            // Only apply defaults if BOTH are unspecified
            const traverseUpSpecified = traverseUp !== undefined;
            const traverseDownSpecified = traverseDown !== undefined;

            if (!traverseUpSpecified && !traverseDownSpecified) {
                queryParams.traverseUp = true;
                queryParams.traverseDown = true;
            }

            // Check for entity types filter
            const entities =
                parsed.params.entities ?? parsed.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Default to requesting all entity types
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW,CARD";
            }

            if (config.displayFormat !== "json") {
                console.log(
                    chalk.cyan(`\nFetching lineage for dataset: ${datasetId}`),
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

            // Process and display the response
            // The key format is DATA_SOURCE{id} for datasets
            const datasetKey = `DATA_SOURCE${datasetId}`;
            const lineageData = lineageResponse[datasetKey];

            if (!lineageData) {
                this.outputErrorResult({
                    message: `No lineage data found for dataset ${datasetId}`,
                    code: "NO_LINEAGE_DATA",
                });
                return;
            }

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { lineage: lineageResponse },
                    metadata: {
                        datasetId,
                        entityType: "dataset",
                        traverseUp: queryParams.traverseUp,
                        traverseDown: queryParams.traverseDown,
                        requestEntities: queryParams.requestEntities,
                        note: "Lineage data from Domo API v1/lineage endpoint",
                    },
                },
                () => this.displayLineage(lineageData),
                "lineage",
            );
        } catch (error) {
            log.error("Error fetching dataset lineage:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error ? error.message : String(error),
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            "Failed to fetch dataset lineage.",
                        ),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error(
                        "Check your API token and DOMO_API_HOST configuration, then try again.",
                    );
                },
            );
        }
    }

    /**
     * Display lineage data in table format
     */
    private displayLineage(lineageData: LineageEntity): void {
        console.log(chalk.cyan("\nDataset Lineage Information:"));
        console.log("============================");
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

        console.log("");
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
     * Shows help for the get-dataset-lineage command
     */
    public showHelp(): void {
        console.log(
            "Gets lineage information for a specific dataset from the Domo API",
        );
        console.log("\nUsage: get-dataset-lineage <dataset-id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log(
            "  dataset-id          The ID of the dataset to get lineage for",
        );

        console.log(chalk.cyan("\nLineage Options:"));
        const lineageData = [
            {
                Option: "--traverse-up=<bool>",
                Description: "Traverse up the lineage graph (default: true)",
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
        console.log("  - Lineage entity type, ID, and completion status");
        console.log("  - Ancestor counts by entity type (datasets, dataflows)");
        console.log("  - Descendant counts by entity type (cards, datasets)");
        console.log("  - Parent entities with nested hierarchy");
        console.log("  - Child entities with nested hierarchy");

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "get-dataset-lineage abc-123-def",
                Description: "Get complete lineage (both directions)",
            },
            {
                Command: "get-dataset-lineage abc-123 --traverse-up=true",
                Description: "Get upstream lineage only",
            },
            {
                Command:
                    "get-dataset-lineage abc-123 --entities=DATA_SOURCE,DATAFLOW",
                Description: "Filter to specific entity types",
            },
            {
                Command: "get-dataset-lineage abc-123 --format=json",
                Description: "Output in JSON format",
            },
            {
                Command: "get-dataset-lineage abc-123 --format=json --export",
                Description: "JSON to stdout AND save to file",
            },
            {
                Command: "get-dataset-lineage abc-123 --export=md",
                Description: "Save lineage to Markdown file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(chalk.cyan("\nNote:"));
        console.log(
            "  This command requires API token authentication and DOMO_API_HOST",
        );
        console.log("  configuration to access the v1 lineage endpoint.");
        console.log("");
        console.log(
            "  Setting both --traverse-up and --traverse-down to true (default)",
        );
        console.log(
            "  will return the complete lineage graph for the dataset.",
        );
        console.log("");
        console.log(
            "  The endpoint also works with dataflow IDs, showing the lineage",
        );
        console.log("  from a data source perspective.");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--traverse-up",
            "--traverse-down",
            "--entities",
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
