import { describe, it, expect } from "vitest";
import {
    isDisplayFormat,
    isExportFormat,
    toLegacySaveOptions,
    toLegacyOutputOptions,
    FLAG_ALIASES,
    OUTPUT_FLAGS,
    NUMERIC_PARAMS,
    type OutputConfig,
} from "./outputTypes";

describe("outputTypes", () => {
    describe("isDisplayFormat", () => {
        it("should return true for 'table'", () => {
            expect(isDisplayFormat("table")).toBe(true);
        });

        it("should return true for 'json'", () => {
            expect(isDisplayFormat("json")).toBe(true);
        });

        it("should return false for invalid values", () => {
            expect(isDisplayFormat("xml")).toBe(false);
            expect(isDisplayFormat("csv")).toBe(false);
            expect(isDisplayFormat(null)).toBe(false);
            expect(isDisplayFormat(undefined)).toBe(false);
            expect(isDisplayFormat(123)).toBe(false);
        });
    });

    describe("isExportFormat", () => {
        it("should return true for 'json'", () => {
            expect(isExportFormat("json")).toBe(true);
        });

        it("should return true for 'md'", () => {
            expect(isExportFormat("md")).toBe(true);
        });

        it("should return true for 'both'", () => {
            expect(isExportFormat("both")).toBe(true);
        });

        it("should return false for invalid values", () => {
            expect(isExportFormat("xml")).toBe(false);
            expect(isExportFormat("markdown")).toBe(false);
            expect(isExportFormat(null)).toBe(false);
            expect(isExportFormat(undefined)).toBe(false);
        });
    });

    describe("toLegacySaveOptions", () => {
        it("should return null when shouldExport is false", () => {
            const config: OutputConfig = {
                displayFormat: "table",
                shouldExport: false,
            };
            expect(toLegacySaveOptions(config)).toBeNull();
        });

        it("should return null when exportFormat is undefined", () => {
            const config: OutputConfig = {
                displayFormat: "table",
                shouldExport: true,
            };
            expect(toLegacySaveOptions(config)).toBeNull();
        });

        it("should convert to SaveOptions with format", () => {
            const config: OutputConfig = {
                displayFormat: "json",
                shouldExport: true,
                exportFormat: "md",
            };
            expect(toLegacySaveOptions(config)).toEqual({
                format: "md",
                path: undefined,
            });
        });

        it("should include path when specified", () => {
            const config: OutputConfig = {
                displayFormat: "json",
                shouldExport: true,
                exportFormat: "both",
                exportPath: "/custom/path",
            };
            expect(toLegacySaveOptions(config)).toEqual({
                format: "both",
                path: "/custom/path",
            });
        });
    });

    describe("toLegacyOutputOptions", () => {
        it("should return null when outputPath is undefined", () => {
            const config: OutputConfig = {
                displayFormat: "table",
                shouldExport: false,
            };
            expect(toLegacyOutputOptions(config)).toBeNull();
        });

        it("should convert to OutputOptions with path", () => {
            const config: OutputConfig = {
                displayFormat: "json",
                shouldExport: false,
                outputPath: "/path/to/file.json",
            };
            expect(toLegacyOutputOptions(config)).toEqual({
                format: "json",
                path: "/path/to/file.json",
            });
        });
    });

    describe("FLAG_ALIASES", () => {
        it("should map legacy save flags to export flags", () => {
            expect(FLAG_ALIASES["--save"]).toBe("--export");
            expect(FLAG_ALIASES["--save-json"]).toBe("--export=json");
            expect(FLAG_ALIASES["--save-md"]).toBe("--export=md");
            expect(FLAG_ALIASES["--save-markdown"]).toBe("--export=md");
            expect(FLAG_ALIASES["--save-both"]).toBe("--export=both");
            expect(FLAG_ALIASES["--save-all"]).toBe("--export=both");
        });

        it("should map --path to --export-path", () => {
            expect(FLAG_ALIASES["--path"]).toBe("--export-path");
        });
    });

    describe("OUTPUT_FLAGS", () => {
        it("should include all new unified flags", () => {
            expect(OUTPUT_FLAGS.has("--format")).toBe(true);
            expect(OUTPUT_FLAGS.has("--export")).toBe(true);
            expect(OUTPUT_FLAGS.has("--export-path")).toBe(true);
            expect(OUTPUT_FLAGS.has("--output")).toBe(true);
            expect(OUTPUT_FLAGS.has("--quiet")).toBe(true);
            expect(OUTPUT_FLAGS.has("-q")).toBe(true);
        });

        it("should include all legacy flags", () => {
            expect(OUTPUT_FLAGS.has("--save")).toBe(true);
            expect(OUTPUT_FLAGS.has("--save-json")).toBe(true);
            expect(OUTPUT_FLAGS.has("--save-md")).toBe(true);
            expect(OUTPUT_FLAGS.has("--save-markdown")).toBe(true);
            expect(OUTPUT_FLAGS.has("--save-both")).toBe(true);
            expect(OUTPUT_FLAGS.has("--save-all")).toBe(true);
            expect(OUTPUT_FLAGS.has("--path")).toBe(true);
        });
    });

    describe("NUMERIC_PARAMS", () => {
        it("should include common numeric parameters", () => {
            expect(NUMERIC_PARAMS.has("limit")).toBe(true);
            expect(NUMERIC_PARAMS.has("offset")).toBe(true);
            expect(NUMERIC_PARAMS.has("page")).toBe(true);
            expect(NUMERIC_PARAMS.has("size")).toBe(true);
            expect(NUMERIC_PARAMS.has("count")).toBe(true);
            expect(NUMERIC_PARAMS.has("timeout")).toBe(true);
            expect(NUMERIC_PARAMS.has("port")).toBe(true);
        });

        it("should not include non-numeric parameters", () => {
            expect(NUMERIC_PARAMS.has("id")).toBe(false);
            expect(NUMERIC_PARAMS.has("name")).toBe(false);
            expect(NUMERIC_PARAMS.has("format")).toBe(false);
        });
    });
});
