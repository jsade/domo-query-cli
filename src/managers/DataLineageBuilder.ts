import { DomoDataflow } from "../api/clients/domoClient.ts";
import { log } from "../utils/logger.ts";

/**
 * Represents a node in the lineage graph (either a dataset or dataflow)
 */
export interface LineageNode {
    id: string;
    name: string;
    type: "dataset" | "dataflow";
    metadata?: {
        rowCount?: number;
        columnCount?: number;
        lastUpdated?: string;
        owner?: string;
        status?: string;
        executionCount?: number;
        successRate?: number;
    };
}

/**
 * Represents an edge in the lineage graph (connection between nodes)
 */
export interface LineageEdge {
    from: string; // Node ID
    to: string; // Node ID
    type: "input" | "output";
}

/**
 * Represents the complete lineage graph
 */
export interface LineageGraph {
    nodes: Map<string, LineageNode>;
    edges: LineageEdge[];
}

/**
 * Represents a path through the lineage graph
 */
export interface DataPath {
    nodes: LineageNode[];
    edges: LineageEdge[];
    distance: number;
}

/**
 * Represents dependencies for a dataset
 */
export interface DatasetDependencies {
    datasetId: string;
    datasetName: string;
    upstream: {
        dataflows: DomoDataflow[];
        datasets: Array<{ id: string; name: string }>;
    };
    downstream: {
        dataflows: DomoDataflow[];
        datasets: Array<{ id: string; name: string }>;
    };
}

/**
 * Builds and analyzes data lineage graphs from Domo dataflows
 */
export class DataLineageBuilder {
    private graph: LineageGraph;
    private datasetIndex: Map<string, DomoDataflow[]>; // Dataset ID -> Dataflows that use it

    constructor() {
        this.graph = {
            nodes: new Map(),
            edges: [],
        };
        this.datasetIndex = new Map();
    }

    /**
     * Builds a lineage graph from an array of dataflows
     * @param dataflows - Array of dataflows to build the graph from
     * @returns The complete lineage graph
     */
    public buildLineageGraph(dataflows: DomoDataflow[]): LineageGraph {
        log.info(`Building lineage graph from ${dataflows.length} dataflows`);

        // Clear existing graph
        this.graph.nodes.clear();
        this.graph.edges = [];
        this.datasetIndex.clear();

        // First pass: Add all dataflow nodes and build dataset index
        for (const dataflow of dataflows) {
            // Add dataflow node
            this.addDataflowNode(dataflow);

            // Index inputs
            if (dataflow.inputs) {
                for (const input of dataflow.inputs) {
                    this.indexDatasetUsage(input.dataSourceId, dataflow);
                }
            }

            // Index outputs
            if (dataflow.outputs) {
                for (const output of dataflow.outputs) {
                    this.indexDatasetUsage(output.dataSourceId, dataflow);
                }
            }
        }

        // Second pass: Add dataset nodes and edges
        for (const dataflow of dataflows) {
            // Add input dataset nodes and edges
            if (dataflow.inputs) {
                for (const input of dataflow.inputs) {
                    this.addDatasetNode(input.dataSourceId, input.name);
                    this.addEdge(input.dataSourceId, dataflow.id, "input");
                }
            }

            // Add output dataset nodes and edges
            if (dataflow.outputs) {
                for (const output of dataflow.outputs) {
                    this.addDatasetNode(output.dataSourceId, output.name);
                    this.addEdge(dataflow.id, output.dataSourceId, "output");
                }
            }
        }

        log.info(
            `Graph built with ${this.graph.nodes.size} nodes and ${this.graph.edges.length} edges`,
        );
        return this.graph;
    }

    /**
     * Traces all paths between two nodes in the graph
     * @param sourceId - Source node ID (dataset or dataflow)
     * @param targetId - Target node ID (dataset or dataflow)
     * @returns Array of all paths between source and target
     */
    public traceDataPath(sourceId: string, targetId: string): DataPath[] {
        log.info(`Tracing paths from ${sourceId} to ${targetId}`);

        const paths: DataPath[] = [];
        const visited = new Set<string>();
        const currentPath: LineageNode[] = [];
        const currentEdges: LineageEdge[] = [];

        // Check if nodes exist
        const sourceNode = this.graph.nodes.get(sourceId);
        const targetNode = this.graph.nodes.get(targetId);

        if (!sourceNode || !targetNode) {
            log.warn(`Source or target node not found in graph`);
            return paths;
        }

        // DFS to find all paths
        this.dfs(sourceId, targetId, visited, currentPath, currentEdges, paths);

        log.info(`Found ${paths.length} paths from ${sourceId} to ${targetId}`);
        return paths;
    }

    /**
     * Gets all upstream and downstream dependencies for a dataset
     * @param datasetId - Dataset ID to analyze
     * @returns Dependencies object with upstream and downstream dataflows/datasets
     */
    public getDatasetDependencies(
        datasetId: string,
    ): DatasetDependencies | null {
        const datasetNode = this.graph.nodes.get(datasetId);
        if (!datasetNode || datasetNode.type !== "dataset") {
            log.warn(`Dataset ${datasetId} not found in graph`);
            return null;
        }

        const dependencies: DatasetDependencies = {
            datasetId,
            datasetName: datasetNode.name,
            upstream: {
                dataflows: [],
                datasets: [],
            },
            downstream: {
                dataflows: [],
                datasets: [],
            },
        };

        // Find upstream dependencies (dataflows that output to this dataset)
        const upstreamDataflows = this.findUpstreamDataflows(datasetId);
        dependencies.upstream.dataflows = upstreamDataflows;

        // Find datasets that feed into upstream dataflows
        for (const dataflow of upstreamDataflows) {
            if (dataflow.inputs) {
                for (const input of dataflow.inputs) {
                    if (
                        !dependencies.upstream.datasets.find(
                            d => d.id === input.dataSourceId,
                        )
                    ) {
                        dependencies.upstream.datasets.push({
                            id: input.dataSourceId,
                            name: input.name,
                        });
                    }
                }
            }
        }

        // Find downstream dependencies (dataflows that use this dataset as input)
        const downstreamDataflows = this.findDownstreamDataflows(datasetId);
        dependencies.downstream.dataflows = downstreamDataflows;

        // Find datasets produced by downstream dataflows
        for (const dataflow of downstreamDataflows) {
            if (dataflow.outputs) {
                for (const output of dataflow.outputs) {
                    if (
                        !dependencies.downstream.datasets.find(
                            d => d.id === output.dataSourceId,
                        )
                    ) {
                        dependencies.downstream.datasets.push({
                            id: output.dataSourceId,
                            name: output.name,
                        });
                    }
                }
            }
        }

        return dependencies;
    }

    /**
     * Gets all dataflows that use a specific dataset
     * @param datasetId - Dataset ID to search for
     * @returns Array of dataflows that use this dataset
     */
    public getDataflowsUsingDataset(datasetId: string): DomoDataflow[] {
        return this.datasetIndex.get(datasetId) || [];
    }

    /**
     * Exports the lineage graph in a format suitable for visualization
     * @returns Graph data in a visualization-friendly format
     */
    public exportForVisualization(): {
        nodes: Array<LineageNode & { x?: number; y?: number }>;
        links: Array<{ source: string; target: string; type: string }>;
    } {
        const nodes = Array.from(this.graph.nodes.values());
        const links = this.graph.edges.map(edge => ({
            source: edge.from,
            target: edge.to,
            type: edge.type,
        }));

        return { nodes, links };
    }

    /**
     * Generates a Mermaid diagram representation of the lineage graph
     * @param maxNodes - Maximum number of nodes to include (for readability)
     * @returns Mermaid diagram syntax as a string
     */
    public generateMermaidDiagram(maxNodes: number = 50): string {
        const lines: string[] = ["graph TD"];
        const nodes = Array.from(this.graph.nodes.values()).slice(0, maxNodes);
        const nodeIds = new Set(nodes.map(n => n.id));

        // Add nodes with styling
        for (const node of nodes) {
            const label = node.name.replace(/"/g, "'");
            if (node.type === "dataset") {
                lines.push(`    ${node.id}["${label}"]:::dataset`);
            } else {
                lines.push(`    ${node.id}("${label}"):::dataflow`);
            }
        }

        // Add edges (only between included nodes)
        for (const edge of this.graph.edges) {
            if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
                const arrow = edge.type === "input" ? "-->" : "==>";
                lines.push(`    ${edge.from} ${arrow} ${edge.to}`);
            }
        }

        // Add styling
        lines.push("");
        lines.push(
            "    classDef dataset fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
        );
        lines.push(
            "    classDef dataflow fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
        );

        return lines.join("\n");
    }

    // Private helper methods

    private addDataflowNode(dataflow: DomoDataflow): void {
        this.graph.nodes.set(dataflow.id, {
            id: dataflow.id,
            name: dataflow.name,
            type: "dataflow",
            metadata: {
                status: dataflow.status,
                owner: dataflow.owner,
                executionCount: dataflow.executionCount,
                successRate: dataflow.successRate,
                lastUpdated: dataflow.lastUpdated,
            },
        });
    }

    private addDatasetNode(id: string, name: string): void {
        if (!this.graph.nodes.has(id)) {
            this.graph.nodes.set(id, {
                id,
                name,
                type: "dataset",
            });
        }
    }

    private addEdge(from: string, to: string, type: "input" | "output"): void {
        this.graph.edges.push({ from, to, type });
    }

    private indexDatasetUsage(datasetId: string, dataflow: DomoDataflow): void {
        if (!this.datasetIndex.has(datasetId)) {
            this.datasetIndex.set(datasetId, []);
        }
        const dataflows = this.datasetIndex.get(datasetId)!;
        if (!dataflows.find(df => df.id === dataflow.id)) {
            dataflows.push(dataflow);
        }
    }

    private dfs(
        currentId: string,
        targetId: string,
        visited: Set<string>,
        currentPath: LineageNode[],
        currentEdges: LineageEdge[],
        allPaths: DataPath[],
    ): void {
        if (currentId === targetId) {
            // Found a path
            allPaths.push({
                nodes: [...currentPath, this.graph.nodes.get(currentId)!],
                edges: [...currentEdges],
                distance: currentPath.length,
            });
            return;
        }

        if (visited.has(currentId)) {
            return; // Avoid cycles
        }

        visited.add(currentId);
        currentPath.push(this.graph.nodes.get(currentId)!);

        // Find all edges from current node
        const outgoingEdges = this.graph.edges.filter(
            edge => edge.from === currentId,
        );

        for (const edge of outgoingEdges) {
            currentEdges.push(edge);
            this.dfs(
                edge.to,
                targetId,
                visited,
                currentPath,
                currentEdges,
                allPaths,
            );
            currentEdges.pop();
        }

        currentPath.pop();
        visited.delete(currentId);
    }

    private findUpstreamDataflows(datasetId: string): DomoDataflow[] {
        const upstreamDataflows: DomoDataflow[] = [];
        const edges = this.graph.edges.filter(
            edge => edge.to === datasetId && edge.type === "output",
        );

        for (const edge of edges) {
            const node = this.graph.nodes.get(edge.from);
            if (node && node.type === "dataflow") {
                // Find the actual dataflow object from our index
                const dataflows = this.getDataflowsUsingDataset(datasetId);
                const dataflow = dataflows.find(df => df.id === edge.from);
                if (dataflow) {
                    upstreamDataflows.push(dataflow);
                }
            }
        }

        return upstreamDataflows;
    }

    private findDownstreamDataflows(datasetId: string): DomoDataflow[] {
        const downstreamDataflows: DomoDataflow[] = [];
        const edges = this.graph.edges.filter(
            edge => edge.from === datasetId && edge.type === "input",
        );

        for (const edge of edges) {
            const node = this.graph.nodes.get(edge.to);
            if (node && node.type === "dataflow") {
                // Find the actual dataflow object from our index
                const dataflows = this.getDataflowsUsingDataset(datasetId);
                const dataflow = dataflows.find(df => df.id === edge.to);
                if (dataflow) {
                    downstreamDataflows.push(dataflow);
                }
            }
        }

        return downstreamDataflows;
    }
}
