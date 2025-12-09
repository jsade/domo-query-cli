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
import { CreateRoleCommand } from "./CreateRoleCommand";
import type { DomoRole } from "../api/clients/domoClient";
import * as readOnlyGuard from "../utils/readOnlyGuard";
import * as CommandUtils from "./CommandUtils";

// Mock dependencies
vi.mock("../api/clients/domoClient");
vi.mock("../utils/readOnlyGuard");
vi.mock("./CommandUtils");

describe("CreateRoleCommand", () => {
    let command: CreateRoleCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    const mockRole: DomoRole = {
        id: 123,
        name: "Test Role",
        description: "A test role",
        isDefault: false,
        userCount: 0,
    };

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new CreateRoleCommand();

        // Mock createRole to return test data
        vi.mocked(domoClient.createRole).mockResolvedValue(mockRole);

        // Mock read-only check to pass by default
        vi.mocked(readOnlyGuard.checkReadOnlyMode).mockImplementation(() => {});

        // Mock confirmation to automatically confirm
        vi.mocked(
            CommandUtils.CommandUtils.promptConfirmation,
        ).mockResolvedValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("create-role");
        expect(command.description).toBe(
            "Creates a new Domo role (Admin required)",
        );
    });

    it("should check read-only mode before creating", async () => {
        await command.execute(["TestRole", "--yes"]);

        expect(readOnlyGuard.checkReadOnlyMode).toHaveBeenCalledWith(
            "create-role",
        );
    });

    it("should throw error when read-only mode is active", async () => {
        vi.mocked(readOnlyGuard.checkReadOnlyMode).mockImplementation(() => {
            throw new readOnlyGuard.ReadOnlyError("create-role");
        });

        await command.execute(["TestRole", "--yes"]);

        expect(domoClient.createRole).not.toHaveBeenCalled();
    });

    it("should create role with name only", async () => {
        await command.execute(["TestRole", "--yes"]);

        expect(domoClient.createRole).toHaveBeenCalledTimes(1);
        expect(domoClient.createRole).toHaveBeenCalledWith(
            "TestRole",
            undefined,
        );
    });

    it("should create role with name and description", async () => {
        await command.execute([
            "TestRole",
            "--description",
            "Test description",
            "--yes",
        ]);

        expect(domoClient.createRole).toHaveBeenCalledWith(
            "TestRole",
            "Test description",
        );
    });

    it("should require role name", async () => {
        await command.execute(["--yes"]);

        expect(domoClient.createRole).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Role name is required"),
        );
    });

    it("should reject empty role name", async () => {
        await command.execute(["", "--yes"]);

        expect(domoClient.createRole).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Role name is required"),
        );
    });

    it("should prompt for confirmation when --yes is not provided", async () => {
        vi.mocked(
            CommandUtils.CommandUtils.promptConfirmation,
        ).mockResolvedValue(true);

        await command.execute(["TestRole"]);

        expect(CommandUtils.CommandUtils.promptConfirmation).toHaveBeenCalled();
        expect(domoClient.createRole).toHaveBeenCalled();
    });

    it("should cancel operation when user declines confirmation", async () => {
        vi.mocked(
            CommandUtils.CommandUtils.promptConfirmation,
        ).mockResolvedValue(false);

        await command.execute(["TestRole"]);

        expect(CommandUtils.CommandUtils.promptConfirmation).toHaveBeenCalled();
        expect(domoClient.createRole).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith("Operation cancelled.");
    });

    it("should skip confirmation with --yes flag", async () => {
        await command.execute(["TestRole", "--yes"]);

        expect(
            CommandUtils.CommandUtils.promptConfirmation,
        ).not.toHaveBeenCalled();
        expect(domoClient.createRole).toHaveBeenCalled();
    });

    it("should skip confirmation in JSON mode", async () => {
        await command.execute(["TestRole", "--format", "json"]);

        expect(
            CommandUtils.CommandUtils.promptConfirmation,
        ).not.toHaveBeenCalled();
        expect(domoClient.createRole).toHaveBeenCalled();
    });

    it("should display success message after creation", async () => {
        await command.execute(["TestRole", "--yes"]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Role created successfully"),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Test Role"),
        );
    });

    it("should output JSON format when requested", async () => {
        await command.execute(["TestRole", "--format", "json"]);

        expect(domoClient.createRole).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"role"'),
        );
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error: Insufficient permissions");
        vi.mocked(domoClient.createRole).mockRejectedValue(error);

        await command.execute(["TestRole", "--yes"]);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Failed to create role"),
        );
        // Error details are in a separate call
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error details:",
            "API Error: Insufficient permissions",
        );
    });

    it("should handle null role response", async () => {
        vi.mocked(domoClient.createRole).mockResolvedValue(
            null as unknown as DomoRole,
        );

        await command.execute(["TestRole", "--yes"]);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Failed to create role"),
        );
    });

    it("should handle role names with spaces", async () => {
        await command.execute(["Data Analyst Role", "--yes"]);

        expect(domoClient.createRole).toHaveBeenCalledWith(
            "Data Analyst Role",
            undefined,
        );
    });

    it("should include metadata in output", async () => {
        await command.execute(["TestRole", "--yes"]);

        expect(domoClient.createRole).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("123"), // Role ID
        );
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: create-role"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--description"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--yes"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Admin privileges"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--description");
            expect(results).toContain("--yes");
            expect(results).toContain("--format");
            expect(results).toContain("--export");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--d");
            expect(results).toContain("--description");
            expect(results).not.toContain("--yes");
            expect(results).not.toContain("--format");
        });
    });
});
