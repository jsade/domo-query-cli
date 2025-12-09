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
import { GetRoleCommand } from "./GetRoleCommand";
import type { DomoRole } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("GetRoleCommand", () => {
    let command: GetRoleCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const mockRole: DomoRole = {
        id: 1,
        name: "Admin",
        description: "Administrator role with full permissions",
        isDefault: false,
        memberCount: 5,
        authorities: [
            {
                name: "manage_all_cards",
                displayName: "Manage All Cards",
                description: "Can create, edit, and delete any card",
                category: "content",
            },
            {
                name: "manage_all_dataflows",
                displayName: "Manage All Dataflows",
                description: "Can create, edit, and delete any dataflow",
                category: "data",
            },
            {
                name: "manage_all_users",
                displayName: "Manage All Users",
                description: "Can create, edit, and delete any user",
                category: "admin",
            },
        ],
    };

    const mockRoleNoAuthorities: DomoRole = {
        id: 2,
        name: "Basic User",
        description: "Basic user with limited permissions",
        isDefault: true,
        memberCount: 100,
    };

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new GetRoleCommand();

        // Mock getRole to return test data
        vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-role");
        expect(command.description).toBe(
            "Gets details for a specific Domo role",
        );
    });

    it("should fetch role from API with valid ID", async () => {
        await command.execute(["123"]);

        expect(domoClient.getRole).toHaveBeenCalledTimes(1);
        expect(domoClient.getRole).toHaveBeenCalledWith("123");
        expect(command.getRole()).toEqual(mockRole);
    });

    it("should display role details in formatted output", async () => {
        await command.execute(["123"]);

        // Verify basic information is displayed
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Role Details"),
        );
    });

    it("should display authorities when present", async () => {
        await command.execute(["123"]);

        // Verify authorities section is displayed
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Authorities/Permissions"),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("3 permissions"),
        );
    });

    it("should handle role without authorities", async () => {
        vi.mocked(domoClient.getRole).mockResolvedValue(mockRoleNoAuthorities);

        await command.execute(["2"]);

        expect(domoClient.getRole).toHaveBeenCalledWith("2");
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("No authorities/permissions found"),
        );
    });

    it("should require role_id argument", async () => {
        await command.execute([]);

        // Should show error message
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("role_id is required"),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Usage: get-role <role_id>"),
        );

        // Should not call API
        expect(domoClient.getRole).not.toHaveBeenCalled();
    });

    it("should handle JSON output format", async () => {
        await command.execute(["123", "--format", "json"]);

        // In JSON mode, should output JSON
        expect(domoClient.getRole).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"role"'),
        );
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("Role not found");
        vi.mocked(domoClient.getRole).mockRejectedValue(error);

        await command.execute(["999"]);

        // Should handle error without crashing
        expect(domoClient.getRole).toHaveBeenCalledWith("999");
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Failed to fetch role"),
        );
    });

    it("should accept numeric role IDs", async () => {
        await command.execute(["456"]);

        expect(domoClient.getRole).toHaveBeenCalledWith("456");
    });

    it("should handle role with missing optional fields", async () => {
        const minimalRole: DomoRole = {
            id: 999,
            name: "Minimal Role",
        };
        vi.mocked(domoClient.getRole).mockResolvedValue(minimalRole);

        await command.execute(["999"]);

        expect(domoClient.getRole).toHaveBeenCalledWith("999");
        expect(command.getRole()).toEqual(minimalRole);
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: get-role <role_id>"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("role_id"),
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
