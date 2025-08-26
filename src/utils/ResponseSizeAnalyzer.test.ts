import { describe, it, expect } from "vitest";
import {
    ResponseSizeAnalyzer,
    RESPONSE_SIZE_LIMITS,
} from "./ResponseSizeAnalyzer";

describe("ResponseSizeAnalyzer", () => {
    describe("analyzeDataflow", () => {
        it("should analyze a small dataflow correctly", () => {
            const smallDataflow = {
                id: "123",
                name: "Test Dataflow",
                description: "A small test dataflow",
                inputs: [{ id: "input1" }],
                outputs: [{ id: "output1" }],
            };

            const analysis =
                ResponseSizeAnalyzer.analyzeDataflow(smallDataflow);

            expect(analysis.exceedsLimit).toBe(false);
            expect(analysis.totalSize).toBeGreaterThan(0);
            expect(analysis.sections).toHaveProperty("core");
            expect(analysis.sections).toHaveProperty("inputs");
            expect(analysis.sections).toHaveProperty("outputs");
            expect(analysis.sections).toHaveProperty("transformations");
        });

        it("should detect when a dataflow exceeds size limit", () => {
            // Create a large dataflow that exceeds the limit
            const largeArray = Array(1000).fill({
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
                transformations: largeArray,
            };

            const analysis =
                ResponseSizeAnalyzer.analyzeDataflow(largeDataflow);

            expect(analysis.exceedsLimit).toBe(true);
            expect(analysis.totalSize).toBeGreaterThan(
                RESPONSE_SIZE_LIMITS.MAX_SINGLE_RESPONSE,
            );
            expect(analysis.sections.transformations.requiresChunking).toBe(
                true,
            );
        });

        it("should calculate correct chunk counts for large sections", () => {
            const largeSection = Array(500).fill({
                id: "item",
                data: "x".repeat(200),
            });

            const dataflow = {
                id: "789",
                name: "Chunked Dataflow",
                inputs: largeSection,
            };

            const analysis = ResponseSizeAnalyzer.analyzeDataflow(dataflow);
            const inputsSection = analysis.sections.inputs;

            expect(inputsSection.requiresChunking).toBe(true);
            expect(inputsSection.chunkCount).toBeGreaterThan(1);
        });

        it("should handle dataflows with missing sections", () => {
            const minimalDataflow = {
                id: "111",
                name: "Minimal",
            };

            const analysis =
                ResponseSizeAnalyzer.analyzeDataflow(minimalDataflow);

            expect(analysis).toBeDefined();
            expect(analysis.sections.inputs.size).toBeGreaterThan(0); // Empty array still has size
            expect(analysis.sections.outputs.size).toBeGreaterThan(0);
            expect(analysis.sections.transformations.size).toBeGreaterThan(0);
        });
    });

    describe("extractCoreInfo", () => {
        it("should extract core information correctly", () => {
            const dataflow = {
                id: "123",
                name: "Test",
                description: "Description",
                status: "ACTIVE",
                enabled: true,
                createdAt: "2024-01-01",
                modified: "2024-01-02",
                responsibleUserId: "user123",
                inputs: [1, 2, 3],
                outputs: [4, 5],
            };

            const coreInfo = ResponseSizeAnalyzer.extractCoreInfo(dataflow);

            expect(coreInfo.id).toBe("123");
            expect(coreInfo.name).toBe("Test");
            expect(coreInfo.description).toBe("Description");
            expect(coreInfo.status).toBe("ACTIVE");
            expect(coreInfo.enabled).toBe(true);
            expect(coreInfo.inputCount).toBe(3);
            expect(coreInfo.outputCount).toBe(2);
        });

        it("should handle alternative field names", () => {
            const dataflow = {
                id: "456",
                runState: "RUNNING",
                lastModified: "2024-01-03",
                owner: "owner123",
            };

            const coreInfo = ResponseSizeAnalyzer.extractCoreInfo(dataflow);

            expect(coreInfo.status).toBe("RUNNING");
            expect(coreInfo.modified).toBe("2024-01-03");
            expect(coreInfo.owner).toBe("owner123");
        });
    });

    describe("extractMetadata", () => {
        it("should extract metadata correctly", () => {
            const dataflow = {
                id: "123",
                onboardFlowVersionDetails: { version: "1.0" },
                engineProperties: { engine: "spark" },
                settings: { setting1: "value1" },
                hydrationState: "HYDRATED",
                magic: true,
                subsetProcessing: false,
            };

            const metadata = ResponseSizeAnalyzer.extractMetadata(dataflow);

            expect(metadata.onboardFlowVersionDetails).toEqual({
                version: "1.0",
            });
            expect(metadata.engineProperties).toEqual({ engine: "spark" });
            expect(metadata.settings).toEqual({ setting1: "value1" });
            expect(metadata.hydrationState).toBe("HYDRATED");
            expect(metadata.magic).toBe(true);
            expect(metadata.subsetProcessing).toBe(false);
        });
    });

    describe("calculateJsonSize", () => {
        it("should calculate JSON size correctly", () => {
            const testObject = { key: "value" };
            const expectedSize = JSON.stringify(testObject).length;

            expect(ResponseSizeAnalyzer.calculateJsonSize(testObject)).toBe(
                expectedSize,
            );
        });

        it("should handle arrays correctly", () => {
            const testArray = [1, 2, 3, 4, 5];
            const expectedSize = JSON.stringify(testArray).length;

            expect(ResponseSizeAnalyzer.calculateJsonSize(testArray)).toBe(
                expectedSize,
            );
        });

        it("should handle null", () => {
            expect(ResponseSizeAnalyzer.calculateJsonSize(null)).toBe(4); // "null"
        });
    });

    describe("exceedsResponseLimit", () => {
        it("should return false for small values", () => {
            const smallValue = { data: "small" };
            expect(ResponseSizeAnalyzer.exceedsResponseLimit(smallValue)).toBe(
                false,
            );
        });

        it("should return true for large values", () => {
            const largeValue = {
                data: "x".repeat(RESPONSE_SIZE_LIMITS.MAX_SINGLE_RESPONSE),
            };
            expect(ResponseSizeAnalyzer.exceedsResponseLimit(largeValue)).toBe(
                true,
            );
        });
    });

    describe("requiresChunking", () => {
        it("should return false for values within section limit", () => {
            const smallValue = { data: "x".repeat(1000) };
            expect(ResponseSizeAnalyzer.requiresChunking(smallValue)).toBe(
                false,
            );
        });

        it("should return true for values exceeding section limit", () => {
            const largeValue = {
                data: "x".repeat(RESPONSE_SIZE_LIMITS.MAX_SECTION_SIZE),
            };
            expect(ResponseSizeAnalyzer.requiresChunking(largeValue)).toBe(
                true,
            );
        });
    });
});
