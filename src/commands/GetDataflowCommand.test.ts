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
import type {
    DomoDataflow,
    DomoDataflowExecution,
} from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import { GetDataflowCommand } from "./GetDataflowCommand";

// Mock dependencies
vi.mock("../api/clients/dataflowApi", () => ({
    getDataflow: vi.fn(),
    getDataflowDual: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GetDataflowCommand", () => {
    let command: GetDataflowCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedGetDataflow = dataflowApi.getDataflow as Mock;
    const mockedGetDataflowDual = dataflowApi.getDataflowDual as Mock;

    beforeEach(() => {
        command = new GetDataflowCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-dataflow");
        expect(command.description).toBe(
            "Gets detailed information about a specific dataflow",
        );
    });

    describe("execute", () => {
        const mockDataflow: DomoDataflow = {
            id: "test-123",
            name: "Test Dataflow",
            description: "Test description",
            status: "ACTIVE",
            createdAt: "2024-01-01T00:00:00Z",
            modified: 1704067200000, // 2024-01-01T00:00:00Z in milliseconds
            responsibleUserId: 12345,
            enabled: true,
            inputCount: 2,
            outputCount: 1,
            executionCount: 10,
            lastExecution: {
                id: 1,
                endTime: 1704067200000,
                state: "SUCCESS",
            } as DomoDataflowExecution,
            inputs: [
                {
                    id: "input-1",
                    name: "Input Dataset 1",
                    dataSourceId: "dataset-001",
                },
                {
                    id: "input-2",
                    name: "Input Dataset 2",
                    dataSourceId: "dataset-002",
                },
            ],
            outputs: [
                {
                    id: "output-1",
                    name: "Output Dataset",
                    dataSourceId: "dataset-003",
                },
            ],
        };

        it("should display dataflow details when dataflow ID is provided", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: mockDataflow,
                v2: mockDataflow,
                merged: mockDataflow,
            });
            mockedGetDataflow.mockResolvedValue(mockDataflow);

            await command.execute(["test-123"]);

            expect(mockedGetDataflowDual).toHaveBeenCalledWith(
                "test-123",
                "apiToken",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataflow Details:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("ID: test-123");
            expect(consoleLogSpy).toHaveBeenCalledWith("Name: Test Dataflow");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Description: Test description",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("Status: ACTIVE");
            expect(consoleLogSpy).toHaveBeenCalledWith("Owner: 12345");
            expect(consoleLogSpy).toHaveBeenCalledWith("Enabled: true");
        });

        it("should handle missing dataflow ID", async () => {
            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataflow ID provided"),
            );
            expect(mockedGetDataflowDual).not.toHaveBeenCalled();
        });

        it("should display inputs with correct dataSourceId", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: mockDataflow,
                v2: mockDataflow,
                merged: mockDataflow,
            });
            mockedGetDataflow.mockResolvedValue(mockDataflow);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Inputs:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Names: Input Dataset 1, Input Dataset 2",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Input Details:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "ID: dataset-001, Name: Input Dataset 1",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "ID: dataset-002, Name: Input Dataset 2",
            );
        });

        it("should display outputs with correct dataSourceId", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: mockDataflow,
                v2: mockDataflow,
                merged: mockDataflow,
            });
            mockedGetDataflow.mockResolvedValue(mockDataflow);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Outputs:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith("Names: Output Dataset");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Details:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "ID: dataset-003, Name: Output Dataset",
            );
        });

        it("should handle dataflow without inputs/outputs", async () => {
            const dataflowNoIO = {
                ...mockDataflow,
                inputs: undefined,
                outputs: undefined,
                inputCount: 0,
                outputCount: 0,
            };
            mockedGetDataflowDual.mockResolvedValue({
                v1: dataflowNoIO,
                v2: dataflowNoIO,
                merged: dataflowNoIO,
            });
            mockedGetDataflow.mockResolvedValue(dataflowNoIO);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith("Input Count: 0");
            expect(consoleLogSpy).toHaveBeenCalledWith("Output Count: 0");
        });

        it("should handle missing optional fields gracefully", async () => {
            const minimalDataflow: DomoDataflow = {
                id: "test-123",
                name: "Minimal Dataflow",
                createdAt: "2024-01-01T00:00:00Z",
            };
            mockedGetDataflowDual.mockResolvedValue({
                v1: minimalDataflow,
                v2: minimalDataflow,
                merged: minimalDataflow,
            });
            mockedGetDataflow.mockResolvedValue(minimalDataflow);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith("Description: N/A");
            expect(consoleLogSpy).toHaveBeenCalledWith("Status: N/A");
            expect(consoleLogSpy).toHaveBeenCalledWith("Last Run: N/A");
            expect(consoleLogSpy).toHaveBeenCalledWith("Updated: N/A");
            expect(consoleLogSpy).toHaveBeenCalledWith("Owner: N/A");
            expect(consoleLogSpy).toHaveBeenCalledWith("Enabled: N/A");
        });

        it("should handle dataflow not found", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: null,
                v2: null,
                merged: null,
            });

            await command.execute(["test-123"]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataflow not found"),
            );
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedGetDataflowDual.mockRejectedValue(error);

            await command.execute(["test-123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching dataflow:",
                error,
            );
        });

        it("should format timestamps correctly", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: mockDataflow,
                v2: mockDataflow,
                merged: mockDataflow,
            });
            mockedGetDataflow.mockResolvedValue(mockDataflow);

            await command.execute(["test-123"]);

            // Check that timestamps are formatted as locale strings
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Last Run:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Created:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Updated:"),
            );
        });

        it("should display input and output counts with names when available", async () => {
            mockedGetDataflowDual.mockResolvedValue({
                v1: mockDataflow,
                v2: mockDataflow,
                merged: mockDataflow,
            });
            mockedGetDataflow.mockResolvedValue(mockDataflow);

            await command.execute(["test-123"]);

            // Check that input count includes names
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Input Count: 2\n- Input Dataset 1\n- Input Dataset 2\n",
                ),
            );
            // Check that output count includes names
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Count: 1\n- Output Dataset\n"),
            );
        });

        it("should handle dataflow with empty inputs/outputs arrays", async () => {
            const dataflowEmptyArrays = {
                ...mockDataflow,
                inputs: [],
                outputs: [],
            };
            mockedGetDataflowDual.mockResolvedValue({
                v1: dataflowEmptyArrays,
                v2: dataflowEmptyArrays,
                merged: dataflowEmptyArrays,
            });
            mockedGetDataflow.mockResolvedValue(dataflowEmptyArrays);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith("Input Count: 2");
            expect(consoleLogSpy).toHaveBeenCalledWith("Output Count: 1");
        });

        it("should handle undefined args parameter", async () => {
            await command.execute(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No dataflow ID provided"),
            );
            expect(mockedGetDataflowDual).not.toHaveBeenCalled();
        });

        it("should display dates with proper fallback for missing lastExecution endTime", async () => {
            const dataflowNoEndTime = {
                ...mockDataflow,
                lastExecution: {
                    id: 1,
                    state: "SUCCESS",
                } as DomoDataflowExecution,
            };
            mockedGetDataflowDual.mockResolvedValue({
                v1: dataflowNoEndTime,
                v2: dataflowNoEndTime,
                merged: dataflowNoEndTime,
            });
            mockedGetDataflow.mockResolvedValue(dataflowNoEndTime);

            await command.execute(["test-123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith("Last Run: N/A");
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Gets detailed information about a specific dataflow",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "\nUsage: get-dataflow [dataflow_id] [options]",
            );
            // Check that key sections are displayed (using stringContaining for chalk formatting)
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Parameters:"),
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
            // Examples are now in table format - check table content
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("get-dataflow"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--format=json"),
            );
        });
    });
});
