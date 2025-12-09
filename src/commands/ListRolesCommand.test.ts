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
import { ListRolesCommand } from "./ListRolesCommand";
import type { DomoRole } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListRolesCommand", () => {
    let command: ListRolesCommand;
    let consoleLogSpy: MockInstance;

    const mockRoles: DomoRole[] = [
        {
            id: 1,
            name: "Admin",
            description: "Administrator role with full permissions",
            isDefault: false,
            userCount: 5,
        },
        {
            id: 2,
            name: "Privileged",
            description: "Privileged user role",
            isDefault: false,
            userCount: 25,
        },
        {
            id: 3,
            name: "Participant",
            description: "Standard participant role",
            isDefault: true,
            userCount: 100,
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListRolesCommand();

        // Mock listRoles to return test data
        vi.mocked(domoClient.listRoles).mockResolvedValue(mockRoles);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-roles");
        expect(command.description).toBe(
            "Lists all Domo roles with optional search",
        );
    });

    it("should fetch roles from API", async () => {
        await command.execute([]);

        expect(domoClient.listRoles).toHaveBeenCalledTimes(1);
        expect(command.getRoles()).toEqual(mockRoles);
    });

    it("should display results in table format", async () => {
        await command.execute([]);

        // Verify output formatting
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 roles"),
        );
    });

    it("should filter roles by search query (name)", async () => {
        await command.execute(["admin"]);

        // listRoles should be called to fetch all roles
        expect(domoClient.listRoles).toHaveBeenCalled();

        // Output should indicate filtering happened - only 1 role matches "admin"
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 role"),
        );

        // Verify the filtered result
        const roles = command.getRoles();
        expect(roles).toHaveLength(1);
        expect(roles[0].name).toBe("Admin");
    });

    it("should filter roles by search query (description)", async () => {
        await command.execute(["standard"]);

        expect(domoClient.listRoles).toHaveBeenCalled();

        // Should find "Participant" role with "Standard participant role" description
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 role"),
        );

        const roles = command.getRoles();
        expect(roles).toHaveLength(1);
        expect(roles[0].name).toBe("Participant");
    });

    it("should be case-insensitive when filtering", async () => {
        await command.execute(["ADMIN"]);

        const roles = command.getRoles();
        expect(roles).toHaveLength(1);
        expect(roles[0].name).toBe("Admin");
    });

    it("should handle JSON output format", async () => {
        await command.execute(["--format", "json"]);

        // In JSON mode, should output JSON
        expect(domoClient.listRoles).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"roles"'),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listRoles).mockResolvedValue([]);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No roles found.");
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listRoles).mockRejectedValue(error);

        await command.execute([]);

        // Should handle error without crashing
        expect(domoClient.listRoles).toHaveBeenCalled();
    });

    it("should handle search query with no matches", async () => {
        await command.execute(["nonexistent"]);

        expect(domoClient.listRoles).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith("No roles found.");
    });

    it("should handle roles without descriptions", async () => {
        const rolesWithoutDesc: DomoRole[] = [
            {
                id: 1,
                name: "Test Role",
                userCount: 5,
            },
        ];
        vi.mocked(domoClient.listRoles).mockResolvedValue(rolesWithoutDesc);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 role"),
        );
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-roles"),
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
            expect(results).toContain("--save");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--for");
            expect(results).toContain("--format");
            expect(results).not.toContain("--export");
        });
    });
});
