import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
    type MockInstance,
} from "vitest";
import * as datasourceApi from "../api/clients/datasourceApi";
import * as logger from "../utils/logger";
import * as CommandUtils from "./CommandUtils";
import * as readOnlyGuard from "../utils/readOnlyGuard";
import { ExecuteDatasourceCommand } from "./ExecuteDatasourceCommand";
import type { ExecuteDatasourceResult } from "../api/clients/domoClient";

// Mock dependencies
vi.mock("../api/clients/datasourceApi", () => ({
    executeDatasources: vi.fn(),
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
        parseCommandArgs: vi.fn(),
    },
}));

vi.mock("../utils/readOnlyGuard", () => ({
    checkReadOnlyMode: vi.fn(),
}));

describe("ExecuteDatasourceCommand", () => {
    let command: ExecuteDatasourceCommand;
    let consoleLogSpy: MockInstance;
    const mockedExecuteDatasources = datasourceApi.executeDatasources as Mock;
    const mockedParseCommandArgs = CommandUtils.CommandUtils
        .parseCommandArgs as Mock;
    const mockedCheckReadOnlyMode = readOnlyGuard.checkReadOnlyMode as Mock;

    beforeEach(() => {
        command = new ExecuteDatasourceCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("execute-datasource");
        expect(command.description).toBe(
            "Executes one or more datasource-based datasets (triggers connector updates)",
        );
    });

    describe("execute", () => {
        const mockSuccessResult: ExecuteDatasourceResult = {
            datasetId: "abc123",
            success: true,
            execution: {
                executionId: "exec-12345",
                datasetId: "abc123",
                state: "RUNNING",
                startTime: 1701600000000,
            },
        };

        const mockCompletedResult: ExecuteDatasourceResult = {
            datasetId: "abc123",
            success: true,
            execution: {
                executionId: "exec-12345",
                datasetId: "abc123",
                state: "SUCCESS",
                startTime: 1701600000000,
                endTime: 1701600120000,
                rowsProcessed: 1000,
            },
        };

        const mockFailedResult: ExecuteDatasourceResult = {
            datasetId: "def456",
            success: false,
            error: "Dataset not found",
            errorCode: "NOT_FOUND",
        };

        it("should require at least one dataset ID", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: [],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });

            await command.execute([]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Error: At least one dataset ID is required",
                ),
            );
            expect(mockedExecuteDatasources).not.toHaveBeenCalled();
        });

        it("should execute single dataset in fire-and-forget mode", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockSuccessResult]);

            await command.execute(["abc123"]);

            expect(mockedExecuteDatasources).toHaveBeenCalledWith(["abc123"], {
                wait: false,
                pollInterval: 5000,
                timeout: 600000,
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Dataset: abc123"),
            );
        });

        it("should execute multiple datasets", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123", "def456"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([
                mockSuccessResult,
                { ...mockSuccessResult, datasetId: "def456" },
            ]);

            await command.execute(["abc123", "def456"]);

            expect(mockedExecuteDatasources).toHaveBeenCalledWith(
                ["abc123", "def456"],
                expect.any(Object),
            );
        });

        it("should wait for completion when --wait flag is set", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(["wait"]),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockCompletedResult]);

            await command.execute(["abc123", "--wait"]);

            expect(mockedExecuteDatasources).toHaveBeenCalledWith(
                ["abc123"],
                expect.objectContaining({ wait: true }),
            );
        });

        it("should respect custom timeout and interval", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: { timeout: 300000, interval: 10000 },
                flags: new Set(["wait"]),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockCompletedResult]);

            await command.execute([
                "abc123",
                "--wait",
                "--timeout=300000",
                "--interval=10000",
            ]);

            expect(mockedExecuteDatasources).toHaveBeenCalledWith(["abc123"], {
                wait: true,
                pollInterval: 10000,
                timeout: 300000,
            });
        });

        it("should output JSON format when requested", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(),
                saveOptions: null,
                format: "json",
            });
            mockedExecuteDatasources.mockResolvedValue([mockSuccessResult]);

            await command.execute(["abc123", "--format=json"]);

            const output = consoleLogSpy.mock.calls.find(call =>
                call[0].includes('"success"'),
            );
            expect(output).toBeDefined();
            if (!output) throw new Error("Output not found");
            const parsed = JSON.parse(output[0]);
            expect(parsed.success).toBe(true);
            expect(parsed.command).toBe("execute-datasource");
        });

        it("should handle partial failures gracefully", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123", "def456"],
                params: {},
                flags: new Set(),
                saveOptions: null,
                format: "json",
            });
            mockedExecuteDatasources.mockResolvedValue([
                mockSuccessResult,
                mockFailedResult,
            ]);

            await command.execute(["abc123", "def456", "--format=json"]);

            const output = consoleLogSpy.mock.calls.find(call =>
                call[0].includes('"metadata"'),
            );
            expect(output).toBeDefined();
            if (!output) throw new Error("Output not found");
            const parsed = JSON.parse(output[0]);
            expect(parsed.metadata.successCount).toBe(1);
            expect(parsed.metadata.failCount).toBe(1);
        });

        it("should display execution details in table format", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockCompletedResult]);

            await command.execute(["abc123"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Execution ID: exec-12345"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("State: SUCCESS"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Rows Processed: 1000"),
            );
        });

        it("should display error message for failed executions", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["def456"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockFailedResult]);

            await command.execute(["def456"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Error: Dataset not found"),
            );
        });

        it("should check read-only mode before execution", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([mockSuccessResult]);

            await command.execute(["abc123"]);

            expect(mockedCheckReadOnlyMode).toHaveBeenCalledWith(
                "execute-datasource",
            );
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedExecuteDatasources.mockRejectedValue(error);

            // In table mode, errors are output via console.error
            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await command.execute(["abc123"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error executing datasource:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to execute datasource"),
            );

            consoleErrorSpy.mockRestore();
        });

        it("should output JSON error when API fails and format is json", async () => {
            const error = new Error("API Error");
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123"],
                params: {},
                flags: new Set(),
                saveOptions: null,
                format: "json",
            });
            mockedExecuteDatasources.mockRejectedValue(error);

            await command.execute(["abc123", "--format=json"]);

            const output = consoleLogSpy.mock.calls.find(call =>
                call[0].includes('"success": false'),
            );
            expect(output).toBeDefined();
        });

        it("should display summary counts", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["abc123", "def456"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedExecuteDatasources.mockResolvedValue([
                mockSuccessResult,
                mockFailedResult,
            ]);

            await command.execute(["abc123", "def456"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Total: 2"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Success: 1"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed: 1"),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("execute-datasource"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--wait"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--timeout"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--interval"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--format=json"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return available flags", async () => {
            const results = await command.autocomplete();
            expect(results).toContain("--wait");
            expect(results).toContain("--format=json");
            expect(results).toContain("--timeout=");
            expect(results).toContain("--interval=");
        });
    });
});
