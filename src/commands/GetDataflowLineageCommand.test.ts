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
import type { LineageEntity } from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import { GetDataflowLineageCommand } from "./GetDataflowLineageCommand";

/**
 * Root lineage entity with count information
 */
interface RootLineageEntity extends LineageEntity {
    ancestorCounts: Record<string, number>;
    descendantCounts: Record<string, number>;
}

// Mock dependencies
vi.mock("../api/clients/dataflowApi", () => ({
    getDataflowLineage: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GetDataflowLineageCommand", () => {
    let command: GetDataflowLineageCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedGetDataflowLineage = dataflowApi.getDataflowLineage as Mock;

    beforeEach(() => {
        command = new GetDataflowLineageCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-dataflow-lineage");
        expect(command.description).toBe(
            "Gets lineage information for a specific dataflow from the API",
        );
    });

    describe("execute", () => {
        const mockLineageEntity: RootLineageEntity = {
            type: "DATAFLOW",
            id: "test-123",
            complete: true,
            ancestorCounts: {
                DATA_SOURCE: 2,
                DATAFLOW: 1,
            },
            descendantCounts: {
                DATAFLOW: 1,
                CARD: 3,
            },
            parents: [
                {
                    type: "DATA_SOURCE",
                    id: "ds-001",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
                {
                    type: "DATAFLOW",
                    id: "df-001",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
            ],
            children: [
                {
                    type: "DATAFLOW",
                    id: "df-002",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
                {
                    type: "CARD",
                    id: "card-001",
                    complete: true,
                    ancestorCounts: {},
                    descendantCounts: {},
                    parents: [],
                    children: [],
                },
            ],
        };

        const mockLineageResponse = {
            "DATAFLOWtest-123": mockLineageEntity,
        };

        it("should display lineage details when dataflow ID is provided", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith("test-123", {
                traverseUp: true,
                traverseDown: true,
                requestEntities: "DATA_SOURCE,DATAFLOW,CARD",
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataflow Lineage Information:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("Type: DATAFLOW");
            expect(consoleLogSpy).toHaveBeenCalledWith("ID: test-123");
            expect(consoleLogSpy).toHaveBeenCalledWith("Complete: true");
        });

        it("should handle missing dataflow ID", async () => {
            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataflow ID provided"),
            );
            expect(mockedGetDataflowLineage).not.toHaveBeenCalled();
        });

        it("should handle missing dataflow ID in JSON mode", async () => {
            await command.execute(["--format=json"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("MISSING_DATAFLOW_ID"),
            );
            expect(mockedGetDataflowLineage).not.toHaveBeenCalled();
        });

        it("should respect traverse-up option", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123", "--traverse-up=true"]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith(
                "test-123",
                expect.objectContaining({
                    traverseUp: true,
                }),
            );
        });

        it("should respect traverse-down option", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123", "--traverse-down=false"]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith(
                "test-123",
                expect.objectContaining({
                    traverseDown: false,
                }),
            );
        });

        it("should respect custom entity types", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute([
                "test-123",
                "--entities=DATA_SOURCE,DATAFLOW",
            ]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith(
                "test-123",
                expect.objectContaining({
                    requestEntities: "DATA_SOURCE,DATAFLOW",
                }),
            );
        });

        it("should default to all entity types if not specified", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith(
                "test-123",
                expect.objectContaining({
                    requestEntities: "DATA_SOURCE,DATAFLOW,CARD",
                }),
            );
        });

        it("should display ancestor counts", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Ancestor Counts:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATA_SOURCE: 2");
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATAFLOW: 1");
        });

        it("should display descendant counts", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Descendant Counts:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("  DATAFLOW: 1");
            expect(consoleLogSpy).toHaveBeenCalledWith("  CARD: 3");
        });

        it("should display parent entities", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATA_SOURCE (ds-001)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATAFLOW (df-001)"),
            );
        });

        it("should display child entities", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATAFLOW (df-002)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("CARD (card-001)"),
            );
        });

        it("should handle null lineage response", async () => {
            mockedGetDataflowLineage.mockResolvedValue(null);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch lineage"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("requires API token and DOMO_API_HOST"),
            );
        });

        it("should handle missing lineage data for dataflow ID", async () => {
            mockedGetDataflowLineage.mockResolvedValue({});

            await command.execute(["test-123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No lineage data found"),
            );
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedGetDataflowLineage.mockRejectedValue(error);

            await command.execute(["test-123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching dataflow lineage:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch dataflow lineage"),
            );
        });

        it("should output JSON format when --format=json is specified", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123", "--format=json"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("lineage"),
            );
        });

        it("should not display query info in JSON mode", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute(["test-123", "--format=json"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Fetching lineage for dataflow:"),
            );
        });

        it("should handle lineage with nested parents", async () => {
            const nestedLineage: RootLineageEntity = {
                ...mockLineageEntity,
                parents: [
                    {
                        type: "DATAFLOW",
                        id: "df-parent",
                        complete: true,
                        ancestorCounts: {},
                        descendantCounts: {},
                        children: [],
                        parents: [
                            {
                                type: "DATA_SOURCE",
                                id: "ds-grandparent",
                                complete: true,
                                ancestorCounts: {},
                                descendantCounts: {},
                                children: [],
                                parents: [],
                            },
                        ],
                    },
                ],
            };

            mockedGetDataflowLineage.mockResolvedValue({
                "DATAFLOWtest-123": nestedLineage,
            });

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATAFLOW (df-parent)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATA_SOURCE (ds-grandparent)"),
            );
        });

        it("should handle lineage with nested children", async () => {
            const nestedLineage: RootLineageEntity = {
                ...mockLineageEntity,
                children: [
                    {
                        type: "DATAFLOW",
                        id: "df-child",
                        complete: true,
                        ancestorCounts: {},
                        descendantCounts: {},
                        parents: [],
                        children: [
                            {
                                type: "CARD",
                                id: "card-grandchild",
                                complete: true,
                                ancestorCounts: {},
                                descendantCounts: {},
                                parents: [],
                                children: [],
                            },
                        ],
                    },
                ],
            };

            mockedGetDataflowLineage.mockResolvedValue({
                "DATAFLOWtest-123": nestedLineage,
            });

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("DATAFLOW (df-child)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("CARD (card-grandchild)"),
            );
        });

        it("should handle lineage with no parents", async () => {
            const noParents: RootLineageEntity = {
                ...mockLineageEntity,
                parents: [],
            };

            mockedGetDataflowLineage.mockResolvedValue({
                DATAFLOWtest123: noParents,
            });

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
        });

        it("should handle lineage with no children", async () => {
            const noChildren: RootLineageEntity = {
                ...mockLineageEntity,
                children: [],
            };

            mockedGetDataflowLineage.mockResolvedValue({
                DATAFLOWtest123: noChildren,
            });

            await command.execute(["test-123"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
        });

        it("should handle undefined args parameter", async () => {
            await command.execute(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataflow ID provided"),
            );
            expect(mockedGetDataflowLineage).not.toHaveBeenCalled();
        });

        it("should use camelCase parameter names", async () => {
            mockedGetDataflowLineage.mockResolvedValue(mockLineageResponse);

            await command.execute([
                "test-123",
                "--traverseUp=false",
                "--requestEntities=CARD",
            ]);

            expect(mockedGetDataflowLineage).toHaveBeenCalledWith(
                "test-123",
                expect.objectContaining({
                    traverseUp: false,
                    requestEntities: "CARD",
                }),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Gets lineage information for a specific dataflow from the Domo API",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "\nUsage: get-dataflow-lineage <dataflow-id> [options]",
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
                expect.stringContaining("Legacy Aliases"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Info Displayed:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });

        it("should include output options in help", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--format=json"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--export"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--export=md"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--export=both"),
            );
        });

        it("should include legacy aliases in help", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--save"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--save-json"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--save-md"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return all flags when partial is empty", () => {
            const result = command.autocomplete("");

            expect(result).toContain("--format=json");
            expect(result).toContain("--export");
            expect(result).toContain("--export=md");
            expect(result).toContain("--traverse-up");
            expect(result).toContain("--traverse-down");
            expect(result).toContain("--entities");
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

        it("should include legacy flags in autocomplete", () => {
            const result = command.autocomplete("--save");

            expect(result).toContain("--save");
            expect(result).toContain("--save-json");
            expect(result).toContain("--save-md");
            expect(result).toContain("--save-both");
        });

        it("should return empty array when no flags match", () => {
            const result = command.autocomplete("--nonexistent");

            expect(result).toEqual([]);
        });
    });
});
