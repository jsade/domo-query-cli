import { listDataflows } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { DomoDataflow } from "../api/clients/domoClient";
import {
    DataLineageBuilder,
    DatasetDependencies,
} from "../managers/DataLineageBuilder";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils, SaveOptions } from "./CommandUtils";
import chalk from "chalk";

/**
 * Export data structure for lineage analysis
 */
interface LineageExportData {
    entity: {
        id: string;
        type: string;
        name: string;
        metadata?: Record<string, unknown>;
    };
    analysis: {
        dependencies?: unknown;
        connections?: {
            inputs: unknown[];
            outputs: unknown[];
        };
        diagram?: string;
        relatedDataflows?: Array<{
            id: string;
            name: string;
            relationship: string;
        }>;
    };
}

/**
 * Shows data lineage for datasets and dataflows
 */
export class ShowLineageCommand extends BaseCommand {
    public readonly name = "show-lineage";
    public readonly description =
        "Shows data lineage visualization for datasets and dataflows";

    /**
     * Executes the show-lineage command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const [entityId, ...options] = args || [];

            if (!entityId || typeof entityId !== "string") {
                console.log(
                    "Usage: show-lineage <dataset-id|dataflow-id> [options]",
                );
                console.log("Use 'help show-lineage' for more information.");
                return;
            }

            // Parse options
            const { saveOptions, displayOptions } = this.parseOptions(options);
            const showDiagram = displayOptions.includes("--diagram");
            const showDependencies =
                displayOptions.includes("--dependencies") ||
                (!showDiagram && displayOptions.length === 0); // Default
            const maxDepth = this.extractMaxDepth(displayOptions);

            console.log(`\nAnalyzing lineage for: ${entityId}`);
            console.log("Loading dataflows... This may take a moment.");

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // Fetch all dataflows (we need them all for lineage analysis)
            const dataflows = await listDataflows({ limit: 1000 }, authMethod);

            if (dataflows.length === 0) {
                console.log("No dataflows found. Unable to build lineage.");
                return;
            }

            console.log(
                `Found ${dataflows.length} dataflows. Building lineage graph...`,
            );

            // Build the lineage graph
            const builder = new DataLineageBuilder();
            const graph = builder.buildLineageGraph(dataflows);

            console.log(
                `Graph built with ${graph.nodes.size} nodes and ${graph.edges.length} edges.\n`,
            );

            // Check if the entity exists
            const node = graph.nodes.get(entityId);
            if (!node) {
                console.log(
                    `Entity '${entityId}' not found in the lineage graph.`,
                );
                console.log(
                    "Make sure the ID is correct and that you have access to related dataflows.",
                );
                return;
            }

            // Display entity information
            console.log(`Entity Type: ${node.type}`);
            console.log(`Name: ${node.name}`);
            if (node.metadata) {
                if (node.metadata.status)
                    console.log(`Status: ${node.metadata.status}`);
                if (node.metadata.owner)
                    console.log(`Owner: ${node.metadata.owner}`);
                if (node.metadata.lastUpdated)
                    console.log(`Last Updated: ${node.metadata.lastUpdated}`);
            }
            console.log("");

            // Prepare export data
            const exportData: LineageExportData = {
                entity: {
                    id: entityId,
                    type: node.type,
                    name: node.name,
                    metadata: node.metadata,
                },
                analysis: {},
            };

            // Show dependencies
            if (showDependencies) {
                if (node.type === "dataset") {
                    const dependencies =
                        builder.getDatasetDependencies(entityId);
                    if (dependencies) {
                        this.displayDatasetDependencies(dependencies);
                        exportData.analysis.dependencies = dependencies;
                    }
                } else {
                    // For dataflows, show input/output datasets
                    const dataflow = dataflows.find(df => df.id === entityId);
                    if (dataflow) {
                        this.displayDataflowConnections(dataflow);
                        exportData.analysis.connections = {
                            inputs: dataflow.inputs || [],
                            outputs: dataflow.outputs || [],
                        };
                    }
                }
            }

            // Show lineage diagram
            if (showDiagram) {
                console.log("\n## Lineage Diagram (Mermaid)");
                console.log("```mermaid");
                const diagram = this.generateFocusedDiagram(
                    builder,
                    entityId,
                    maxDepth,
                );
                console.log(diagram);
                console.log("```");
                console.log(
                    "\nNote: Copy the diagram above to view in a Mermaid-compatible viewer.",
                );
                exportData.analysis.diagram = diagram;
            }

            // Show related dataflows
            if (node.type === "dataset") {
                const relatedDataflows =
                    builder.getDataflowsUsingDataset(entityId);
                if (relatedDataflows.length > 0) {
                    console.log(
                        `\n## Dataflows Using This Dataset (${relatedDataflows.length})`,
                    );
                    relatedDataflows.forEach(df => {
                        console.log(`- ${df.name} (${df.id})`);
                    });
                    exportData.analysis.relatedDataflows = relatedDataflows.map(
                        df => ({
                            id: df.id,
                            name: df.name,
                            relationship: "uses",
                        }),
                    );
                }
            }

            // Export data if requested
            await CommandUtils.exportData(
                [exportData],
                `Data Lineage for ${node.name}`,
                "lineage",
                saveOptions,
            );

            console.log("");
        } catch (error) {
            log.error("Error analyzing lineage:", error);
            console.error(
                "Failed to analyze lineage. Check your authentication and try again.",
            );
        }
    }

    /**
     * Shows help for the show-lineage command
     */
    public showHelp(): void {
        console.log(
            "Shows data lineage visualization for datasets and dataflows",
        );
        console.log("\nUsage: show-lineage <dataset-id|dataflow-id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "entity-id",
                Type: "string",
                Description: "Dataset or dataflow ID to analyze",
            },
        ];
        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nDisplay Options:"));
        const displayData = [
            {
                Option: "--dependencies",
                Description: "Show upstream/downstream dependencies (default)",
            },
            {
                Option: "--diagram",
                Description: "Generate a Mermaid diagram of the lineage",
            },
            {
                Option: "--max-depth=<n>",
                Description:
                    "Maximum depth for diagram generation (default: 3)",
            },
        ];
        console.log(TerminalFormatter.table(displayData));

        console.log(chalk.cyan("\nExport Options:"));
        const exportData = [
            {
                Option: "--save",
                Description: "Save results to JSON file (default)",
            },
            { Option: "--save-json", Description: "Save results to JSON file" },
            {
                Option: "--save-md",
                Description: "Save results to Markdown file",
            },
            {
                Option: "--save-both",
                Description: "Save to both JSON and Markdown",
            },
            {
                Option: "--path=<directory>",
                Description: "Specify custom export directory",
            },
        ];
        console.log(TerminalFormatter.table(exportData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "show-lineage ds123",
                Description: "Show dependencies for dataset",
            },
            {
                Command: "show-lineage df456 --diagram",
                Description: "Show diagram for dataflow",
            },
            {
                Command: "show-lineage ds789 --diagram --save-md",
                Description: "Show and save as markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    private parseOptions(options: string[]): {
        saveOptions: SaveOptions | null;
        displayOptions: string[];
    } {
        const saveOptionArgs: string[] = [];
        const displayOptions: string[] = [];

        for (const opt of options) {
            if (opt.startsWith("--save") || opt.startsWith("--path=")) {
                saveOptionArgs.push(opt);
            } else {
                displayOptions.push(opt);
            }
        }

        const [, saveOptions] = CommandUtils.parseSaveOptions(saveOptionArgs);
        return { saveOptions, displayOptions };
    }

    private extractMaxDepth(options: string[]): number {
        const depthOption = options.find(opt => opt.startsWith("--max-depth="));
        if (depthOption) {
            const depth = parseInt(depthOption.split("=")[1], 10);
            return isNaN(depth) ? 3 : Math.max(1, Math.min(10, depth));
        }
        return 3;
    }

    private displayDatasetDependencies(
        dependencies: DatasetDependencies,
    ): void {
        console.log("\n## Upstream Dependencies");
        if (dependencies.upstream.dataflows.length === 0) {
            console.log("No upstream dataflows found.");
        } else {
            console.log(
                `### Dataflows that output to this dataset (${dependencies.upstream.dataflows.length}):`,
            );
            dependencies.upstream.dataflows.forEach(df => {
                console.log(`- ${df.name} (${df.id})`);
                if (df.status) console.log(`  Status: ${df.status}`);
                if (df.owner) console.log(`  Owner: ${df.owner}`);
            });

            if (dependencies.upstream.datasets.length > 0) {
                console.log(
                    `\n### Source datasets (${dependencies.upstream.datasets.length}):`,
                );
                dependencies.upstream.datasets.forEach(ds => {
                    console.log(`- ${ds.name} (${ds.id})`);
                });
            }
        }

        console.log("\n## Downstream Dependencies");
        if (dependencies.downstream.dataflows.length === 0) {
            console.log("No downstream dataflows found.");
        } else {
            console.log(
                `### Dataflows that use this dataset as input (${dependencies.downstream.dataflows.length}):`,
            );
            dependencies.downstream.dataflows.forEach((df: DomoDataflow) => {
                console.log(`- ${df.name} (${df.id})`);
                if (df.status) console.log(`  Status: ${df.status}`);
                if (df.owner) console.log(`  Owner: ${df.owner}`);
            });

            if (dependencies.downstream.datasets.length > 0) {
                console.log(
                    `\n### Output datasets (${dependencies.downstream.datasets.length}):`,
                );
                dependencies.downstream.datasets.forEach(
                    (ds: { id: string; name: string }) => {
                        console.log(`- ${ds.name} (${ds.id})`);
                    },
                );
            }
        }
    }

    private displayDataflowConnections(dataflow: DomoDataflow): void {
        console.log("\n## Dataflow Connections");

        if (dataflow.inputs && dataflow.inputs.length > 0) {
            console.log(`### Input Datasets (${dataflow.inputs.length}):`);
            dataflow.inputs.forEach(
                (input: { id: string; name: string; dataSourceId: string }) => {
                    console.log(`- ${input.name} (${input.dataSourceId})`);
                },
            );
        } else {
            console.log("### Input Datasets: None");
        }

        if (dataflow.outputs && dataflow.outputs.length > 0) {
            console.log(`\n### Output Datasets (${dataflow.outputs.length}):`);
            dataflow.outputs.forEach(
                (output: {
                    id: string;
                    name: string;
                    dataSourceId: string;
                }) => {
                    console.log(`- ${output.name} (${output.dataSourceId})`);
                },
            );
        } else {
            console.log("\n### Output Datasets: None");
        }
    }

    private generateFocusedDiagram(
        builder: DataLineageBuilder,
        entityId: string,
        maxDepth: number,
    ): string {
        // Get the full graph
        const fullGraph = builder.exportForVisualization();
        const node = fullGraph.nodes.find(n => n.id === entityId);
        if (!node) {
            return "graph TD\n    NoData[No data found]";
        }

        // Find all nodes that contribute to the target entity
        const contributingNodes = new Set<string>();
        contributingNodes.add(entityId);

        // For datasets: find all upstream paths (nodes that eventually lead to this dataset)
        // For dataflows: find both upstream inputs and downstream outputs
        if (node.type === "dataset") {
            this.findUpstreamContributors(
                entityId,
                fullGraph,
                contributingNodes,
                maxDepth,
            );
        } else {
            // For dataflows, show both upstream and downstream
            this.findUpstreamContributors(
                entityId,
                fullGraph,
                contributingNodes,
                maxDepth,
            );
            this.findDownstreamContributors(
                entityId,
                fullGraph,
                contributingNodes,
                maxDepth,
            );
        }

        // Build a focused diagram with only contributing nodes
        const lines: string[] = ["graph TD"];

        // Add nodes
        fullGraph.nodes.forEach(node => {
            if (contributingNodes.has(node.id)) {
                const label = node.name.replace(/"/g, "'");
                const highlight =
                    node.id === entityId
                        ? ":::" + node.type + "-highlight"
                        : ":::" + node.type;

                if (node.type === "dataset") {
                    lines.push(`    ${node.id}["${label}"]${highlight}`);
                } else {
                    lines.push(`    ${node.id}("${label}")${highlight}`);
                }
            }
        });

        // Add edges (only between contributing nodes)
        fullGraph.links.forEach(link => {
            if (
                contributingNodes.has(link.source) &&
                contributingNodes.has(link.target)
            ) {
                const arrow = link.type === "input" ? "-->" : "==>";
                lines.push(`    ${link.source} ${arrow} ${link.target}`);
            }
        });

        // Add styling
        lines.push("");
        lines.push(
            "    classDef dataset fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
        );
        lines.push(
            "    classDef dataflow fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
        );
        lines.push(
            "    classDef dataset-highlight fill:#ffd54f,stroke:#f57c00,stroke-width:3px",
        );
        lines.push(
            "    classDef dataflow-highlight fill:#ffcc80,stroke:#e65100,stroke-width:3px",
        );

        return lines.join("\n");
    }

    /**
     * Find all nodes that contribute data to the target (upstream traversal)
     */
    private findUpstreamContributors(
        targetId: string,
        graph: {
            nodes: Array<{ id: string; name: string; type: string }>;
            links: Array<{ source: string; target: string; type: string }>;
        },
        contributors: Set<string>,
        maxDepth: number,
        currentDepth: number = 0,
    ): void {
        if (currentDepth >= maxDepth) return;

        // Find all edges that lead TO the target
        const incomingEdges = graph.links.filter(
            link => link.target === targetId,
        );

        for (const edge of incomingEdges) {
            if (!contributors.has(edge.source)) {
                contributors.add(edge.source);
                // Recursively find contributors to this source
                this.findUpstreamContributors(
                    edge.source,
                    graph,
                    contributors,
                    maxDepth,
                    currentDepth + 1,
                );
            }
        }
    }

    /**
     * Find all nodes that receive data from the target (downstream traversal)
     */
    private findDownstreamContributors(
        sourceId: string,
        graph: {
            nodes: Array<{ id: string; name: string; type: string }>;
            links: Array<{ source: string; target: string; type: string }>;
        },
        contributors: Set<string>,
        maxDepth: number,
        currentDepth: number = 0,
    ): void {
        if (currentDepth >= maxDepth) return;

        // Find all edges that come FROM the source
        const outgoingEdges = graph.links.filter(
            link => link.source === sourceId,
        );

        for (const edge of outgoingEdges) {
            if (!contributors.has(edge.target)) {
                contributors.add(edge.target);
                // Recursively find nodes that this target contributes to
                this.findDownstreamContributors(
                    edge.target,
                    graph,
                    contributors,
                    maxDepth,
                    currentDepth + 1,
                );
            }
        }
    }
}
