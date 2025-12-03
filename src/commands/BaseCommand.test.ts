import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type Mock,
} from "vitest";
import { BaseCommand } from "./BaseCommand";

// Mock dependencies
vi.mock("../utils/FileOutputWriter", () => ({
    writeJsonToFile: vi.fn().mockResolvedValue({
        filePath: "/test/output.json",
        bytesWritten: 100,
    }),
}));

vi.mock("../utils/utils", () => ({
    ensureExportDir: vi.fn().mockResolvedValue("/export"),
    exportToJson: vi
        .fn()
        .mockResolvedValue("/export/test_20250101_120000.json"),
    exportToMarkdown: vi
        .fn()
        .mockResolvedValue("/export/test_20250101_120000.md"),
}));

vi.mock("../config", () => ({
    domoConfig: {
        exportPath: "/default/export",
        outputPath: "/default/output",
    },
}));

// Concrete test implementation
class TestCommand extends BaseCommand {
    public readonly name = "test-command";
    public readonly description = "Test command for unit testing";

    public async execute(_args?: string[]): Promise<void> {
        // Implementation for testing
    }

    public showHelp(): void {
        console.log("Test command help");
    }

    // Expose protected methods for testing
    public testParseOutputConfig(args?: string[]) {
        return this.parseOutputConfig(args);
    }

    public async testOutput<T>(
        result: { success: boolean; data?: T; error?: { message: string } },
        tableRenderer: () => void,
        filePrefix: string,
    ) {
        return this.output(result, tableRenderer, filePrefix);
    }

    public testOutputErrorResult(
        error: { message: string; code?: string },
        defaultHandler?: () => void,
    ) {
        return this.outputErrorResult(error, defaultHandler);
    }

    public getOutputConfig() {
        return this.outputConfig;
    }

    public getIsJsonOutput() {
        return this.isJsonOutput;
    }

    public getIsJsonMode() {
        return this.isJsonMode;
    }

    // Legacy methods for testing backward compatibility
    public testCheckJsonOutput(args?: string[]) {
        return this.checkJsonOutput(args);
    }

    public testApplyLegacySaveOptions(
        saveOptions: { format: "json" | "md" | "both"; path?: string } | null,
    ) {
        return this.applyLegacySaveOptions(saveOptions);
    }
}

describe("BaseCommand", () => {
    let command: TestCommand;
    let logMock: Mock;
    let errorMock: Mock;

    beforeEach(() => {
        command = new TestCommand();
        logMock = vi.fn();
        errorMock = vi.fn();
        vi.spyOn(console, "log").mockImplementation(logMock);
        vi.spyOn(console, "error").mockImplementation(errorMock);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("parseOutputConfig", () => {
        it("should parse display format", () => {
            const { config } = command.testParseOutputConfig(["--format=json"]);
            expect(config.displayFormat).toBe("json");
        });

        it("should parse export flags", () => {
            const { config } = command.testParseOutputConfig(["--export=md"]);
            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("md");
        });

        it("should parse output path", () => {
            const { config } = command.testParseOutputConfig([
                "--output=/path/to/file.json",
            ]);
            expect(config.outputPath).toBe("/path/to/file.json");
        });

        it("should return remaining args without output flags", () => {
            const { args } = command.testParseOutputConfig([
                "arg1",
                "--format=json",
                "--limit=10",
            ]);
            expect(args).toContain("arg1");
            expect(args).toContain("--limit=10");
        });

        it("should set legacy isJsonOutput property", () => {
            command.testParseOutputConfig(["--format=json"]);
            expect(command.getIsJsonOutput()).toBe(true);
        });

        it("should update outputConfig instance property", () => {
            command.testParseOutputConfig(["--format=json", "--export"]);
            const config = command.getOutputConfig();
            expect(config.displayFormat).toBe("json");
            expect(config.shouldExport).toBe(true);
        });

        it("should handle legacy --save flag", () => {
            const { config } = command.testParseOutputConfig(["--save"]);
            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("json");
        });

        it("should handle legacy --save-both flag", () => {
            const { config } = command.testParseOutputConfig(["--save-both"]);
            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("both");
        });

        it("should handle legacy --path flag", () => {
            const { config } = command.testParseOutputConfig([
                "--save",
                "--path=/custom",
            ]);
            expect(config.exportPath).toBe("/custom");
        });
    });

    describe("output method", () => {
        it("should call tableRenderer for default format", async () => {
            command.testParseOutputConfig([]);
            const tableRenderer = vi.fn();

            await command.testOutput(
                { success: true, data: { test: "data" } },
                tableRenderer,
                "test",
            );

            expect(tableRenderer).toHaveBeenCalled();
        });

        it("should output JSON for --format=json", async () => {
            command.testParseOutputConfig(["--format=json"]);
            const tableRenderer = vi.fn();

            await command.testOutput(
                { success: true, data: { test: "data" } },
                tableRenderer,
                "test",
            );

            expect(tableRenderer).not.toHaveBeenCalled();
            expect(logMock).toHaveBeenCalled();
            const output = logMock.mock.calls[0][0];
            expect(output).toContain('"success": true');
        });

        it("should handle error result in table mode", async () => {
            command.testParseOutputConfig([]);
            const tableRenderer = vi.fn();

            await command.testOutput(
                { success: false, error: { message: "Test error" } },
                tableRenderer,
                "test",
            );

            expect(tableRenderer).not.toHaveBeenCalled();
            expect(errorMock).toHaveBeenCalledWith("Error: Test error");
        });

        it("should handle error result in JSON mode", async () => {
            command.testParseOutputConfig(["--format=json"]);
            const tableRenderer = vi.fn();

            await command.testOutput(
                { success: false, error: { message: "Test error" } },
                tableRenderer,
                "test",
            );

            const output = logMock.mock.calls[0][0];
            expect(output).toContain('"success": false');
            expect(output).toContain("Test error");
        });
    });

    describe("outputErrorResult method", () => {
        it("should output JSON error in JSON mode", () => {
            command.testParseOutputConfig(["--format=json"]);

            command.testOutputErrorResult({ message: "Error message" });

            const output = logMock.mock.calls[0][0];
            expect(output).toContain('"success": false');
            expect(output).toContain("Error message");
        });

        it("should use default handler in table mode", () => {
            command.testParseOutputConfig([]);
            const defaultHandler = vi.fn();

            command.testOutputErrorResult(
                { message: "Error message" },
                defaultHandler,
            );

            expect(defaultHandler).toHaveBeenCalled();
        });

        it("should output to stderr without handler in table mode", () => {
            command.testParseOutputConfig([]);

            command.testOutputErrorResult({ message: "Error message" });

            expect(errorMock).toHaveBeenCalledWith("Error: Error message");
        });
    });

    describe("isJsonMode getter", () => {
        it("should return true when displayFormat is json", () => {
            command.testParseOutputConfig(["--format=json"]);
            expect(command.getIsJsonMode()).toBe(true);
        });

        it("should return false when displayFormat is table", () => {
            command.testParseOutputConfig([]);
            expect(command.getIsJsonMode()).toBe(false);
        });
    });

    describe("legacy method compatibility", () => {
        describe("checkJsonOutput", () => {
            it("should detect JSON output", () => {
                command.testCheckJsonOutput(["--format=json"]);
                expect(command.getIsJsonOutput()).toBe(true);
            });

            it("should strip format args", () => {
                const remaining = command.testCheckJsonOutput([
                    "--format=json",
                    "--limit=10",
                ]);
                expect(remaining).toEqual(["--limit=10"]);
            });

            it("should update outputConfig displayFormat", () => {
                command.testCheckJsonOutput(["--format=json"]);
                expect(command.getOutputConfig().displayFormat).toBe("json");
            });
        });

        describe("applyLegacySaveOptions", () => {
            it("should apply save options to outputConfig", () => {
                command.testApplyLegacySaveOptions({
                    format: "md",
                    path: "/custom",
                });
                const config = command.getOutputConfig();
                expect(config.shouldExport).toBe(true);
                expect(config.exportFormat).toBe("md");
                expect(config.exportPath).toBe("/custom");
            });

            it("should handle null save options", () => {
                command.testApplyLegacySaveOptions(null);
                const config = command.getOutputConfig();
                expect(config.shouldExport).toBe(false);
            });
        });
    });
});
