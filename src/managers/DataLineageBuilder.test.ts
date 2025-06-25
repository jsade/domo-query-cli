import { beforeEach, describe, expect, it } from "vitest";
import { DomoDataflow } from "../api/clients/domoClient";
import { DataLineageBuilder } from "./DataLineageBuilder";

describe("DataLineageBuilder", () => {
    let builder: DataLineageBuilder;
    let mockDataflows: DomoDataflow[];

    beforeEach(() => {
        builder = new DataLineageBuilder();

        // Create mock dataflows forming a simple pipeline:
        // Dataset1 -> Dataflow1 -> Dataset2 -> Dataflow2 -> Dataset3
        mockDataflows = [
            {
                id: "df1",
                name: "Transform Customer Data",
                createdAt: "2024-01-01T00:00:00Z",
                status: "SUCCESS",
                owner: "John Doe",
                executionCount: 100,
                successRate: 0.95,
                inputs: [
                    {
                        id: "ds1",
                        name: "Raw Customer Data",
                        dataSourceId: "ds1",
                    },
                ],
                outputs: [
                    {
                        id: "ds2",
                        name: "Cleaned Customer Data",
                        dataSourceId: "ds2",
                    },
                ],
            },
            {
                id: "df2",
                name: "Generate Customer Report",
                createdAt: "2024-01-02T00:00:00Z",
                status: "SUCCESS",
                owner: "Jane Smith",
                executionCount: 50,
                successRate: 0.98,
                inputs: [
                    {
                        id: "ds2",
                        name: "Cleaned Customer Data",
                        dataSourceId: "ds2",
                    },
                ],
                outputs: [
                    { id: "ds3", name: "Customer Report", dataSourceId: "ds3" },
                ],
            },
        ];
    });

    describe("buildLineageGraph", () => {
        it("should build a graph with correct nodes and edges", () => {
            const graph = builder.buildLineageGraph(mockDataflows);

            // Check nodes
            expect(graph.nodes.size).toBe(5); // 2 dataflows + 3 datasets
            expect(graph.nodes.has("df1")).toBe(true);
            expect(graph.nodes.has("df2")).toBe(true);
            expect(graph.nodes.has("ds1")).toBe(true);
            expect(graph.nodes.has("ds2")).toBe(true);
            expect(graph.nodes.has("ds3")).toBe(true);

            // Check node types
            expect(graph.nodes.get("df1")?.type).toBe("dataflow");
            expect(graph.nodes.get("ds1")?.type).toBe("dataset");

            // Check edges
            expect(graph.edges.length).toBe(4);
            expect(graph.edges).toContainEqual({
                from: "ds1",
                to: "df1",
                type: "input",
            });
            expect(graph.edges).toContainEqual({
                from: "df1",
                to: "ds2",
                type: "output",
            });
            expect(graph.edges).toContainEqual({
                from: "ds2",
                to: "df2",
                type: "input",
            });
            expect(graph.edges).toContainEqual({
                from: "df2",
                to: "ds3",
                type: "output",
            });
        });

        it("should handle dataflows with multiple inputs and outputs", () => {
            const multiDataflow: DomoDataflow = {
                id: "df3",
                name: "Join Data Sources",
                createdAt: "2024-01-03T00:00:00Z",
                inputs: [
                    { id: "ds4", name: "Source A", dataSourceId: "ds4" },
                    { id: "ds5", name: "Source B", dataSourceId: "ds5" },
                ],
                outputs: [
                    { id: "ds6", name: "Joined Output", dataSourceId: "ds6" },
                    { id: "ds7", name: "Error Records", dataSourceId: "ds7" },
                ],
            };

            const graph = builder.buildLineageGraph([multiDataflow]);

            expect(graph.nodes.size).toBe(5); // 1 dataflow + 4 datasets
            expect(graph.edges.length).toBe(4); // 2 inputs + 2 outputs
        });

        it("should handle empty dataflows array", () => {
            const graph = builder.buildLineageGraph([]);
            expect(graph.nodes.size).toBe(0);
            expect(graph.edges.length).toBe(0);
        });

        it("should handle dataflows without inputs or outputs", () => {
            const dataflow: DomoDataflow = {
                id: "df4",
                name: "Standalone Dataflow",
                createdAt: "2024-01-04T00:00:00Z",
            };

            const graph = builder.buildLineageGraph([dataflow]);
            expect(graph.nodes.size).toBe(1);
            expect(graph.edges.length).toBe(0);
        });
    });

    describe("traceDataPath", () => {
        beforeEach(() => {
            builder.buildLineageGraph(mockDataflows);
        });

        it("should find direct path between connected nodes", () => {
            const paths = builder.traceDataPath("ds1", "ds2");

            expect(paths.length).toBe(1);
            expect(paths[0].nodes.length).toBe(3); // ds1 -> df1 -> ds2
            expect(paths[0].nodes[0].id).toBe("ds1");
            expect(paths[0].nodes[1].id).toBe("df1");
            expect(paths[0].nodes[2].id).toBe("ds2");
            expect(paths[0].distance).toBe(2);
        });

        it("should find path across multiple dataflows", () => {
            const paths = builder.traceDataPath("ds1", "ds3");

            expect(paths.length).toBe(1);
            expect(paths[0].nodes.length).toBe(5); // ds1 -> df1 -> ds2 -> df2 -> ds3
            expect(paths[0].nodes[0].id).toBe("ds1");
            expect(paths[0].nodes[4].id).toBe("ds3");
        });

        it("should return empty array for non-existent nodes", () => {
            const paths = builder.traceDataPath("nonexistent1", "nonexistent2");
            expect(paths).toEqual([]);
        });

        it("should return empty array when no path exists", () => {
            // Build a disconnected graph
            const disconnectedDataflows: DomoDataflow[] = [
                {
                    id: "df_a",
                    name: "Dataflow A",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        { id: "ds_a1", name: "Input A", dataSourceId: "ds_a1" },
                    ],
                    outputs: [
                        {
                            id: "ds_a2",
                            name: "Output A",
                            dataSourceId: "ds_a2",
                        },
                    ],
                },
                {
                    id: "df_b",
                    name: "Dataflow B",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        { id: "ds_b1", name: "Input B", dataSourceId: "ds_b1" },
                    ],
                    outputs: [
                        {
                            id: "ds_b2",
                            name: "Output B",
                            dataSourceId: "ds_b2",
                        },
                    ],
                },
            ];

            builder.buildLineageGraph(disconnectedDataflows);
            const paths = builder.traceDataPath("ds_a1", "ds_b2");
            expect(paths).toEqual([]);
        });
    });

    describe("getDatasetDependencies", () => {
        beforeEach(() => {
            builder.buildLineageGraph(mockDataflows);
        });

        it("should get dependencies for middle dataset", () => {
            const deps = builder.getDatasetDependencies("ds2");

            expect(deps).not.toBeNull();
            expect(deps?.datasetId).toBe("ds2");
            expect(deps?.datasetName).toBe("Cleaned Customer Data");

            // Upstream
            expect(deps?.upstream.dataflows.length).toBe(1);
            expect(deps?.upstream.dataflows[0].id).toBe("df1");
            expect(deps?.upstream.datasets.length).toBe(1);
            expect(deps?.upstream.datasets[0].id).toBe("ds1");

            // Downstream
            expect(deps?.downstream.dataflows.length).toBe(1);
            expect(deps?.downstream.dataflows[0].id).toBe("df2");
            expect(deps?.downstream.datasets.length).toBe(1);
            expect(deps?.downstream.datasets[0].id).toBe("ds3");
        });

        it("should handle dataset with no dependencies", () => {
            const deps = builder.getDatasetDependencies("ds1");

            expect(deps).not.toBeNull();
            expect(deps?.upstream.dataflows.length).toBe(0);
            expect(deps?.upstream.datasets.length).toBe(0);
            expect(deps?.downstream.dataflows.length).toBe(1);
            expect(deps?.downstream.dataflows[0].id).toBe("df1");
        });

        it("should return null for non-existent dataset", () => {
            const deps = builder.getDatasetDependencies("nonexistent");
            expect(deps).toBeNull();
        });

        it("should return null for dataflow node", () => {
            const deps = builder.getDatasetDependencies("df1");
            expect(deps).toBeNull();
        });
    });

    describe("getDataflowsUsingDataset", () => {
        beforeEach(() => {
            builder.buildLineageGraph(mockDataflows);
        });

        it("should return dataflows using a dataset", () => {
            const dataflows = builder.getDataflowsUsingDataset("ds2");
            expect(dataflows.length).toBe(2); // Used by df1 (output) and df2 (input)
            expect(dataflows.map(df => df.id)).toContain("df1");
            expect(dataflows.map(df => df.id)).toContain("df2");
        });

        it("should return empty array for unused dataset", () => {
            const dataflows = builder.getDataflowsUsingDataset("unused");
            expect(dataflows).toEqual([]);
        });
    });

    describe("exportForVisualization", () => {
        beforeEach(() => {
            builder.buildLineageGraph(mockDataflows);
        });

        it("should export nodes and links for visualization", () => {
            const vizData = builder.exportForVisualization();

            expect(vizData.nodes.length).toBe(5);
            expect(vizData.links.length).toBe(4);

            // Check link format
            expect(vizData.links[0]).toHaveProperty("source");
            expect(vizData.links[0]).toHaveProperty("target");
            expect(vizData.links[0]).toHaveProperty("type");
        });
    });

    describe("generateMermaidDiagram", () => {
        beforeEach(() => {
            builder.buildLineageGraph(mockDataflows);
        });

        it("should generate valid Mermaid diagram syntax", () => {
            const diagram = builder.generateMermaidDiagram();

            expect(diagram).toContain("graph TD");
            expect(diagram).toContain('ds1["Raw Customer Data"]:::dataset');
            expect(diagram).toContain(
                'df1("Transform Customer Data"):::dataflow',
            );
            expect(diagram).toContain("ds1 --> df1");
            expect(diagram).toContain("df1 ==> ds2");
            expect(diagram).toContain("classDef dataset");
            expect(diagram).toContain("classDef dataflow");
        });

        it("should respect maxNodes parameter", () => {
            // Create many dataflows
            const manyDataflows: DomoDataflow[] = [];
            for (let i = 0; i < 100; i++) {
                manyDataflows.push({
                    id: `df${i}`,
                    name: `Dataflow ${i}`,
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: `ds${i}`,
                            name: `Dataset ${i}`,
                            dataSourceId: `ds${i}`,
                        },
                    ],
                    outputs: [
                        {
                            id: `ds${i + 1}`,
                            name: `Dataset ${i + 1}`,
                            dataSourceId: `ds${i + 1}`,
                        },
                    ],
                });
            }

            builder.buildLineageGraph(manyDataflows);
            const diagram = builder.generateMermaidDiagram(10);

            // Count node definitions (lines containing [ or ( )
            const nodeLines = diagram
                .split("\n")
                .filter(line => line.includes("[") || line.includes("("));
            expect(nodeLines.length).toBeLessThanOrEqual(10);
        });

        it("should escape quotes in node names", () => {
            const dataflowWithQuotes: DomoDataflow = {
                id: "df_quote",
                name: 'Dataflow with "quotes"',
                createdAt: "2024-01-01T00:00:00Z",
                inputs: [
                    {
                        id: "ds_quote",
                        name: 'Dataset with "quotes"',
                        dataSourceId: "ds_quote",
                    },
                ],
            };

            builder.buildLineageGraph([dataflowWithQuotes]);
            const diagram = builder.generateMermaidDiagram();

            expect(diagram).toContain("Dataflow with 'quotes'");
            expect(diagram).toContain("Dataset with 'quotes'");
        });
    });

    describe("complex scenarios", () => {
        it("should handle circular dependencies", () => {
            const circularDataflows: DomoDataflow[] = [
                {
                    id: "df_circular1",
                    name: "Circular Flow 1",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: "ds_c1",
                            name: "Dataset C1",
                            dataSourceId: "ds_c1",
                        },
                    ],
                    outputs: [
                        {
                            id: "ds_c2",
                            name: "Dataset C2",
                            dataSourceId: "ds_c2",
                        },
                    ],
                },
                {
                    id: "df_circular2",
                    name: "Circular Flow 2",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: "ds_c2",
                            name: "Dataset C2",
                            dataSourceId: "ds_c2",
                        },
                    ],
                    outputs: [
                        {
                            id: "ds_c1",
                            name: "Dataset C1",
                            dataSourceId: "ds_c1",
                        },
                    ],
                },
            ];

            const graph = builder.buildLineageGraph(circularDataflows);
            expect(graph.nodes.size).toBe(4); // 2 dataflows + 2 datasets

            // Should handle circular path tracing without infinite loop
            const paths = builder.traceDataPath("ds_c1", "ds_c2");
            expect(paths.length).toBeGreaterThan(0);
        });

        it("should handle shared datasets between multiple dataflows", () => {
            const sharedDataflows: DomoDataflow[] = [
                {
                    id: "df_shared1",
                    name: "Process A",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: "ds_source",
                            name: "Source",
                            dataSourceId: "ds_source",
                        },
                    ],
                    outputs: [
                        {
                            id: "ds_shared",
                            name: "Shared Output",
                            dataSourceId: "ds_shared",
                        },
                    ],
                },
                {
                    id: "df_shared2",
                    name: "Process B",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: "ds_source",
                            name: "Source",
                            dataSourceId: "ds_source",
                        },
                    ],
                    outputs: [
                        {
                            id: "ds_shared",
                            name: "Shared Output",
                            dataSourceId: "ds_shared",
                        },
                    ],
                },
                {
                    id: "df_consumer",
                    name: "Consumer",
                    createdAt: "2024-01-01T00:00:00Z",
                    inputs: [
                        {
                            id: "ds_shared",
                            name: "Shared Output",
                            dataSourceId: "ds_shared",
                        },
                    ],
                    outputs: [
                        {
                            id: "ds_final",
                            name: "Final",
                            dataSourceId: "ds_final",
                        },
                    ],
                },
            ];

            builder.buildLineageGraph(sharedDataflows);
            const deps = builder.getDatasetDependencies("ds_shared");

            expect(deps?.upstream.dataflows.length).toBe(2);
            expect(deps?.downstream.dataflows.length).toBe(1);
        });
    });
});
