import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type MockInstance,
} from "vitest";
import { UpdateRolePermissionsCommand } from "./UpdateRolePermissionsCommand";
import * as domoClient from "../api/clients/domoClient";
import * as readOnlyGuard from "../utils/readOnlyGuard";
import type { DomoRole } from "../api/clients/domoClient";

// Mock dependencies
vi.mock("../api/clients/domoClient");
vi.mock("../utils/readOnlyGuard");
vi.mock("../utils/logger");

describe("UpdateRolePermissionsCommand", () => {
    let command: UpdateRolePermissionsCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        command = new UpdateRolePermissionsCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        // Mock the read-only guard to allow operations by default
        vi.mocked(readOnlyGuard.checkReadOnlyMode).mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe("read-only mode", () => {
        it("should block in read-only mode", async () => {
            // Mock read-only mode throwing an error
            vi.mocked(readOnlyGuard.checkReadOnlyMode).mockImplementation(
                () => {
                    throw new readOnlyGuard.ReadOnlyError(
                        "update-role-permissions",
                    );
                },
            );

            // The command catches and handles the error internally (via outputErrorResult)
            // so it doesn't re-throw. We verify the error was handled and API was not called.
            await command.execute(["123", "--set", "VIEW_DATA", "--yes"]);

            expect(domoClient.updateRolePermissions).not.toHaveBeenCalled();
            // Verify error output was produced
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it("should allow operation when not in read-only mode", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [{ authority: "VIEW_DATA", name: "VIEW_DATA" }],
            };

            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);

            await command.execute(["123", "--set", "VIEW_DATA", "--yes"]);

            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                ["VIEW_DATA"],
            );
        });
    });

    describe("argument parsing", () => {
        it("should require role_id", async () => {
            await command.execute([]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No role ID provided"),
            );
            expect(domoClient.updateRolePermissions).not.toHaveBeenCalled();
        });

        it("should require at least one operation flag", async () => {
            await command.execute(["123"]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Must specify one of"),
            );
            expect(domoClient.updateRolePermissions).not.toHaveBeenCalled();
        });

        it("should reject multiple operation flags", async () => {
            await command.execute(["123", "--set", "AUTH1", "--add", "AUTH2"]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cannot use multiple operations"),
            );
            expect(domoClient.updateRolePermissions).not.toHaveBeenCalled();
        });
    });

    describe("--set operation", () => {
        it("should replace all permissions with provided list", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [
                    { authority: "VIEW_DATA", name: "VIEW_DATA" },
                    { authority: "EDIT_DATA", name: "EDIT_DATA" },
                    { authority: "ADMIN_DATA", name: "ADMIN_DATA" },
                ],
            };

            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);

            await command.execute([
                "123",
                "--set",
                "VIEW_DATA,EDIT_DATA,ADMIN_DATA",
                "--yes",
            ]);

            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                ["VIEW_DATA", "EDIT_DATA", "ADMIN_DATA"],
            );
        });

        it("should handle empty authority list", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };

            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);

            await command.execute(["123", "--set", "", "--yes"]);

            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                [],
            );
        });

        it("should trim whitespace from authorities", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [
                    { authority: "VIEW_DATA", name: "VIEW_DATA" },
                    { authority: "EDIT_DATA", name: "EDIT_DATA" },
                ],
            };

            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);

            await command.execute([
                "123",
                "--set",
                " VIEW_DATA , EDIT_DATA ",
                "--yes",
            ]);

            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                ["VIEW_DATA", "EDIT_DATA"],
            );
        });
    });

    describe("--add operation", () => {
        it("should add permissions to existing authorities", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [
                    { authority: "VIEW_DATA", name: "VIEW_DATA" },
                    { authority: "EDIT_DATA", name: "EDIT_DATA" },
                ],
            };

            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();

            await command.execute([
                "123",
                "--add",
                "ADMIN_DATA,DELETE_DATA",
                "--yes",
            ]);

            expect(domoClient.getRole).toHaveBeenCalledWith("123");
            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                expect.arrayContaining([
                    "VIEW_DATA",
                    "EDIT_DATA",
                    "ADMIN_DATA",
                    "DELETE_DATA",
                ]),
            );
        });

        it("should deduplicate authorities when adding", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [{ authority: "VIEW_DATA", name: "VIEW_DATA" }],
            };

            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();

            await command.execute([
                "123",
                "--add",
                "VIEW_DATA,EDIT_DATA",
                "--yes",
            ]);

            const callArgs = vi.mocked(domoClient.updateRolePermissions).mock
                .calls[0];
            expect(callArgs[1]).toEqual(
                expect.arrayContaining(["VIEW_DATA", "EDIT_DATA"]),
            );
            expect(callArgs[1]).toHaveLength(2); // Should not have duplicate VIEW_DATA
        });

        it("should fail if role not found", async () => {
            vi.mocked(domoClient.getRole).mockResolvedValue(
                null as unknown as DomoRole,
            );

            await command.execute(["999", "--add", "ADMIN_DATA", "--yes"]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Role 999 not found"),
            );
            expect(domoClient.updateRolePermissions).not.toHaveBeenCalled();
        });
    });

    describe("--remove operation", () => {
        it("should remove permissions from existing authorities", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [
                    { authority: "VIEW_DATA", name: "VIEW_DATA" },
                    { authority: "EDIT_DATA", name: "EDIT_DATA" },
                    { authority: "ADMIN_DATA", name: "ADMIN_DATA" },
                ],
            };

            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();

            await command.execute(["123", "--remove", "ADMIN_DATA", "--yes"]);

            expect(domoClient.getRole).toHaveBeenCalledWith("123");
            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                ["VIEW_DATA", "EDIT_DATA"],
            );
        });

        it("should handle removing non-existent authorities gracefully", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [{ authority: "VIEW_DATA", name: "VIEW_DATA" }],
            };

            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();

            await command.execute([
                "123",
                "--remove",
                "NONEXISTENT_AUTH",
                "--yes",
            ]);

            expect(domoClient.updateRolePermissions).toHaveBeenCalledWith(
                "123",
                ["VIEW_DATA"],
            );
        });
    });

    describe("help and autocomplete", () => {
        it("should display help text", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Updates the authorities/permissions"),
            );
        });

        it("should provide autocomplete suggestions", () => {
            const suggestions = command.autocomplete("--s");
            expect(suggestions).toContain("--set=");
        });

        it("should autocomplete with --add", () => {
            const suggestions = command.autocomplete("--a");
            expect(suggestions).toContain("--add=");
        });

        it("should autocomplete with --remove", () => {
            const suggestions = command.autocomplete("--r");
            expect(suggestions).toContain("--remove=");
        });
    });

    describe("output handling", () => {
        it("should output JSON when --format=json is specified", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [{ authority: "VIEW_DATA", name: "VIEW_DATA" }],
            };

            vi.mocked(domoClient.updateRolePermissions).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);

            await command.execute([
                "123",
                "--set",
                "VIEW_DATA",
                "--yes",
                "--format=json",
            ]);

            // JSON output is pretty-printed with spaces
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
        });
    });

    describe("error handling", () => {
        it("should handle API errors gracefully", async () => {
            vi.mocked(domoClient.updateRolePermissions).mockRejectedValue(
                new Error("API Error"),
            );

            await command.execute(["123", "--set", "VIEW_DATA", "--yes"]);

            // Error is output to console.error in non-JSON mode
            // The error message is passed as a separate argument: "Error details:", "API Error"
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error details:",
                "API Error",
            );
        });
    });
});
