import { describe, it, expect } from "vitest";
import { JsonOutputFormatter } from "../../utils/JsonOutputFormatter";

/**
 * MCP Compatibility Integration Tests
 *
 * These tests verify that JSON output from the CLI is compatible with
 * Model Context Protocol (MCP) requirements. MCP clients consume this
 * JSON output, so it must be:
 * - Valid, parseable JSON
 * - Consistently structured
 * - Type-safe (booleans are booleans, not strings)
 * - Complete with required fields
 * - Properly sanitized (no stack traces, sensitive data)
 */

describe("MCP Compatibility Tests", () => {
    describe("JSON Structure Validation", () => {
        it("should produce valid JSON that can be parsed", () => {
            const output = JsonOutputFormatter.success("test-command", {
                foo: "bar",
            });

            // Should not throw
            const parsed = JSON.parse(output);
            expect(parsed).toBeDefined();
        });

        it("should have required success field as boolean", () => {
            const successOutput = JsonOutputFormatter.success("test-command", {
                data: "value",
            });
            const errorOutput = JsonOutputFormatter.error(
                "test-command",
                "Error message",
            );

            const parsedSuccess = JSON.parse(successOutput);
            const parsedError = JSON.parse(errorOutput);

            // Must be boolean, not string "true"/"false"
            expect(parsedSuccess.success).toBe(true);
            expect(typeof parsedSuccess.success).toBe("boolean");

            expect(parsedError.success).toBe(false);
            expect(typeof parsedError.success).toBe("boolean");
        });

        it("should have required command field as string", () => {
            const output = JsonOutputFormatter.success("list-datasets", {
                data: [],
            });
            const parsed = JSON.parse(output);

            expect(parsed.command).toBeDefined();
            expect(typeof parsed.command).toBe("string");
            expect(parsed.command).toBe("list-datasets");
        });

        it("should have data field on success", () => {
            const testData = { datasets: [], count: 0 };
            const output = JsonOutputFormatter.success(
                "list-datasets",
                testData,
            );
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(parsed.data).toBeDefined();
            expect(parsed.data).toEqual(testData);
        });

        it("should have error field on failure", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                "Something went wrong",
                "ERROR_CODE",
                { detail: "More info" },
            );
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(false);
            expect(parsed.error).toBeDefined();
            expect(parsed.error.message).toBe("Something went wrong");
            expect(parsed.error.code).toBe("ERROR_CODE");
            expect(parsed.error.details).toEqual({ detail: "More info" });
        });

        it("should not have data field on error", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                "Error message",
            );
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(false);
            expect(parsed.data).toBeUndefined();
            expect(parsed.error).toBeDefined();
        });

        it("should have metadata with timestamp", () => {
            const output = JsonOutputFormatter.success("test-command", {
                value: 123,
            });
            const parsed = JSON.parse(output);

            expect(parsed.metadata).toBeDefined();
            expect(parsed.metadata.timestamp).toBeDefined();

            // Should be valid ISO 8601 timestamp
            const timestamp = new Date(parsed.metadata.timestamp);
            expect(timestamp.toISOString()).toBe(parsed.metadata.timestamp);
        });

        it("should include additional metadata fields", () => {
            const output = JsonOutputFormatter.success(
                "test-command",
                { items: [] },
                {
                    count: 5,
                    pagination: {
                        offset: 0,
                        limit: 10,
                        hasMore: false,
                    },
                },
            );
            const parsed = JSON.parse(output);

            expect(parsed.metadata.count).toBe(5);
            expect(parsed.metadata.pagination).toEqual({
                offset: 0,
                limit: 10,
                hasMore: false,
            });
            expect(parsed.metadata.timestamp).toBeDefined();
        });
    });

    describe("Data Type Consistency", () => {
        it("should serialize dates as ISO strings", () => {
            const testDate = new Date("2024-01-15T10:30:00.000Z");
            const output = JsonOutputFormatter.success("test-command", {
                createdDate: testDate,
                modifiedDate: testDate.toISOString(),
            });
            const parsed = JSON.parse(output);

            // Date objects should be serialized to ISO strings
            expect(typeof parsed.data.createdDate).toBe("string");
            expect(parsed.data.createdDate).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            );

            // ISO strings should remain strings
            expect(typeof parsed.data.modifiedDate).toBe("string");
            expect(parsed.data.modifiedDate).toBe("2024-01-15T10:30:00.000Z");
        });

        it("should handle nested objects", () => {
            const complexData = {
                dataset: {
                    id: "abc123",
                    name: "Sales Data",
                    owner: {
                        id: 456,
                        name: "John Doe",
                        email: "john@example.com",
                    },
                    schema: {
                        columns: [
                            { name: "id", type: "STRING" },
                            { name: "amount", type: "DOUBLE" },
                        ],
                    },
                },
            };

            const output = JsonOutputFormatter.success(
                "get-dataset",
                complexData,
            );
            const parsed = JSON.parse(output);

            expect(parsed.data).toEqual(complexData);
            expect(parsed.data.dataset.owner.name).toBe("John Doe");
            expect(parsed.data.dataset.schema.columns).toHaveLength(2);
        });

        it("should handle arrays", () => {
            const arrayData = {
                datasets: [
                    { id: "1", name: "Dataset 1" },
                    { id: "2", name: "Dataset 2" },
                    { id: "3", name: "Dataset 3" },
                ],
                count: 3,
            };

            const output = JsonOutputFormatter.success(
                "list-datasets",
                arrayData,
            );
            const parsed = JSON.parse(output);

            expect(Array.isArray(parsed.data.datasets)).toBe(true);
            expect(parsed.data.datasets).toHaveLength(3);
            expect(parsed.data.count).toBe(3);
        });

        it("should handle null values", () => {
            const dataWithNull = {
                id: "123",
                name: "Test",
                description: null,
                owner: null,
                tags: [],
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                dataWithNull,
            );
            const parsed = JSON.parse(output);

            expect(parsed.data.description).toBeNull();
            expect(parsed.data.owner).toBeNull();
            expect(parsed.data.tags).toEqual([]);
        });

        it("should handle undefined values by omitting them", () => {
            const dataWithUndefined = {
                id: "123",
                name: "Test",
                description: undefined,
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                dataWithUndefined,
            );
            const parsed = JSON.parse(output);

            // undefined values are omitted from JSON
            expect(parsed.data.id).toBe("123");
            expect(parsed.data.name).toBe("Test");
            expect("description" in parsed.data).toBe(false);
        });

        it("should handle special characters in strings", () => {
            const dataWithSpecialChars = {
                name: 'Dataset with "quotes"',
                description: "Line 1\nLine 2\tTabbed",
                path: "C:\\Users\\data\\file.csv",
                unicode: "Hello 世界 🌍",
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                dataWithSpecialChars,
            );

            // Should not throw when parsing
            const parsed = JSON.parse(output);

            expect(parsed.data.name).toBe('Dataset with "quotes"');
            expect(parsed.data.description).toBe("Line 1\nLine 2\tTabbed");
            expect(parsed.data.path).toBe("C:\\Users\\data\\file.csv");
            expect(parsed.data.unicode).toBe("Hello 世界 🌍");
        });

        it("should handle numbers correctly", () => {
            const numbersData = {
                integer: 42,
                float: 3.14159,
                negative: -100,
                zero: 0,
                large: 9007199254740991, // Max safe integer
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                numbersData,
            );
            const parsed = JSON.parse(output);

            expect(parsed.data.integer).toBe(42);
            expect(parsed.data.float).toBe(3.14159);
            expect(parsed.data.negative).toBe(-100);
            expect(parsed.data.zero).toBe(0);
            expect(parsed.data.large).toBe(9007199254740991);
        });

        it("should handle boolean values", () => {
            const booleanData = {
                isActive: true,
                isDeleted: false,
                isPending: true,
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                booleanData,
            );
            const parsed = JSON.parse(output);

            expect(parsed.data.isActive).toBe(true);
            expect(typeof parsed.data.isActive).toBe("boolean");
            expect(parsed.data.isDeleted).toBe(false);
            expect(typeof parsed.data.isDeleted).toBe("boolean");
        });
    });

    describe("Error Response Format", () => {
        it("should have consistent error structure", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                "Operation failed",
            );
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(false);
            expect(parsed.command).toBe("test-command");
            expect(parsed.error).toBeDefined();
            expect(parsed.error.message).toBeDefined();
            expect(typeof parsed.error.message).toBe("string");
            expect(parsed.metadata).toBeDefined();
            expect(parsed.metadata.timestamp).toBeDefined();
        });

        it("should include error code when available", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                "Not found",
                "DATASET_NOT_FOUND",
            );
            const parsed = JSON.parse(output);

            expect(parsed.error.code).toBe("DATASET_NOT_FOUND");
        });

        it("should default to UNKNOWN_ERROR when code not provided", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                "Something went wrong",
            );
            const parsed = JSON.parse(output);

            expect(parsed.error.code).toBe("UNKNOWN_ERROR");
        });

        it("should include error details when provided", () => {
            const errorDetails = {
                datasetId: "abc123",
                attemptedOperation: "delete",
                reason: "insufficient permissions",
            };

            const output = JsonOutputFormatter.error(
                "delete-dataset",
                "Delete failed",
                "PERMISSION_DENIED",
                errorDetails,
            );
            const parsed = JSON.parse(output);

            expect(parsed.error.details).toEqual(errorDetails);
        });

        it("should sanitize error messages (no stack traces)", () => {
            // Simulate an error with a stack trace
            const error = new Error("Something went wrong");
            const errorMessage = error.message; // Should only use message, not stack

            const output = JsonOutputFormatter.error(
                "test-command",
                errorMessage,
            );
            const parsed = JSON.parse(output);

            // Should not contain stack trace patterns
            expect(parsed.error.message).not.toContain("at ");
            expect(parsed.error.message).not.toContain(".ts:");
            expect(parsed.error.message).not.toContain("Error:");
            expect(parsed.error.message).toBe("Something went wrong");
        });

        it("should handle error details with complex objects", () => {
            const complexDetails = {
                request: {
                    method: "POST",
                    url: "/api/datasets",
                    body: { name: "Test Dataset" },
                },
                response: {
                    status: 400,
                    statusText: "Bad Request",
                    errors: [{ field: "name", message: "Name already exists" }],
                },
            };

            const output = JsonOutputFormatter.error(
                "create-dataset",
                "Validation failed",
                "VALIDATION_ERROR",
                complexDetails,
            );
            const parsed = JSON.parse(output);

            expect(parsed.error.details).toEqual(complexDetails);
            expect(parsed.error.details.response.errors).toHaveLength(1);
        });
    });

    describe("Large Response Handling", () => {
        it("should handle large data arrays", () => {
            // Create array with 1000 items
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: `dataset-${i}`,
                name: `Dataset ${i}`,
                description: `This is dataset number ${i}`,
                rowCount: i * 1000,
                columnCount: 10 + (i % 50),
            }));

            const output = JsonOutputFormatter.success("list-datasets", {
                datasets: largeArray,
                count: largeArray.length,
            });

            // Should not throw
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(parsed.data.datasets).toHaveLength(1000);
            expect(parsed.data.count).toBe(1000);

            // Verify structure is maintained
            expect(parsed.data.datasets[0].id).toBe("dataset-0");
            expect(parsed.data.datasets[999].id).toBe("dataset-999");
        });

        it("should maintain structure with many fields", () => {
            // Create object with many fields
            const manyFields: Record<string, unknown> = {};
            for (let i = 0; i < 100; i++) {
                manyFields[`field${i}`] = `value${i}`;
            }

            const output = JsonOutputFormatter.success(
                "test-command",
                manyFields,
            );
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(Object.keys(parsed.data)).toHaveLength(100);
            expect(parsed.data.field0).toBe("value0");
            expect(parsed.data.field99).toBe("value99");
        });

        it("should handle deeply nested structures", () => {
            // Create deeply nested object
            let deeplyNested: Record<string, unknown> = {
                value: "deepest level",
            };
            for (let i = 0; i < 20; i++) {
                deeplyNested = { level: i, nested: deeplyNested };
            }

            const output = JsonOutputFormatter.success(
                "test-command",
                deeplyNested,
            );

            // Should not throw
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(parsed.data.level).toBe(19);
            expect(parsed.data.nested.level).toBe(18);
        });
    });

    describe("MCP Tool Response Compatibility", () => {
        it("should be suitable for MCP tool_result (success case)", () => {
            const output = JsonOutputFormatter.success(
                "list-datasets",
                {
                    datasets: [
                        { id: "1", name: "Dataset 1" },
                        { id: "2", name: "Dataset 2" },
                    ],
                    count: 2,
                },
                { count: 2 },
            );
            const parsed = JSON.parse(output);

            // MCP tool_result expects specific structure
            expect(parsed).toHaveProperty("success");
            expect(parsed).toHaveProperty("command");
            expect(parsed).toHaveProperty("data");
            expect(parsed).toHaveProperty("metadata");

            // Should be directly usable as tool response
            const mcpResponse = {
                content: [
                    {
                        type: "text",
                        text: output,
                    },
                ],
            };

            expect(mcpResponse.content[0].text).toBe(output);
            expect(() => JSON.parse(mcpResponse.content[0].text)).not.toThrow();
        });

        it("should be suitable for MCP tool_result (error case)", () => {
            const output = JsonOutputFormatter.error(
                "get-dataset",
                "Dataset not found",
                "NOT_FOUND",
                { datasetId: "abc123" },
            );
            const parsed = JSON.parse(output);

            // MCP can handle error responses
            expect(parsed).toHaveProperty("success");
            expect(parsed.success).toBe(false);
            expect(parsed).toHaveProperty("error");
            expect(parsed.error).toHaveProperty("message");
            expect(parsed.error).toHaveProperty("code");

            // Should be directly usable as tool error response
            const mcpResponse = {
                content: [
                    {
                        type: "text",
                        text: output,
                    },
                ],
                isError: true,
            };

            expect(mcpResponse.isError).toBe(true);
            expect(() => JSON.parse(mcpResponse.content[0].text)).not.toThrow();
        });

        it("should produce compact output when stringified without formatting", () => {
            const data = { id: "123", name: "Test" };

            // JsonOutputFormatter uses JSON.stringify with 2-space indent
            const formattedOutput = JsonOutputFormatter.success(
                "test-command",
                data,
            );
            expect(formattedOutput).toContain("\n");
            expect(formattedOutput).toContain("  "); // 2 spaces

            // When re-parsed and stringified by MCP, it remains valid
            const parsed = JSON.parse(formattedOutput);
            const compactOutput = JSON.stringify(parsed);
            const reparsed = JSON.parse(compactOutput);

            expect(reparsed.success).toBe(true);
            expect(reparsed.data).toEqual(data);
        });

        it("should maintain type safety across JSON serialization", () => {
            const typedData = {
                id: 123, // number
                name: "Test", // string
                active: true, // boolean
                tags: ["a", "b"], // array
                metadata: { key: "value" }, // object
                nullable: null, // null
            };

            const output = JsonOutputFormatter.success(
                "test-command",
                typedData,
            );
            const parsed = JSON.parse(output);

            // Verify types are preserved
            expect(typeof parsed.data.id).toBe("number");
            expect(typeof parsed.data.name).toBe("string");
            expect(typeof parsed.data.active).toBe("boolean");
            expect(Array.isArray(parsed.data.tags)).toBe(true);
            expect(typeof parsed.data.metadata).toBe("object");
            expect(parsed.data.nullable).toBeNull();
        });
    });

    describe("Edge Cases and Boundary Conditions", () => {
        it("should handle empty data object", () => {
            const output = JsonOutputFormatter.success("test-command", {});
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(parsed.data).toEqual({});
        });

        it("should handle empty array", () => {
            const output = JsonOutputFormatter.success("list-items", {
                items: [],
                count: 0,
            });
            const parsed = JSON.parse(output);

            expect(parsed.success).toBe(true);
            expect(parsed.data.items).toEqual([]);
            expect(parsed.data.count).toBe(0);
        });

        it("should handle string with only whitespace", () => {
            const output = JsonOutputFormatter.success("test-command", {
                value: "   \n\t   ",
            });
            const parsed = JSON.parse(output);

            expect(parsed.data.value).toBe("   \n\t   ");
        });

        it("should handle very long strings", () => {
            const longString = "x".repeat(10000);
            const output = JsonOutputFormatter.success("test-command", {
                longValue: longString,
            });
            const parsed = JSON.parse(output);

            expect(parsed.data.longValue).toHaveLength(10000);
            expect(parsed.data.longValue).toBe(longString);
        });

        it("should handle command names with special characters", () => {
            const output = JsonOutputFormatter.success("get-dataset-by-id", {
                id: "123",
            });
            const parsed = JSON.parse(output);

            expect(parsed.command).toBe("get-dataset-by-id");
        });

        it("should handle error messages with quotes", () => {
            const output = JsonOutputFormatter.error(
                "test-command",
                'Dataset "Sales 2024" not found',
            );
            const parsed = JSON.parse(output);

            expect(parsed.error.message).toBe('Dataset "Sales 2024" not found');
        });

        it("should handle metadata with custom fields", () => {
            const output = JsonOutputFormatter.success(
                "test-command",
                { value: 1 },
                {
                    customField: "custom value",
                    nestedCustom: { a: 1, b: 2 },
                    arrayCustom: [1, 2, 3],
                },
            );
            const parsed = JSON.parse(output);

            expect(parsed.metadata.customField).toBe("custom value");
            expect(parsed.metadata.nestedCustom).toEqual({ a: 1, b: 2 });
            expect(parsed.metadata.arrayCustom).toEqual([1, 2, 3]);
            expect(parsed.metadata.timestamp).toBeDefined();
        });
    });

    describe("Formatting Consistency", () => {
        it("should use consistent indentation (2 spaces)", () => {
            const output = JsonOutputFormatter.success("test-command", {
                nested: { value: 1 },
            });

            // Should have 2-space indentation
            expect(output).toContain('  "success"');
            expect(output).toContain('  "command"');
            expect(output).toContain('    "value"'); // Nested gets 4 spaces
        });

        it("should produce pretty-printed output", () => {
            const output = JsonOutputFormatter.success("test-command", {
                a: 1,
                b: 2,
            });

            // Should have newlines (pretty-printed)
            const lines = output.split("\n");
            expect(lines.length).toBeGreaterThan(1);
        });

        it("should produce consistent output for same input", () => {
            const data = { id: "123", name: "Test", count: 42 };
            const metadata = { count: 1, source: "cache" };

            const output1 = JsonOutputFormatter.success(
                "test-command",
                data,
                metadata,
            );
            const output2 = JsonOutputFormatter.success(
                "test-command",
                data,
                metadata,
            );

            // Parse and compare (timestamps will differ)
            const parsed1 = JSON.parse(output1);
            const parsed2 = JSON.parse(output2);

            delete parsed1.metadata.timestamp;
            delete parsed2.metadata.timestamp;

            expect(parsed1).toEqual(parsed2);
        });
    });
});
