import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
    TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { NonInteractiveExecutor } from "../src/NonInteractiveExecutor.js";
import { SmartResponseBuilder } from "../src/utils/SmartResponseBuilder.js";
import { config } from "dotenv";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// Load environment variables from multiple possible locations
function loadEnvConfig() {
    // First try local .env
    const localEnv = resolve(process.cwd(), ".env");
    if (existsSync(localEnv)) {
        config({ path: localEnv });
    }

    // Then try global .domo-cli/.env
    const globalEnv = resolve(homedir(), ".domo-cli", ".env");
    if (existsSync(globalEnv)) {
        config({ path: globalEnv });
    }

    // Validate required environment variables
    const required = ["DOMO_API_HOST", "DOMO_API_TOKEN"];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `Missing required environment variables: ${missing.join(", ")}`,
        );
        console.error(
            "Please configure your Domo credentials in .env or ~/.domo-cli/.env",
        );
        process.exit(1);
    }
}

// Load environment configuration
loadEnvConfig();

// Define available tools
const tools: Tool[] = [
    {
        name: "list_datasets",
        description:
            "List all Domo datasets. Returns a list of datasets with metadata including ID, name, owner, row count, and last update time.",
        inputSchema: {
            type: "object",
            properties: {
                search: {
                    type: "string",
                    description:
                        "Optional search term to filter datasets by name",
                },
                limit: {
                    type: "number",
                    description:
                        "Maximum number of results to return (default: 50)",
                },
                offset: {
                    type: "number",
                    description:
                        "Number of results to skip for pagination (default: 0)",
                },
            },
        },
    },
    {
        name: "list_dataflows",
        description:
            "List all Domo dataflows. Returns dataflow information including execution status, input/output datasets, and last run time.",
        inputSchema: {
            type: "object",
            properties: {
                search: {
                    type: "string",
                    description:
                        "Optional search term to filter dataflows by name",
                },
                limit: {
                    type: "number",
                    description:
                        "Maximum number of results to return (default: 50)",
                },
                offset: {
                    type: "number",
                    description:
                        "Number of results to skip for pagination (default: 0)",
                },
            },
        },
    },
    {
        name: "list_cards",
        description:
            "List all Domo cards (visualizations/dashboards). Returns card metadata including ID, title, type, and associated datasets.",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description:
                        "Maximum number of results to return (default: 50)",
                },
                offset: {
                    type: "number",
                    description:
                        "Number of results to skip for pagination (default: 0)",
                },
            },
        },
    },
    {
        name: "list_pages",
        description:
            "List all Domo pages (dashboard collections). Returns page information including ID, name, and contained cards.",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description:
                        "Maximum number of results to return (default: 50)",
                },
                offset: {
                    type: "number",
                    description:
                        "Number of results to skip for pagination (default: 0)",
                },
            },
        },
    },
    {
        name: "get_dataflow",
        description:
            "Get detailed information about a specific dataflow including configuration, input/output datasets, and execution history.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Dataflow ID (numeric or string)",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "get_dataset",
        description:
            "Get detailed information about a specific dataset including schema, row count, columns, and update history.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Dataset ID (GUID format)",
                },
                sync: {
                    type: "boolean",
                    description:
                        "Force refresh from API and update local DB (bypass cached database entry)",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "get_card",
        description:
            "Get detailed information about a specific card including visualization type, associated datasets, and configuration.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Card ID (numeric or string)",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "show_lineage",
        description:
            "Show data lineage for a dataset by analyzing local dataflow data. Builds a dependency graph showing upstream and downstream relationships.",
        inputSchema: {
            type: "object",
            properties: {
                datasetId: {
                    type: "string",
                    description: "Dataset ID to show lineage for (GUID format)",
                },
                format: {
                    type: "string",
                    enum: ["text", "mermaid", "json"],
                    description:
                        "Output format: text (tree view), mermaid (diagram), or json (default: text)",
                },
            },
            required: ["datasetId"],
        },
    },
    {
        name: "get_dataset_lineage",
        description:
            "Get complete lineage information for a dataset from the Domo API, showing all upstream sources and downstream consumers. By default, traverses both directions to return the full dependency graph including parent dataflows, child dataflows, and cards that use this dataset. Requires API token and DOMO_API_HOST configuration.",
        inputSchema: {
            type: "object",
            properties: {
                datasetId: {
                    type: "string",
                    description: "Dataset ID (GUID format)",
                },
                traverseUp: {
                    type: "boolean",
                    description:
                        "Include upstream dependencies - dataflows and datasets that produce this dataset (default: true when both unspecified)",
                },
                traverseDown: {
                    type: "boolean",
                    description:
                        "Include downstream dependencies - dataflows and cards that consume this dataset (default: true when both unspecified)",
                },
                entities: {
                    type: "string",
                    description:
                        "Comma-separated entity types to include in the response (default: DATA_SOURCE,DATAFLOW,CARD). Options: DATA_SOURCE, DATAFLOW, CARD, ALERT",
                },
            },
            required: ["datasetId"],
        },
    },
    {
        name: "get_dataset_parents",
        description:
            "Get direct parents for a dataset from the Domo API. Returns only the immediate parents (type and id), typically DATAFLOWs or upstream DATA_SOURCEs. Requires API token and DOMO_API_HOST configuration.",
        inputSchema: {
            type: "object",
            properties: {
                datasetId: {
                    type: "string",
                    description: "Dataset ID (GUID format)",
                },
            },
            required: ["datasetId"],
        },
    },
    {
        name: "get_dataset_children",
        description:
            "Get direct children for a dataset from the Domo API. Returns only the immediate children keyed as <TYPE><ID> with full node objects when available (e.g., CARDs and downstream DATA_SOURCEs). Requires API token and DOMO_API_HOST configuration.",
        inputSchema: {
            type: "object",
            properties: {
                datasetId: {
                    type: "string",
                    description: "Dataset ID (GUID format)",
                },
            },
            required: ["datasetId"],
        },
    },
    {
        name: "get_dataflow_lineage",
        description:
            "Get complete lineage information for a dataflow from the Domo API, showing all upstream inputs and downstream outputs. By default, traverses both directions to return the full dependency graph including parent datasets, child datasets, connected dataflows, and cards. Requires API token and DOMO_API_HOST configuration.",
        inputSchema: {
            type: "object",
            properties: {
                dataflowId: {
                    type: "string",
                    description: "Dataflow ID (numeric or string)",
                },
                traverseUp: {
                    type: "boolean",
                    description:
                        "Include upstream dependencies - parent datasets and dataflows that feed into this dataflow (default: true when both unspecified)",
                },
                traverseDown: {
                    type: "boolean",
                    description:
                        "Include downstream dependencies - child datasets and cards that consume from this dataflow (default: true when both unspecified)",
                },
                entities: {
                    type: "string",
                    description:
                        "Comma-separated entity types to include in the response (default: DATA_SOURCE,DATAFLOW,CARD). Options: DATA_SOURCE, DATAFLOW, CARD, ALERT",
                },
            },
            required: ["dataflowId"],
        },
    },
    {
        name: "execute_dataflow",
        description:
            "Execute a dataflow. This is a write operation that triggers dataflow processing. Check read-only mode settings before using.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Dataflow ID to execute (numeric or string)",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "cache_status",
        description:
            "Show the status of the local cache including entry counts, memory usage, and cache hit rates.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "clear_cache",
        description:
            "Clear all entries from the local cache. Use this to force fresh data retrieval from Domo APIs.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "generate_lineage_report",
        description:
            "Generate a comprehensive data lineage report for all datasets and dataflows. Analyzes dependencies and creates documentation.",
        inputSchema: {
            type: "object",
            properties: {
                format: {
                    type: "string",
                    enum: ["markdown", "json"],
                    description:
                        "Output format: markdown (human-readable) or json (machine-parseable) (default: markdown)",
                },
            },
        },
    },
    {
        name: "update_dataset_properties",
        description:
            "Update dataset properties (name, description, tags). Requires API token authentication. This is a write operation.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Dataset ID (GUID format)",
                },
                name: {
                    type: "string",
                    description: "New name for the dataset",
                },
                description: {
                    type: "string",
                    description: "New description for the dataset",
                },
                tags: {
                    type: "string",
                    description: "Comma-separated list of tags",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "list_dataflow_executions",
        description:
            "List execution history for a specific dataflow. Shows status, duration, and timestamps of recent runs.",
        inputSchema: {
            type: "object",
            properties: {
                dataflowId: {
                    type: "string",
                    description: "Dataflow ID (numeric or string)",
                },
                limit: {
                    type: "number",
                    description:
                        "Maximum number of executions to return (default: 50)",
                },
                offset: {
                    type: "number",
                    description:
                        "Number of results to skip for pagination (default: 0)",
                },
            },
            required: ["dataflowId"],
        },
    },
    {
        name: "get_dataflow_execution",
        description:
            "Get detailed information about a specific dataflow execution including logs and error details.",
        inputSchema: {
            type: "object",
            properties: {
                dataflowId: {
                    type: "string",
                    description: "Dataflow ID (numeric or string)",
                },
                executionId: {
                    type: "string",
                    description: "Execution ID",
                },
            },
            required: ["dataflowId", "executionId"],
        },
    },
    {
        name: "render_card",
        description:
            "Render a KPI card visualization and save as image and summary data. By default, dimensions are auto-computed from the card's aspect via a preflight render: if you provide only width (or only height), the other dimension is derived to avoid cropping.\n\nCard Status Values:\n• 'success': Card rendered with data\n• 'not_ran': Card rendered but does not contain data\n• 'error': Configuration or data issues",
        inputSchema: {
            type: "object",
            properties: {
                cardId: {
                    type: "string",
                    description: "Card ID (numeric or string)",
                },
                width: {
                    type: "number",
                    description:
                        "Image width in pixels (default: 1024). Height auto unless provided",
                },
                height: {
                    type: "number",
                    description:
                        "Image height in pixels (optional). If width and height don't match the card's aspect, image may crop",
                },
                scale: {
                    type: "number",
                    description: "Scale factor for image (default: 1)",
                },
            },
            required: ["cardId"],
        },
    },
    {
        name: "db_status",
        description:
            "Show the status of the local persistent database including collection counts and sync timestamps.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "db_sync",
        description:
            "Synchronize the local database with Domo API data. Fetches latest datasets, dataflows, and cards.",
        inputSchema: {
            type: "object",
            properties: {
                datasets: {
                    type: "boolean",
                    description: "Sync datasets (default: true)",
                },
                dataflows: {
                    type: "boolean",
                    description: "Sync dataflows (default: true)",
                },
                cards: {
                    type: "boolean",
                    description: "Sync cards (default: true)",
                },
            },
        },
    },
    {
        name: "db_clear",
        description:
            "Clear the local database. Use with caution as this removes all cached data.",
        inputSchema: {
            type: "object",
            properties: {
                collections: {
                    type: "string",
                    description:
                        "Comma-separated list of collections to clear (datasets,dataflows,cards). If not specified, clears all.",
                },
                force: {
                    type: "boolean",
                    description: "Skip confirmation prompt (default: false)",
                },
            },
        },
    },
    {
        name: "db_export",
        description:
            "Export the local database to a JSON file for backup or sharing.",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description:
                        "Export filename (default: auto-generated with timestamp)",
                },
            },
        },
    },
    {
        name: "db_import",
        description:
            "Import a database from a JSON file. Merges with existing data.",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "JSON file to import",
                },
            },
            required: ["filename"],
        },
    },
    {
        name: "get_dataflow_section",
        description:
            "Get a specific section of a large dataflow. Use after get_dataflow indicates sections are available.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Dataflow ID (numeric or string)",
                },
                section: {
                    type: "string",
                    enum: [
                        "core",
                        "inputs",
                        "outputs",
                        "transformations",
                        "triggers",
                        "history",
                        "metadata",
                    ],
                    description: "Section to retrieve",
                },
                chunkIndex: {
                    type: "number",
                    description:
                        "For chunked sections, the chunk index to retrieve (0-based)",
                },
            },
            required: ["id", "section"],
        },
    },
];

// Create MCP server
const server = new Server(
    {
        name: "domo-query-cli",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args = {} } = request.params;

    try {
        const executor = new NonInteractiveExecutor();

        // Map tool names to CLI commands
        let command: string;
        let commandArgs: string[] = [];

        switch (name) {
            case "list_datasets":
                command = "list-datasets";
                if (args.search) {
                    commandArgs.push(args.search as string);
                }
                if (args.limit) {
                    commandArgs.push("--limit", String(args.limit));
                }
                if (args.offset) {
                    commandArgs.push("--offset", String(args.offset));
                }
                break;

            case "list_dataflows":
                command = "list-dataflows";
                if (args.search) {
                    commandArgs.push(args.search as string);
                }
                break;

            case "list_cards":
                command = "list-cards";
                break;

            case "list_pages":
                command = "list-pages";
                break;

            case "get_dataflow":
                command = "get-dataflow";
                commandArgs.push(args.id as string);
                break;

            case "get_dataflow_section":
                // First get the full dataflow
                command = "get-dataflow";
                commandArgs.push(args.id as string);
                // We'll handle the section extraction after execution
                break;

            case "get_dataset":
                command = "get-dataset";
                commandArgs.push(args.id as string);
                if (args.sync === true) {
                    commandArgs.push("--sync");
                }
                break;

            case "get_card":
                command = "get-card";
                commandArgs.push(args.id as string);
                break;

            case "show_lineage":
                command = "show-lineage";
                commandArgs.push(args.datasetId as string);
                if (args.format) {
                    commandArgs.push("--format", args.format as string);
                }
                break;

            case "get_dataset_lineage":
                command = "get-dataset-lineage";
                commandArgs.push(args.datasetId as string);
                // Pass through traverse parameters
                if (args.traverseUp === true) {
                    commandArgs.push("--traverse-up=true");
                }
                if (args.traverseDown === true) {
                    commandArgs.push("--traverse-down=true");
                }
                // Pass through entity filter if provided
                if (args.entities) {
                    commandArgs.push("--entities", args.entities as string);
                }
                break;

            case "get_dataset_parents":
                command = "get-dataset-parents";
                commandArgs.push(args.datasetId as string);
                break;

            case "get_dataset_children":
                command = "get-dataset-children";
                commandArgs.push(args.datasetId as string);
                break;

            case "get_dataflow_lineage":
                command = "get-dataflow-lineage";
                commandArgs.push(args.dataflowId as string);
                // Pass through traverse parameters
                if (args.traverseUp === true) {
                    commandArgs.push("--traverse-up=true");
                }
                if (args.traverseDown === true) {
                    commandArgs.push("--traverse-down=true");
                }
                // Pass through entity filter if provided
                if (args.entities) {
                    commandArgs.push("--entities", args.entities as string);
                }
                break;

            case "execute_dataflow":
                command = "execute-dataflow";
                commandArgs.push(args.id as string);
                break;

            case "cache_status":
                command = "cache-status";
                break;

            case "clear_cache":
                command = "clear-cache";
                break;

            case "generate_lineage_report":
                command = "generate-lineage-report";
                if (args.format) {
                    commandArgs.push("--format", args.format as string);
                }
                break;

            case "update_dataset_properties":
                command = "update-dataset-properties";
                commandArgs.push(args.id as string);
                if (args.name) {
                    commandArgs.push("--name", args.name as string);
                }
                if (args.description) {
                    commandArgs.push(
                        "--description",
                        args.description as string,
                    );
                }
                if (args.tags) {
                    commandArgs.push("--tags", args.tags as string);
                }
                break;

            case "list_dataflow_executions":
                command = "list-dataflow-executions";
                commandArgs.push(args.dataflowId as string);
                if (args.limit) {
                    commandArgs.push("--limit", String(args.limit));
                }
                if (args.offset) {
                    commandArgs.push("--offset", String(args.offset));
                }
                break;

            case "get_dataflow_execution":
                command = "get-dataflow-execution";
                commandArgs.push(args.dataflowId as string);
                commandArgs.push(args.executionId as string);
                break;

            case "render_card":
                command = "render-card";
                commandArgs.push(args.cardId as string);
                if (args.width !== undefined) {
                    commandArgs.push("--width", String(args.width));
                }
                if (args.height !== undefined) {
                    commandArgs.push("--height", String(args.height));
                }
                if (args.scale !== undefined) {
                    commandArgs.push("--scale", String(args.scale));
                }
                break;

            case "db_status":
                command = "db-status";
                break;

            case "db_sync":
                command = "db-sync";
                // Add flags for what to sync
                if (
                    args.datasets !== false &&
                    args.dataflows !== false &&
                    args.cards !== false
                ) {
                    // All true or undefined - sync all
                    commandArgs.push("--all");
                } else {
                    // Selective sync
                    if (args.datasets !== false) {
                        commandArgs.push("--datasets");
                    }
                    if (args.dataflows !== false) {
                        commandArgs.push("--dataflows");
                    }
                    if (args.cards !== false) {
                        commandArgs.push("--cards");
                    }
                }
                break;

            case "db_clear":
                command = "db-clear";
                if (args.collections) {
                    commandArgs.push(
                        "--collections",
                        args.collections as string,
                    );
                }
                if (args.force) {
                    commandArgs.push("--force");
                }
                break;

            case "db_export":
                command = "db-export";
                if (args.filename) {
                    commandArgs.push(args.filename as string);
                }
                break;

            case "db_import":
                command = "db-import";
                commandArgs.push(args.filename as string);
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        // Capture output
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const output: string[] = [];
        const errors: string[] = [];

        console.log = (...args: unknown[]) => {
            output.push(args.map(a => String(a)).join(" "));
        };
        console.error = (...args: unknown[]) => {
            errors.push(args.map(a => String(a)).join(" "));
        };

        try {
            // Execute command in JSON format for structured output
            await executor.execute(command, commandArgs, "json");

            // Restore console
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;

            // Parse the JSON output if possible
            const outputText = output.join("\n");
            let responseContent: TextContent;

            try {
                const jsonOutput = JSON.parse(outputText);

                // Special handling for get_dataflow and get_dataflow_section
                if (
                    name === "get_dataflow" ||
                    name === "get_dataflow_section"
                ) {
                    // Check if we have actual dataflow data
                    if (jsonOutput.success && jsonOutput.data) {
                        // Extract the actual dataflow from the nested structure
                        // The GetDataflowCommand returns { dataflow: {...} } in the data field
                        const dataflowWrapper =
                            jsonOutput.data.dataflow || jsonOutput.data;

                        // Handle v1/v2/merged structure - prefer merged, then v1, then v2
                        const dataflow =
                            dataflowWrapper.merged ||
                            dataflowWrapper.v1 ||
                            dataflowWrapper.v2 ||
                            dataflowWrapper;

                        if (name === "get_dataflow") {
                            // Build smart response for get_dataflow
                            const smartResponse =
                                SmartResponseBuilder.buildDataflowResponse(
                                    dataflow,
                                );
                            responseContent = {
                                type: "text",
                                text: JSON.stringify(
                                    smartResponse.data,
                                    null,
                                    2,
                                ),
                            };
                        } else {
                            // Handle get_dataflow_section
                            const section = args.section as string;
                            const chunkIndex = args.chunkIndex as
                                | number
                                | undefined;
                            const smartResponse =
                                SmartResponseBuilder.buildDataflowResponse(
                                    dataflow,
                                    section,
                                    chunkIndex,
                                );
                            responseContent = {
                                type: "text",
                                text: JSON.stringify(
                                    smartResponse.data,
                                    null,
                                    2,
                                ),
                            };
                        }
                    } else {
                        // Return the original response if not successful or missing data
                        responseContent = {
                            type: "text",
                            text: JSON.stringify(jsonOutput, null, 2),
                        };
                    }
                } else {
                    // Normal JSON response for other tools
                    responseContent = {
                        type: "text",
                        text: JSON.stringify(jsonOutput, null, 2),
                    };
                }
            } catch {
                // If not valid JSON, return as plain text
                responseContent = {
                    type: "text",
                    text:
                        outputText ||
                        "Command executed successfully (no output)",
                };
            }

            return {
                content: [responseContent],
            };
        } catch (error) {
            // Restore console
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;

            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const errorDetails =
                errors.length > 0 ? errors.join("\n") : errorMessage;

            return {
                content: [
                    {
                        type: "text",
                        text: `Error executing command: ${errorDetails}`,
                    },
                ],
                isError: true,
            };
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Use stderr for server status messages to avoid interfering with JSON-RPC
    process.stderr.write("Domo Query CLI MCP Server started\n");
}

main().catch(error => {
    // Use stderr for error messages
    process.stderr.write(`Failed to start MCP server: ${error}\n`);
    process.exit(1);
});
