import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
    type MockInstance,
} from "vitest";
import * as dataflowApi from "../api/clients/dataflowApi";
import type { DomoDataflow } from "../api/clients/domoClient";
import {
    DataLineageBuilder,
    type DatasetDependencies,
    type LineageGraph,
} from "../managers/DataLineageBuilder";
import * as logger from "../utils/logger";
import * as CommandUtils from "./CommandUtils";
import { ShowLineageCommand } from "./ShowLineageCommand";
import type { SaveOptions } from "./CommandUtils";

// Mock dependencies
vi.mock("../api/clients/dataflowApi", () => ({
    listDataflows: vi.fn(),
}));

vi.mock("../managers/DataLineageBuilder", () => ({
    DataLineageBuilder: vi.fn().mockImplementation(() => ({
        buildLineageGraph: vi.fn(),
        getDatasetDependencies: vi.fn(),
        exportForVisualization: vi.fn(),
    })),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("./CommandUtils", () => ({
    CommandUtils: {
        parseSaveOptions: vi.fn(),
        exportData: vi.fn(),
    },
}));

describe("ShowLineageCommand", () => {
    let command: ShowLineageCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    let mockLineageBuilder: {
        buildLineageGraph: Mock;
        getDatasetDependencies: Mock;
        getDataflowsUsingDataset: Mock;
        exportForVisualization: Mock;
    };
    const mockedListDataflows = dataflowApi.listDataflows as Mock;
    const mockedParseSaveOptions = CommandUtils.CommandUtils
        .parseSaveOptions as Mock;
    const mockedExportData = CommandUtils.CommandUtils.exportData as Mock;

    // Sample data
    const sampleDataflows: DomoDataflow[] = [
        {
            id: "df1",
            name: "Sales ETL",
            description: "Process sales data",
            inputs: [
                {
                    id: "input1",
                    dataSourceId: "ds1",
                    name: "Raw Sales Data",
                },
            ],
            outputs: [
                {
                    id: "output1",
                    dataSourceId: "ds2",
                    name: "Processed Sales",
                },
            ],
            owner: "John Doe",
            status: "SUCCESS",
            lastUpdated: "2023-01-01T00:00:00.000Z",
            createdAt: "2022-01-01T00:00:00.000Z",
        },
        {
            id: "df2",
            name: "Analytics Dataflow",
            description: "Analytics processing",
            inputs: [
                {
                    id: "input2",
                    dataSourceId: "ds2",
                    name: "Processed Sales",
                },
            ],
            outputs: [
                {
                    id: "output2",
                    dataSourceId: "ds3",
                    name: "Sales Analytics",
                },
            ],
            owner: "Jane Smith",
            status: "SUCCESS",
            lastUpdated: "2023-01-02T00:00:00.000Z",
            createdAt: "2022-01-02T00:00:00.000Z",
        },
    ];

    const sampleGraph: LineageGraph = {
        nodes: new Map([
            ["ds1", { id: "ds1", name: "Raw Sales Data", type: "dataset" }],
            ["ds2", { id: "ds2", name: "Processed Sales", type: "dataset" }],
            ["ds3", { id: "ds3", name: "Sales Analytics", type: "dataset" }],
            ["df1", { id: "df1", name: "Sales ETL", type: "dataflow" }],
            [
                "df2",
                { id: "df2", name: "Analytics Dataflow", type: "dataflow" },
            ],
        ]),
        edges: [
            { from: "ds1", to: "df1", type: "input" },
            { from: "df1", to: "ds2", type: "output" },
            { from: "ds2", to: "df2", type: "input" },
            { from: "df2", to: "ds3", type: "output" },
        ],
    };

    const sampleDependencies: DatasetDependencies = {
        datasetId: "ds2",
        datasetName: "Processed Sales",
        upstream: {
            dataflows: [sampleDataflows[0]],
            datasets: [{ id: "ds1", name: "Raw Sales Data" }],
        },
        downstream: {
            dataflows: [sampleDataflows[1]],
            datasets: [{ id: "ds3", name: "Sales Analytics" }],
        },
    };

    beforeEach(() => {
        command = new ShowLineageCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();

        // Setup mock lineage builder
        mockLineageBuilder = {
            buildLineageGraph: vi.fn().mockReturnValue(sampleGraph),
            getDatasetDependencies: vi.fn().mockReturnValue(sampleDependencies),
            getDataflowsUsingDataset: vi
                .fn()
                .mockReturnValue([sampleDataflows[1]]), // df2 uses ds2
            exportForVisualization: vi.fn().mockReturnValue({
                nodes: Array.from(sampleGraph.nodes.values()),
                links: sampleGraph.edges.map(edge => ({
                    source: edge.from,
                    target: edge.to,
                    type: edge.type,
                })),
            }),
        };

        (DataLineageBuilder as unknown as Mock).mockImplementation(
            () => mockLineageBuilder,
        );

        // Default mock implementations
        mockedParseSaveOptions.mockReturnValue([
            [],
            { format: null, path: "./output" },
        ]);
    });

    describe("execute", () => {
        it("should display usage when no entity ID is provided", async () => {
            await command.execute([]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Usage: show-lineage <dataset-id|dataflow-id> [options]",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Use 'help show-lineage' for more information.",
            );
        });

        it("should handle no dataflows found", async () => {
            mockedListDataflows.mockResolvedValue([]);

            await command.execute(["ds1"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "No dataflows found. Unable to build lineage.",
            );
        });

        it("should handle entity not found in graph", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);
            mockLineageBuilder.buildLineageGraph.mockReturnValue({
                nodes: new Map(),
                edges: [],
            });

            await command.execute(["unknown-id"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Entity 'unknown-id' not found in the lineage graph.",
            );
        });

        it("should display dataset dependencies by default", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["ds2"]);

            expect(mockLineageBuilder.buildLineageGraph).toHaveBeenCalledWith(
                sampleDataflows,
            );
            expect(
                mockLineageBuilder.getDatasetDependencies,
            ).toHaveBeenCalledWith("ds2");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Upstream Dependencies"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Downstream Dependencies"),
            );
        });

        it("should display dataflow connections", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["df1"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataflow Connections"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Input Datasets"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Datasets"),
            );
        });

        it("should generate diagram when --diagram option is used", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["ds2", "--diagram"]);

            expect(
                mockLineageBuilder.exportForVisualization,
            ).toHaveBeenCalled();

            // Check that the diagram was output by looking at all console logs
            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("Lineage Diagram (Mermaid)");
            expect(allLogs).toContain("graph TD");
        });

        it("should respect max depth option", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["ds2", "--diagram", "--max-depth=5"]);

            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("graph TD");
        });

        it("should export data when save options are provided", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);
            mockedParseSaveOptions.mockReturnValue([
                [], // remaining args after parsing save options
                { format: "json", path: "./output" },
            ]);

            // Execute the command
            await command.execute(["ds2", "--save-json"]);

            // Debug: Check what error was thrown
            if ((logger.log.error as unknown as Mock).mock.calls.length > 0) {
                console.log(
                    "Error logged:",
                    (logger.log.error as unknown as Mock).mock.calls[0],
                );
            }
            if (consoleErrorSpy.mock.calls.length > 0) {
                console.log("Console error:", consoleErrorSpy.mock.calls[0]);
            }

            expect(mockedParseSaveOptions).toHaveBeenCalledWith([
                "--save-json",
            ]);
            expect(mockedExportData).toHaveBeenCalled();
            const callArgs = mockedExportData.mock.calls[0];
            expect(callArgs[0]).toEqual([
                expect.objectContaining({
                    entity: expect.objectContaining({
                        id: "ds2",
                        type: "dataset",
                        name: "Processed Sales",
                    }),
                    analysis: expect.objectContaining({
                        dependencies: sampleDependencies,
                    }),
                }),
            ]);
            expect(callArgs[1]).toBe("Data Lineage for Processed Sales");
            expect(callArgs[2]).toBe("lineage");
            expect(callArgs[3]).toEqual({ format: "json", path: "./output" });
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("API Error");
            mockedListDataflows.mockRejectedValue(error);

            await command.execute(["ds1"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error analyzing lineage:",
                error,
            );
            expect(console.error).toHaveBeenCalledWith(
                "Failed to analyze lineage. Check your authentication and try again.",
            );
        });

        it("should find upstream contributors correctly", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["ds3", "--diagram"]);

            // Should include diagram with upstream nodes
            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("graph TD");
        });

        it("should find downstream contributors for dataflows", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["df1", "--diagram"]);

            // Should include diagram with both upstream and downstream nodes
            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("graph TD");
        });

        it("should handle dataflows with no inputs", async () => {
            const dataflowNoInputs: DomoDataflow = {
                id: "df3",
                name: "Source Dataflow",
                description: "No inputs",
                inputs: [],
                outputs: [
                    {
                        id: "output3",
                        dataSourceId: "ds4",
                        name: "Generated Data",
                    },
                ],
                owner: "System",
                status: "SUCCESS",
                createdAt: "2022-01-01T00:00:00.000Z",
            };

            mockedListDataflows.mockResolvedValue([dataflowNoInputs]);

            // Mock the graph to include the new dataflow
            const graphWithNoInputs: LineageGraph = {
                nodes: new Map([
                    [
                        "df3",
                        {
                            id: "df3",
                            name: "Source Dataflow",
                            type: "dataflow",
                        },
                    ],
                    [
                        "ds4",
                        { id: "ds4", name: "Generated Data", type: "dataset" },
                    ],
                ]),
                edges: [{ from: "df3", to: "ds4", type: "output" }],
            };

            mockLineageBuilder.buildLineageGraph.mockReturnValue(
                graphWithNoInputs,
            );

            await command.execute(["df3"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "### Input Datasets: None",
            );
        });

        it("should handle dataflows with no outputs", async () => {
            const dataflowNoOutputs: DomoDataflow = {
                id: "df4",
                name: "Sink Dataflow",
                description: "No outputs",
                inputs: [
                    {
                        id: "input4",
                        dataSourceId: "ds5",
                        name: "Input Data",
                    },
                ],
                outputs: [],
                owner: "System",
                status: "SUCCESS",
                createdAt: "2022-01-01T00:00:00.000Z",
            };

            mockedListDataflows.mockResolvedValue([dataflowNoOutputs]);

            // Mock the graph to include the new dataflow
            const graphWithNoOutputs: LineageGraph = {
                nodes: new Map([
                    [
                        "df4",
                        { id: "df4", name: "Sink Dataflow", type: "dataflow" },
                    ],
                    ["ds5", { id: "ds5", name: "Input Data", type: "dataset" }],
                ]),
                edges: [{ from: "ds5", to: "df4", type: "input" }],
            };

            mockLineageBuilder.buildLineageGraph.mockReturnValue(
                graphWithNoOutputs,
            );

            await command.execute(["df4"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("### Output Datasets: None"),
            );
        });

        it("should display both dependencies and diagram when both options are used", async () => {
            mockedListDataflows.mockResolvedValue(sampleDataflows);

            await command.execute(["ds2", "--dependencies", "--diagram"]);

            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("Upstream Dependencies");
            expect(allLogs).toContain("Lineage Diagram (Mermaid)");
        });

        it("should handle circular dependencies", async () => {
            const circularDataflows: DomoDataflow[] = [
                {
                    id: "df_circular1",
                    name: "Circular 1",
                    inputs: [
                        { id: "i1", dataSourceId: "ds_c1", name: "Data 1" },
                    ],
                    outputs: [
                        { id: "o1", dataSourceId: "ds_c2", name: "Data 2" },
                    ],
                    createdAt: "2022-01-01T00:00:00.000Z",
                },
                {
                    id: "df_circular2",
                    name: "Circular 2",
                    inputs: [
                        { id: "i2", dataSourceId: "ds_c2", name: "Data 2" },
                    ],
                    outputs: [
                        { id: "o2", dataSourceId: "ds_c1", name: "Data 1" },
                    ],
                    createdAt: "2022-01-01T00:00:00.000Z",
                },
            ];

            mockedListDataflows.mockResolvedValue(circularDataflows);

            // Mock the graph to include the circular nodes
            const circularGraph: LineageGraph = {
                nodes: new Map([
                    ["ds_c1", { id: "ds_c1", name: "Data 1", type: "dataset" }],
                    ["ds_c2", { id: "ds_c2", name: "Data 2", type: "dataset" }],
                    [
                        "df_circular1",
                        {
                            id: "df_circular1",
                            name: "Circular 1",
                            type: "dataflow",
                        },
                    ],
                    [
                        "df_circular2",
                        {
                            id: "df_circular2",
                            name: "Circular 2",
                            type: "dataflow",
                        },
                    ],
                ]),
                edges: [
                    { from: "ds_c1", to: "df_circular1", type: "input" },
                    { from: "df_circular1", to: "ds_c2", type: "output" },
                    { from: "ds_c2", to: "df_circular2", type: "input" },
                    { from: "df_circular2", to: "ds_c1", type: "output" },
                ],
            };

            mockLineageBuilder.buildLineageGraph.mockReturnValue(circularGraph);
            mockLineageBuilder.exportForVisualization.mockReturnValue({
                nodes: Array.from(circularGraph.nodes.values()),
                links: circularGraph.edges.map(edge => ({
                    source: edge.from,
                    target: edge.to,
                    type: edge.type,
                })),
            });

            await command.execute(["ds_c1", "--diagram", "--max-depth=10"]);

            // Should not crash and should display diagram
            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("graph TD");
        });
    });

    describe("showHelp", () => {
        it("should display help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("show-lineage"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Display Options:"),
            );

            // Check that the table data includes the options
            const allLogs = consoleLogSpy.mock.calls.flat().join("\n");
            expect(allLogs).toContain("--dependencies");
            expect(allLogs).toContain("--diagram");
            expect(allLogs).toContain("--max-depth");
        });
    });

    describe("parseOptions", () => {
        it("should parse save and display options correctly", () => {
            const options = ["--save-json", "--diagram", "--dependencies"];
            mockedParseSaveOptions.mockReturnValue([
                ["--save-json"],
                { format: "json", path: "./output" },
            ]);

            const result = (
                command as unknown as {
                    parseOptions: (options: string[]) => {
                        saveOptions: SaveOptions;
                        displayOptions: string[];
                    };
                }
            ).parseOptions(options);

            expect(result.saveOptions).toEqual({
                format: "json",
                path: "./output",
            });
            expect(result.displayOptions).toEqual([
                "--diagram",
                "--dependencies",
            ]);
        });
    });

    describe("extractMaxDepth", () => {
        it("should extract max depth from options", () => {
            const options = ["--max-depth=5"];
            const depth = (
                command as unknown as {
                    extractMaxDepth: (options: string[]) => number;
                }
            ).extractMaxDepth(options);
            expect(depth).toBe(5);
        });

        it("should return default depth when not specified", () => {
            const options = ["--diagram"];
            const depth = (
                command as unknown as {
                    extractMaxDepth: (options: string[]) => number;
                }
            ).extractMaxDepth(options);
            expect(depth).toBe(3);
        });

        it("should clamp depth between 1 and 10", () => {
            const extractMaxDepth = (
                command as unknown as {
                    extractMaxDepth: (options: string[]) => number;
                }
            ).extractMaxDepth;
            expect(extractMaxDepth.call(command, ["--max-depth=0"])).toBe(1);
            expect(extractMaxDepth.call(command, ["--max-depth=15"])).toBe(10);
        });

        it("should handle invalid depth values", () => {
            const options = ["--max-depth=invalid"];
            const depth = (
                command as unknown as {
                    extractMaxDepth: (options: string[]) => number;
                }
            ).extractMaxDepth(options);
            expect(depth).toBe(3);
        });
    });
});
