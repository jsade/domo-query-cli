import * as crypto from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { DomoDataflow, DomoDataset } from "../../api/clients/domoClient.js";

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    useFileCache?: boolean;
    cacheDir?: string;
}

export class CacheManager {
    private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
    private readonly defaultTTL = 3600000; // 1 hour in milliseconds
    private readonly cacheDir: string;
    private useFileCache: boolean;

    constructor(options: CacheOptions = {}) {
        this.useFileCache = options.useFileCache ?? false;
        this.cacheDir = options.cacheDir ?? path.join(process.cwd(), ".cache");

        if (this.useFileCache) {
            this.initializeFileCache();
        }
    }

    private async initializeFileCache(): Promise<void> {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error("Failed to create cache directory:", error);
            this.useFileCache = false;
        }
    }

    generateKey(prefix: string, params: unknown): string {
        const paramString = JSON.stringify(
            params,
            Object.keys(params as Record<string, unknown>).sort(),
        );
        const hash = crypto.createHash("md5").update(paramString).digest("hex");
        return `${prefix}:${hash}`;
    }

    private isExpired(entry: CacheEntry<unknown>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    async get<T>(key: string): Promise<T | null> {
        // Check memory cache first
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry)) {
            return memoryEntry.data as T;
        }

        // Check file cache if enabled
        if (this.useFileCache) {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            try {
                const fileContent = await fs.readFile(filePath, "utf-8");
                const fileEntry = JSON.parse(fileContent) as CacheEntry<T>;

                if (!this.isExpired(fileEntry)) {
                    // Update memory cache
                    this.memoryCache.set(key, fileEntry);
                    return fileEntry.data;
                }

                // Clean up expired file
                await fs.unlink(filePath).catch(() => {});
            } catch {
                // File doesn't exist or is invalid
            }
        }

        return null;
    }

    async set<T>(key: string, data: T, ttl?: number): Promise<void> {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        };

        // Update memory cache
        this.memoryCache.set(key, entry);

        // Update file cache if enabled
        if (this.useFileCache) {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            try {
                await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
            } catch (error) {
                console.error("Failed to write cache file:", error);
            }
        }
    }

    async invalidate(key: string): Promise<void> {
        this.memoryCache.delete(key);

        if (this.useFileCache) {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            await fs.unlink(filePath).catch(() => {});
        }
    }

    async invalidatePattern(pattern: RegExp): Promise<void> {
        // Invalidate memory cache entries
        for (const key of this.memoryCache.keys()) {
            if (pattern.test(key)) {
                this.memoryCache.delete(key);
            }
        }

        // Invalidate file cache entries
        if (this.useFileCache) {
            try {
                const files = await fs.readdir(this.cacheDir);
                for (const file of files) {
                    if (file.endsWith(".json")) {
                        const key = file.slice(0, -5);
                        if (pattern.test(key)) {
                            await fs
                                .unlink(path.join(this.cacheDir, file))
                                .catch(() => {});
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to clean file cache:", error);
            }
        }
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();

        if (this.useFileCache) {
            try {
                const files = await fs.readdir(this.cacheDir);
                await Promise.all(
                    files
                        .filter(file => file.endsWith(".json"))
                        .map(file =>
                            fs
                                .unlink(path.join(this.cacheDir, file))
                                .catch(() => {}),
                        ),
                );
            } catch (error) {
                console.error("Failed to clear file cache:", error);
            }
        }
    }

    // Specific cache methods for common operations
    async getDataflow(dataflowId: string): Promise<DomoDataflow | null> {
        const key = this.generateKey("dataflow", { id: dataflowId });
        return this.get<DomoDataflow>(key);
    }

    async setDataflow(dataflow: DomoDataflow, ttl?: number): Promise<void> {
        const key = this.generateKey("dataflow", { id: dataflow.id });
        await this.set(key, dataflow, ttl);
    }

    async getDataflowList(params: unknown): Promise<DomoDataflow[] | null> {
        const key = this.generateKey("dataflow-list", params);
        return this.get<DomoDataflow[]>(key);
    }

    async setDataflowList(
        dataflows: DomoDataflow[],
        params: unknown,
        ttl?: number,
    ): Promise<void> {
        const key = this.generateKey("dataflow-list", params);
        await this.set(key, dataflows, ttl);
    }

    async getDataset(datasetId: string): Promise<DomoDataset | null> {
        const key = this.generateKey("dataset", { id: datasetId });
        return this.get<DomoDataset>(key);
    }

    async setDataset(dataset: DomoDataset, ttl?: number): Promise<void> {
        const key = this.generateKey("dataset", { id: dataset.id });
        await this.set(key, dataset, ttl);
    }

    async getDatasetList(params: unknown): Promise<DomoDataset[] | null> {
        const key = this.generateKey("dataset-list", params);
        return this.get<DomoDataset[]>(key);
    }

    async setDatasetList(
        datasets: DomoDataset[],
        params: unknown,
        ttl?: number,
    ): Promise<void> {
        const key = this.generateKey("dataset-list", params);
        await this.set(key, datasets, ttl);
    }

    // Invalidate all dataflow-related caches
    async invalidateDataflowCaches(): Promise<void> {
        await this.invalidatePattern(/^dataflow/);
    }

    // Invalidate all dataset-related caches
    async invalidateDatasetCaches(): Promise<void> {
        await this.invalidatePattern(/^dataset/);
    }

    // Get cache statistics
    getStats(): { memoryEntries: number; totalSize: number } {
        let totalSize = 0;
        for (const entry of this.memoryCache.values()) {
            totalSize += JSON.stringify(entry).length;
        }

        return {
            memoryEntries: this.memoryCache.size,
            totalSize,
        };
    }
}

// Singleton instance
let cacheInstance: CacheManager | null = null;

export function getCacheManager(options?: CacheOptions): CacheManager {
    if (!cacheInstance) {
        cacheInstance = new CacheManager(options);
    }
    return cacheInstance;
}

export function resetCacheManager(): void {
    if (cacheInstance) {
        cacheInstance.clear();
        cacheInstance = null;
    }
}
