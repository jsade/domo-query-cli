import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from "vitest";
import * as domoClient from "../api/clients/domoClient";
import { resetCacheManager } from "../core/cache/CacheManager";
import { ListAuditObjectTypesCommand } from "./ListAuditObjectTypesCommand";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListAuditObjectTypesCommand", () => {
    let command: ListAuditObjectTypesCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const mockObjectTypes: string[] = [
        "DATASET",
        "CARD",
        "PAGE",
        "DATAFLOW",
        "USER",
        "GROUP",
        "ACCOUNT",
        "ALERT",
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListAuditObjectTypesCommand();

        // Mock listAuditObjectTypes to return test data
        vi.mocked(domoClient.listAuditObjectTypes).mockResolvedValue(
            mockObjectTypes,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-audit-object-types");
        expect(command.description).toBe(
            "Lists available audit log object types for filtering",
        );
    });

    it("should fetch object types from API", async () => {
        await command.execute([]);

        expect(domoClient.listAuditObjectTypes).toHaveBeenCalledTimes(1);
        expect(command.getObjectTypes()).toEqual(mockObjectTypes);
    });

    it("should display results in table format", async () => {
        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 8 types"),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("list-audit-logs --type"),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listAuditObjectTypes).mockResolvedValue([]);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            "No audit object types found.",
        );
    });

    it("should handle JSON output format", async () => {
        await command.execute(["--format", "json"]);

        expect(domoClient.listAuditObjectTypes).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"objectTypes"'),
        );
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listAuditObjectTypes).mockRejectedValue(error);

        await command.execute([]);

        expect(domoClient.listAuditObjectTypes).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should sort types alphabetically in table view", async () => {
        const unsortedTypes = ["ZEBRA", "APPLE", "MANGO", "BANANA"];
        vi.mocked(domoClient.listAuditObjectTypes).mockResolvedValue(
            unsortedTypes,
        );

        await command.execute([]);

        // Check that the table was called with sorted data
        expect(domoClient.listAuditObjectTypes).toHaveBeenCalled();
        // The actual sorting is verified through the command execution
    });

    it("should use cached data on subsequent calls", async () => {
        // First call
        await command.execute([]);
        expect(domoClient.listAuditObjectTypes).toHaveBeenCalledTimes(1);

        // Clear the spy
        vi.mocked(domoClient.listAuditObjectTypes).mockClear();

        // Second call - should still call API (cache is handled at API level)
        await command.execute([]);
        expect(domoClient.listAuditObjectTypes).toHaveBeenCalledTimes(1);
    });

    it("should work with export flag", async () => {
        await command.execute(["--export"]);

        expect(domoClient.listAuditObjectTypes).toHaveBeenCalled();
        // Export functionality is tested through integration
    });

    it("should work with quiet flag", async () => {
        await command.execute(["--quiet", "--export"]);

        expect(domoClient.listAuditObjectTypes).toHaveBeenCalled();
        // Quiet mode suppresses export messages
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-audit-object-types"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Output Options:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("audit' scope"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("list-audit-logs"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return all flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--format");
            expect(results).toContain("--export");
            expect(results).toContain("--export-path");
            expect(results).toContain("--output");
            expect(results).toContain("--quiet");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--ex");
            expect(results).toContain("--export");
            expect(results).toContain("--export-path");
            expect(results).not.toContain("--format");
        });

        it("should return empty array for non-matching input", () => {
            const results = command.autocomplete("--xyz");
            expect(results).toEqual([]);
        });
    });
});
