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
import { ListAuthoritiesCommand } from "./ListAuthoritiesCommand";
import type { DomoAuthority } from "../api/clients/domoClient";

// Mock domoClient
vi.mock("../api/clients/domoClient");

describe("ListAuthoritiesCommand", () => {
    let command: ListAuthoritiesCommand;
    let consoleLogSpy: MockInstance;

    // Note: API returns `authority`, `title`, and `authorityUIGroup` as field names
    const mockAuthorities: DomoAuthority[] = [
        {
            authority: "manage_all_cards",
            title: "Manage All Cards",
            description: "Can create, edit, and delete any card",
            authorityUIGroup: "content",
        },
        {
            authority: "manage_all_dataflows",
            title: "Manage All Dataflows",
            description: "Can create, edit, and delete any dataflow",
            authorityUIGroup: "data",
        },
        {
            authority: "manage_all_users",
            title: "Manage All Users",
            description: "Can create, edit, and delete any user",
            authorityUIGroup: "admin",
        },
        {
            authority: "view_dashboards",
            title: "View Dashboards",
            description: "Can view dashboards",
            authorityUIGroup: "content",
        },
        {
            authority: "manage_datasets",
            title: "Manage Datasets",
            description: "Can manage datasets",
            authorityUIGroup: "data",
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        command = new ListAuthoritiesCommand();

        // Mock listAuthorities to return test data
        vi.mocked(domoClient.listAuthorities).mockResolvedValue(
            mockAuthorities,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should have correct name and description", () => {
        expect(command.name).toBe("list-authorities");
        expect(command.description).toBe(
            "Lists all available Domo authorities/permissions",
        );
    });

    it("should fetch authorities from API", async () => {
        await command.execute([]);

        expect(domoClient.listAuthorities).toHaveBeenCalledTimes(1);
        expect(command.getAuthorities()).toEqual(mockAuthorities);
    });

    it("should display results in table format", async () => {
        await command.execute([]);

        // Verify output formatting
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 5 authorities"),
        );
    });

    it("should filter authorities by search query (name)", async () => {
        await command.execute(["manage_all"]);

        // listAuthorities should be called to fetch all authorities
        expect(domoClient.listAuthorities).toHaveBeenCalled();

        // Should match 3 authorities with "manage_all" in name
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 3 authorities"),
        );

        const authorities = command.getAuthorities();
        expect(authorities).toHaveLength(3);
        expect(authorities.every(a => a.authority.includes("manage_all"))).toBe(
            true,
        );
    });

    it("should filter authorities by search query (display name)", async () => {
        await command.execute(["manage"]);

        expect(domoClient.listAuthorities).toHaveBeenCalled();

        // Should match authorities with "manage" in display name (title)
        const authorities = command.getAuthorities();
        expect(authorities.length).toBeGreaterThan(0);
        expect(
            authorities.some(a => a.title?.toLowerCase().includes("manage")),
        ).toBe(true);
    });

    it("should filter authorities by search query (description)", async () => {
        await command.execute(["create"]);

        expect(domoClient.listAuthorities).toHaveBeenCalled();

        // Should match authorities with "create" in description
        const authorities = command.getAuthorities();
        expect(authorities.length).toBeGreaterThan(0);
        expect(
            authorities.some(a =>
                a.description?.toLowerCase().includes("create"),
            ),
        ).toBe(true);
    });

    it("should filter authorities by category", async () => {
        await command.execute(["--category", "content"]);

        expect(domoClient.listAuthorities).toHaveBeenCalled();

        // Should filter to 2 "content" category authorities
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 2 authorities"),
        );

        const authorities = command.getAuthorities();
        expect(authorities).toHaveLength(2);
        expect(authorities.every(a => a.authorityUIGroup === "content")).toBe(
            true,
        );
    });

    it("should filter by category case-insensitively", async () => {
        await command.execute(["--category", "CONTENT"]);

        const authorities = command.getAuthorities();
        expect(authorities).toHaveLength(2);
        expect(authorities.every(a => a.authorityUIGroup === "content")).toBe(
            true,
        );
    });

    it("should handle search with category filter", async () => {
        await command.execute(["manage", "--category", "data"]);

        expect(domoClient.listAuthorities).toHaveBeenCalled();

        // Should find authorities with "manage" in data category
        const authorities = command.getAuthorities();
        expect(authorities.length).toBeGreaterThan(0);
        expect(authorities.every(a => a.authorityUIGroup === "data")).toBe(
            true,
        );
    });

    it("should be case-insensitive when filtering by search", async () => {
        await command.execute(["MANAGE"]);

        const authorities = command.getAuthorities();
        expect(authorities.length).toBeGreaterThan(0);
    });

    it("should handle JSON output format", async () => {
        await command.execute(["--format", "json"]);

        // In JSON mode, should output JSON
        expect(domoClient.listAuthorities).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('"authorities"'),
        );
    });

    it("should handle empty results", async () => {
        vi.mocked(domoClient.listAuthorities).mockResolvedValue([]);

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No authorities found.");
    });

    it("should handle API errors gracefully", async () => {
        const error = new Error("API Error");
        vi.mocked(domoClient.listAuthorities).mockRejectedValue(error);

        await command.execute([]);

        // Should handle error without crashing
        expect(domoClient.listAuthorities).toHaveBeenCalled();
    });

    it("should handle search query with no matches", async () => {
        await command.execute(["nonexistent"]);

        expect(domoClient.listAuthorities).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith("No authorities found.");
    });

    it("should handle authorities without optional fields", async () => {
        const minimalAuthorities: DomoAuthority[] = [
            {
                authority: "basic_permission",
            },
        ];
        vi.mocked(domoClient.listAuthorities).mockResolvedValue(
            minimalAuthorities,
        );

        await command.execute([]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Total: 1 authority"),
        );
    });

    it("should handle category filter with no matches", async () => {
        await command.execute(["--category", "nonexistent"]);

        expect(consoleLogSpy).toHaveBeenCalledWith("No authorities found.");
    });

    describe("showHelp", () => {
        it("should display comprehensive help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage: list-authorities"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("search_term"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--category"),
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
            expect(results).toContain("--category");
            expect(results).toContain("--export");
            expect(results).toContain("--save");
        });

        it("should filter flags based on partial input", () => {
            const results = command.autocomplete("--cat");
            expect(results).toContain("--category");
            expect(results).not.toContain("--format");
        });
    });
});
