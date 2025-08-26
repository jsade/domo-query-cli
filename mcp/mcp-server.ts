import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
    TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { NonInteractiveExecutor } from "../src/NonInteractiveExecutor";
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
            "Get lineage information for a dataset from the Domo API. Requires API token and DOMO_API_HOST configuration. Returns upstream and downstream dependencies.",
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
                        "Include upstream dependencies (default: false)",
                },
                traverseDown: {
                    type: "boolean",
                    description:
                        "Include downstream dependencies (default: false)",
                },
                entities: {
                    type: "string",
                    description:
                        "Comma-separated entity types to include (e.g., DATA_SOURCE,DATAFLOW,CARD)",
                },
            },
            required: ["datasetId"],
        },
    },
    {
        name: "get_dataflow_lineage",
        description:
            "Get lineage information for a dataflow from the Domo API. Requires API token and DOMO_API_HOST configuration. Returns input and output dataset relationships.",
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
                        "Include upstream dependencies (default: false)",
                },
                traverseDown: {
                    type: "boolean",
                    description:
                        "Include downstream dependencies (default: false)",
                },
                entities: {
                    type: "string",
                    description:
                        "Comma-separated entity types to include (e.g., DATA_SOURCE,DATAFLOW,CARD)",
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
            "Render a card visualization as a text-based chart or table. Best for simple visualizations.",
        inputSchema: {
            type: "object",
            properties: {
                cardId: {
                    type: "string",
                    description: "Card ID (numeric or string)",
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

            case "get_dataset":
                command = "get-dataset";
                commandArgs.push(args.id as string);
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
                break;

            case "get_dataflow_lineage":
                command = "get-dataflow-lineage";
                commandArgs.push(args.dataflowId as string);
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
                responseContent = {
                    type: "text",
                    text: JSON.stringify(jsonOutput, null, 2),
                };
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
