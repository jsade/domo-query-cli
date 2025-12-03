import { getDataflowLineage } from "../api/clients/dataflowApi";
import {
    DataflowLineageQueryParams,
    LineageEntity,
} from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import chalk from "chalk";
import { TerminalFormatter } from "../utils/terminalFormatter";

/**
 * Root lineage entity with count information
 */
interface RootLineageEntity extends LineageEntity {
    ancestorCounts: Record<string, number>;
    descendantCounts: Record<string, number>;
}

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
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const dataflowId = parsed.positional[0];

            if (!dataflowId) {
                this.outputErrorResult({
                    message: "No dataflow ID provided",
                    code: "MISSING_DATAFLOW_ID",
                });
                return;
            }

            // Parse query parameters
            const queryParams: DataflowLineageQueryParams = {};

            // Check for traverse options
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

            // Default to traversing both directions if neither is specified
            // This provides more useful data by default
            if (
                queryParams.traverseUp === undefined &&
                queryParams.traverseDown === undefined
            ) {
                queryParams.traverseUp = true;
                queryParams.traverseDown = true;
            }

            // Check for entity types filter
            const entities =
                parsed.params.entities !== undefined
                    ? parsed.params.entities
                    : parsed.params.requestEntities;
            if (entities) {
                queryParams.requestEntities = String(entities);
            } else {
                // Default to requesting all entity types
                queryParams.requestEntities = "DATA_SOURCE,DATAFLOW,CARD";
            }

            if (config.displayFormat !== "json") {
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
                this.outputErrorResult(
                    {
                        message:
                            "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                        code: "CONFIG_ERROR",
                    },
                    () => {
                        console.log(
                            TerminalFormatter.error("Failed to fetch lineage."),
                        );
                        console.log(
                            "This command requires API token and DOMO_API_HOST configuration.",
                        );
                    },
                );
                return;
            }

            // Process and display the response
            const dataflowKey = `DATAFLOW${dataflowId}`;
            const lineageData = lineageResponse[dataflowKey];

            if (!lineageData) {
                this.outputErrorResult({
                    message: `No lineage data found for dataflow ${dataflowId}`,
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
                        dataflowId,
                        entityType: "dataflow",
                        note: "Lineage data from Domo API v1/lineage endpoint",
                    },
                },
                () => this.displayLineage(lineageData),
                "lineage",
            );
        } catch (error) {
            log.error("Error fetching dataflow lineage:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error ? error.message : String(error),
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        TerminalFormatter.error(
                            "Failed to fetch dataflow lineage.",
                        ),
                    );
                    if (error instanceof Error) {
                        console.error(error.message);
                    }
                },
            );
        }
    }

    /**
     * Display lineage information in table format
     */
    private displayLineage(lineageData: RootLineageEntity): void {
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
        console.log("  - Entity type and ID");
        console.log("  - Completeness indicator");
        console.log("  - Ancestor counts by entity type");
        console.log("  - Descendant counts by entity type");
        console.log("  - Hierarchical parent entities");
        console.log("  - Hierarchical child entities");

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "get-dataflow-lineage 123",
                Description: "Get basic lineage for dataflow 123",
            },
            {
                Command: "get-dataflow-lineage 123 --traverse-up=true",
                Description: "Get upstream lineage only",
            },
            {
                Command: "get-dataflow-lineage 123 --entities=DATA_SOURCE",
                Description: "Get lineage for data sources only",
            },
            {
                Command: "get-dataflow-lineage 123 --format=json",
                Description: "Output lineage in JSON format",
            },
            {
                Command: "get-dataflow-lineage 123 --format=json --export",
                Description: "JSON to stdout AND save to file",
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
            "  Setting both --traverse-up and --traverse-down to true will",
        );
        console.log("  return the complete lineage graph for the dataflow.");
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
