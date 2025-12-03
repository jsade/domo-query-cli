import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    parseOutputArgs,
    toOutputConfig,
    getRemainingArgs,
    isJsonOutput,
    stripFormatArgs,
} from "./OutputParser";
import { log } from "./logger";

// Mock the logger
vi.mock("./logger", () => ({
    log: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("OutputParser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("parseOutputArgs", () => {
        describe("display format parsing", () => {
            it("should default to table format", () => {
                const result = parseOutputArgs([]);
                expect(result.displayFormat).toBe("table");
            });

            it("should parse --format json", () => {
                const result = parseOutputArgs(["--format", "json"]);
                expect(result.displayFormat).toBe("json");
            });

            it("should parse --format=json", () => {
                const result = parseOutputArgs(["--format=json"]);
                expect(result.displayFormat).toBe("json");
            });

            it("should be case-insensitive for format value", () => {
                const result = parseOutputArgs(["--format=JSON"]);
                expect(result.displayFormat).toBe("json");
            });

            it("should ignore invalid format values", () => {
                const result = parseOutputArgs(["--format=xml"]);
                expect(result.displayFormat).toBe("table");
            });
        });

        describe("export flag parsing", () => {
            it("should parse --export without value as json", () => {
                const result = parseOutputArgs(["--export"]);
                expect(result.export).toEqual({ format: "json" });
            });

            it("should parse --export=json", () => {
                const result = parseOutputArgs(["--export=json"]);
                expect(result.export).toEqual({ format: "json" });
            });

            it("should parse --export=md", () => {
                const result = parseOutputArgs(["--export=md"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should parse --export=both", () => {
                const result = parseOutputArgs(["--export=both"]);
                expect(result.export).toEqual({ format: "both" });
            });

            it("should parse --export md (value as next arg)", () => {
                const result = parseOutputArgs(["--export", "md"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should parse --export-path with directory", () => {
                const result = parseOutputArgs([
                    "--export",
                    "--export-path",
                    "/custom/path",
                ]);
                expect(result.export).toEqual({
                    format: "json",
                    path: "/custom/path",
                });
            });

            it("should parse --export-path=/custom/path", () => {
                const result = parseOutputArgs([
                    "--export",
                    "--export-path=/custom/path",
                ]);
                expect(result.export).toEqual({
                    format: "json",
                    path: "/custom/path",
                });
            });

            it("should create export when only --export-path is provided", () => {
                const result = parseOutputArgs(["--export-path=/custom/path"]);
                expect(result.export).toEqual({
                    format: "json",
                    path: "/custom/path",
                });
            });
        });

        describe("legacy flag aliases", () => {
            it("should convert --save to --export", () => {
                const result = parseOutputArgs(["--save"]);
                expect(result.export).toEqual({ format: "json" });
            });

            it("should convert --save-json to --export=json", () => {
                const result = parseOutputArgs(["--save-json"]);
                expect(result.export).toEqual({ format: "json" });
            });

            it("should convert --save-md to --export=md", () => {
                const result = parseOutputArgs(["--save-md"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should convert --save-markdown to --export=md", () => {
                const result = parseOutputArgs(["--save-markdown"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should convert --save-both to --export=both", () => {
                const result = parseOutputArgs(["--save-both"]);
                expect(result.export).toEqual({ format: "both" });
            });

            it("should convert --save-all to --export=both", () => {
                const result = parseOutputArgs(["--save-all"]);
                expect(result.export).toEqual({ format: "both" });
            });

            it("should convert --save=md to --export=md", () => {
                const result = parseOutputArgs(["--save=md"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should convert --save=markdown to --export=md", () => {
                const result = parseOutputArgs(["--save=markdown"]);
                expect(result.export).toEqual({ format: "md" });
            });

            it("should convert --save=all to --export=both", () => {
                const result = parseOutputArgs(["--save=all"]);
                expect(result.export).toEqual({ format: "both" });
            });

            it("should convert --path to --export-path", () => {
                const result = parseOutputArgs([
                    "--save",
                    "--path=/custom/path",
                ]);
                expect(result.export).toEqual({
                    format: "json",
                    path: "/custom/path",
                });
            });
        });

        describe("output path parsing", () => {
            it("should parse --output with file path", () => {
                const result = parseOutputArgs([
                    "--output",
                    "/path/to/file.json",
                ]);
                expect(result.output).toBe("/path/to/file.json");
            });

            it("should parse --output=/path/to/file.json", () => {
                const result = parseOutputArgs(["--output=/path/to/file.json"]);
                expect(result.output).toBe("/path/to/file.json");
            });

            it("should warn when --output has no value", () => {
                parseOutputArgs(["--output"]);
                expect(log.warn).toHaveBeenCalledWith(
                    "--output requires a file path",
                );
            });

            it("should warn when --output= has empty value", () => {
                parseOutputArgs(["--output="]);
                expect(log.warn).toHaveBeenCalledWith(
                    "--output requires a file path",
                );
            });
        });

        describe("quiet flag parsing", () => {
            it("should parse --quiet", () => {
                const result = parseOutputArgs(["--quiet"]);
                expect(result.quiet).toBe(true);
            });

            it("should parse -q", () => {
                const result = parseOutputArgs(["-q"]);
                expect(result.quiet).toBe(true);
            });

            it("should default quiet to false", () => {
                const result = parseOutputArgs([]);
                expect(result.quiet).toBe(false);
            });
        });

        describe("positional arguments", () => {
            it("should extract positional arguments", () => {
                const result = parseOutputArgs([
                    "arg1",
                    "arg2",
                    "--format=json",
                ]);
                expect(result.positional).toEqual(["arg1", "arg2"]);
            });

            it("should handle positional arguments between flags", () => {
                const result = parseOutputArgs([
                    "--format=json",
                    "arg1",
                    "--export",
                ]);
                expect(result.positional).toEqual(["arg1"]);
            });
        });

        describe("named parameters", () => {
            it("should parse --key value format", () => {
                const result = parseOutputArgs(["--limit", "10"]);
                expect(result.params.limit).toBe(10);
            });

            it("should parse --key=value format", () => {
                const result = parseOutputArgs(["--limit=10"]);
                expect(result.params.limit).toBe(10);
            });

            it("should parse key=value format (legacy)", () => {
                const result = parseOutputArgs(["limit=10"]);
                expect(result.params.limit).toBe(10);
            });

            it("should parse boolean flags", () => {
                const result = parseOutputArgs(["--verbose"]);
                expect(result.flags.has("verbose")).toBe(true);
                expect(result.params.verbose).toBe(true);
            });

            it("should parse string values with = in them", () => {
                const result = parseOutputArgs(["--filter=a=b"]);
                expect(result.params.filter).toBe("a=b");
            });

            it("should convert known numeric params to numbers", () => {
                const result = parseOutputArgs(["--limit=10", "--offset=20"]);
                expect(result.params.limit).toBe(10);
                expect(result.params.offset).toBe(20);
            });

            it("should keep non-numeric params as strings", () => {
                const result = parseOutputArgs(["--id=abc123"]);
                expect(result.params.id).toBe("abc123");
            });

            it("should parse boolean string values", () => {
                const result = parseOutputArgs(["--active=true"]);
                expect(result.params.active).toBe(true);
            });
        });

        describe("complex combinations", () => {
            it("should handle --format=json with --export", () => {
                const result = parseOutputArgs(["--format=json", "--export"]);
                expect(result.displayFormat).toBe("json");
                expect(result.export).toEqual({ format: "json" });
            });

            it("should handle all options together", () => {
                const result = parseOutputArgs([
                    "datasetId",
                    "--format=json",
                    "--export=both",
                    "--export-path=/custom",
                    "--quiet",
                    "--limit=10",
                ]);

                expect(result.displayFormat).toBe("json");
                expect(result.export).toEqual({
                    format: "both",
                    path: "/custom",
                });
                expect(result.quiet).toBe(true);
                expect(result.positional).toEqual(["datasetId"]);
                expect(result.params.limit).toBe(10);
            });

            it("should handle legacy and new flags mixed", () => {
                const result = parseOutputArgs([
                    "--format=json",
                    "--save-both",
                    "--path=/legacy/path",
                ]);
                expect(result.displayFormat).toBe("json");
                expect(result.export).toEqual({
                    format: "both",
                    path: "/legacy/path",
                });
            });
        });
    });

    describe("toOutputConfig", () => {
        it("should convert parsed args to output config", () => {
            const parsed = parseOutputArgs([
                "--format=json",
                "--export=md",
                "--export-path=/custom",
                "--quiet",
            ]);
            const config = toOutputConfig(parsed);

            expect(config.displayFormat).toBe("json");
            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("md");
            expect(config.exportPath).toBe("/custom");
            expect(config.quiet).toBe(true);
        });

        it("should handle output path", () => {
            const parsed = parseOutputArgs(["--output=/path/to/file.json"]);
            const config = toOutputConfig(parsed);

            expect(config.outputPath).toBe("/path/to/file.json");
        });

        it("should set shouldExport false when no export flag", () => {
            const parsed = parseOutputArgs(["--format=json"]);
            const config = toOutputConfig(parsed);

            expect(config.shouldExport).toBe(false);
        });
    });

    describe("getRemainingArgs", () => {
        it("should return positional args", () => {
            const parsed = parseOutputArgs([
                "arg1",
                "--format=json",
                "arg2",
                "--export",
            ]);
            const remaining = getRemainingArgs(parsed);

            expect(remaining).toContain("arg1");
            expect(remaining).toContain("arg2");
        });

        it("should include non-output params as --key=value", () => {
            const parsed = parseOutputArgs(["--limit=10", "--format=json"]);
            const remaining = getRemainingArgs(parsed);

            expect(remaining).toContain("--limit=10");
        });

        it("should include boolean flags", () => {
            const parsed = parseOutputArgs(["--verbose", "--format=json"]);
            const remaining = getRemainingArgs(parsed);

            expect(remaining).toContain("--verbose");
        });
    });

    describe("isJsonOutput", () => {
        it("should return true for --format=json", () => {
            expect(isJsonOutput(["--format=json"])).toBe(true);
        });

        it("should return true for --format json", () => {
            expect(isJsonOutput(["--format", "json"])).toBe(true);
        });

        it("should return false for no format flag", () => {
            expect(isJsonOutput(["--limit=10"])).toBe(false);
        });

        it("should return false for undefined args", () => {
            expect(isJsonOutput(undefined)).toBe(false);
        });
    });

    describe("stripFormatArgs", () => {
        it("should remove --format=json", () => {
            const result = stripFormatArgs(["--format=json", "--limit=10"]);
            expect(result).toEqual(["--limit=10"]);
        });

        it("should remove --format json pair", () => {
            const result = stripFormatArgs(["--format", "json", "--limit=10"]);
            expect(result).toEqual(["--limit=10"]);
        });

        it("should handle undefined args", () => {
            expect(stripFormatArgs(undefined)).toEqual([]);
        });

        it("should preserve other args", () => {
            const result = stripFormatArgs([
                "arg1",
                "--format=json",
                "--export",
            ]);
            expect(result).toEqual(["arg1", "--export"]);
        });
    });
});
