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
import * as dataflowApi from "../api/clients/dataflowApi";
import * as logger from "../utils/logger";
import { GetDatasetParentsCommand } from "./GetDatasetParentsCommand";

// Mock dependencies
vi.mock("../api/clients/domoClient", () => ({
    getDatasetLineage: vi.fn(),
    getDatasetLegacy: vi.fn(),
}));

vi.mock("../api/clients/dataflowApi", () => ({
    getDataflow: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GetDatasetParentsCommand", () => {
    let command: GetDatasetParentsCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedGetDatasetLineage = domoClient.getDatasetLineage as Mock;
    const mockedGetDatasetLegacy = domoClient.getDatasetLegacy as Mock;
    const mockedGetDataflow = dataflowApi.getDataflow as Mock;

    beforeEach(() => {
        command = new GetDatasetParentsCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-dataset-parents");
        expect(command.description).toBe(
            "Gets direct parents for a dataset from the API",
        );
    });

    describe("execute", () => {
        const mockLineageResponse = {
            "DATA_SOURCEdataset-123": {
                type: "DATA_SOURCE",
                id: "dataset-123",
                parents: [
                    { type: "DATAFLOW", id: "dataflow-001" },
                    { type: "DATA_SOURCE", id: "dataset-456" },
                ],
            },
            "DATAFLOW dataflow-001": {
                type: "DATAFLOW",
                id: "dataflow-001",
            },
            "DATA_SOURCE dataset-456": {
                type: "DATA_SOURCE",
                id: "dataset-456",
            },
        };

        it("should display dataset parents when dataset ID is provided", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({
                id: "dataflow-001",
                name: "Test Dataflow",
            });
            mockedGetDatasetLegacy.mockResolvedValue({
                id: "dataset-456",
                name: "Test Dataset",
            });

            await command.execute(["dataset-123"]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith(
                "dataset-123",
                expect.objectContaining({
                    traverseUp: true,
                    traverseDown: false,
                    requestEntities: "DATA_SOURCE,DATAFLOW",
                }),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
        });

        it("should handle missing dataset ID", async () => {
            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should handle missing lineage response", async () => {
            mockedGetDatasetLineage.mockResolvedValue(null);

            await command.execute(["dataset-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch dataset parents"),
            );
        });

        it("should handle no lineage data for dataset", async () => {
            mockedGetDatasetLineage.mockResolvedValue({});

            await command.execute(["dataset-123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "No lineage data found for dataset dataset-123",
                ),
            );
        });

        it("should handle dataset with no parents", async () => {
            const noParentsResponse = {
                "DATA_SOURCEdataset-123": {
                    type: "DATA_SOURCE",
                    id: "dataset-123",
                    parents: [],
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(noParentsResponse);

            await command.execute(["dataset-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "No parents found for this dataset.\n",
            );
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedGetDatasetLineage.mockRejectedValue(error);

            await command.execute(["dataset-123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching dataset parents:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch dataset parents"),
            );
        });

        it("should support custom traverse options", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({ name: "Test" });
            mockedGetDatasetLegacy.mockResolvedValue({ name: "Test" });

            await command.execute([
                "dataset-123",
                "--traverse-up=false",
                "--traverse-down=true",
            ]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith(
                "dataset-123",
                expect.objectContaining({
                    traverseUp: false,
                    traverseDown: true,
                }),
            );
        });

        it("should support custom entity types filter", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({ name: "Test" });

            await command.execute(["dataset-123", "--entities=DATAFLOW"]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith(
                "dataset-123",
                expect.objectContaining({
                    requestEntities: "DATAFLOW",
                }),
            );
        });

        it("should output JSON when --format=json is specified", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({
                id: "dataflow-001",
                name: "Test Dataflow",
            });
            mockedGetDatasetLegacy.mockResolvedValue({
                id: "dataset-456",
                name: "Test Dataset",
            });

            await command.execute(["dataset-123", "--format=json"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"command": "get-dataset-parents"'),
            );
        });

        it("should handle name lookup failures gracefully", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockRejectedValue(new Error("Not found"));
            mockedGetDatasetLegacy.mockRejectedValue(new Error("Not found"));

            await command.execute(["dataset-123"]);

            // Should still display parents even if name lookup fails
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parent Entities:"),
            );
        });

        it("should handle undefined args parameter", async () => {
            await command.execute(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should display progress messages in table mode", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({ name: "Test" });
            mockedGetDatasetLegacy.mockResolvedValue({ name: "Test" });

            await command.execute(["dataset-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Fetching parents for dataset"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Traverse Up:"),
            );
        });

        it("should suppress progress messages in JSON mode", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDataflow.mockResolvedValue({ name: "Test" });
            mockedGetDatasetLegacy.mockResolvedValue({ name: "Test" });

            await command.execute(["dataset-123", "--format=json"]);

            const progressCalls = consoleLogSpy.mock.calls.filter(call =>
                String(call[0]).includes("Fetching parents for dataset"),
            );
            expect(progressCalls.length).toBe(0);
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Gets direct parents for a specific dataset from the Domo API",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "\nUsage: get-dataset-parents <dataset-id> [options]",
            );
            // Check that key sections are displayed
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
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Note:"),
            );
        });

        it("should document output flags", () => {
            command.showHelp();

            // Check that output flags are documented
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--format=json"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--export"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--export-path"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return all flags when partial is empty", () => {
            const results = command.autocomplete("");

            expect(results).toContain("--format=json");
            expect(results).toContain("--export");
            expect(results).toContain("--traverse-up");
            expect(results).toContain("--entities");
        });

        it("should filter flags based on partial match", () => {
            const results = command.autocomplete("--exp");

            expect(results).toContain("--export");
            expect(results).toContain("--export=json");
            expect(results).toContain("--export=md");
            expect(results).toContain("--export=both");
            expect(results).toContain("--export-path");
            expect(results).not.toContain("--format=json");
        });

        it("should include legacy flags", () => {
            const results = command.autocomplete("--save");

            expect(results).toContain("--save");
            expect(results).toContain("--save-json");
            expect(results).toContain("--save-md");
            expect(results).toContain("--save-both");
        });

        it("should return empty array for non-matching partial", () => {
            const results = command.autocomplete("--nonexistent");

            expect(results).toEqual([]);
        });
    });
});
