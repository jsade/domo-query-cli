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
import { GetDatasetChildrenCommand } from "./GetDatasetChildrenCommand";

// Mock dependencies
vi.mock("../api/clients/domoClient", () => ({
    getDatasetLineage: vi.fn(),
    getDatasetLegacy: vi.fn(),
    getCard: vi.fn(),
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

describe("GetDatasetChildrenCommand", () => {
    let command: GetDatasetChildrenCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedGetDatasetLineage = domoClient.getDatasetLineage as Mock;
    const mockedGetDatasetLegacy = domoClient.getDatasetLegacy as Mock;
    const mockedGetCard = domoClient.getCard as Mock;
    const mockedGetDataflow = dataflowApi.getDataflow as Mock;

    beforeEach(() => {
        command = new GetDatasetChildrenCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-dataset-children");
        expect(command.description).toBe(
            "Gets direct children for a dataset from the API",
        );
    });

    describe("execute", () => {
        const mockLineageResponse = {
            DATA_SOURCEtest123: {
                type: "DATA_SOURCE",
                id: "test123",
                name: "Test Dataset",
                children: [
                    { type: "DATA_SOURCE", id: "child-ds-1" },
                    { type: "CARD", id: "child-card-1" },
                    { type: "DATAFLOW", id: "child-df-1" },
                ],
            },
            "DATA_SOURCEchild-ds-1": {
                type: "DATA_SOURCE",
                id: "child-ds-1",
                name: "Child Dataset 1",
            },
            "CARDchild-card-1": {
                type: "CARD",
                id: "child-card-1",
                title: "Child Card 1",
            },
            "DATAFLOWchild-df-1": {
                type: "DATAFLOW",
                id: "child-df-1",
                name: "Child Dataflow 1",
            },
        };

        it("should display dataset children when dataset ID is provided", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDatasetLegacy.mockResolvedValue({
                id: "child-ds-1",
                name: "Child Dataset 1",
            });
            mockedGetCard.mockResolvedValue({
                id: "child-card-1",
                title: "Child Card 1",
            });
            mockedGetDataflow.mockResolvedValue({
                id: "child-df-1",
                name: "Child Dataflow 1",
            });

            await command.execute(["test123"]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith("test123", {
                traverseUp: false,
                traverseDown: true,
                requestEntities: "DATA_SOURCE,DATAFLOW,CARD",
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
        });

        it("should handle missing dataset ID", async () => {
            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should handle failed lineage fetch", async () => {
            mockedGetDatasetLineage.mockResolvedValue(null);

            await command.execute(["test123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Failed to fetch lineage. API token and DOMO_API_HOST configuration required.",
                ),
            );
        });

        it("should handle missing lineage data for dataset", async () => {
            mockedGetDatasetLineage.mockResolvedValue({
                OTHER_KEYsomething: {},
            });

            await command.execute(["test123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "No lineage data found for dataset test123",
                ),
            );
        });

        it("should handle dataset with no children", async () => {
            const emptyLineageResponse = {
                DATA_SOURCEtest123: {
                    type: "DATA_SOURCE",
                    id: "test123",
                    name: "Test Dataset",
                    children: [],
                },
            };
            mockedGetDatasetLineage.mockResolvedValue(emptyLineageResponse);

            await command.execute(["test123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "No children found for this dataset.\n",
            );
        });

        it("should respect custom traverse parameters", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDatasetLegacy.mockResolvedValue({});
            mockedGetCard.mockResolvedValue({});
            mockedGetDataflow.mockResolvedValue({});

            await command.execute([
                "test123",
                "--traverse-up=true",
                "--traverse-down=false",
            ]);

            // Note: traverseDown=false doesn't get set in params (only true values are set)
            // So it remains undefined and doesn't appear in the call
            expect(mockedGetDatasetLineage).toHaveBeenCalledWith("test123", {
                traverseUp: true,
                requestEntities: "DATA_SOURCE,DATAFLOW,CARD",
            });
        });

        it("should respect custom entity types filter", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDatasetLegacy.mockResolvedValue({});

            await command.execute(["test123", "--entities=DATA_SOURCE"]);

            expect(mockedGetDatasetLineage).toHaveBeenCalledWith("test123", {
                traverseUp: false,
                traverseDown: true,
                requestEntities: "DATA_SOURCE",
            });
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedGetDatasetLineage.mockRejectedValue(error);

            await command.execute(["test123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching dataset children:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch dataset children."),
            );
        });

        it("should handle JSON output format", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDatasetLegacy.mockResolvedValue({
                id: "child-ds-1",
                name: "Child Dataset 1",
            });
            mockedGetCard.mockResolvedValue({
                id: "child-card-1",
                title: "Child Card 1",
            });
            mockedGetDataflow.mockResolvedValue({
                id: "child-df-1",
                name: "Child Dataflow 1",
            });

            await command.execute(["test123", "--format=json"]);

            // Should output JSON instead of table
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringMatching(/"success"\s*:\s*true/),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringMatching(/"datasetId"\s*:\s*"test123"/),
            );
        });

        it("should handle undefined args parameter", async () => {
            await command.execute(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataset ID provided"),
            );
            expect(mockedGetDatasetLineage).not.toHaveBeenCalled();
        });

        it("should handle name lookup failures gracefully", async () => {
            mockedGetDatasetLineage.mockResolvedValue(mockLineageResponse);
            mockedGetDatasetLegacy.mockRejectedValue(
                new Error("Dataset not found"),
            );
            mockedGetCard.mockRejectedValue(new Error("Card not found"));
            mockedGetDataflow.mockRejectedValue(
                new Error("Dataflow not found"),
            );

            // Should not throw error, just continue without names
            await expect(command.execute(["test123"])).resolves.not.toThrow();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Child Entities:"),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Gets direct children for a specific dataset from the Domo API",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "\nUsage: get-dataset-children <dataset-id> [options]",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parameters:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Query Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Legacy Aliases"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Note:"),
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
            expect(result).toContain("--export=md");
            expect(result).toContain("--export=both");
            expect(result).toContain("--export-path");
            expect(result).toContain("--output");
            expect(result).toContain("--quiet");
            expect(result).toContain("--save");
            expect(result).toContain("--save-json");
            expect(result).toContain("--save-md");
            expect(result).toContain("--save-both");
            expect(result).toContain("--path");
        });

        it("should filter flags by partial match", () => {
            const result = command.autocomplete("--export");
            expect(result).toContain("--export");
            expect(result).toContain("--export=json");
            expect(result).toContain("--export=md");
            expect(result).toContain("--export=both");
            expect(result).toContain("--export-path");
            expect(result).not.toContain("--format=json");
            expect(result).not.toContain("--traverse-up");
        });

        it("should return empty array when no matches", () => {
            const result = command.autocomplete("--nonexistent");
            expect(result).toEqual([]);
        });

        it("should filter query options correctly", () => {
            const result = command.autocomplete("--traverse");
            expect(result).toContain("--traverse-up");
            expect(result).toContain("--traverse-down");
            expect(result).not.toContain("--entities");
        });
    });
});
