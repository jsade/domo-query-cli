/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { SmartResponseBuilder } from "./SmartResponseBuilder";

// Type for test data assertions
type TestDataAssertion = Record<string, any>;

describe("SmartResponseBuilder", () => {
    describe("buildDataflowResponse", () => {
        it("should return complete response for small dataflows", () => {
            const smallDataflow = {
                id: "123",
                name: "Small Dataflow",
                description: "A small test dataflow",
                inputs: [{ id: "input1" }],
                outputs: [{ id: "output1" }],
            };

            const response =
                SmartResponseBuilder.buildDataflowResponse(smallDataflow);

            expect(response.type).toBe("complete");
            expect(response.data).toEqual(smallDataflow);
            expect(response.metadata).toBeUndefined();
        });

        it("should return summary for large dataflows", () => {
            // Create a large dataflow that exceeds the limit
            const largeTransformations = Array(1000).fill({
                id: "transformation",
                name: "Large Transformation",
                config: {
                    sql: "SELECT * FROM large_table WHERE condition = true",
                    parameters: Array(100).fill({
                        key: "param",
                        value: "value",
                    }),
                },
            });

            const largeDataflow = {
                id: "456",
                name: "Large Dataflow",
                description: "A large dataflow with many transformations",
                transformations: largeTransformations,
            };

            const response =
                SmartResponseBuilder.buildDataflowResponse(largeDataflow);

            expect(response.type).toBe("summary");
            const data = response.data as TestDataAssertion;
            expect(data.id).toBe("456");
            expect(data.name).toBe("Large Dataflow");
            expect(data._metadata).toBeDefined();
            expect(data._metadata.exceedsLimit).toBe(true);
            expect(data._metadata.availableSections).toBeDefined();
            expect(data._metadata.availableSections.length).toBeGreaterThan(0);
            expect(data._metadata.message).toContain("get_dataflow_section");
        });

        it("should return specific section when requested", () => {
            const dataflow = {
                id: "789",
                name: "Test Dataflow",
                inputs: [
                    { id: "input1", datasetId: "dataset1" },
                    { id: "input2", datasetId: "dataset2" },
                ],
                outputs: [{ id: "output1", datasetId: "dataset3" }],
            };

            const response = SmartResponseBuilder.buildDataflowResponse(
                dataflow,
                "inputs",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.inputs).toBeDefined();
            expect(data.inputs).toHaveLength(2);
            expect(response.metadata?.section).toBe("inputs");
            expect(response.metadata?.complete).toBe(true);
        });

        it("should handle chunked sections for very large data", () => {
            // Create a section that requires chunking
            const largeInputs = Array(500).fill({
                id: "input",
                datasetId: "dataset",
                configuration: {
                    data: "x".repeat(200),
                },
            });

            const dataflow = {
                id: "999",
                name: "Chunked Dataflow",
                inputs: largeInputs,
            };

            const response = SmartResponseBuilder.buildDataflowResponse(
                dataflow,
                "inputs",
                0,
            );

            expect(response.type).toBe("chunk");
            const data = response.data as TestDataAssertion;
            expect(data.inputs).toBeDefined();
            expect(data.inputs.length).toBeLessThan(largeInputs.length);
            expect(response.metadata?.section).toBe("inputs");
            expect(response.metadata?.chunkIndex).toBe(0);
            expect(response.metadata?.totalChunks).toBeGreaterThan(1);
            expect(response.metadata?.hasMore).toBe(true);
            expect(response.metadata?.nextChunkIndex).toBe(1);
        });

        it("should throw error for invalid section name", () => {
            const dataflow = { id: "111", name: "Test" };

            expect(() => {
                SmartResponseBuilder.buildDataflowResponse(
                    dataflow,
                    "invalidSection",
                );
            }).toThrow("Section 'invalidSection' not found");
        });

        it("should not throw error for sections that fit in one response", () => {
            const dataflow = {
                id: "222",
                name: "Test",
                inputs: [{ id: "input1" }],
            };

            // Small sections return directly without chunking
            const response = SmartResponseBuilder.buildDataflowResponse(
                dataflow,
                "inputs",
                10,
            );
            expect(response.type).toBe("section");
        });
    });

    describe("section extraction", () => {
        const testDataflow = {
            id: "333",
            name: "Test Dataflow",
            description: "Test description",
            status: "ACTIVE",
            enabled: true,
            inputs: [{ id: "input1" }],
            outputs: [{ id: "output1" }],
            transformations: [{ id: "transform1" }],
            actions: [{ id: "action1" }],
            triggerSettings: { schedule: "daily" },
            executionHistory: [{ id: "exec1" }],
            onboardFlowVersionDetails: { version: "1.0" },
            engineProperties: { engine: "spark" },
            guiCanvas: { layout: "grid" },
        };

        it("should extract core section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "core",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.id).toBe("333");
            expect(data.name).toBe("Test Dataflow");
            expect(data.description).toBe("Test description");
            expect(data.status).toBe("ACTIVE");
            expect(data.enabled).toBe(true);
        });

        it("should extract inputs section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "inputs",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.inputs).toEqual([{ id: "input1" }]);
        });

        it("should extract outputs section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "outputs",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.outputs).toEqual([{ id: "output1" }]);
        });

        it("should extract transformations section with guiCanvas", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "transformations",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.transformations).toEqual([{ id: "transform1" }]);
            expect(data.guiCanvas).toEqual({ layout: "grid" });
        });

        it("should use actions as fallback for transformations", () => {
            const dataflowWithActions = {
                id: "444",
                actions: [{ id: "action1" }],
            };

            const response = SmartResponseBuilder.buildDataflowResponse(
                dataflowWithActions,
                "transformations",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.transformations).toEqual([{ id: "action1" }]);
        });

        it("should extract triggers section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "triggers",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.triggers).toEqual({ schedule: "daily" });
        });

        it("should extract history section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "history",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.executionHistory).toEqual([{ id: "exec1" }]);
        });

        it("should extract metadata section correctly", () => {
            const response = SmartResponseBuilder.buildDataflowResponse(
                testDataflow,
                "metadata",
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.onboardFlowVersionDetails).toEqual({
                version: "1.0",
            });
            expect(data.engineProperties).toEqual({ engine: "spark" });
        });
    });

    describe("buildNotFoundResponse", () => {
        it("should create not found error response", () => {
            const response = SmartResponseBuilder.buildNotFoundResponse("555");

            expect(response.type).toBe("complete");
            const data = response.data as TestDataAssertion;
            expect(data.error).toContain("Dataflow with ID 555 not found");
        });
    });

    describe("buildErrorResponse", () => {
        it("should handle Error objects", () => {
            const error = new Error("Test error message");
            const response = SmartResponseBuilder.buildErrorResponse(error);

            expect(response.type).toBe("complete");
            const data = response.data as TestDataAssertion;
            expect(data.error).toBe("Test error message");
        });

        it("should handle string errors", () => {
            const response =
                SmartResponseBuilder.buildErrorResponse("String error");

            expect(response.type).toBe("complete");
            const data = response.data as TestDataAssertion;
            expect(data.error).toBe("String error");
        });

        it("should handle unknown error types", () => {
            const response = SmartResponseBuilder.buildErrorResponse({
                code: "ERR001",
            });

            expect(response.type).toBe("complete");
            const data = response.data as TestDataAssertion;
            expect(data.error).toBe("[object Object]");
        });
    });

    describe("chunking logic", () => {
        it("should handle empty arrays", () => {
            const dataflow = {
                id: "666",
                inputs: [],
            };

            const response = SmartResponseBuilder.buildDataflowResponse(
                dataflow,
                "inputs",
                0,
            );

            expect(response.type).toBe("section");
            const data = response.data as TestDataAssertion;
            expect(data.inputs).toEqual([]);
            expect(response.metadata?.complete).toBe(true);
        });

        it("should chunk arrays intelligently based on size", () => {
            // Create items with different sizes
            const smallItems = Array(100).fill({ id: "small", data: "x" });
            const largeItems = Array(10).fill({
                id: "large",
                data: "x".repeat(10000),
            });

            const dataflowSmall = { id: "777", inputs: smallItems };
            const dataflowLarge = { id: "888", inputs: largeItems };

            const responseSmall = SmartResponseBuilder.buildDataflowResponse(
                dataflowSmall,
                "inputs",
                0,
            );
            const responseLarge = SmartResponseBuilder.buildDataflowResponse(
                dataflowLarge,
                "inputs",
                0,
            );

            // Small items should have more items per chunk
            if (responseSmall.type === "chunk") {
                const data = responseSmall.data as TestDataAssertion;
                expect(data.inputs.length).toBeGreaterThan(1);
            }

            // Large items should have fewer items per chunk
            if (responseLarge.type === "chunk") {
                const data = responseLarge.data as TestDataAssertion;
                expect(data.inputs.length).toBeLessThanOrEqual(10);
            }
        });

        it("should handle last chunk correctly", () => {
            const largeInputs = Array(100).fill({
                id: "input",
                data: "x".repeat(1000),
            });

            const dataflow = {
                id: "999",
                inputs: largeInputs,
            };

            // Get the first chunk to determine total chunks
            const firstChunk = SmartResponseBuilder.buildDataflowResponse(
                dataflow,
                "inputs",
                0,
            );

            if (
                firstChunk.type === "chunk" &&
                firstChunk.metadata?.totalChunks
            ) {
                const lastChunkIndex = firstChunk.metadata.totalChunks - 1;
                const lastChunk = SmartResponseBuilder.buildDataflowResponse(
                    dataflow,
                    "inputs",
                    lastChunkIndex,
                );

                expect(lastChunk.type).toBe("chunk");
                expect(lastChunk.metadata?.hasMore).toBe(false);
                expect(lastChunk.metadata?.nextChunkIndex).toBeUndefined();
            }
        });
    });
});
