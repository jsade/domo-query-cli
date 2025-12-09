import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type MockInstance,
} from "vitest";
import { AddUserToRoleCommand } from "./AddUserToRoleCommand";
import * as domoClient from "../api/clients/domoClient";
import * as readOnlyGuard from "../utils/readOnlyGuard";
import type { DomoRole, DomoUser } from "../api/clients/domoClient";

// Mock dependencies
vi.mock("../api/clients/domoClient");
vi.mock("../utils/readOnlyGuard");
vi.mock("../utils/logger");

describe("AddUserToRoleCommand", () => {
    let command: AddUserToRoleCommand;
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        command = new AddUserToRoleCommand();
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
                    throw new readOnlyGuard.ReadOnlyError("add-user-to-role");
                },
            );

            // The command catches and handles the error internally (via outputErrorResult)
            // so it doesn't re-throw. We verify the error was handled and API was not called.
            await command.execute(["123", "456", "--yes"]);

            expect(domoClient.addUserToRole).not.toHaveBeenCalled();
            // Verify error output was produced
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it("should allow operation when not in read-only mode", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
        });
    });

    describe("argument parsing", () => {
        it("should require role_id", async () => {
            await command.execute([]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No role ID provided"),
            );
            expect(domoClient.addUserToRole).not.toHaveBeenCalled();
        });

        it("should require user_id", async () => {
            await command.execute(["123"]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("No user ID provided"),
            );
            expect(domoClient.addUserToRole).not.toHaveBeenCalled();
        });

        it("should accept both role_id and user_id", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
        });
    });

    describe("user assignment", () => {
        it("should add user to role successfully", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
            expect(domoClient.getRole).toHaveBeenCalledWith("123");
            expect(domoClient.getUser).toHaveBeenCalledWith("456");
        });

        it("should work even if role/user details cannot be fetched", async () => {
            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockRejectedValue(
                new Error("Not found"),
            );
            vi.mocked(domoClient.getUser).mockRejectedValue(
                new Error("Not found"),
            );

            await command.execute(["123", "456", "--yes"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
        });

        it("should handle string user IDs", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 789,
                name: "String User",
                email: "string@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "789", "--yes"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "789");
        });
    });

    describe("help and autocomplete", () => {
        it("should display help text", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Adds a user to a role"),
            );
        });

        it("should provide autocomplete suggestions", () => {
            const suggestions = command.autocomplete("--y");
            expect(suggestions).toContain("--yes");
        });

        it("should autocomplete with --format", () => {
            const suggestions = command.autocomplete("--f");
            expect(suggestions).toContain("--format=json");
        });

        it("should autocomplete with --export", () => {
            const suggestions = command.autocomplete("--e");
            expect(suggestions).toContain("--export");
            expect(suggestions).toContain("--export=json");
            expect(suggestions).toContain("--export=md");
            expect(suggestions).toContain("--export=both");
        });
    });

    describe("output handling", () => {
        it("should output JSON when --format=json is specified", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes", "--format=json"]);

            // JSON output is pretty-printed with spaces
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"roleId": "123"'),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"userId": "456"'),
            );
        });

        it("should display table format by default", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("✓"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Test Role"),
            );
        });
    });

    describe("error handling", () => {
        it("should handle API errors gracefully", async () => {
            vi.mocked(domoClient.addUserToRole).mockRejectedValue(
                new Error("API Error"),
            );

            await command.execute(["123", "456", "--yes"]);

            // Error is output to console.error in non-JSON mode
            // The error message is passed as a separate argument: "Error details:", "API Error"
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error details:",
                "API Error",
            );
        });

        it("should handle non-Error exceptions", async () => {
            vi.mocked(domoClient.addUserToRole).mockRejectedValue(
                "String error",
            );

            await command.execute(["123", "456", "--yes"]);

            // Error is output to console.error in non-JSON mode
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to add user to role"),
            );
        });
    });

    describe("--yes flag", () => {
        it("should skip confirmation when --yes is provided", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--yes"]);

            // Should not fetch role/user for confirmation (only for output)
            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
        });

        it("should work in JSON mode without confirmation", async () => {
            const mockRole: DomoRole = {
                id: 123,
                name: "Test Role",
                authorities: [],
            };
            const mockUser: DomoUser = {
                id: 456,
                name: "Test User",
                email: "test@example.com",
                role: "Participant",
            };

            vi.mocked(domoClient.addUserToRole).mockResolvedValue();
            vi.mocked(domoClient.getRole).mockResolvedValue(mockRole);
            vi.mocked(domoClient.getUser).mockResolvedValue(mockUser);

            await command.execute(["123", "456", "--format=json"]);

            expect(domoClient.addUserToRole).toHaveBeenCalledWith("123", "456");
        });
    });
});
