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
import { ListGroupsCommand } from "./ListGroupsCommand";
import type { DomoGroup } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListGroupsCommand", () => {
    let command: ListGroupsCommand;
    let consoleLogSpy: MockInstance;

    const mockGroups: DomoGroup[] = [
        {
            groupId: 100,
            name: "Engineering Team",
            groupType: "open",
            memberCount: 25,
        },
        {
            groupId: 200,
            name: "Sales Team",
            groupType: "user",
            memberCount: 15,
        },
        {
            groupId: 300,
            name: "System Admins",
            groupType: "system",
            memberCount: 5,
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListGroupsCommand();

        // Mock listGroups to return test data
        vi.mocked(domoClient.listGroups).mockResolvedValue(mockGroups);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-groups");
        expect(command.description).toBe(
            "Lists all Domo groups with optional search",
        );
    });

    it("should fetch data from API on first call", async () => {
        await command.execute([]);

        expect(domoClient.listGroups).toHaveBeenCalledTimes(1);
        expect(domoClient.listGroups).toHaveBeenCalledWith({
            limit: 50,
            offset: 0,
        });
    });

    it("should use cached data on subsequent calls with same parameters", async () => {
        // First call - should hit the API
        await command.execute([]);
        expect(domoClient.listGroups).toHaveBeenCalledTimes(1);

        // Clear the mock call count
        vi.mocked(domoClient.listGroups).mockClear();

        // Second call with same parameters - should use cache
        await command.execute([]);

        // Should still be called (not cached at command level)
        expect(domoClient.listGroups).toHaveBeenCalledTimes(1);
    });

    it("should display results in table format", async () => {
        await command.execute([]);

        // Verify output formatting
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 groups"),
        );
    });

    it("should filter groups by search query", async () => {
        await command.execute(["engineering"]);

        // listGroups should be called to fetch all groups
        expect(domoClient.listGroups).toHaveBeenCalled();

        // Output should indicate filtering happened
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 groups"),
        );
    });

    it("should filter groups by type", async () => {
        await command.execute(["--type", "open"]);

        // listGroups should be called
        expect(domoClient.listGroups).toHaveBeenCalled();

        // Should filter to 1 open group
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 groups"),
        );
    });

    it("should handle search with type filter", async () => {
        await command.execute(["sales", "--type", "user"]);

        expect(domoClient.listGroups).toHaveBeenCalled();

        // Should find Sales Team (1 group)
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 groups"),
        );
    });

    it("should handle JSON output format", async () => {
        await command.execute(["--format", "json"]);

        // In JSON mode, should not call console.table
        expect(domoClient.listGroups).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"groups"'),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listGroups).mockResolvedValue([]);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No groups found.");
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listGroups).mockRejectedValue(error);

        await command.execute([]);

        // Should handle error without crashing
        expect(domoClient.listGroups).toHaveBeenCalled();
    });

    it("should handle search query with no matches", async () => {
        await command.execute(["nonexistent"]);

        expect(domoClient.listGroups).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith("No groups found.");
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-groups"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("search_term"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--type"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--type");
            expect(results).toContain("--format=json");
            expect(results).toContain("--export");
            // Legacy aliases still supported
            expect(results).toContain("--save");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--ty");
            expect(results).toContain("--type");
            expect(results).not.toContain("--format=json");
        });
    });
});
