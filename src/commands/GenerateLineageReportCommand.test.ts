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
import type { DomoDataflow } from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import { GenerateLineageReportCommand } from "./GenerateLineageReportCommand";
import { promises as fs } from "fs";

// Mock dependencies
vi.mock("../api/clients/dataflowApi", () => ({
    listDataflows: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("fs", () => ({
    promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
    },
}));

describe("GenerateLineageReportCommand", () => {
    let command: GenerateLineageReportCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    const mockedListDataflows = dataflowApi.listDataflows as Mock;
    const mockedMkdir = fs.mkdir as Mock;
    const mockedWriteFile = fs.writeFile as Mock;

    beforeEach(() => {
        command = new GenerateLineageReportCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("generate-lineage-report");
        expect(command.description).toBe(
            "Generates comprehensive lineage reports in Obsidian-compatible markdown format",
        );
    });

    describe("execute", () => {
        const mockDataflows: DomoDataflow[] = [
            {
                id: "df-001",
                name: "Dataflow 1",
                description: "Test dataflow 1",
                createdAt: "2024-01-01T00:00:00Z",
                inputs: [
                    {
                        id: "input-1",
                        name: "Input Dataset 1",
                        dataSourceId: "ds-001",
                    },
                ],
                outputs: [
                    {
                        id: "output-1",
                        name: "Output Dataset 1",
                        dataSourceId: "ds-002",
                    },
                ],
            },
            {
                id: "df-002",
                name: "Dataflow 2",
                description: "Test dataflow 2",
                createdAt: "2024-01-02T00:00:00Z",
                inputs: [
                    {
                        id: "input-2",
                        name: "Input Dataset 2",
                        dataSourceId: "ds-002",
                    },
                ],
                outputs: [
                    {
                        id: "output-2",
                        name: "Output Dataset 2",
                        dataSourceId: "ds-003",
                    },
                ],
            },
        ];

        it("should generate full report by default", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute([]);

            expect(mockedListDataflows).toHaveBeenCalledWith(
                { limit: 1000 },
                "apiToken",
            );
            expect(mockedMkdir).toHaveBeenCalledWith("./reports", {
                recursive: true,
            });
            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.stringContaining("lineage-full-report.md"),
                expect.stringContaining("# Domo Data Lineage Full Report"),
                "utf8",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Report generated successfully!"),
            );
        });

        it("should handle --format=json flag", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["--format=json"]);

            expect(mockedListDataflows).toHaveBeenCalled();
            expect(mockedWriteFile).toHaveBeenCalled();
            // Should output JSON metadata - check that JSON was logged
            // The JSON is written as a single string, so search for success field
            const allLogs = consoleLogSpy.mock.calls
                .map(call => String(call[0]))
                .join("\n");
            expect(allLogs).toContain('"success"');
            expect(allLogs).toContain("reportMetadata");
        });

        it("should generate entity report when type=entity and ID provided", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["ds-001", "--type=entity"]);

            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.stringContaining("lineage-report-ds-001.md"),
                expect.any(String),
                "utf8",
            );
        });

        it("should generate overview report when type=overview", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["--type=overview"]);

            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.stringContaining("lineage-overview-report.md"),
                expect.stringContaining("# Domo Data Lineage Overview"),
                "utf8",
            );
        });

        it("should generate orphans report when type=orphans", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["--type=orphans"]);

            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.stringContaining("lineage-orphans-report.md"),
                expect.stringContaining("Orphaned Datasets"),
                "utf8",
            );
        });

        it("should handle custom report path", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["--report-path=/custom/reports"]);

            expect(mockedMkdir).toHaveBeenCalledWith("/custom/reports", {
                recursive: true,
            });
            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.stringContaining(
                    "/custom/reports/lineage-full-report.md",
                ),
                expect.any(String),
                "utf8",
            );
        });

        it("should error when no dataflows found", async () => {
            mockedListDataflows.mockResolvedValue([]);

            await command.execute([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "No dataflows found. Unable to generate lineage report",
                ),
            );
            expect(mockedWriteFile).not.toHaveBeenCalled();
        });

        it("should error when entity ID missing for entity report", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);

            await command.execute(["--type=entity"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Entity ID required for entity report"),
            );
            expect(mockedWriteFile).not.toHaveBeenCalled();
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedListDataflows.mockRejectedValue(error);

            await command.execute([]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error generating lineage report:",
                error,
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to generate lineage report"),
            );
        });

        it("should handle include options", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute([
                "--include-diagrams",
                "--include-metadata",
                "--include-transforms",
            ]);

            expect(mockedWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining("```mermaid"),
                "utf8",
            );
        });

        it("should handle max-depth option", async () => {
            mockedListDataflows.mockResolvedValue(mockDataflows);
            mockedMkdir.mockResolvedValue(undefined);
            mockedWriteFile.mockResolvedValue(undefined);

            await command.execute(["--max-depth=5"]);

            expect(mockedWriteFile).toHaveBeenCalled();
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Generates comprehensive lineage reports in Obsidian-compatible markdown format",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Usage: generate-lineage-report [entity-id] [options]",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Report Types:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Report Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Legacy Aliases"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags for partial input", () => {
            const flags = command.autocomplete("--type");
            expect(flags).toContain("--type=full");
            expect(flags).toContain("--type=entity");
            expect(flags).toContain("--type=overview");
            expect(flags).toContain("--type=orphans");
        });

        it("should return output flags", () => {
            const flags = command.autocomplete("--export");
            expect(flags).toContain("--export");
            expect(flags).toContain("--export=json");
            expect(flags).toContain("--export=md");
            expect(flags).toContain("--export=both");
            expect(flags).toContain("--export-path");
        });

        it("should return legacy flags", () => {
            const flags = command.autocomplete("--save");
            expect(flags).toContain("--save");
            expect(flags).toContain("--save-json");
            expect(flags).toContain("--save-md");
            expect(flags).toContain("--save-both");
        });

        it("should return all flags for empty input", () => {
            const flags = command.autocomplete("--");
            expect(flags.length).toBeGreaterThan(10);
        });
    });
});
