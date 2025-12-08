/**
 * Integration tests for legacy alias backward compatibility
 *
 * This test suite verifies that legacy --save* and --path flags continue
 * to work identically to their new --export* equivalents, ensuring zero
 * breaking changes for existing users.
 *
 * Legacy → New Flag Mappings:
 * --save           → --export
 * --save-json      → --export=json
 * --save-md        → --export=md
 * --save-markdown  → --export=md
 * --save-both      → --export=both
 * --save-all       → --export=both
 * --save=<format>  → --export=<format>
 * --path=<dir>     → --export-path=<dir>
 */

import { describe, it, expect } from "vitest";
import {
    parseOutputArgs,
    toOutputConfig,
    getRemainingArgs,
} from "../../utils/OutputParser";
import type {
    ParsedOutputArgs,
    OutputConfig,
    ExportFormat,
} from "../../types/outputTypes";

/**
 * Helper to assert deep equality between two ParsedOutputArgs
 */
function assertParsedArgsEqual(
    legacy: ParsedOutputArgs,
    modern: ParsedOutputArgs,
    message: string,
): void {
    expect(legacy.displayFormat, `${message}: displayFormat`).toBe(
        modern.displayFormat,
    );
    expect(legacy.export, `${message}: export`).toEqual(modern.export);
    expect(legacy.output, `${message}: output`).toBe(modern.output);
    expect(legacy.quiet, `${message}: quiet`).toBe(modern.quiet);
    expect(Array.from(legacy.flags).sort(), `${message}: flags`).toEqual(
        Array.from(modern.flags).sort(),
    );
    expect(legacy.positional, `${message}: positional`).toEqual(
        modern.positional,
    );
    expect(legacy.params, `${message}: params`).toEqual(modern.params);
}

/**
 * Helper to assert deep equality between two OutputConfigs
 */
function assertOutputConfigEqual(
    legacy: OutputConfig,
    modern: OutputConfig,
    message: string,
): void {
    expect(legacy.displayFormat, `${message}: displayFormat`).toBe(
        modern.displayFormat,
    );
    expect(legacy.shouldExport, `${message}: shouldExport`).toBe(
        modern.shouldExport,
    );
    expect(legacy.exportFormat, `${message}: exportFormat`).toBe(
        modern.exportFormat,
    );
    expect(legacy.exportPath, `${message}: exportPath`).toBe(modern.exportPath);
    expect(legacy.outputPath, `${message}: outputPath`).toBe(modern.outputPath);
    expect(legacy.quiet, `${message}: quiet`).toBe(modern.quiet);
}

describe("Legacy Alias Verification Tests", () => {
    describe("Direct Flag Mappings", () => {
        describe("--save → --export", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save"]);
                const modernResult = parseOutputArgs(["--export"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save vs --export",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save vs --export",
                );
            });

            it("should both default to JSON format", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export"]),
                );

                expect(legacyConfig.exportFormat).toBe("json");
                expect(modernConfig.exportFormat).toBe("json");
                expect(legacyConfig.shouldExport).toBe(true);
                expect(modernConfig.shouldExport).toBe(true);
            });
        });

        describe("--save-json → --export=json", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save-json"]);
                const modernResult = parseOutputArgs(["--export=json"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save-json vs --export=json",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-json"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=json"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save-json vs --export=json",
                );
            });

            it("should both specify JSON format explicitly", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-json"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=json"]),
                );

                expect(legacyConfig.exportFormat).toBe("json");
                expect(modernConfig.exportFormat).toBe("json");
            });
        });

        describe("--save-md → --export=md", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save-md"]);
                const modernResult = parseOutputArgs(["--export=md"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save-md vs --export=md",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-md"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=md"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save-md vs --export=md",
                );
            });

            it("should both specify Markdown format", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-md"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=md"]),
                );

                expect(legacyConfig.exportFormat).toBe("md");
                expect(modernConfig.exportFormat).toBe("md");
            });
        });

        describe("--save-markdown → --export=md", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save-markdown"]);
                const modernResult = parseOutputArgs(["--export=md"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save-markdown vs --export=md",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-markdown"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=md"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save-markdown vs --export=md",
                );
            });

            it("should normalize --save-markdown to md format", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-markdown"]),
                );

                expect(legacyConfig.exportFormat).toBe("md");
            });
        });

        describe("--save-both → --export=both", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save-both"]);
                const modernResult = parseOutputArgs(["--export=both"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save-both vs --export=both",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-both"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=both"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save-both vs --export=both",
                );
            });

            it("should both specify both format", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-both"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=both"]),
                );

                expect(legacyConfig.exportFormat).toBe("both");
                expect(modernConfig.exportFormat).toBe("both");
            });
        });

        describe("--save-all → --export=both", () => {
            it("should produce identical ParsedOutputArgs", () => {
                const legacyResult = parseOutputArgs(["--save-all"]);
                const modernResult = parseOutputArgs(["--export=both"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save-all vs --export=both",
                );
            });

            it("should produce identical OutputConfig", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-all"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export=both"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--save-all vs --export=both",
                );
            });

            it("should normalize --save-all to both format", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save-all"]),
                );

                expect(legacyConfig.exportFormat).toBe("both");
            });
        });

        describe("--path → --export-path", () => {
            it("should produce identical ParsedOutputArgs with --save", () => {
                const legacyResult = parseOutputArgs([
                    "--save",
                    "--path=/custom/dir",
                ]);
                const modernResult = parseOutputArgs([
                    "--export",
                    "--export-path=/custom/dir",
                ]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--path vs --export-path",
                );
            });

            it("should produce identical OutputConfig with --save", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save", "--path=/custom/dir"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export", "--export-path=/custom/dir"]),
                );

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "--path vs --export-path",
                );
            });

            it("should both set custom export path", () => {
                const legacyConfig = toOutputConfig(
                    parseOutputArgs(["--save", "--path=/custom/dir"]),
                );
                const modernConfig = toOutputConfig(
                    parseOutputArgs(["--export", "--export-path=/custom/dir"]),
                );

                expect(legacyConfig.exportPath).toBe("/custom/dir");
                expect(modernConfig.exportPath).toBe("/custom/dir");
            });

            it("should work with --path space syntax", () => {
                const legacyResult = parseOutputArgs([
                    "--save",
                    "--path",
                    "/custom/dir",
                ]);
                const modernResult = parseOutputArgs([
                    "--export",
                    "--export-path",
                    "/custom/dir",
                ]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--path space syntax",
                );
            });
        });
    });

    describe("Parametric Flag Mappings", () => {
        describe("--save=<format> → --export=<format>", () => {
            const formats: Array<{
                input: ExportFormat;
                normalized: ExportFormat;
            }> = [
                { input: "json", normalized: "json" },
                { input: "md", normalized: "md" },
                { input: "both", normalized: "both" },
            ];

            formats.forEach(({ input, normalized }) => {
                it(`should handle --save=${input}`, () => {
                    const legacyResult = parseOutputArgs([`--save=${input}`]);
                    const modernResult = parseOutputArgs([`--export=${input}`]);

                    assertParsedArgsEqual(
                        legacyResult,
                        modernResult,
                        `--save=${input} vs --export=${input}`,
                    );

                    const legacyConfig = toOutputConfig(legacyResult);
                    expect(legacyConfig.exportFormat).toBe(normalized);
                });
            });

            it("should normalize --save=markdown to md", () => {
                const legacyResult = parseOutputArgs(["--save=markdown"]);
                const modernResult = parseOutputArgs(["--export=md"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save=markdown normalization",
                );

                const legacyConfig = toOutputConfig(legacyResult);
                expect(legacyConfig.exportFormat).toBe("md");
            });

            it("should normalize --save=all to both", () => {
                const legacyResult = parseOutputArgs(["--save=all"]);
                const modernResult = parseOutputArgs(["--export=both"]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "--save=all normalization",
                );

                const legacyConfig = toOutputConfig(legacyResult);
                expect(legacyConfig.exportFormat).toBe("both");
            });
        });
    });

    describe("Command-Level Integration", () => {
        describe("Legacy flags preserve command arguments", () => {
            it("should preserve positional arguments with legacy flags", () => {
                const legacyResult = parseOutputArgs([
                    "dataset123",
                    "--save-json",
                    "otherArg",
                ]);
                const modernResult = parseOutputArgs([
                    "dataset123",
                    "--export=json",
                    "otherArg",
                ]);

                expect(legacyResult.positional).toEqual(
                    modernResult.positional,
                );
                expect(legacyResult.positional).toEqual([
                    "dataset123",
                    "otherArg",
                ]);
            });

            it("should preserve named parameters with legacy flags", () => {
                const legacyResult = parseOutputArgs([
                    "--limit=10",
                    "--save-md",
                    "--offset=5",
                ]);
                const modernResult = parseOutputArgs([
                    "--limit=10",
                    "--export=md",
                    "--offset=5",
                ]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "named params preservation",
                );
                expect(legacyResult.params.limit).toBe(10);
                expect(legacyResult.params.offset).toBe(5);
            });

            it("should preserve boolean flags with legacy flags", () => {
                const legacyResult = parseOutputArgs([
                    "--verbose",
                    "--save-both",
                    "--debug",
                ]);
                const modernResult = parseOutputArgs([
                    "--verbose",
                    "--export=both",
                    "--debug",
                ]);

                assertParsedArgsEqual(
                    legacyResult,
                    modernResult,
                    "boolean flags preservation",
                );
                expect(legacyResult.flags.has("verbose")).toBe(true);
                expect(legacyResult.flags.has("debug")).toBe(true);
            });
        });

        describe("getRemainingArgs with legacy flags", () => {
            it("should strip legacy export flags from remaining args", () => {
                const legacyParsed = parseOutputArgs([
                    "dataset123",
                    "--save-json",
                    "--limit=10",
                ]);
                const modernParsed = parseOutputArgs([
                    "dataset123",
                    "--export=json",
                    "--limit=10",
                ]);

                const legacyRemaining = getRemainingArgs(legacyParsed);
                const modernRemaining = getRemainingArgs(modernParsed);

                expect(legacyRemaining.sort()).toEqual(modernRemaining.sort());
                expect(legacyRemaining).toContain("dataset123");
                expect(legacyRemaining).toContain("--limit=10");
            });

            it("should handle legacy --path flag in remaining args", () => {
                const legacyParsed = parseOutputArgs([
                    "--save",
                    "--path=/custom",
                    "--limit=5",
                ]);
                const modernParsed = parseOutputArgs([
                    "--export",
                    "--export-path=/custom",
                    "--limit=5",
                ]);

                const legacyRemaining = getRemainingArgs(legacyParsed);
                const modernRemaining = getRemainingArgs(modernParsed);

                expect(legacyRemaining).toEqual(modernRemaining);
            });
        });
    });

    describe("Combined Legacy/New Flags", () => {
        it("should handle --save with --format=json", () => {
            const result = parseOutputArgs(["--format=json", "--save"]);

            expect(result.displayFormat).toBe("json");
            expect(result.export).toEqual({ format: "json" });
        });

        it("should handle legacy --save-md with new --export-path", () => {
            const result = parseOutputArgs([
                "--save-md",
                "--export-path=/mixed",
            ]);
            const config = toOutputConfig(result);

            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("md");
            expect(config.exportPath).toBe("/mixed");
        });

        it("should handle new --export with legacy --path", () => {
            const result = parseOutputArgs(["--export=both", "--path=/legacy"]);
            const config = toOutputConfig(result);

            expect(config.shouldExport).toBe(true);
            expect(config.exportFormat).toBe("both");
            expect(config.exportPath).toBe("/legacy");
        });

        it("should let newer flag override when both specified", () => {
            // If both --save-json and --export=md are present,
            // last one wins (standard CLI behavior)
            const result1 = parseOutputArgs(["--save-json", "--export=md"]);
            expect(result1.export?.format).toBe("md");

            const result2 = parseOutputArgs(["--export=md", "--save-json"]);
            expect(result2.export?.format).toBe("json");
        });
    });

    describe("Edge Cases", () => {
        it("should handle --path without any save/export flag", () => {
            const legacyResult = parseOutputArgs(["--path=/standalone"]);
            const modernResult = parseOutputArgs(["--export-path=/standalone"]);

            assertParsedArgsEqual(
                legacyResult,
                modernResult,
                "--path standalone",
            );

            // Both should create implicit export with path
            expect(legacyResult.export).toEqual({
                format: "json",
                path: "/standalone",
            });
            expect(modernResult.export).toEqual({
                format: "json",
                path: "/standalone",
            });
        });

        it("should handle empty string values gracefully", () => {
            const result = parseOutputArgs(["--save=", "--path="]);

            // Empty format should fall back to default (json)
            expect(result.export?.format).toBe("json");
        });

        it("should handle mixed case in legacy --save=<format>", () => {
            const result1 = parseOutputArgs(["--save=JSON"]);
            const result2 = parseOutputArgs(["--save=Markdown"]);
            const result3 = parseOutputArgs(["--save=BOTH"]);

            expect(result1.export?.format).toBe("json");
            expect(result2.export?.format).toBe("md");
            expect(result3.export?.format).toBe("both");
        });

        it("should handle paths with spaces (quoted)", () => {
            // Note: Shell would handle quotes, we just test the parsed value
            const result = parseOutputArgs([
                "--save",
                "--path=/path with spaces",
            ]);

            expect(result.export?.path).toBe("/path with spaces");
        });

        it("should handle paths with equals signs", () => {
            const result = parseOutputArgs([
                "--save",
                "--path=/path=with=equals",
            ]);

            expect(result.export?.path).toBe("/path=with=equals");
        });

        it("should handle multiple format flags (last one wins)", () => {
            const result = parseOutputArgs([
                "--save-json",
                "--save-md",
                "--save-both",
            ]);

            expect(result.export?.format).toBe("both");
        });
    });

    describe("Equivalence Tests", () => {
        describe("Full pipeline equivalence", () => {
            const testCases: Array<{
                name: string;
                legacy: string[];
                modern: string[];
                expectedFormat?: ExportFormat;
                expectedPath?: string;
            }> = [
                {
                    name: "basic export",
                    legacy: ["--save"],
                    modern: ["--export"],
                    expectedFormat: "json",
                },
                {
                    name: "JSON export",
                    legacy: ["--save-json"],
                    modern: ["--export=json"],
                    expectedFormat: "json",
                },
                {
                    name: "Markdown export",
                    legacy: ["--save-md"],
                    modern: ["--export=md"],
                    expectedFormat: "md",
                },
                {
                    name: "both formats export",
                    legacy: ["--save-both"],
                    modern: ["--export=both"],
                    expectedFormat: "both",
                },
                {
                    name: "export with custom path",
                    legacy: ["--save", "--path=/custom"],
                    modern: ["--export", "--export-path=/custom"],
                    expectedFormat: "json",
                    expectedPath: "/custom",
                },
                {
                    name: "parametric format with path",
                    legacy: ["--save=md", "--path=/docs"],
                    modern: ["--export=md", "--export-path=/docs"],
                    expectedFormat: "md",
                    expectedPath: "/docs",
                },
            ];

            testCases.forEach(
                ({ name, legacy, modern, expectedFormat, expectedPath }) => {
                    it(`should be equivalent: ${name}`, () => {
                        // Step 1: Parse arguments
                        const legacyParsed = parseOutputArgs(legacy);
                        const modernParsed = parseOutputArgs(modern);

                        assertParsedArgsEqual(
                            legacyParsed,
                            modernParsed,
                            `${name} - parsed args`,
                        );

                        // Step 2: Convert to OutputConfig
                        const legacyConfig = toOutputConfig(legacyParsed);
                        const modernConfig = toOutputConfig(modernParsed);

                        assertOutputConfigEqual(
                            legacyConfig,
                            modernConfig,
                            `${name} - output config`,
                        );

                        // Step 3: Verify expected values
                        if (expectedFormat) {
                            expect(
                                legacyConfig.exportFormat,
                                `${name} - legacy format`,
                            ).toBe(expectedFormat);
                            expect(
                                modernConfig.exportFormat,
                                `${name} - modern format`,
                            ).toBe(expectedFormat);
                        }

                        if (expectedPath) {
                            expect(
                                legacyConfig.exportPath,
                                `${name} - legacy path`,
                            ).toBe(expectedPath);
                            expect(
                                modernConfig.exportPath,
                                `${name} - modern path`,
                            ).toBe(expectedPath);
                        }

                        // Step 4: Verify getRemainingArgs equivalence
                        const legacyRemaining = getRemainingArgs(legacyParsed);
                        const modernRemaining = getRemainingArgs(modernParsed);

                        expect(
                            legacyRemaining.sort(),
                            `${name} - remaining args`,
                        ).toEqual(modernRemaining.sort());
                    });
                },
            );
        });

        describe("Complex command scenarios", () => {
            it("should be equivalent in full command simulation", () => {
                const legacyArgs = [
                    "dataset123",
                    "--format=json",
                    "--save-both",
                    "--path=/exports",
                    "--limit=50",
                    "--quiet",
                ];

                const modernArgs = [
                    "dataset123",
                    "--format=json",
                    "--export=both",
                    "--export-path=/exports",
                    "--limit=50",
                    "--quiet",
                ];

                const legacyParsed = parseOutputArgs(legacyArgs);
                const modernParsed = parseOutputArgs(modernArgs);

                // Verify complete equivalence
                assertParsedArgsEqual(
                    legacyParsed,
                    modernParsed,
                    "complex command",
                );

                const legacyConfig = toOutputConfig(legacyParsed);
                const modernConfig = toOutputConfig(modernParsed);

                assertOutputConfigEqual(
                    legacyConfig,
                    modernConfig,
                    "complex command config",
                );

                // Verify all expected properties
                expect(legacyConfig).toEqual({
                    displayFormat: "json",
                    shouldExport: true,
                    exportFormat: "both",
                    exportPath: "/exports",
                    outputPath: undefined,
                    quiet: true,
                });

                expect(modernConfig).toEqual({
                    displayFormat: "json",
                    shouldExport: true,
                    exportFormat: "both",
                    exportPath: "/exports",
                    outputPath: undefined,
                    quiet: true,
                });
            });

            it("should preserve command-specific arguments with legacy flags", () => {
                const legacyArgs = [
                    "get-dataset",
                    "abc123",
                    "--save-json",
                    "--format=table",
                    "--fields=id,name",
                    "--path=/data",
                    "--verbose",
                ];

                const modernArgs = [
                    "get-dataset",
                    "abc123",
                    "--export=json",
                    "--format=table",
                    "--fields=id,name",
                    "--export-path=/data",
                    "--verbose",
                ];

                const legacyParsed = parseOutputArgs(legacyArgs);
                const modernParsed = parseOutputArgs(modernArgs);

                // Verify parsed arguments equivalence
                assertParsedArgsEqual(
                    legacyParsed,
                    modernParsed,
                    "command with args",
                );

                // Verify positional args preserved
                expect(legacyParsed.positional).toEqual([
                    "get-dataset",
                    "abc123",
                ]);

                // Verify command params preserved
                expect(legacyParsed.params.fields).toBe("id,name");
                expect(legacyParsed.params.verbose).toBe(true);

                // Verify output config
                const legacyConfig = toOutputConfig(legacyParsed);
                expect(legacyConfig.displayFormat).toBe("table");
                expect(legacyConfig.shouldExport).toBe(true);
                expect(legacyConfig.exportFormat).toBe("json");
                expect(legacyConfig.exportPath).toBe("/data");
            });
        });
    });

    describe("Backward Compatibility Guarantees", () => {
        it("should maintain stable behavior across all legacy aliases", () => {
            const allLegacyFlagCombos = [
                ["--save"],
                ["--save-json"],
                ["--save-md"],
                ["--save-markdown"],
                ["--save-both"],
                ["--save-all"],
                ["--save=json"],
                ["--save=md"],
                ["--save=markdown"],
                ["--save=both"],
                ["--save=all"],
                ["--save", "--path=/test"],
                ["--save-json", "--path=/test"],
                ["--path=/test"], // Standalone path
            ];

            allLegacyFlagCombos.forEach(flags => {
                // Each legacy flag combo should parse without error
                const result = parseOutputArgs(flags);
                const config = toOutputConfig(result);

                // Should enable export
                expect(
                    config.shouldExport,
                    `${flags.join(" ")} should export`,
                ).toBe(true);

                // Should have valid format
                expect(
                    config.exportFormat,
                    `${flags.join(" ")} should have format`,
                ).toMatch(/^(json|md|both)$/);

                // Should preserve path if specified
                if (flags.some(f => f.includes("/test"))) {
                    expect(
                        config.exportPath,
                        `${flags.join(" ")} should preserve path`,
                    ).toBe("/test");
                }
            });
        });

        it("should never break existing user scripts", () => {
            // Common real-world usage patterns that must continue working
            const realWorldPatterns = [
                {
                    name: "legacy JSON save",
                    args: ["list-datasets", "--save-json"],
                    expects: { format: "json", shouldExport: true },
                },
                {
                    name: "legacy markdown save",
                    args: ["get-dataset", "id123", "--save-md"],
                    expects: { format: "md", shouldExport: true },
                },
                {
                    name: "legacy custom path",
                    args: [
                        "query",
                        "SELECT * FROM table",
                        "--save",
                        "--path=/tmp/exports",
                    ],
                    expects: {
                        format: "json",
                        shouldExport: true,
                        path: "/tmp/exports",
                    },
                },
                {
                    name: "legacy both formats",
                    args: ["get-dataflow", "flow123", "--save-both"],
                    expects: { format: "both", shouldExport: true },
                },
            ];

            realWorldPatterns.forEach(({ name, args, expects }) => {
                const parsed = parseOutputArgs(args);
                const config = toOutputConfig(parsed);

                expect(config.exportFormat, `${name} - format`).toBe(
                    expects.format,
                );
                expect(config.shouldExport, `${name} - shouldExport`).toBe(
                    expects.shouldExport,
                );

                if (expects.path) {
                    expect(config.exportPath, `${name} - path`).toBe(
                        expects.path,
                    );
                }
            });
        });
    });
});
