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
import { ListRoleMembersCommand } from "./ListRoleMembersCommand";
import type { DomoRoleMember } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListRoleMembersCommand", () => {
    let command: ListRoleMembersCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const mockRoleMembers: DomoRoleMember[] = [
        {
            id: 123,
            name: "John Doe",
            email: "john@example.com",
        },
        {
            id: 456,
            name: "Jane Smith",
            email: "jane@example.com",
        },
        {
            id: 789,
            name: "Bob Admin",
            email: "bob@example.com",
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListRoleMembersCommand();

        // Mock listRoleMembers to return test data
        vi.mocked(domoClient.listRoleMembers).mockResolvedValue(
            mockRoleMembers,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-role-members");
        expect(command.description).toBe(
            "Lists users who have a specific role",
        );
    });

    it("should fetch role members from API", async () => {
        await command.execute(["123"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledTimes(1);
        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");
    });

    it("should display results in table format", async () => {
        await command.execute(["123"]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 members"),
        );
    });

    it("should filter members by search query", async () => {
        await command.execute(["123", "john"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");

        // Output should indicate filtering happened
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("1 member"),
        );
    });

    it("should filter members by email", async () => {
        await command.execute(["123", "jane@example"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");

        // Should filter to Jane Smith
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("1 member"),
        );
    });

    it("should handle JSON output format", async () => {
        await command.execute(["123", "--format", "json"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"roleMembers"'),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listRoleMembers).mockResolvedValue([]);

        await command.execute(["123"]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No role members found.");
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listRoleMembers).mockRejectedValue(error);

        await command.execute(["123"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle search query with no matches", async () => {
        await command.execute(["123", "nonexistent"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("123");
        expect(consoleLogSpy).toHaveBeenCalledWith("No role members found.");
    });

    it("should require role ID", async () => {
        await command.execute([]);

        expect(domoClient.listRoleMembers).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Role ID is required"),
        );
    });

    it("should handle numeric role IDs", async () => {
        await command.execute(["456"]);

        expect(domoClient.listRoleMembers).toHaveBeenCalledWith("456");
    });

    it("should include metadata in output", async () => {
        await command.execute(["123"]);

        const members = command.getRoleMembers();
        expect(members).toHaveLength(3);
        expect(members[0].id).toBe(123);
        expect(members[0].name).toBe("John Doe");
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-role-members"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("role_id"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("search_term"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--format");
            expect(results).toContain("--export");
            expect(results).toContain("--output");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--ex");
            expect(results).toContain("--export");
            expect(results).toContain("--export-path");
            expect(results).not.toContain("--format");
        });
    });
});
