import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
    type MockInstance,
} from "vitest";
import * as domoClient from "../api/clients/domoClient";
import type { LineageEntity } from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import { GetDatasetLineageCommand } from "./GetDatasetLineageCommand";

// Mock dependencies
vi.mock("../api/clients/domoClient", () => ({
    getDatasetLineage: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GetDatasetLineageCommand", () => {
    let command: GetDatasetLineageCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedGetDatasetLineage = domoClient.getDatasetLineage as Mock;

    beforeEach(() => {
        command = new GetDatasetLineageCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-dataset-lineage");
        expect(command.description).toBe(
            "Gets lineage information for a specific dataset from the API",
        );
    });

    describe("execute", () => {
        const mockLineageEntity: LineageEntity = {
            type: "DATA_SOURCE",
            id: "test-123",
            complete: true,
            ancestorCounts: {
                DATA_SOURCE: 2,
                DATAFLOW: 1,
            },
            descendantCounts: {
                CARD: 5,
                DATA_SOURCE: 1,
            },
            parents: [
                {
                    type: "DATA_SOURCE",
                    id: "parent-1",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
            ],
            children: [
                {
                    type: "CARD",
                    id: "child-1",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
            ],
        };

        const mockLineageResponse = {
            "DATA_SOURCEtest-123": mockLineageEntity,
        };

        it("should display lineage details when dataset ID is provided", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith("test-123", {
                traverseUp: true,
                traverseDown: true,
                requestEntities: "DATA_SOURCE,DATAFLOW,CARD",
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataset Lineage Information:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("Type: DATA_SOURCE");
            expect(consoleLogSpy).toHaveBeenCalledWith("ID: test-123");
            expect(consoleLogSpy).toHaveBeenCalledWith("Complete: true");
        });

        it("should handle missing dataset ID", async () => {
            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should handle undefined args parameter", async () => {
            await command.execute(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should handle custom traverse options", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute([
                "test-123",
                "--traverse-up=false",
                "--entities=DATAFLOW",
            ]);

            const callArgs = mockedGetDatasetLineage.mock.calls[0];
            expect(callArgs[0]).toBe("test-123");
            expect(callArgs[1]).toMatchObject({
                traverseUp: false,
                requestEntities: "DATAFLOW",
            });
        });

        it("should handle custom entity types filter", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute([
                "test-123",
                "--entities=DATA_SOURCE,DATAFLOW",
            ]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith("test-123", {
                traverseUp: true,
                traverseDown: true,
                requestEntities: "DATA_SOURCE,DATAFLOW",
            });
        });

        it("should display ancestor counts when available", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Ancestor Counts:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATA_SOURCE: 2");
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATAFLOW: 1");
        });

        it("should display descendant counts when available", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Descendant Counts:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("  CARD: 5");
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATA_SOURCE: 1");
        });

        it("should display parent entities when available", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "  • DATA_SOURCE (parent-1)",
            );
        });

        it("should display child entities when available", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("  • CARD (child-1)");
        });

        it("should handle lineage response with no data", async () => {
            mockedGetDatasetLineage.mockResolvedValue(null);

            await command.execute(["test-123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                ),
            );
        });

        it("should handle missing lineage data for dataset", async () => {
            mockedGetDatasetLineage.mockResolvedValue({});

            await command.execute(["test-123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "No lineage data found for dataset test-123",
                ),
            );
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedGetDatasetLineage.mockRejectedValue(error);

            await command.execute(["test-123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching dataset lineage:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch dataset lineage."),
            );
        });

        it("should output JSON format when --format=json is specified", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123", "--format=json"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"lineage"'),
            );
        });

        it("should handle lineage entities with empty ancestor counts", async () => {
            const lineageWithEmptyCounts = {
                DATA_SOURCEtest123: {
                    ...mockLineageEntity,
                    ancestorCounts: {},
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(lineageWithEmptyCounts);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Ancestor Counts:"),
            );
        });

        it("should handle lineage entities with empty descendant counts", async () => {
            const lineageWithEmptyCounts = {
                DATA_SOURCEtest123: {
                    ...mockLineageEntity,
                    descendantCounts: {},
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(lineageWithEmptyCounts);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Descendant Counts:"),
            );
        });

        it("should handle lineage entities with no parents", async () => {
            const lineageWithNoParents = {
                DATA_SOURCEtest123: {
                    ...mockLineageEntity,
                    parents: [],
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(lineageWithNoParents);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
        });

        it("should handle lineage entities with no children", async () => {
            const lineageWithNoChildren = {
                DATA_SOURCEtest123: {
                    ...mockLineageEntity,
                    children: [],
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(lineageWithNoChildren);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Gets lineage information for a specific dataset from the Domo API",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "\nUsage: get-dataset-lineage <dataset-id> [options]",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parameters:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Lineage Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Info Displayed:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return all flags when partial is empty", () => {
            const result = command.autocomplete("");
            expect(result).toContain("--traverse-up");
            expect(result).toContain("--traverse-down");
            expect(result).toContain("--entities");
            expect(result).toContain("--format=json");
            expect(result).toContain("--export");
            expect(result).toContain("--export=json");
            expect(result).toContain("--export=md");
            expect(result).toContain("--export=both");
            expect(result).toContain("--export-path");
            expect(result).toContain("--output");
            expect(result).toContain("--quiet");
        });

        it("should filter flags by partial match", () => {
            const result = command.autocomplete("--export");
            expect(result).toContain("--export");
            expect(result).toContain("--export=json");
            expect(result).toContain("--export=md");
            expect(result).toContain("--export=both");
            expect(result).toContain("--export-path");
            expect(result).not.toContain("--format=json");
        });

        it("should return legacy aliases", () => {
            const result = command.autocomplete("--save");
            expect(result).toContain("--save");
            expect(result).toContain("--save-json");
            expect(result).toContain("--save-md");
            expect(result).toContain("--save-both");
        });
    });
});
