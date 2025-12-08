import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type MockInstance,
} from "vitest";
import { BaseCommand } from "../../commands/BaseCommand";
import type { CommandResult } from "../../types/outputTypes";
import * as FileOutputWriter from "../../utils/FileOutputWriter";
import * as utils from "../../utils/utils";

// Mock dependencies
vi.mock("../../utils/FileOutputWriter", () => ({
    writeJsonToFile: vi.fn().mockResolvedValue({
        filePath: "/test/output.json",
        bytesWritten: 100,
    }),
}));

vi.mock("../../utils/utils", () => ({
    ensureExportDir: vi.fn().mockResolvedValue("/export"),
    exportToJson: vi
        .fn()
        .mockResolvedValue("/export/test_20250101_120000.json"),
    exportToMarkdown: vi
        .fn()
        .mockResolvedValue("/export/test_20250101_120000.md"),
}));

vi.mock("../../config", () => ({
    domoConfig: {
        exportPath: "/default/export",
        outputPath: "/default/output",
    },
}));

// Test command implementation
class TestIntegrationCommand extends BaseCommand {
    public readonly name = "test-integration";
    public readonly description = "Test command for integration testing";

    public async execute(_args?: string[]): Promise<void> {
        // Implementation for testing
    }

    public showHelp(): void {
        console.log("Test integration command help");
    }

    // Expose protected methods for testing
    public testParseOutputConfig(args?: string[]) {
        return this.parseOutputConfig(args);
    }

    public async testOutput<T>(
        result: CommandResult<T>,
        tableRenderer: () => void | Promise<void>,
        filePrefix: string,
    ) {
        return this.output(result, tableRenderer, filePrefix);
    }

    public testOutputErrorResult(
        error: { message: string; code?: string; details?: unknown },
        defaultHandler?: () => void,
    ) {
        return this.outputErrorResult(error, defaultHandler);
    }
}

describe("Output System Integration Tests", () => {
    let command: TestIntegrationCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const sampleData = {
        datasets: [
            { id: "ds1", name: "Dataset 1", rows: 100 },
            { id: "ds2", name: "Dataset 2", rows: 200 },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        command = new TestIntegrationCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});

        // Reset mock implementations
        vi.mocked(utils.exportToJson).mockResolvedValue(
            "/export/test_20250101_120000.json",
        );
        vi.mocked(utils.exportToMarkdown).mockResolvedValue(
            "/export/test_20250101_120000.md",
        );
        vi.mocked(FileOutputWriter.writeJsonToFile).mockResolvedValue({
            filePath: "/test/output.json",
            bytesWritten: 100,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("D1: Command Output Behavior", () => {
        describe("JSON Output Mode (--format=json)", () => {
            it("should produce valid JSON when --format=json is provided", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                expect(consoleLogSpy).toHaveBeenCalledTimes(1);
                const output = consoleLogSpy.mock.calls[0][0];

                // Verify it's valid JSON
                expect(() => JSON.parse(output)).not.toThrow();

                // Parse and verify structure
                const json = JSON.parse(output);
                expect(json).toHaveProperty("success", true);
                expect(json).toHaveProperty("command", "test-integration");
                expect(json).toHaveProperty("data");
                expect(json).toHaveProperty("metadata");
            });

            it("should include command name in JSON output", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.command).toBe("test-integration");
            });

            it("should include data payload in JSON output", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.data).toEqual(sampleData);
            });

            it("should include metadata with timestamp in JSON output", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    {
                        success: true,
                        data: sampleData,
                        metadata: { count: 2 },
                    },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.metadata).toBeDefined();
                expect(json.metadata.timestamp).toBeDefined();
                expect(json.metadata.count).toBe(2);
            });

            it("should not call table renderer in JSON mode", async () => {
                command.testParseOutputConfig(["--format=json"]);
                const tableRenderer = vi.fn();

                await command.testOutput(
                    { success: true, data: sampleData },
                    tableRenderer,
                    "test",
                );

                expect(tableRenderer).not.toHaveBeenCalled();
            });

            it("should format errors as valid JSON", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    {
                        success: false,
                        error: {
                            message: "Test error",
                            code: "TEST_ERROR",
                            details: { field: "value" },
                        },
                    },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.success).toBe(false);
                expect(json.error).toBeDefined();
                expect(json.error.message).toBe("Test error");
                expect(json.error.code).toBe("TEST_ERROR");
                expect(json.error.details).toEqual({ field: "value" });
            });

            it("should handle --format json (space-separated)", async () => {
                command.testParseOutputConfig(["--format", "json"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.success).toBe(true);
            });

            it("should be case-insensitive for format value", async () => {
                command.testParseOutputConfig(["--format=JSON"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                expect(() => JSON.parse(output)).not.toThrow();
            });
        });

        describe("Table Output Mode (default)", () => {
            it("should call table renderer by default", async () => {
                command.testParseOutputConfig([]);
                const tableRenderer = vi.fn();

                await command.testOutput(
                    { success: true, data: sampleData },
                    tableRenderer,
                    "test",
                );

                expect(tableRenderer).toHaveBeenCalledTimes(1);
            });

            it("should not output JSON in table mode", async () => {
                command.testParseOutputConfig([]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                // Should not have JSON-like output
                if (consoleLogSpy.mock.calls.length > 0) {
                    const output = consoleLogSpy.mock.calls[0][0];
                    expect(output).not.toContain('"success"');
                    expect(output).not.toContain('"command"');
                }
            });

            it("should display errors to stderr in table mode", async () => {
                command.testParseOutputConfig([]);

                await command.testOutput(
                    {
                        success: false,
                        error: { message: "Test error" },
                    },
                    () => console.table(sampleData),
                    "test",
                );

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Error: Test error",
                );
            });

            it("should handle async table renderer", async () => {
                command.testParseOutputConfig([]);
                const asyncRenderer = vi.fn().mockResolvedValue(undefined);

                await command.testOutput(
                    { success: true, data: sampleData },
                    asyncRenderer,
                    "test",
                );

                expect(asyncRenderer).toHaveBeenCalledTimes(1);
            });
        });

        describe("Export Functionality", () => {
            it("should export to JSON when --export is provided", async () => {
                command.testParseOutputConfig(["--export"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    undefined,
                );
            });

            it("should export to JSON with --export=json", async () => {
                command.testParseOutputConfig(["--export=json"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    undefined,
                );
            });

            it("should export to markdown with --export=md", async () => {
                command.testParseOutputConfig(["--export=md"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToMarkdown).toHaveBeenCalledWith(
                    sampleData,
                    expect.any(String),
                    "datasets",
                    undefined,
                );
            });

            it("should export to both formats with --export=both", async () => {
                command.testParseOutputConfig(["--export=both"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalled();
                expect(utils.exportToMarkdown).toHaveBeenCalled();
            });

            it("should use custom export path when --export-path is provided", async () => {
                command.testParseOutputConfig([
                    "--export",
                    "--export-path=/custom/path",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/custom/path",
                );
            });

            it("should show export confirmation message in table mode", async () => {
                command.testParseOutputConfig(["--export"]);
                vi.mocked(utils.exportToJson).mockResolvedValue(
                    "/export/datasets_20250101_120000.json",
                );

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(consoleLogSpy).toHaveBeenCalledWith(
                    expect.stringContaining(
                        "Exported to JSON: /export/datasets_20250101_120000.json",
                    ),
                );
            });

            it("should not export when there is an error", async () => {
                command.testParseOutputConfig(["--export"]);

                await command.testOutput(
                    {
                        success: false,
                        error: { message: "Test error" },
                    },
                    () => console.table(sampleData),
                    "test",
                );

                expect(utils.exportToJson).not.toHaveBeenCalled();
            });

            it("should not export when data is undefined", async () => {
                command.testParseOutputConfig(["--export"]);

                await command.testOutput(
                    { success: true },
                    () => console.log("No data"),
                    "test",
                );

                expect(utils.exportToJson).not.toHaveBeenCalled();
            });

            it("should handle export errors gracefully", async () => {
                command.testParseOutputConfig(["--export"]);
                vi.mocked(utils.exportToJson).mockRejectedValue(
                    new Error("Export failed"),
                );

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    expect.stringContaining("Export failed"),
                );
            });
        });

        describe("File Output (--output=<path>)", () => {
            it("should write to specific file with --output", async () => {
                command.testParseOutputConfig([
                    "--output=/path/to/output.json",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                expect(FileOutputWriter.writeJsonToFile).toHaveBeenCalledWith(
                    { success: true, data: sampleData },
                    "/path/to/output.json",
                    "/default/output",
                );
            });

            it("should show write confirmation in table mode", async () => {
                command.testParseOutputConfig([
                    "--output=/path/to/output.json",
                ]);
                vi.mocked(FileOutputWriter.writeJsonToFile).mockResolvedValue({
                    filePath: "/resolved/path/output.json",
                    bytesWritten: 150,
                });

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                expect(consoleLogSpy).toHaveBeenCalledWith(
                    expect.stringContaining(
                        "Output written to: /resolved/path/output.json (150 bytes)",
                    ),
                );
            });

            it("should show write confirmation as JSON in JSON mode", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--output=/path/to/output.json",
                ]);
                vi.mocked(FileOutputWriter.writeJsonToFile).mockResolvedValue({
                    filePath: "/resolved/path/output.json",
                    bytesWritten: 150,
                });

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.success).toBe(true);
                expect(json.data.filePath).toBe("/resolved/path/output.json");
                expect(json.data.bytesWritten).toBe(150);
            });

            it("should not call table renderer when --output is used", async () => {
                command.testParseOutputConfig([
                    "--output=/path/to/output.json",
                ]);
                const tableRenderer = vi.fn();

                await command.testOutput(
                    { success: true, data: sampleData },
                    tableRenderer,
                    "test",
                );

                expect(tableRenderer).not.toHaveBeenCalled();
            });

            it("should prioritize --output over display format", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--output=/path/to/output.json",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                expect(FileOutputWriter.writeJsonToFile).toHaveBeenCalled();
                // Should show confirmation, not the JSON result
                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.data.filePath).toBeDefined();
            });
        });

        describe("Error Handling", () => {
            it("should output error result with outputErrorResult method", () => {
                command.testParseOutputConfig([]);

                command.testOutputErrorResult({
                    message: "Test error",
                    code: "TEST_CODE",
                });

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Error: Test error",
                );
            });

            it("should output error as JSON in JSON mode", () => {
                command.testParseOutputConfig(["--format=json"]);

                command.testOutputErrorResult({
                    message: "Test error",
                    code: "TEST_CODE",
                    details: { field: "value" },
                });

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);

                expect(json.success).toBe(false);
                expect(json.error.message).toBe("Test error");
                expect(json.error.code).toBe("TEST_CODE");
                expect(json.error.details).toEqual({ field: "value" });
            });

            it("should use custom error handler in table mode", () => {
                command.testParseOutputConfig([]);
                const customHandler = vi.fn();

                command.testOutputErrorResult(
                    { message: "Test error" },
                    customHandler,
                );

                expect(customHandler).toHaveBeenCalled();
                expect(consoleErrorSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe("D2: Flag Combinations", () => {
        describe("JSON + Export", () => {
            it("should output JSON to stdout AND export to file", async () => {
                command.testParseOutputConfig(["--format=json", "--export"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // Should output JSON to stdout
                expect(consoleLogSpy).toHaveBeenCalled();
                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.success).toBe(true);

                // Should also export to file
                expect(utils.exportToJson).toHaveBeenCalled();
            });

            it("should work with --format=json --export=md", async () => {
                command.testParseOutputConfig(["--format=json", "--export=md"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // JSON to stdout
                const output = consoleLogSpy.mock.calls[0][0];
                expect(() => JSON.parse(output)).not.toThrow();

                // Markdown export
                expect(utils.exportToMarkdown).toHaveBeenCalled();
            });

            it("should work with --format=json --export=both", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--export=both",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // JSON to stdout
                const output = consoleLogSpy.mock.calls[0][0];
                expect(() => JSON.parse(output)).not.toThrow();

                // Both exports
                expect(utils.exportToJson).toHaveBeenCalled();
                expect(utils.exportToMarkdown).toHaveBeenCalled();
            });
        });

        describe("JSON + Output Path", () => {
            it("should write JSON to specific file with --format=json --output", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--output=/custom/output.json",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                expect(FileOutputWriter.writeJsonToFile).toHaveBeenCalledWith(
                    { success: true, data: sampleData },
                    "/custom/output.json",
                    "/default/output",
                );
            });

            it("should show confirmation as JSON when --format=json --output", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--output=/custom/output.json",
                ]);
                vi.mocked(FileOutputWriter.writeJsonToFile).mockResolvedValue({
                    filePath: "/custom/output.json",
                    bytesWritten: 100,
                });

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.data.filePath).toBe("/custom/output.json");
            });
        });

        describe("Export + Custom Path", () => {
            it("should export to custom directory with --export --export-path", async () => {
                command.testParseOutputConfig([
                    "--export",
                    "--export-path=/custom/export",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/custom/export",
                );
            });

            it("should work with --export=both --export-path=/custom", async () => {
                command.testParseOutputConfig([
                    "--export=both",
                    "--export-path=/custom/export",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/custom/export",
                );
                expect(utils.exportToMarkdown).toHaveBeenCalledWith(
                    sampleData,
                    expect.any(String),
                    "datasets",
                    "/custom/export",
                );
            });

            it("should work with --export=md --export-path=/custom", async () => {
                command.testParseOutputConfig([
                    "--export=md",
                    "--export-path=/custom/export",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToMarkdown).toHaveBeenCalledWith(
                    sampleData,
                    expect.any(String),
                    "datasets",
                    "/custom/export",
                );
            });

            it("should handle --export-path without --export (implies --export)", async () => {
                command.testParseOutputConfig(["--export-path=/custom/export"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/custom/export",
                );
            });
        });

        describe("Quiet Mode", () => {
            it("should suppress export confirmation with --quiet", async () => {
                command.testParseOutputConfig(["--export", "--quiet"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // Should export
                expect(utils.exportToJson).toHaveBeenCalled();

                // Should not show confirmation
                expect(consoleLogSpy).not.toHaveBeenCalledWith(
                    expect.stringContaining("Exported to JSON"),
                );
            });

            it("should suppress output path confirmation with --quiet", async () => {
                command.testParseOutputConfig([
                    "--output=/path/output.json",
                    "--quiet",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "test",
                );

                // Should write to file
                expect(FileOutputWriter.writeJsonToFile).toHaveBeenCalled();

                // Should not show confirmation
                expect(consoleLogSpy).not.toHaveBeenCalled();
            });

            it("should work with -q shorthand", async () => {
                command.testParseOutputConfig(["-q", "--export"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalled();
                expect(consoleLogSpy).not.toHaveBeenCalledWith(
                    expect.stringContaining("Exported"),
                );
            });
        });

        describe("Complex Flag Combinations", () => {
            it("should handle --format=json --export --quiet together", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--export",
                    "--quiet",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // Should output JSON to stdout
                const output = consoleLogSpy.mock.calls[0][0];
                expect(() => JSON.parse(output)).not.toThrow();

                // Should export
                expect(utils.exportToJson).toHaveBeenCalled();

                // Should not show "Exported to JSON" message
                const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
                expect(
                    allLogs.some(log => log.includes("Exported to JSON")),
                ).toBe(false);
            });

            it("should handle --format=json --export=both --export-path=/custom --quiet", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--export=both",
                    "--export-path=/custom",
                    "--quiet",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // JSON to stdout
                expect(() =>
                    JSON.parse(consoleLogSpy.mock.calls[0][0]),
                ).not.toThrow();

                // Both exports to custom path
                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/custom",
                );
                expect(utils.exportToMarkdown).toHaveBeenCalledWith(
                    sampleData,
                    expect.any(String),
                    "datasets",
                    "/custom",
                );

                // No confirmation messages
                const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
                expect(allLogs.some(log => log.includes("Exported to"))).toBe(
                    false,
                );
            });

            it("should handle all flags at once", async () => {
                command.testParseOutputConfig([
                    "searchTerm",
                    "--format=json",
                    "--export=both",
                    "--export-path=/custom/export",
                    "--limit=10",
                    "--quiet",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // JSON output
                expect(() =>
                    JSON.parse(consoleLogSpy.mock.calls[0][0]),
                ).not.toThrow();

                // Exports
                expect(utils.exportToJson).toHaveBeenCalled();
                expect(utils.exportToMarkdown).toHaveBeenCalled();

                // No confirmation messages
                const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
                expect(allLogs.some(log => log.includes("Exported to"))).toBe(
                    false,
                );
            });
        });

        describe("Legacy Flag Compatibility", () => {
            it("should work with legacy --save flag", async () => {
                command.testParseOutputConfig(["--save"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalled();
            });

            it("should work with legacy --save-both flag", async () => {
                command.testParseOutputConfig(["--save-both"]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalled();
                expect(utils.exportToMarkdown).toHaveBeenCalled();
            });

            it("should work with legacy --path flag", async () => {
                command.testParseOutputConfig([
                    "--save",
                    "--path=/legacy/path",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/legacy/path",
                );
            });

            it("should work with mixed legacy and new flags", async () => {
                command.testParseOutputConfig([
                    "--format=json",
                    "--save-both",
                    "--path=/legacy/path",
                    "--quiet",
                ]);

                await command.testOutput(
                    { success: true, data: sampleData },
                    () => console.table(sampleData),
                    "datasets",
                );

                // JSON output
                expect(() =>
                    JSON.parse(consoleLogSpy.mock.calls[0][0]),
                ).not.toThrow();

                // Exports to legacy path
                expect(utils.exportToJson).toHaveBeenCalledWith(
                    sampleData,
                    "datasets",
                    "/legacy/path",
                );
                expect(utils.exportToMarkdown).toHaveBeenCalledWith(
                    sampleData,
                    expect.any(String),
                    "datasets",
                    "/legacy/path",
                );
            });
        });

        describe("Edge Cases", () => {
            it("should handle undefined data gracefully", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true },
                    () => console.log("No data"),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.success).toBe(true);
                expect(json.data).toBeUndefined();
            });

            it("should handle empty data object", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true, data: {} },
                    () => console.log("Empty data"),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.data).toEqual({});
            });

            it("should handle null data", async () => {
                command.testParseOutputConfig(["--format=json"]);

                await command.testOutput(
                    { success: true, data: null },
                    () => console.log("Null data"),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.data).toBeNull();
            });

            it("should handle complex nested data structures", async () => {
                command.testParseOutputConfig(["--format=json"]);
                const complexData = {
                    nested: {
                        deep: {
                            array: [1, 2, 3],
                            object: { key: "value" },
                        },
                    },
                };

                await command.testOutput(
                    { success: true, data: complexData },
                    () => console.log("Complex data"),
                    "test",
                );

                const output = consoleLogSpy.mock.calls[0][0];
                const json = JSON.parse(output);
                expect(json.data).toEqual(complexData);
            });
        });
    });
});
