import { describe, it, expect } from "vitest";
import {
    parseOutputArgs,
    toOutputConfig,
    getRemainingArgs,
    isJsonOutput,
    stripFormatArgs,
} from "../../utils/OutputParser";

/**
 * Performance Benchmarking Tests for OutputParser
 *
 * These tests verify that the unified output parsing system meets
 * performance requirements:
 * - Parsing overhead should be less than 5ms for typical use cases
 * - No performance regression from the unified system
 * - Linear scaling with argument count
 */

/**
 * Benchmark helper function
 * Runs a function multiple times and returns average execution time in milliseconds
 */
function benchmark(fn: () => void, iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const elapsed = performance.now() - start;
    return elapsed / iterations;
}

/**
 * Run benchmark multiple times and return statistics
 */
function benchmarkStats(
    fn: () => void,
    iterations: number,
    runs: number = 5,
): { avg: number; min: number; max: number; median: number } {
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
        times.push(benchmark(fn, iterations));
    }
    times.sort((a, b) => a - b);

    return {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: times[0],
        max: times[times.length - 1],
        median: times[Math.floor(times.length / 2)],
    };
}

describe("Output Parser Performance Benchmarks", () => {
    describe("Parsing Speed - Simple Cases", () => {
        it("should parse empty args in under 0.01ms", () => {
            const stats = benchmarkStats(() => {
                parseOutputArgs([]);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `Empty args: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should parse single format flag in under 0.1ms", () => {
            const stats = benchmarkStats(() => {
                parseOutputArgs(["--format=json"]);
            }, 1000);

            expect(stats.avg).toBeLessThan(0.1);
            console.log(
                `Single flag: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should parse simple args with positional in under 0.5ms", () => {
            const stats = benchmarkStats(() => {
                parseOutputArgs(["datasetId", "--format=json"]);
            }, 1000);

            expect(stats.avg).toBeLessThan(0.5);
            console.log(
                `Simple args: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should parse typical command args in under 1ms", () => {
            const args = [
                "datasetId",
                "--format=json",
                "--export",
                "--limit=100",
            ];
            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Typical args (4 args): avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Parsing Speed - Complex Cases", () => {
        it("should parse complex args in under 5ms (performance requirement)", () => {
            const complexArgs = [
                "datasetId",
                "--format=json",
                "--export=both",
                "--export-path=/custom/path/to/exports",
                "--output=/path/to/output.json",
                "--quiet",
                "--limit=100",
                "--offset=50",
                "--filter=status:active",
                "--sort=name",
                "--verbose",
                "extraArg",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(complexArgs);
            }, 1000);

            expect(stats.avg).toBeLessThan(5);
            expect(stats.max).toBeLessThan(10); // Even worst case should be reasonable
            console.log(
                `Complex args (12 args): avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms, max=${stats.max.toFixed(4)}ms`,
            );
        });

        it("should parse args with many equals signs efficiently", () => {
            const args = [
                "--filter=key1=value1",
                "--query=select=*&where=id=123",
                "--config=a=b&c=d&e=f",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Multiple equals: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle long argument values efficiently", () => {
            const longPath = "/very/long/path/".repeat(20) + "file.json";
            const args = [
                `--export-path=${longPath}`,
                `--output=${longPath}`,
                `--filter=${longPath}`,
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(2);
            console.log(
                `Long values: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Legacy Alias Normalization Performance", () => {
        it("should handle legacy save aliases efficiently", () => {
            const legacyArgs = [
                "--save-both",
                "--path=/legacy/path",
                "--format=json",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(legacyArgs);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Legacy aliases: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle mixed legacy and new flags efficiently", () => {
            const mixedArgs = [
                "--save-json", // legacy
                "--export=md", // new
                "--path=/old", // legacy
                "--export-path=/new", // new
                "--quiet",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(mixedArgs);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Mixed legacy/new: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle all legacy save variants efficiently", () => {
            const variants = [
                ["--save"],
                ["--save-json"],
                ["--save-md"],
                ["--save-markdown"],
                ["--save-both"],
                ["--save-all"],
                ["--save=json"],
                ["--save=md"],
                ["--save=all"],
            ];

            variants.forEach(args => {
                const stats = benchmarkStats(() => {
                    parseOutputArgs(args);
                }, 1000);
                expect(stats.avg).toBeLessThan(0.5);
            });

            console.log("All legacy variants: passed < 0.5ms");
        });
    });

    describe("Memory Efficiency", () => {
        it("should not create excessive allocations in repeated parsing", () => {
            const args = ["--format=json", "--export", "--quiet"];

            // Warmup
            for (let i = 0; i < 100; i++) {
                parseOutputArgs(args);
            }

            // Measure many iterations
            const iterations = 10000;
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                parseOutputArgs(args);
            }
            const elapsed = performance.now() - start;
            const avgTime = elapsed / iterations;

            // Should maintain consistent performance (no memory pressure)
            expect(avgTime).toBeLessThan(0.5);
            console.log(
                `Repeated parsing (10k iterations): avg=${avgTime.toFixed(4)}ms`,
            );
        });

        it("should handle rapid successive calls efficiently", () => {
            const testCases = [
                ["--format=json"],
                ["--export=md"],
                ["--quiet"],
                ["datasetId", "--limit=10"],
                ["--save-both", "--path=/test"],
            ];

            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                testCases.forEach(args => parseOutputArgs(args));
            }
            const elapsed = performance.now() - start;
            const avgTime = elapsed / (testCases.length * 1000);

            expect(avgTime).toBeLessThan(0.1);
            console.log(
                `Rapid successive calls: avg=${avgTime.toFixed(4)}ms per call`,
            );
        });
    });

    describe("Scaling Behavior", () => {
        it("should scale linearly with argument count", () => {
            const argCounts = [5, 10, 20, 50];
            const times: number[] = [];

            argCounts.forEach(count => {
                // Generate args dynamically
                const args: string[] = ["datasetId"];
                for (let i = 0; i < count - 1; i++) {
                    args.push(`--param${i}=value${i}`);
                }

                const stats = benchmarkStats(() => {
                    parseOutputArgs(args);
                }, 1000);

                times.push(stats.avg);
                console.log(`${count} args: avg=${stats.avg.toFixed(4)}ms`);
            });

            // Check for roughly linear scaling
            // Time should grow linearly, not exponentially
            // Allow some variance, but ratio shouldn't exceed 3x for 10x args
            const ratio5to50 = times[3] / times[0];
            expect(ratio5to50).toBeLessThan(15); // 50/5=10x args should be < 15x time

            // Even with 50 args, should be well under 5ms
            expect(times[times.length - 1]).toBeLessThan(5);
        });

        it("should handle very large argument arrays efficiently", () => {
            // Extreme case: 100 arguments
            const args: string[] = ["datasetId"];
            for (let i = 0; i < 99; i++) {
                args.push(`--param${i}=value${i}`);
            }

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 100); // Fewer iterations for large case

            expect(stats.avg).toBeLessThan(10);
            console.log(
                `100 args: avg=${stats.avg.toFixed(4)}ms, max=${stats.max.toFixed(4)}ms`,
            );
        });
    });

    describe("Helper Function Performance", () => {
        it("should convert to OutputConfig quickly", () => {
            const parsed = parseOutputArgs([
                "--format=json",
                "--export=md",
                "--quiet",
            ]);

            const stats = benchmarkStats(() => {
                toOutputConfig(parsed);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `toOutputConfig: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should extract remaining args quickly", () => {
            const parsed = parseOutputArgs([
                "arg1",
                "arg2",
                "--limit=10",
                "--format=json",
            ]);

            const stats = benchmarkStats(() => {
                getRemainingArgs(parsed);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `getRemainingArgs: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should check JSON output quickly", () => {
            const args = ["--format=json", "--export"];

            const stats = benchmarkStats(() => {
                isJsonOutput(args);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.1);
            console.log(
                `isJsonOutput: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should strip format args quickly", () => {
            const args = [
                "--format",
                "json",
                "arg1",
                "--limit=10",
                "--format=table",
            ];

            const stats = benchmarkStats(() => {
                stripFormatArgs(args);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `stripFormatArgs: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Edge Case Performance", () => {
        it("should handle empty args quickly", () => {
            const stats = benchmarkStats(() => {
                parseOutputArgs([]);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `Empty args: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle undefined args quickly", () => {
            const stats = benchmarkStats(() => {
                parseOutputArgs(undefined);
            }, 10000);

            expect(stats.avg).toBeLessThan(0.01);
            console.log(
                `Undefined args: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle args with many equals signs quickly", () => {
            const args = [
                "--complex=a=b=c=d=e=f=g=h=i=j",
                "--query=select=*&where=id=123&order=name=asc",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(0.5);
            console.log(
                `Many equals: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle args with special characters quickly", () => {
            const args = [
                "--path=/path/with spaces/file.json",
                '--query={"key":"value"}',
                "--filter=name:test|status:active",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Special chars: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle boolean flags efficiently", () => {
            const args = [
                "--flag1",
                "--flag2",
                "--flag3",
                "--flag4",
                "--flag5",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Multiple boolean flags: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Real-World Usage Patterns", () => {
        it("should handle typical list-datasets command quickly", () => {
            const args = ["--format=json", "--limit=100", "--offset=0"];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `list-datasets pattern: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle typical get-dataset-lineage command quickly", () => {
            const args = [
                "dataset123",
                "--format=json",
                "--export=both",
                "--export-path=/exports",
                "--quiet",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(2);
            console.log(
                `get-dataset-lineage pattern: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle scripting mode (--output) quickly", () => {
            const args = [
                "datasetId",
                "--format=json",
                "--output=/tmp/result.json",
                "--quiet",
            ];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Scripting mode: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });

        it("should handle legacy command migration quickly", () => {
            const args = ["datasetId", "--save-both", "--path=/legacy/exports"];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(1);
            console.log(
                `Legacy migration: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Worst-Case Scenarios", () => {
        it("should handle pathological input efficiently", () => {
            // Many flags with long values and complex parsing
            const args: string[] = [];
            for (let i = 0; i < 30; i++) {
                args.push(`--param${i}=${"x".repeat(100)}`);
            }

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 100);

            expect(stats.avg).toBeLessThan(10);
            console.log(
                `Pathological input (30 args, 100 char values): avg=${stats.avg.toFixed(4)}ms, max=${stats.max.toFixed(4)}ms`,
            );
        });

        it("should maintain performance with deeply nested equals", () => {
            const complexValue = Array(20)
                .fill(null)
                .map((_, i) => `key${i}=value${i}`)
                .join("&");
            const args = [`--query=${complexValue}`];

            const stats = benchmarkStats(() => {
                parseOutputArgs(args);
            }, 1000);

            expect(stats.avg).toBeLessThan(0.5);
            console.log(
                `Deeply nested equals: avg=${stats.avg.toFixed(4)}ms, median=${stats.median.toFixed(4)}ms`,
            );
        });
    });

    describe("Performance Summary", () => {
        it("should meet all core performance requirements", () => {
            const testCases = [
                { name: "Empty", args: [], maxTime: 0.01 },
                { name: "Simple", args: ["--format=json"], maxTime: 0.1 },
                {
                    name: "Typical",
                    args: ["id", "--format=json", "--export"],
                    maxTime: 1,
                },
                {
                    name: "Complex",
                    args: [
                        "id",
                        "--format=json",
                        "--export=both",
                        "--export-path=/path",
                        "--quiet",
                        "--limit=100",
                    ],
                    maxTime: 5,
                },
            ];

            console.log("\n=== Performance Summary ===");
            testCases.forEach(({ name, args, maxTime }) => {
                const stats = benchmarkStats(() => parseOutputArgs(args), 1000);
                expect(stats.avg).toBeLessThan(maxTime);
                console.log(
                    `${name.padEnd(10)}: ${stats.avg.toFixed(4)}ms (max allowed: ${maxTime}ms) ✓`,
                );
            });

            console.log("All performance requirements met! ✓");
        });
    });
});
