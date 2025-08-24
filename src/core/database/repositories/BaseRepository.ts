import { JsonDatabase } from "../JsonDatabase";

export interface Entity {
    id: string;
    name?: string;
    [key: string]: unknown;
}

export interface RepositoryOptions {
    syncInterval?: number; // Auto-sync interval in milliseconds
    offlineMode?: boolean; // If true, don't fetch from API
}

export abstract class BaseRepository<T extends Entity> {
    protected db: JsonDatabase;
    protected collectionName: string;
    protected options: RepositoryOptions;

    constructor(
        db: JsonDatabase,
        collectionName: string,
        options: RepositoryOptions = {},
    ) {
        this.db = db;
        this.collectionName = collectionName;
        this.options = options;
    }

    /**
     * Get a single entity by ID
     */
    async get(id: string): Promise<T | null> {
        return this.db.get<T>(this.collectionName, id);
    }

    /**
     * Get multiple entities by IDs
     */
    async getMany(ids: string[]): Promise<T[]> {
        const results: T[] = [];
        for (const id of ids) {
            const entity = await this.get(id);
            if (entity) {
                results.push(entity);
            }
        }
        return results;
    }

    /**
     * Save a single entity
     */
    async save(entity: T): Promise<void> {
        await this.db.set(this.collectionName, entity);
    }

    /**
     * Save multiple entities
     */
    async saveMany(entities: T[]): Promise<void> {
        await this.db.setMany(this.collectionName, entities);
    }

    /**
     * Delete an entity by ID
     */
    async delete(id: string): Promise<boolean> {
        return this.db.delete(this.collectionName, id);
    }

    /**
     * List all entities
     */
    async list(options?: {
        filter?: (entity: T) => boolean;
        sort?: (a: T, b: T) => number;
        limit?: number;
        offset?: number;
    }): Promise<T[]> {
        return this.db.list<T>(this.collectionName, options);
    }

    /**
     * Find entities by a field value
     */
    async findBy(field: keyof T, value: unknown): Promise<T[]> {
        return this.list({
            filter: entity => entity[field] === value,
        });
    }

    /**
     * Find one entity by a field value
     */
    async findOneBy(field: keyof T, value: unknown): Promise<T | null> {
        const results = await this.findBy(field, value);
        return results[0] || null;
    }

    /**
     * Search entities by text
     */
    async search(query: string, fields?: string[]): Promise<T[]> {
        const results = await this.db.search(query, {
            collections: [this.collectionName],
            fields,
        });
        return results.map(r => r.entity as T);
    }

    /**
     * Count entities
     */
    async count(filter?: (entity: T) => boolean): Promise<number> {
        return this.db.count(
            this.collectionName,
            filter as ((entity: Entity) => boolean) | undefined,
        );
    }

    /**
     * Clear all entities in this collection
     */
    async clear(): Promise<void> {
        await this.db.clear(this.collectionName);
    }

    /**
     * Check if sync is needed
     */
    async needsSync(maxAge: number = 3600000): Promise<boolean> {
        const lastSync = this.db.getLastSync(this.collectionName);
        if (!lastSync) return true;

        const age = Date.now() - new Date(lastSync).getTime();
        return age > maxAge;
    }

    /**
     * Update last sync timestamp
     */
    async updateSyncTime(): Promise<void> {
        await this.db.updateLastSync(this.collectionName);
    }

    /**
     * Get last sync time
     */
    getLastSync(): string | null {
        return this.db.getLastSync(this.collectionName);
    }

    /**
     * Abstract method to sync with API
     */
    abstract sync(): Promise<void>;
}
