import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
    type MockInstance,
} from "vitest";
import * as domoClient from "../api/clients/domoClient";
import type { DomoUser } from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import * as CommandUtils from "./CommandUtils";
import * as database from "../core/database/JsonDatabase";
import { GetUserCommand } from "./GetUserCommand";

// Mock dependencies
vi.mock("../api/clients/domoClient", () => ({
    getUser: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
    log: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("./CommandUtils", () => ({
    CommandUtils: {
        parseSaveOptions: vi.fn(),
        exportData: vi.fn(),
        parseCommandArgs: vi.fn(),
    },
}));

vi.mock("../core/database/JsonDatabase", () => ({
    getDatabase: vi.fn(),
}));

describe("GetUserCommand", () => {
    let command: GetUserCommand;
    let consoleLogSpy: MockInstance;
    const mockedGetUser = domoClient.getUser as Mock;
    const mockedExportData = CommandUtils.CommandUtils.exportData as Mock;
    const mockedParseCommandArgs = CommandUtils.CommandUtils
        .parseCommandArgs as Mock;
    const mockedGetDatabase = vi.mocked(database.getDatabase);

    const mockDatabase = {
        get: vi.fn(),
        set: vi.fn(),
        setMany: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
    };

    beforeEach(() => {
        command = new GetUserCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.clearAllMocks();

        // Mock database to return mock database with proper signature
        mockedGetDatabase.mockResolvedValue(
            mockDatabase as unknown as database.JsonDatabase,
        );
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-user");
        expect(command.description).toBe(
            "Gets detailed information about a specific user",
        );
    });

    describe("execute", () => {
        const mockUser: DomoUser = {
            id: 871428330,
            name: "John Doe",
            email: "john@example.com",
            role: "Admin",
            title: "System Administrator",
            phone: "+1234567890",
            location: "New York",
            groups: [
                {
                    groupId: 123,
                    name: "Admins",
                    groupType: "user",
                },
                {
                    groupId: 456,
                    name: "Engineering",
                    groupType: "open",
                },
            ],
        };

        it("should display user details when user ID is provided", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockResolvedValue(mockUser);

            await command.execute(["871428330"]);

            expect(mockedGetUser).toHaveBeenCalledWith("871428330");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("User: John Doe"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Email: john@example.com"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Role: Admin"),
            );
        });

        it("should handle missing user ID", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: [],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });

            await command.execute([]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Error: User ID is required",
            );
            expect(mockedGetUser).not.toHaveBeenCalled();
        });

        it("should display user groups when available", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockResolvedValue(mockUser);

            await command.execute(["871428330"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Groups (2)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Admins"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Engineering"),
            );
        });

        it("should handle missing optional fields gracefully", async () => {
            const minimalUser: DomoUser = {
                id: 871428330,
                name: "Minimal User",
                email: "minimal@example.com",
                role: "Participant",
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockResolvedValue(minimalUser);

            await command.execute(["871428330"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("User: Minimal User"),
            );
            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Title:"),
            );
            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Phone:"),
            );
        });

        it("should export data when save options are provided", async () => {
            const saveOptions = { format: "json" as const, path: null };
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: saveOptions,
            });
            mockedGetUser.mockResolvedValue(mockUser);

            await command.execute(["871428330", "--save-json"]);

            expect(mockedExportData).toHaveBeenCalledWith(
                [mockUser],
                "User",
                "user_871428330",
                saveOptions,
                false,
            );
        });

        it("should handle user not found", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["999999999"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockRejectedValue(
                new Error("User 999999999 not found"),
            );

            await command.execute(["999999999"]);

            expect(logger.log.error).toHaveBeenCalled();
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockRejectedValue(error);

            await command.execute(["871428330"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching user:",
                error,
            );
        });

        it("should handle offline mode with cached data", async () => {
            const cachedUser: DomoUser = {
                id: 871428330,
                name: "Cached User",
                email: "cached@example.com",
                role: "Admin",
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(["offline"]),
                saveOptions: null,
            });
            mockDatabase.get.mockResolvedValue({
                ...cachedUser,
                id: "871428330",
            });

            await command.execute(["871428330", "--offline"]);

            // Should not call API in offline mode if data exists in cache
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cached User"),
            );
        });

        it("should force sync with --sync flag", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(["sync"]),
                saveOptions: null,
            });
            mockedGetUser.mockResolvedValue(mockUser);

            await command.execute(["871428330", "--sync"]);

            // Should call API even if data might be cached
            expect(mockedGetUser).toHaveBeenCalledWith("871428330");
        });

        it("should output JSON format when requested", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
                format: "json",
            });
            mockDatabase.get.mockResolvedValue(null);
            mockedGetUser.mockResolvedValue(mockUser);

            await command.execute(["871428330", "--format", "json"]);

            expect(mockedGetUser).toHaveBeenCalledWith("871428330");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"user"'),
            );
        });

        it("should handle user with no groups", async () => {
            const userNoGroups: DomoUser = {
                ...mockUser,
                groups: [],
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["871428330"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetUser.mockResolvedValue(userNoGroups);

            await command.execute(["871428330"]);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Groups"),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: get-user"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("user_id"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--sync"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--offline"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });

    describe("autocomplete", () => {
        it("should return matching flags", () => {
            const results = command.autocomplete("--");
            expect(results).toContain("--sync");
            expect(results).toContain("--offline");
            expect(results).toContain("--format");
            expect(results).toContain("--save");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--sy");
            expect(results).toContain("--sync");
            expect(results).not.toContain("--offline");
        });
    });
});
