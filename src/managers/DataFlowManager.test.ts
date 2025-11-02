import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataflowClient } from "../api/clients/dataflowClient";
import { resetCacheManager } from "../core/cache/CacheManager";
import { DataFlowManager } from "./DataFlowManager";
import { SearchManager } from "./SearchManager";

// Mock dependencies
vi.mock("../api/clients/dataflowClient");
vi.mock("./SearchManager");

describe("DataFlowManager with Cache", () => {
    let dataFlowManager: DataFlowManager;
    let mockClient: DataflowClient;
    let mockSearchManager: SearchManager;

    const mockSearchResponse = {
        count: 2,
        offset: 0,
        limit: 10,
        entities: [
            {
                id: "123",
                name: "Test Dataflow 1",
                createdAt: "2024-01-01T10:00:00Z",
            },
            {
                id: "456",
                name: "Test Dataflow 2",
                createdAt: "2024-01-02T10:00:00Z",
            },
        ],
    };

    const mockDetailedDataflow = {
        id: "123",
        name: "Test Dataflow 1",
        description: "Test description",
        createdAt: "2024-01-01T10:00:00Z",
        modified: 1704099600000,
        inputs: [{ id: "input1", name: "Input Dataset", dataSourceId: "ds1" }],
        outputs: [
            { id: "output1", name: "Output Dataset", dataSourceId: "ds2" },
        ],
    };

    beforeEach(() => {
        resetCacheManager();

        // Create mock client
        mockClient = {
            ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(mockDetailedDataflow),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        } as unknown as DataflowClient;

        // Create mock search manager
        mockSearchManager = {
            searchDomo: vi.fn().mockResolvedValue(mockSearchResponse),
        } as unknown as SearchManager;

        // Mock constructors - vitest requires actual function/class syntax
        vi.mocked(DataflowClient).mockImplementation(function (
            this: DataflowClient,
        ) {
            return mockClient as DataflowClient;
        } as unknown as () => DataflowClient);
        vi.mocked(SearchManager).mockImplementation(function (
            this: SearchManager,
        ) {
            return mockSearchManager as SearchManager;
        } as unknown as () => SearchManager);

        dataFlowManager = new DataFlowManager(mockClient);
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetCacheManager();
    });

    describe("Search Caching", () => {
        it("should cache search results on first call", async () => {
            const result = await dataFlowManager.getDataflowsWithPagination(
                "test",
                10,
                0,
            );

            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockSearchResponse);
        });

        it("should use cached results on subsequent calls with same parameters", async () => {
            // First call
            await dataFlowManager.getDataflowsWithPagination("test", 10, 0);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(1);

            // Clear mock to ensure we're checking fresh
            vi.mocked(mockSearchManager.searchDomo).mockClear();

            // Second call with same parameters
            const result = await dataFlowManager.getDataflowsWithPagination(
                "test",
                10,
                0,
            );

            // Should not call search API again
            expect(mockSearchManager.searchDomo).not.toHaveBeenCalled();
            expect(result).toEqual(mockSearchResponse);
        });

        it("should fetch new data when parameters change", async () => {
            // First call
            await dataFlowManager.getDataflowsWithPagination("test", 10, 0);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(1);

            // Second call with different parameters
            await dataFlowManager.getDataflowsWithPagination("test", 20, 0);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(2);

            // Third call with another different parameter
            await dataFlowManager.getDataflowsWithPagination("test", 20, 10);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(3);
        });

        it("should cache results with different sort options separately", async () => {
            await dataFlowManager.getDataflowsWithPagination(
                "*",
                10,
                0,
                "name",
                "asc",
            );
            await dataFlowManager.getDataflowsWithPagination(
                "*",
                10,
                0,
                "name",
                "desc",
            );
            await dataFlowManager.getDataflowsWithPagination(
                "*",
                10,
                0,
                "lastUpdated",
                "asc",
            );

            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(3);

            // Calling again with same parameters should use cache
            vi.mocked(mockSearchManager.searchDomo).mockClear();

            await dataFlowManager.getDataflowsWithPagination(
                "*",
                10,
                0,
                "name",
                "asc",
            );
            expect(mockSearchManager.searchDomo).not.toHaveBeenCalled();
        });

        it("should handle nameDescending sort correctly", async () => {
            await dataFlowManager.getDataflowsWithPagination(
                "*",
                10,
                0,
                "nameDescending",
            );

            expect(mockSearchManager.searchDomo).toHaveBeenCalledWith(
                expect.objectContaining({
                    sort: {
                        field: "name",
                        direction: "desc",
                    },
                }),
            );
        });
    });

    describe("Individual Dataflow Caching", () => {
        it("should cache individual dataflow on first fetch", async () => {
            const result = await dataFlowManager.getDataflow("123");

            expect(mockClient.get).toHaveBeenCalledTimes(1);
            expect(mockClient.get).toHaveBeenCalledWith(
                "/api/dataprocessing/v2/dataflows/123",
            );
            expect(result.id).toBe("123");
        });

        it("should use cached dataflow on subsequent calls", async () => {
            // First call
            await dataFlowManager.getDataflow("123");
            expect(mockClient.get).toHaveBeenCalledTimes(1);

            // Clear mock
            vi.mocked(mockClient.get).mockClear();

            // Second call
            const result = await dataFlowManager.getDataflow("123");

            // Should not call API again
            expect(mockClient.get).not.toHaveBeenCalled();
            expect(result.id).toBe("123");
        });

        it("should fetch different dataflows separately", async () => {
            await dataFlowManager.getDataflow("123");
            await dataFlowManager.getDataflow("456");

            expect(mockClient.get).toHaveBeenCalledTimes(2);
            expect(mockClient.get).toHaveBeenNthCalledWith(
                1,
                "/api/dataprocessing/v2/dataflows/123",
            );
            expect(mockClient.get).toHaveBeenNthCalledWith(
                2,
                "/api/dataprocessing/v2/dataflows/456",
            );
        });
    });

    describe("Cache Invalidation", () => {
        it("should invalidate cache when dataflow is updated", async () => {
            // Fetch and cache
            await dataFlowManager.getDataflow("123");
            expect(mockClient.get).toHaveBeenCalledTimes(1);

            // Update dataflow - the update response will be cached
            const updatedDataflow = {
                ...mockDetailedDataflow,
                name: "Updated Name",
            };
            vi.mocked(mockClient.put).mockResolvedValueOnce(updatedDataflow);
            const updateResult = await dataFlowManager.updateDataflow("123", {
                name: "Updated Name",
            });

            // The updated dataflow should have the new name
            expect(updateResult.name).toBe("Updated Name");

            // Clear mocks
            vi.mocked(mockClient.get).mockClear();

            // Fetch again - should return the cached updated version without hitting API
            const cachedResult = await dataFlowManager.getDataflow("123");
            expect(mockClient.get).not.toHaveBeenCalled();
            expect(cachedResult.name).toBe("Updated Name");
        });

        it("should invalidate cache when dataflow is executed", async () => {
            // Fetch and cache
            await dataFlowManager.getDataflow("123");
            expect(mockClient.get).toHaveBeenCalledTimes(1);

            // Execute dataflow
            vi.mocked(mockClient.post).mockResolvedValueOnce({
                id: 1,
                beginTime: Date.now(),
            });
            await dataFlowManager.runDataFlow("123");

            // Clear mocks
            vi.mocked(mockClient.get).mockClear();

            // Fetch again - should hit API due to cache invalidation
            await dataFlowManager.getDataflow("123");
            expect(mockClient.get).toHaveBeenCalledTimes(1);
        });

        it("should invalidate search cache when dataflow is updated", async () => {
            // Search and cache results
            await dataFlowManager.getDataflowsWithPagination("*", 10, 0);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(1);

            // Update a dataflow
            vi.mocked(mockClient.put).mockResolvedValueOnce(
                mockDetailedDataflow,
            );
            await dataFlowManager.updateDataflow("123", { name: "Updated" });

            // Clear mock
            vi.mocked(mockSearchManager.searchDomo).mockClear();

            // Search again - should hit API due to cache invalidation
            await dataFlowManager.getDataflowsWithPagination("*", 10, 0);
            expect(mockSearchManager.searchDomo).toHaveBeenCalledTimes(1);
        });
    });

    // TODO: Implement request deduplication for parallel requests
    // This would prevent multiple simultaneous requests for the same resource
});
