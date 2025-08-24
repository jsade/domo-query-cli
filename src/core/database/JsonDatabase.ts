import * as fs from "fs/promises";
import * as path from "path";
import { homedir } from "os";
import { existsSync } from "fs";

interface DatabaseMetadata {
    version: string;
    lastSync: string | null;
    createdAt: string;
    updatedAt: string;
}

interface EntityMetadata {
    fetchedAt: string;
    source: "api" | "manual" | "import";
    syncedAt?: string;
}

interface DatabaseEntity {
    id: string;
    _metadata?: EntityMetadata;
    [key: string]: unknown;
}

interface Collection<T extends DatabaseEntity> {
    version: string;
    lastSync: string | null;
    entities: Record<string, T>;
}

interface QueryOptions<T> {
    filter?: (entity: T) => boolean;
    sort?: (a: T, b: T) => number;
    limit?: number;
    offset?: number;
}

export class JsonDatabase {
    private readonly dbPath: string;
    private readonly backupPath: string;
    private collections: Map<string, Collection<DatabaseEntity>> = new Map();
    private metadata: DatabaseMetadata;
    private readonly dbVersion = "1.0.0";

    constructor(instanceName?: string) {
        const basePath =
            process.env.DOMO_DB_PATH || path.join(homedir(), ".domo-cli", "db");
        const instance = instanceName || "default";
        this.dbPath = path.join(basePath, instance);
        this.backupPath = path.join(this.dbPath, "backups");

        this.metadata = {
            version: this.dbVersion,
            lastSync: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Initialize the database, creating directories if needed
     */
    async initialize(): Promise<void> {
        // Create directories if they don't exist
        await fs.mkdir(this.dbPath, { recursive: true });
        await fs.mkdir(this.backupPath, { recursive: true });

        // Load or create metadata
        const metadataPath = path.join(this.dbPath, "metadata.json");
        if (existsSync(metadataPath)) {
            try {
                const content = await fs.readFile(metadataPath, "utf-8");
                this.metadata = JSON.parse(content);
            } catch (error) {
                console.error("Failed to load metadata, creating new:", error);
                await this.saveMetadata();
            }
        } else {
            await this.saveMetadata();
        }

        // Load existing collections
        await this.loadCollections();
    }

    /**
     * Save metadata to disk
     */
    private async saveMetadata(): Promise<void> {
        this.metadata.updatedAt = new Date().toISOString();
        const metadataPath = path.join(this.dbPath, "metadata.json");
        await this.writeJsonFile(metadataPath, this.metadata);
    }

    /**
     * Load all collections from disk
     */
    private async loadCollections(): Promise<void> {
        try {
            const files = await fs.readdir(this.dbPath);
            const jsonFiles = files.filter(
                f => f.endsWith(".json") && f !== "metadata.json",
            );

            for (const file of jsonFiles) {
                const collectionName = file.replace(".json", "");
                const filePath = path.join(this.dbPath, file);

                try {
                    const content = await fs.readFile(filePath, "utf-8");
                    const collection = JSON.parse(
                        content,
                    ) as Collection<DatabaseEntity>;
                    this.collections.set(collectionName, collection);
                } catch (error) {
                    console.error(
                        `Failed to load collection ${collectionName}:`,
                        error,
                    );
                    // Initialize empty collection
                    this.collections.set(collectionName, {
                        version: this.dbVersion,
                        lastSync: null,
                        entities: {},
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load collections:", error);
        }
    }

    /**
     * Get a collection, creating it if it doesn't exist
     */
    private getCollection<T extends DatabaseEntity>(
        collectionName: string,
    ): Collection<T> {
        if (!this.collections.has(collectionName)) {
            this.collections.set(collectionName, {
                version: this.dbVersion,
                lastSync: null,
                entities: {},
            });
        }
        return this.collections.get(collectionName) as Collection<T>;
    }

    /**
     * Write JSON file atomically with fallback for permission issues
     */
    private async writeJsonFile(
        filePath: string,
        data: unknown,
    ): Promise<void> {
        const tempPath = `${filePath}.tmp`;
        const content = JSON.stringify(data, null, 2);

        try {
            // Try atomic write: write to temp file then rename
            await fs.writeFile(tempPath, content, "utf-8");
            await fs.rename(tempPath, filePath);
        } catch (error: unknown) {
            // Handle permission errors that occur in packaged executables
            const errorCode = (error as { code?: string })?.code;
            if (errorCode === "EPERM" || errorCode === "EACCES") {
                // Fallback: direct write if atomic rename fails
                try {
                    await fs.writeFile(filePath, content, "utf-8");
                    // Try to clean up temp file if it exists
                    try {
                        await fs.unlink(tempPath);
                    } catch {
                        // Ignore cleanup errors
                    }
                } catch {
                    // If direct write also fails, throw a more informative error
                    throw new Error(
                        `Failed to write database file at ${filePath}. ` +
                            `Please ensure the directory exists and is writable. ` +
                            `Original error: ${(error as Error).message}`,
                    );
                }
            } else {
                // Re-throw non-permission errors
                throw error;
            }
        }
    }

    /**
     * Save a collection to disk
     */
    private async saveCollection(collectionName: string): Promise<void> {
        const collection = this.collections.get(collectionName);
        if (!collection) return;

        const filePath = path.join(this.dbPath, `${collectionName}.json`);
        await this.writeJsonFile(filePath, collection);
        await this.saveMetadata();
    }

    /**
     * Create backup of a collection before modification
     */
    private async backupCollection(collectionName: string): Promise<void> {
        const collection = this.collections.get(collectionName);
        if (!collection) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFile = path.join(
            this.backupPath,
            `${collectionName}_${timestamp}.json`,
        );
        await this.writeJsonFile(backupFile, collection);

        // Clean old backups (keep last 10)
        await this.cleanOldBackups(collectionName);
    }

    /**
     * Clean old backup files, keeping only the most recent ones
     */
    private async cleanOldBackups(
        collectionName: string,
        keepCount: number = 10,
    ): Promise<void> {
        try {
            const files = await fs.readdir(this.backupPath);
            const backups = files
                .filter(
                    f =>
                        f.startsWith(`${collectionName}_`) &&
                        f.endsWith(".json"),
                )
                .sort()
                .reverse();

            if (backups.length > keepCount) {
                const toDelete = backups.slice(keepCount);
                for (const file of toDelete) {
                    await fs.unlink(path.join(this.backupPath, file));
                }
            }
        } catch (error) {
            console.error("Failed to clean old backups:", error);
        }
    }

    /**
     * Get a single entity by ID
     */
    async get<T extends DatabaseEntity>(
        collectionName: string,
        id: string,
    ): Promise<T | null> {
        const collection = this.getCollection<T>(collectionName);
        return collection.entities[id] || null;
    }

    /**
     * Set/update an entity
     */
    async set<T extends DatabaseEntity>(
        collectionName: string,
        entity: T,
    ): Promise<void> {
        await this.backupCollection(collectionName);

        const collection = this.getCollection<T>(collectionName);

        // Add metadata
        entity._metadata = {
            fetchedAt: new Date().toISOString(),
            source: "api",
            ...(entity._metadata || {}),
        };

        collection.entities[entity.id] = entity;
        await this.saveCollection(collectionName);
    }

    /**
     * Set multiple entities at once
     */
    async setMany<T extends DatabaseEntity>(
        collectionName: string,
        entities: T[],
    ): Promise<void> {
        await this.backupCollection(collectionName);

        const collection = this.getCollection<T>(collectionName);
        const now = new Date().toISOString();

        for (const entity of entities) {
            entity._metadata = {
                fetchedAt: now,
                source: "api",
                ...(entity._metadata || {}),
            };
            collection.entities[entity.id] = entity;
        }

        collection.lastSync = now;
        await this.saveCollection(collectionName);
    }

    /**
     * Delete an entity
     */
    async delete(collectionName: string, id: string): Promise<boolean> {
        const collection = this.getCollection(collectionName);

        if (collection.entities[id]) {
            await this.backupCollection(collectionName);
            delete collection.entities[id];
            await this.saveCollection(collectionName);
            return true;
        }

        return false;
    }

    /**
     * List entities with optional filtering, sorting, and pagination
     */
    async list<T extends DatabaseEntity>(
        collectionName: string,
        options: QueryOptions<T> = {},
    ): Promise<T[]> {
        const collection = this.getCollection<T>(collectionName);
        let entities = Object.values(collection.entities) as T[];

        // Apply filter
        if (options.filter) {
            entities = entities.filter(options.filter);
        }

        // Apply sort
        if (options.sort) {
            entities.sort(options.sort);
        }

        // Apply pagination
        if (options.offset !== undefined || options.limit !== undefined) {
            const start = options.offset || 0;
            const end = options.limit ? start + options.limit : undefined;
            entities = entities.slice(start, end);
        }

        return entities;
    }

    /**
     * Count entities in a collection
     */
    async count(
        collectionName: string,
        filter?: (entity: DatabaseEntity) => boolean,
    ): Promise<number> {
        const collection = this.getCollection(collectionName);
        const entities = Object.values(collection.entities);

        if (filter) {
            return entities.filter(filter).length;
        }

        return entities.length;
    }

    /**
     * Clear a collection
     */
    async clear(collectionName: string): Promise<void> {
        await this.backupCollection(collectionName);

        const collection = this.getCollection(collectionName);
        collection.entities = {};
        collection.lastSync = null;

        await this.saveCollection(collectionName);
    }

    /**
     * Clear all collections
     */
    async clearAll(): Promise<void> {
        for (const collectionName of this.collections.keys()) {
            await this.clear(collectionName);
        }
    }

    /**
     * Get last sync time for a collection
     */
    getLastSync(collectionName: string): string | null {
        const collection = this.collections.get(collectionName);
        return collection?.lastSync || null;
    }

    /**
     * Update last sync time for a collection
     */
    async updateLastSync(
        collectionName: string,
        timestamp?: string,
    ): Promise<void> {
        const collection = this.getCollection(collectionName);
        collection.lastSync = timestamp || new Date().toISOString();
        await this.saveCollection(collectionName);
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        collections: Array<{
            name: string;
            count: number;
            lastSync: string | null;
            sizeBytes: number;
        }>;
        totalEntities: number;
        totalSizeBytes: number;
        metadata: DatabaseMetadata;
    }> {
        const stats = {
            collections: [] as Array<{
                name: string;
                count: number;
                lastSync: string | null;
                sizeBytes: number;
            }>,
            totalEntities: 0,
            totalSizeBytes: 0,
            metadata: this.metadata,
        };

        for (const [name, collection] of this.collections) {
            const count = Object.keys(collection.entities).length;
            const sizeBytes = JSON.stringify(collection).length;

            stats.collections.push({
                name,
                count,
                lastSync: collection.lastSync,
                sizeBytes,
            });

            stats.totalEntities += count;
            stats.totalSizeBytes += sizeBytes;
        }

        return stats;
    }

    /**
     * Export database to a single JSON file
     */
    async export(exportPath?: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `domo-db-export_${timestamp}.json`;
        const filePath = exportPath || path.join(process.cwd(), fileName);

        const exportData = {
            metadata: this.metadata,
            collections: Object.fromEntries(this.collections),
            exportedAt: new Date().toISOString(),
        };

        await this.writeJsonFile(filePath, exportData);
        return filePath;
    }

    /**
     * Import database from a JSON file
     */
    async import(importPath: string): Promise<void> {
        const content = await fs.readFile(importPath, "utf-8");
        const importData = JSON.parse(content);

        // Backup current state
        for (const collectionName of this.collections.keys()) {
            await this.backupCollection(collectionName);
        }

        // Import collections
        if (importData.collections) {
            for (const [name, collection] of Object.entries(
                importData.collections,
            )) {
                this.collections.set(
                    name,
                    collection as Collection<DatabaseEntity>,
                );
                await this.saveCollection(name);
            }
        }

        // Update metadata
        this.metadata.updatedAt = new Date().toISOString();
        await this.saveMetadata();
    }

    /**
     * Search across all collections
     */
    async search(
        query: string,
        options?: {
            collections?: string[];
            fields?: string[];
            limit?: number;
        },
    ): Promise<Array<{ collection: string; entity: DatabaseEntity }>> {
        const results: Array<{ collection: string; entity: DatabaseEntity }> =
            [];
        const searchRegex = new RegExp(query, "i");
        const targetCollections =
            options?.collections || Array.from(this.collections.keys());

        for (const collectionName of targetCollections) {
            const collection = this.collections.get(collectionName);
            if (!collection) continue;

            for (const entity of Object.values(collection.entities)) {
                const searchTarget = options?.fields
                    ? options.fields.map(f => entity[f]).join(" ")
                    : JSON.stringify(entity);

                if (searchRegex.test(searchTarget)) {
                    results.push({ collection: collectionName, entity });

                    if (options?.limit && results.length >= options.limit) {
                        return results;
                    }
                }
            }
        }

        return results;
    }
}

// Singleton instance management
let dbInstance: JsonDatabase | null = null;

export async function getDatabase(
    instanceName?: string,
): Promise<JsonDatabase> {
    if (!dbInstance) {
        dbInstance = new JsonDatabase(instanceName);
        await dbInstance.initialize();
    }
    return dbInstance;
}

export function resetDatabase(): void {
    dbInstance = null;
}
