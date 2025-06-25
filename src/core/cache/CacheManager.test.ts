import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    CacheManager,
    getCacheManager,
    resetCacheManager,
} from "./CacheManager";
import { promises as fs } from "fs";
import * as path from "path";

// Mock fs module
vi.mock("fs", () => ({
    promises: {
        mkdir: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockRejectedValue(new Error("File not found")),
        writeFile: vi.fn().mockResolvedValue(undefined),
        unlink: vi.fn().mockResolvedValue(undefined),
        readdir: vi.fn().mockResolvedValue([]),
    },
}));

describe("CacheManager", () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
        resetCacheManager();
        cacheManager = new CacheManager();
    });

    afterEach(() => {
        resetCacheManager();
        vi.clearAllMocks();
    });

    describe("Memory Cache Operations", () => {
        it("should store and retrieve data from cache", async () => {
            const testData = { id: "123", name: "Test Item" };
            const key = "test-key";

            await cacheManager.set(key, testData);
            const cached = await cacheManager.get<typeof testData>(key);

            expect(cached).toEqual(testData);
        });

        it("should return null for non-existent keys", async () => {
            const cached = await cacheManager.get("non-existent-key");
            expect(cached).toBeNull();
        });

        it("should respect TTL for cached items", async () => {
            const testData = { value: "test" };
            const key = "ttl-test";
            const ttl = 100; // 100ms

            await cacheManager.set(key, testData, ttl);

            // Should exist immediately
            let cached = await cacheManager.get(key);
            expect(cached).toEqual(testData);

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be expired now
            cached = await cacheManager.get(key);
            expect(cached).toBeNull();
        });

        it("should invalidate specific cache entries", async () => {
            const key = "invalidate-test";
            const data = { test: true };

            await cacheManager.set(key, data);
            expect(await cacheManager.get(key)).toEqual(data);

            await cacheManager.invalidate(key);
            expect(await cacheManager.get(key)).toBeNull();
        });

        it("should invalidate cache entries by pattern", async () => {
            await cacheManager.set("dataflow:123", { id: "123" });
            await cacheManager.set("dataflow:456", { id: "456" });
            await cacheManager.set("dataset:789", { id: "789" });

            await cacheManager.invalidatePattern(/^dataflow/);

            expect(await cacheManager.get("dataflow:123")).toBeNull();
            expect(await cacheManager.get("dataflow:456")).toBeNull();
            expect(await cacheManager.get("dataset:789")).toEqual({
                id: "789",
            });
        });

        it("should clear all cache entries", async () => {
            await cacheManager.set("key1", { data: 1 });
            await cacheManager.set("key2", { data: 2 });
            await cacheManager.set("key3", { data: 3 });

            await cacheManager.clear();

            expect(await cacheManager.get("key1")).toBeNull();
            expect(await cacheManager.get("key2")).toBeNull();
            expect(await cacheManager.get("key3")).toBeNull();
        });
    });

    describe("Key Generation", () => {
        it("should generate consistent keys for same parameters", () => {
            const params1 = { name: "test", limit: 10, offset: 0 };
            const params2 = { limit: 10, name: "test", offset: 0 }; // Different order

            const key1 = cacheManager.generateKey("prefix", params1);
            const key2 = cacheManager.generateKey("prefix", params2);

            expect(key1).toBe(key2);
        });

        it("should generate different keys for different parameters", () => {
            const params1 = { name: "test1" };
            const params2 = { name: "test2" };

            const key1 = cacheManager.generateKey("prefix", params1);
            const key2 = cacheManager.generateKey("prefix", params2);

            expect(key1).not.toBe(key2);
        });

        it("should generate different keys for different prefixes", () => {
            const params = { name: "test" };

            const key1 = cacheManager.generateKey("prefix1", params);
            const key2 = cacheManager.generateKey("prefix2", params);

            expect(key1).not.toBe(key2);
        });
    });

    describe("Dataflow Cache Methods", () => {
        it("should cache and retrieve dataflows", async () => {
            const dataflow = {
                id: "123",
                name: "Test Dataflow",
                createdAt: new Date().toISOString(),
            };

            await cacheManager.setDataflow(dataflow);
            const cached = await cacheManager.getDataflow("123");

            expect(cached).toEqual(dataflow);
        });

        it("should cache and retrieve dataflow lists", async () => {
            const dataflows = [
                {
                    id: "1",
                    name: "Flow 1",
                    createdAt: new Date().toISOString(),
                },
                {
                    id: "2",
                    name: "Flow 2",
                    createdAt: new Date().toISOString(),
                },
            ];
            const params = { limit: 10, offset: 0 };

            await cacheManager.setDataflowList(dataflows, params);
            const cached = await cacheManager.getDataflowList(params);

            expect(cached).toEqual(dataflows);
        });

        it("should invalidate all dataflow caches", async () => {
            const dataflow = {
                id: "123",
                name: "Test",
                createdAt: new Date().toISOString(),
            };
            const dataflows = [dataflow];
            const params = { limit: 10 };

            await cacheManager.setDataflow(dataflow);
            await cacheManager.setDataflowList(dataflows, params);

            await cacheManager.invalidateDataflowCaches();

            expect(await cacheManager.getDataflow("123")).toBeNull();
            expect(await cacheManager.getDataflowList(params)).toBeNull();
        });
    });

    describe("Dataset Cache Methods", () => {
        it("should cache and retrieve datasets", async () => {
            const dataset = {
                id: "456",
                name: "Test Dataset",
                rows: 1000,
                columns: 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await cacheManager.setDataset(dataset);
            const cached = await cacheManager.getDataset("456");

            expect(cached).toEqual(dataset);
        });

        it("should cache and retrieve dataset lists", async () => {
            const datasets = [
                {
                    id: "1",
                    name: "Dataset 1",
                    rows: 100,
                    columns: 5,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "2",
                    name: "Dataset 2",
                    rows: 200,
                    columns: 10,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            const params = { limit: 10, offset: 0 };

            await cacheManager.setDatasetList(datasets, params);
            const cached = await cacheManager.getDatasetList(params);

            expect(cached).toEqual(datasets);
        });

        it("should invalidate all dataset caches", async () => {
            const dataset = {
                id: "456",
                name: "Test",
                rows: 100,
                columns: 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const datasets = [dataset];
            const params = { limit: 10 };

            await cacheManager.setDataset(dataset);
            await cacheManager.setDatasetList(datasets, params);

            await cacheManager.invalidateDatasetCaches();

            expect(await cacheManager.getDataset("456")).toBeNull();
            expect(await cacheManager.getDatasetList(params)).toBeNull();
        });
    });

    describe("Cache Statistics", () => {
        it("should return correct cache statistics", async () => {
            // Empty cache
            let stats = cacheManager.getStats();
            expect(stats.memoryEntries).toBe(0);
            expect(stats.totalSize).toBe(0);

            // Add some entries
            await cacheManager.set("key1", { data: "test1" });
            await cacheManager.set("key2", { data: "test2" });
            await cacheManager.set("key3", { data: "test3" });

            stats = cacheManager.getStats();
            expect(stats.memoryEntries).toBe(3);
            expect(stats.totalSize).toBeGreaterThan(0);
        });
    });

    describe("File Cache Operations", () => {
        let fileCacheManager: CacheManager;

        beforeEach(() => {
            fileCacheManager = new CacheManager({
                useFileCache: true,
                cacheDir: "/tmp/test-cache",
            });
        });

        it("should create cache directory on initialization", async () => {
            expect(fs.mkdir).toHaveBeenCalledWith("/tmp/test-cache", {
                recursive: true,
            });
        });

        it("should write to file cache when enabled", async () => {
            const key = "file-test";
            const data = { test: "data" };

            await fileCacheManager.set(key, data);

            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join("/tmp/test-cache", `${key}.json`),
                expect.any(String),
            );
        });

        it("should read from file cache when memory cache misses", async () => {
            const key = "file-read-test";
            const data = { test: "file-data" };
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                ttl: 3600000,
            };

            vi.mocked(fs.readFile).mockResolvedValueOnce(
                JSON.stringify(cacheEntry),
            );

            const result = await fileCacheManager.get(key);

            expect(fs.readFile).toHaveBeenCalledWith(
                path.join("/tmp/test-cache", `${key}.json`),
                "utf-8",
            );
            expect(result).toEqual(data);
        });

        it("should handle file cache read errors gracefully", async () => {
            vi.mocked(fs.readFile).mockRejectedValueOnce(
                new Error("File not found"),
            );

            const result = await fileCacheManager.get("non-existent");

            expect(result).toBeNull();
        });

        it("should clean up expired files from cache", async () => {
            const key = "expired-file-test";
            const expiredEntry = {
                data: { test: "expired" },
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600000, // 1 hour TTL
            };

            vi.mocked(fs.readFile).mockResolvedValueOnce(
                JSON.stringify(expiredEntry),
            );

            const result = await fileCacheManager.get(key);

            expect(result).toBeNull();
            expect(fs.unlink).toHaveBeenCalledWith(
                path.join("/tmp/test-cache", `${key}.json`),
            );
        });

        it("should clear file cache when clearing all", async () => {
            vi.mocked(fs.readdir).mockResolvedValueOnce([
                "key1.json",
                "key2.json",
                "other.txt",
            ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

            await fileCacheManager.clear();

            // Check that unlink was called for JSON files only
            const unlinkCalls = vi
                .mocked(fs.unlink)
                .mock.calls.map(call => call[0]);
            expect(unlinkCalls).toContain(
                path.join("/tmp/test-cache", "key1.json"),
            );
            expect(unlinkCalls).toContain(
                path.join("/tmp/test-cache", "key2.json"),
            );
            expect(unlinkCalls).not.toContain(
                path.join("/tmp/test-cache", "other.txt"),
            );
            expect(vi.mocked(fs.unlink)).toHaveBeenCalledTimes(2);
        });

        it("should invalidate file cache entries by pattern", async () => {
            vi.mocked(fs.readdir).mockResolvedValueOnce([
                "dataflow:123.json",
                "dataflow:456.json",
                "dataset:789.json",
            ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

            await fileCacheManager.invalidatePattern(/^dataflow/);

            // Check that unlink was called for matching files only
            const unlinkCalls = vi
                .mocked(fs.unlink)
                .mock.calls.map(call => call[0]);
            expect(unlinkCalls).toContain(
                path.join("/tmp/test-cache", "dataflow:123.json"),
            );
            expect(unlinkCalls).toContain(
                path.join("/tmp/test-cache", "dataflow:456.json"),
            );
            expect(unlinkCalls).not.toContain(
                path.join("/tmp/test-cache", "dataset:789.json"),
            );
            expect(vi.mocked(fs.unlink)).toHaveBeenCalledTimes(2);
        });
    });

    describe("Singleton Pattern", () => {
        it("should return the same instance when getCacheManager is called multiple times", () => {
            const instance1 = getCacheManager();
            const instance2 = getCacheManager();

            expect(instance1).toBe(instance2);
        });

        it("should create new instance after reset", () => {
            const instance1 = getCacheManager();
            resetCacheManager();
            const instance2 = getCacheManager();

            expect(instance1).not.toBe(instance2);
        });

        it("should preserve options on first initialization", () => {
            const options = { useFileCache: true, cacheDir: "/custom/cache" };
            const instance1 = getCacheManager(options);
            const instance2 = getCacheManager(); // Called without options

            expect(instance1).toBe(instance2);
        });
    });
});
