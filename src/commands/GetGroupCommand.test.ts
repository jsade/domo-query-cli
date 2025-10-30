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
import type { DomoGroup } from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import * as CommandUtils from "./CommandUtils";
import * as database from "../core/database/JsonDatabase";
import { GetGroupCommand } from "./GetGroupCommand";

// Mock dependencies
vi.mock("../api/clients/domoClient", () => ({
    getGroup: vi.fn(),
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

describe("GetGroupCommand", () => {
    let command: GetGroupCommand;
    let consoleLogSpy: MockInstance;
    const mockedGetGroup = domoClient.getGroup as Mock;
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
        command = new GetGroupCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.clearAllMocks();

        // Mock database to return mock database with proper signature
        mockedGetDatabase.mockResolvedValue(
            mockDatabase as unknown as database.JsonDatabase,
        );
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("get-group");
        expect(command.description).toBe(
            "Gets detailed information about a specific group",
        );
    });

    describe("execute", () => {
        const mockGroup: DomoGroup = {
            groupId: 1324037627,
            name: "Engineering Team",
            groupType: "open",
            memberCount: 5,
            created: "2024-01-15T10:00:00Z",
            groupMembers: [
                {
                    id: 123,
                    name: "John Doe",
                    displayName: "John D.",
                    email: "john@example.com",
                },
                {
                    id: 456,
                    name: "Jane Smith",
                    displayName: "Jane S.",
                    email: "jane@example.com",
                },
            ],
        };

        it("should display group details when group ID is provided", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockResolvedValue(mockGroup);

            await command.execute(["1324037627"]);

            expect(mockedGetGroup).toHaveBeenCalledWith("1324037627");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Group: Engineering Team"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Type: open"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Member Count: 5"),
            );
        });

        it("should handle missing group ID", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: [],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });

            await command.execute([]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Error: Group ID is required",
            );
            expect(mockedGetGroup).not.toHaveBeenCalled();
        });

        it("should display group members when available", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockResolvedValue(mockGroup);

            await command.execute(["1324037627"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Group Members (2)"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("John D."),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Jane S."),
            );
        });

        it("should handle missing optional fields gracefully", async () => {
            const minimalGroup: DomoGroup = {
                groupId: 1324037627,
                name: "Minimal Group",
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockResolvedValue(minimalGroup);

            await command.execute(["1324037627"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Group: Minimal Group"),
            );
            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Created:"),
            );
        });

        it("should export data when save options are provided", async () => {
            const saveOptions = { format: "json" as const, path: null };
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: saveOptions,
            });
            mockedGetGroup.mockResolvedValue(mockGroup);

            await command.execute(["1324037627", "--save-json"]);

            expect(mockedExportData).toHaveBeenCalledWith(
                [mockGroup],
                "Group",
                "group_1324037627",
                saveOptions,
                false,
            );
        });

        it("should handle group not found", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["999999999"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockRejectedValue(
                new Error("Group 999999999 not found"),
            );

            await command.execute(["999999999"]);

            expect(logger.log.error).toHaveBeenCalled();
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockRejectedValue(error);

            await command.execute(["1324037627"]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error fetching group:",
                error,
            );
        });

        it("should handle offline mode with cached data", async () => {
            const cachedGroup: DomoGroup = {
                groupId: 1324037627,
                name: "Cached Group",
                groupType: "user",
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(["offline"]),
                saveOptions: null,
            });
            mockDatabase.get.mockResolvedValue({
                ...cachedGroup,
                id: "1324037627",
            });

            await command.execute(["1324037627", "--offline"]);

            // Should not call API in offline mode if data exists in cache
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cached Group"),
            );
        });

        it("should force sync with --sync flag", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(["sync"]),
                saveOptions: null,
            });
            mockedGetGroup.mockResolvedValue(mockGroup);

            await command.execute(["1324037627", "--sync"]);

            // Should call API even if data might be cached
            expect(mockedGetGroup).toHaveBeenCalledWith("1324037627");
        });

        it("should output JSON format when requested", async () => {
            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
                format: "json",
            });
            mockDatabase.get.mockResolvedValue(null);
            mockedGetGroup.mockResolvedValue(mockGroup);

            await command.execute(["1324037627", "--format", "json"]);

            expect(mockedGetGroup).toHaveBeenCalledWith("1324037627");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"group"'),
            );
        });

        it("should handle group with no members", async () => {
            const groupNoMembers: DomoGroup = {
                ...mockGroup,
                groupMembers: [],
                memberCount: 0,
            };

            mockedParseCommandArgs.mockReturnValue({
                positional: ["1324037627"],
                params: {},
                flags: new Set(),
                saveOptions: null,
            });
            mockedGetGroup.mockResolvedValue(groupNoMembers);

            await command.execute(["1324037627"]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("No members in this group"),
            );
        });
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: get-group"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("group_id"),
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
