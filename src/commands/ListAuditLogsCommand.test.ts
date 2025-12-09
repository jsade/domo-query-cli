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
import { ListAuditLogsCommand } from "./ListAuditLogsCommand";
import type { AuditEntry } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListAuditLogsCommand", () => {
    let command: ListAuditLogsCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const mockAuditLogs: AuditEntry[] = [
        {
            userName: "John Doe",
            userId: 123,
            userType: "USER",
            actionType: "VIEWED",
            objectType: "DATASET",
            time: Date.now() - 3600000, // 1 hour ago
            eventText: "Viewed dataset 'Sales Data'",
        },
        {
            userName: "Jane Smith",
            userId: 456,
            userType: "USER",
            actionType: "UPDATED",
            objectType: "CARD",
            time: Date.now() - 7200000, // 2 hours ago
            eventText: "Updated card 'Revenue Dashboard'",
        },
        {
            userName: "Bob Admin",
            userId: 789,
            userType: "ADMIN",
            actionType: "CREATED",
            objectType: "DATASET",
            time: Date.now() - 10800000, // 3 hours ago
            eventText: "Created dataset 'Customer Data'",
            additionalComment: "Import from CSV",
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListAuditLogsCommand();

        // Mock listAuditLogs to return test data
        vi.mocked(domoClient.listAuditLogs).mockResolvedValue(mockAuditLogs);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-audit-logs");
        expect(command.description).toBe(
            "Lists audit log entries from Domo with time range filtering",
        );
    });

    it("should fetch audit logs with time range", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--limit",
            "50",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledTimes(1);
        const callArgs = vi.mocked(domoClient.listAuditLogs).mock.calls[0][0];

        expect(callArgs.start).toBeLessThan(callArgs.end);
        expect(callArgs.limit).toBe(50);
        expect(callArgs.offset).toBe(0);
    });

    it("should require start time parameter", async () => {
        await command.execute(["--end", "now"]);

        expect(domoClient.listAuditLogs).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Start time is required"),
        );
    });

    it("should require end time parameter", async () => {
        await command.execute(["--start", "24h ago"]);

        expect(domoClient.listAuditLogs).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("End time is required"),
        );
    });

    it("should validate that start is before end", async () => {
        await command.execute([
            "--start",
            "now",
            "--end",
            "24h ago", // End is before start
        ]);

        expect(domoClient.listAuditLogs).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Start time must be before end time"),
        );
    });

    it("should parse relative time expressions", async () => {
        await command.execute(["--start", "7d ago", "--end", "now"]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledTimes(1);
        const callArgs = vi.mocked(domoClient.listAuditLogs).mock.calls[0][0];

        // 7 days ago should be approximately 7 days before now
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const expectedStart = Date.now() - sevenDaysMs;

        expect(callArgs.start).toBeGreaterThan(expectedStart - 1000); // Allow 1s tolerance
        expect(callArgs.start).toBeLessThan(expectedStart + 1000);
    });

    it("should parse keyword time expressions", async () => {
        await command.execute(["--start", "yesterday", "--end", "today"]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledTimes(1);
        const callArgs = vi.mocked(domoClient.listAuditLogs).mock.calls[0][0];

        expect(callArgs.start).toBeLessThan(callArgs.end);
    });

    it("should filter by object type", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--type",
            "DATASET",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                objectType: "DATASET",
            }),
        );
    });

    it("should filter by user", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--user",
            "john",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                user: "john",
            }),
        );
    });

    it("should support limit and offset parameters", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--limit",
            "200",
            "--offset",
            "50",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 200,
                offset: 50,
            }),
        );
    });

    it("should cap limit at 1000 max", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--limit",
            "5000",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 1000, // Capped at 1000
            }),
        );
    });

    it("should display results in table format", async () => {
        await command.execute(["--start", "24h ago", "--end", "now"]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 entries"),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listAuditLogs).mockResolvedValue([]);

        await command.execute(["--start", "24h ago", "--end", "now"]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            "No audit logs found for the specified criteria.",
        );
    });

    it("should handle JSON output format", async () => {
        await command.execute([
            "--start",
            "24h ago",
            "--end",
            "now",
            "--format",
            "json",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"auditLogs"'),
        );
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listAuditLogs).mockRejectedValue(error);

        await command.execute(["--start", "24h ago", "--end", "now"]);

        expect(domoClient.listAuditLogs).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle invalid time expressions", async () => {
        await command.execute(["--start", "invalid-time", "--end", "now"]);

        expect(domoClient.listAuditLogs).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid time expression"),
        );
    });

    it("should combine multiple filters", async () => {
        await command.execute([
            "--start",
            "7d ago",
            "--end",
            "now",
            "--type",
            "DATASET",
            "--user",
            "john",
            "--limit",
            "500",
        ]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                objectType: "DATASET",
                user: "john",
                limit: 500,
            }),
        );
    });

    it("should use default limit of 100 if not specified", async () => {
        await command.execute(["--start", "24h ago", "--end", "now"]);

        expect(domoClient.listAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 100,
            }),
        );
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Usage: list-audit-logs --start <time> --end <time>",
                ),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--start"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--end"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Time Expression Formats:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return all flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--start");
            expect(results).toContain("--end");
            expect(results).toContain("--type");
            expect(results).toContain("--user");
            expect(results).toContain("--limit");
            expect(results).toContain("--offset");
            expect(results).toContain("--format");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--ty");
            expect(results).toContain("--type");
            expect(results).not.toContain("--start");
        });
    });
});
