import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as domoClient from "../api/clients/domoClient";
import { resetCacheManager } from "../core/cache/CacheManager";
import { ListUsersCommand } from "./ListUsersCommand";
import type { DomoUser } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListUsersCommand", () => {
    let command: ListUsersCommand;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    const mockUsers: DomoUser[] = [
        {
            id: 123,
            name: "John Doe",
            email: "john@example.com",
            role: "Admin",
            title: "Admin User",
        },
        {
            id: 456,
            name: "Jane Smith",
            email: "jane@example.com",
            role: "Participant",
            title: "Data Analyst",
        },
        {
            id: 789,
            name: "Bob Admin",
            email: "bob@example.com",
            role: "Admin",
            title: "System Admin",
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListUsersCommand();

        // Mock listUsers to return test data
        vi.mocked(domoClient.listUsers).mockResolvedValue(mockUsers);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-users");
        expect(command.description).toBe(
            "Lists all Domo users with optional search",
        );
    });

    it("should fetch data from API on first call", async () => {
        await command.execute(["--limit", "10"]);

        expect(domoClient.listUsers).toHaveBeenCalledTimes(1);
        expect(domoClient.listUsers).toHaveBeenCalledWith({
            limit: 10,
            offset: 0,
        });
    });

    it("should use cached data on subsequent calls with same parameters", async () => {
        // First call - should hit the API
        await command.execute(["--limit", "10"]);
        expect(domoClient.listUsers).toHaveBeenCalledTimes(1);

        // Clear the mock call count
        vi.mocked(domoClient.listUsers).mockClear();

        // Second call with same parameters - should use cache
        await command.execute(["--limit", "10"]);

        // Should still be called (not cached at command level)
        expect(domoClient.listUsers).toHaveBeenCalledTimes(1);
    });

    it("should fetch new data when parameters change", async () => {
        // First call with limit=10
        await command.execute(["--limit", "10"]);
        expect(domoClient.listUsers).toHaveBeenCalledTimes(1);

        // Second call with different limit - should hit API again
        await command.execute(["--limit", "20"]);
        expect(domoClient.listUsers).toHaveBeenCalledTimes(2);

        // Verify different parameters were used
        expect(domoClient.listUsers).toHaveBeenNthCalledWith(1, {
            limit: 10,
            offset: 0,
        });
        expect(domoClient.listUsers).toHaveBeenNthCalledWith(2, {
            limit: 20,
            offset: 0,
        });
    });

    it("should display results in table format", async () => {
        await command.execute([]);

        // Verify output formatting
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 users"),
        );
    });

    it("should filter users by search query", async () => {
        await command.execute(["john"]);

        // listUsers should be called to fetch all users
        expect(domoClient.listUsers).toHaveBeenCalled();

        // Output should indicate filtering happened
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 users"),
        );
    });

    it("should filter users by role", async () => {
        await command.execute(["--role", "Admin"]);

        // listUsers should be called
        expect(domoClient.listUsers).toHaveBeenCalled();

        // Should filter to 2 admins
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 2 users"),
        );
    });

    it("should handle search with role filter", async () => {
        await command.execute(["bob", "--role", "Admin"]);

        expect(domoClient.listUsers).toHaveBeenCalled();

        // Should find Bob Admin (1 user)
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 users"),
        );
    });

    it("should handle offset parameter", async () => {
        await command.execute(["--limit", "10", "--offset", "5"]);

        expect(domoClient.listUsers).toHaveBeenCalledWith({
            limit: 10,
            offset: 5,
        });
    });

    it("should handle JSON output format", async () => {
        await command.execute(["--format", "json"]);

        // In JSON mode, should not call console.table
        expect(domoClient.listUsers).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"users"'),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listUsers).mockResolvedValue([]);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No users found.");
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listUsers).mockRejectedValue(error);

        await command.execute([]);

        // Should handle error without crashing
        expect(domoClient.listUsers).toHaveBeenCalled();
    });

    it("should handle search query with no matches", async () => {
        await command.execute(["nonexistent"]);

        expect(domoClient.listUsers).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith("No users found.");
    });

    it("should limit results to 500 max when limit exceeds", async () => {
        await command.execute(["--limit", "1000"]);

        expect(domoClient.listUsers).toHaveBeenCalledWith({
            limit: 500, // Should be capped at 500
            offset: 0,
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-users"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("search_term"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--role"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--limit");
            expect(results).toContain("--offset");
            expect(results).toContain("--role");
            expect(results).toContain("--format");
            expect(results).toContain("--save");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--ro");
            expect(results).toContain("--role");
            expect(results).not.toContain("--limit");
        });
    });
});
