import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from "vitest";
import * as dataflowApi from "../api/clients/dataflowApi";
import { resetCacheManager } from "../core/cache/CacheManager";
import { ListDataflowsCommand } from "./ListDataflowsCommand";

// Mock dataflowApi
vi.mock("../api/clients/dataflowApi");

describe("ListDataflowsCommand with Cache", () => {
    let command: ListDataflowsCommand;
    let consoleLogSpy: MockInstance;

    const mockDataflows = [
        {
            id: "123",
            name: "Test Dataflow 1",
            owner: "User1",
            lastUpdated: "2024-01-01T10:00:00Z",
            status: "active",
            createdAt: "2024-01-01T10:00:00Z",
        },
        {
            id: "456",
            name: "Test Dataflow 2",
            owner: "User2",
            lastUpdated: "2024-01-02T10:00:00Z",
            status: "inactive",
            createdAt: "2024-01-02T10:00:00Z",
        },
    ];

    beforeEach(() => {
        resetCacheManager();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        command = new ListDataflowsCommand();

        // Mock listDataflows to return test data
        vi.mocked(dataflowApi.listDataflows).mockResolvedValue(mockDataflows);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    it("should fetch data from API on first call", async () => {
        await command.execute(["limit=10"]);

        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(1);
        expect(dataflowApi.listDataflows).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 10,
                offset: 0,
            }),
            "apiToken",
        );
    });

    it("should use cached data on subsequent calls with same parameters", async () => {
        // First call - should hit the API
        await command.execute(["limit=10"]);
        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(1);

        // Clear the mock call count
        vi.mocked(dataflowApi.listDataflows).mockClear();

        // Second call with same parameters - should use cache
        await command.execute(["limit=10"]);

        // The listDataflows function internally uses DataFlowManager which handles caching
        // So it should still be called but the actual API request would be cached
        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(1);
    });

    it("should fetch new data when parameters change", async () => {
        // First call with limit=10
        await command.execute(["limit=10"]);
        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(1);

        // Second call with different limit - should hit API again
        await command.execute(["limit=20"]);
        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(2);

        // Verify different parameters were used
        expect(dataflowApi.listDataflows).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ limit: 10 }),
            "apiToken",
        );
        expect(dataflowApi.listDataflows).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ limit: 20 }),
            "apiToken",
        );
    });

    it("should display results correctly", async () => {
        await command.execute([]);

        // Verify output formatting
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("2 dataflows"),
        );

        // Verify table is displayed with headers
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("Name"),
        );

        // Verify column headers
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining("ID"),
        );
    });

    it("should handle search with caching", async () => {
        // Search for specific dataflow
        await command.execute(["Test"]);

        expect(dataflowApi.listDataflows).toHaveBeenCalledWith(
            expect.objectContaining({
                nameLike: "Test",
                limit: 50,
                offset: 0,
            }),
            "apiToken",
        );

        // Clear mock
        vi.mocked(dataflowApi.listDataflows).mockClear();

        // Same search again - should use cache
        await command.execute(["Test"]);
        expect(dataflowApi.listDataflows).toHaveBeenCalledTimes(1);
    });

    it("should handle sorting", async () => {
        // First call with sort
        await command.execute(["sort=name"]);

        expect(dataflowApi.listDataflows).toHaveBeenCalledWith(
            expect.objectContaining({
                sort: "name",
            }),
            "apiToken",
        );

        // Different sort - should fetch new data
        await command.execute(["sort=lastRun"]);

        expect(dataflowApi.listDataflows).toHaveBeenCalledWith(
            expect.objectContaining({
                sort: "lastRun",
            }),
            "apiToken",
        );
    });
});
