import * as fs from "fs/promises";
import * as fsSync from "fs";
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
    private initialized = false;
    private backupsEnabled = true;
    private readonly isPkg: boolean;

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

        // Detect if running as pkg-compiled executable
        // @ts-expect-error - process.pkg is set by pkg when running in compiled executable
        this.isPkg = process.pkg !== undefined;

        // Disable backups in pkg-compiled executables on macOS
        if (this.isPkg && process.platform === "darwin") {
            this.backupsEnabled = false;
            console.log(
                "Note: Automatic backups disabled in packaged executable",
            );
        }
    }

    /**
     * Initialize the database, creating directories if needed
     */
    async initialize(retryCount = 0): Promise<void> {
        const maxRetries = 3;

        try {
            // Create directories if they don't exist
            await fs.mkdir(this.dbPath, { recursive: true });
            await fs.mkdir(this.backupPath, { recursive: true });

            // Verify directories were created
            if (!existsSync(this.dbPath)) {
                throw new Error(
                    `Failed to create database directory: ${this.dbPath}`,
                );
            }

            // Try to recover from corrupted state before cleanup
            await this.recoverFromCorruptedFiles();

            // Clean up any orphaned temp files from previous runs
            await this.cleanupTempFiles();

            // Load or create metadata
            const metadataPath = path.join(this.dbPath, "metadata.json");
            if (existsSync(metadataPath)) {
                try {
                    const content = await fs.readFile(metadataPath, "utf-8");
                    // Check if file is empty
                    if (content.trim() === "") {
                        throw new Error("Metadata file is empty");
                    }
                    this.metadata = JSON.parse(content);
                } catch (error) {
                    console.error(
                        "Failed to load metadata, attempting recovery:",
                        error,
                    );
                    // Try to recover from .tmp file
                    const recovered = await this.recoverFile(metadataPath);
                    if (recovered) {
                        try {
                            const content = await fs.readFile(
                                metadataPath,
                                "utf-8",
                            );
                            this.metadata = JSON.parse(content);
                        } catch {
                            await this.saveMetadata();
                        }
                    } else {
                        await this.saveMetadata();
                    }
                }
            } else {
                await this.saveMetadata();
            }

            // Load existing collections
            await this.loadCollections();

            this.initialized = true;
        } catch (error) {
            if (retryCount < maxRetries) {
                console.warn(
                    `Database initialization attempt ${retryCount + 1} failed, retrying...`,
                );
                await new Promise(resolve =>
                    setTimeout(resolve, 100 * (retryCount + 1)),
                );
                return this.initialize(retryCount + 1);
            }
            throw new Error(
                `Failed to initialize database after ${maxRetries} attempts. ` +
                    `Error: ${error instanceof Error ? error.message : "Unknown error"}. ` +
                    `Please check permissions for ${this.dbPath}`,
            );
        }
    }

    /**
     * Ensure database is initialized before operations
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            throw new Error(
                "Database not initialized. Call initialize() first.",
            );
        }
    }

    /**
     * Recover from corrupted files by restoring from .tmp files
     */
    private async recoverFromCorruptedFiles(): Promise<void> {
        try {
            const files = await fs.readdir(this.dbPath);

            for (const file of files) {
                if (file.endsWith(".json") && !file.endsWith(".tmp.json")) {
                    const filePath = path.join(this.dbPath, file);
                    const tmpPath = `${filePath}.tmp`;

                    // Check if main file is empty or corrupted
                    if (existsSync(filePath)) {
                        try {
                            const content = await fs.readFile(
                                filePath,
                                "utf-8",
                            );
                            if (content.trim() === "") {
                                // File is empty, try to recover from .tmp
                                if (existsSync(tmpPath)) {
                                    console.log(
                                        `Recovering ${file} from temporary file...`,
                                    );
                                    await this.recoverFile(filePath);
                                }
                            }
                        } catch {
                            // File is corrupted, try to recover
                            if (existsSync(tmpPath)) {
                                console.log(
                                    `Recovering corrupted ${file} from temporary file...`,
                                );
                                await this.recoverFile(filePath);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("Could not check for corrupted files:", error);
        }
    }

    /**
     * Recover a file from its .tmp backup
     */
    private async recoverFile(filePath: string): Promise<boolean> {
        const tmpPath = `${filePath}.tmp`;

        if (!existsSync(tmpPath)) {
            return false;
        }

        try {
            const tmpContent = await fs.readFile(tmpPath, "utf-8");

            // Validate the tmp file has valid JSON
            try {
                JSON.parse(tmpContent);
            } catch {
                console.warn(`Temporary file ${tmpPath} contains invalid JSON`);
                return false;
            }

            // For pkg, use synchronous write
            if (this.isPkg) {
                try {
                    fsSync.writeFileSync(filePath, tmpContent, "utf-8");
                    console.log(
                        `Successfully recovered ${path.basename(filePath)}`,
                    );
                    // Try to remove the tmp file (may fail but that's ok)
                    try {
                        fsSync.unlinkSync(tmpPath);
                    } catch {
                        // Ignore cleanup errors
                    }
                    return true;
                } catch (error) {
                    console.error(`Failed to recover ${filePath}:`, error);
                    return false;
                }
            } else {
                // For non-pkg, use async operations
                await fs.writeFile(filePath, tmpContent, "utf-8");
                console.log(
                    `Successfully recovered ${path.basename(filePath)}`,
                );
                try {
                    await fs.unlink(tmpPath);
                } catch {
                    // Ignore cleanup errors
                }
                return true;
            }
        } catch (error) {
            console.error(`Failed to recover from ${tmpPath}:`, error);
            return false;
        }
    }

    /**
     * Clean up orphaned temp files
     */
    private async cleanupTempFiles(): Promise<void> {
        try {
            const files = await fs.readdir(this.dbPath);
            const tempFiles = files.filter(f => f.endsWith(".tmp"));

            for (const tempFile of tempFiles) {
                const tempPath = path.join(this.dbPath, tempFile);
                try {
                    await fs.unlink(tempPath);
                    console.log(`Cleaned up orphaned temp file: ${tempFile}`);
                } catch (error) {
                    // Ignore errors when cleaning up individual files
                    console.warn(`Could not clean up ${tempFile}:`, error);
                }
            }

            // Also check backup directory
            try {
                const backupFiles = await fs.readdir(this.backupPath);
                const backupTempFiles = backupFiles.filter(f =>
                    f.endsWith(".tmp"),
                );
                for (const tempFile of backupTempFiles) {
                    const tempPath = path.join(this.backupPath, tempFile);
                    try {
                        await fs.unlink(tempPath);
                    } catch {
                        // Ignore errors
                    }
                }
            } catch {
                // Backup directory might not exist yet
            }
        } catch (error) {
            // Ignore errors during cleanup
            console.warn("Could not clean up temp files:", error);
        }
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
     * Write JSON file with special handling for pkg-compiled environments
     */
    private async writeJsonFile(
        filePath: string,
        data: unknown,
    ): Promise<void> {
        const content = JSON.stringify(data, null, 2);

        // Special handling for pkg-compiled executables
        if (this.isPkg) {
            try {
                // For pkg, use synchronous direct write
                // This works better with pkg's file system restrictions
                fsSync.writeFileSync(filePath, content, "utf-8");
                return; // Success!
            } catch {
                // If even direct sync write fails, try to create parent directory
                try {
                    const dir = path.dirname(filePath);
                    if (!existsSync(dir)) {
                        fsSync.mkdirSync(dir, { recursive: true });
                    }
                    // Retry the write
                    fsSync.writeFileSync(filePath, content, "utf-8");
                    return; // Success!
                } catch (retryError) {
                    // For macOS signed executables, try normal async write before giving up
                    // This can work when the executable is properly signed with entitlements
                    if (process.platform === "darwin") {
                        try {
                            await fs.writeFile(filePath, content, "utf-8");
                            return; // Success with async write!
                        } catch {
                            // Continue to fallback strategies
                        }
                    }

                    // As a last resort for pkg, write to temp and inform user
                    const tempPath = `${filePath}.tmp`;
                    try {
                        fsSync.writeFileSync(tempPath, content, "utf-8");
                        console.warn(
                            `Note: Data saved to ${path.basename(tempPath)}. ` +
                                `The packaged executable has limited file permissions.`,
                        );
                        return;
                    } catch {
                        // Provide more helpful error message
                        const errorMsg =
                            retryError instanceof Error
                                ? retryError.message
                                : String(retryError);
                        throw new Error(
                            `Failed to write database file at ${filePath}. ` +
                                `Error: ${errorMsg}. ` +
                                `Try running: sudo chmod -R 755 ${path.dirname(filePath)} ` +
                                `or use the source with: yarn tsx src/main.ts`,
                        );
                    }
                }
            }
        }

        // Normal atomic write strategy for non-pkg environments
        const tempPath = `${filePath}.tmp`;

        // Try atomic write with rename
        try {
            await fs.writeFile(tempPath, content, "utf-8");
            try {
                await fs.rename(tempPath, filePath);
                return; // Success!
            } catch (renameError: unknown) {
                const errorCode = (renameError as { code?: string })?.code;
                // If rename fails with permission error, continue to fallback strategies
                if (
                    errorCode !== "EPERM" &&
                    errorCode !== "EACCES" &&
                    errorCode !== "EXDEV"
                ) {
                    throw renameError; // Re-throw if not a permission issue
                }
                // Otherwise, continue with fallback strategies
            }
        } catch (error: unknown) {
            // If writeFile itself failed, handle it at the end
            const errorCode = (error as { code?: string })?.code;
            if (
                errorCode !== "EPERM" &&
                errorCode !== "EACCES" &&
                errorCode !== "EXDEV"
            ) {
                throw error; // Re-throw if not a permission issue
            }
        }

        // Strategy 2: Try copy and delete (works better in pkg environments)
        try {
            // Temp file should already exist from Strategy 1, but create it again if needed
            if (!existsSync(tempPath)) {
                await fs.writeFile(tempPath, content, "utf-8");
            }
            await fs.copyFile(tempPath, filePath);
            await fs.unlink(tempPath).catch(() => {
                // Ignore cleanup errors
            });
            return; // Success!
        } catch {
            // Continue to next strategy
        }

        // Strategy 3: Direct write (non-atomic but most compatible)
        try {
            await fs.writeFile(filePath, content, "utf-8");
            // Clean up any leftover temp file
            await fs.unlink(tempPath).catch(() => {
                // Ignore cleanup errors
            });
            return; // Success!
        } catch (directError) {
            // Strategy 3b: Try removing and recreating the file (for pkg on macOS)
            try {
                if (existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
                await fs.writeFile(filePath, content, "utf-8");
                await fs.unlink(tempPath).catch(() => {});
                return; // Success!
            } catch {
                // Continue to next strategy
            }
            // Strategy 4: Try to remove extended attributes and retry (macOS specific)
            if (process.platform === "darwin") {
                try {
                    const { exec } = await import("child_process");
                    await new Promise<void>(resolve => {
                        exec(`xattr -c "${filePath}" 2>/dev/null`, () =>
                            resolve(),
                        );
                    });
                    // Retry direct write after clearing attributes
                    await fs.writeFile(filePath, content, "utf-8");
                    await fs.unlink(tempPath).catch(() => {});
                    return; // Success!
                } catch {
                    // Continue to error handling
                }
            }

            // All strategies failed
            throw new Error(
                `Failed to write database file at ${filePath}. ` +
                    `Please ensure the directory exists and is writable. ` +
                    `You may need to manually delete any .tmp files in ${path.dirname(filePath)}. ` +
                    `Original error: ${(directError as Error).message}`,
            );
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
        if (!this.backupsEnabled) {
            return; // Skip backups if disabled
        }

        const collection = this.collections.get(collectionName);
        if (!collection) return;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const backupFile = path.join(
                this.backupPath,
                `${collectionName}_${timestamp}.json`,
            );
            await this.writeJsonFile(backupFile, collection);

            // Clean old backups (keep last 10)
            await this.cleanOldBackups(collectionName);
        } catch (error) {
            // If backup fails, log warning but continue
            console.warn(
                `Warning: Could not create backup for ${collectionName}:`,
                error,
            );
            // Don't throw - allow the operation to continue without backup
        }
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
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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
     * Get the database path
     */
    getDbPath(): string {
        return this.dbPath;
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
