import { BaseRepository } from "./BaseRepository";
import { DomoDataset, listDatasets } from "../../../api/clients/domoClient";
import { JsonDatabase } from "../JsonDatabase";

// Extend DomoDataset to satisfy Entity constraint
export interface DatasetEntity extends DomoDataset {
    [key: string]: unknown;
}

export class DatasetRepository extends BaseRepository<DatasetEntity> {
    constructor(db: JsonDatabase) {
        super(db, "datasets");
    }

    /**
     * Sync datasets from Domo API
     */
    async sync(): Promise<void> {
        if (this.options.offlineMode) {
            console.log("Offline mode enabled, skipping sync");
            return;
        }

        try {
            console.log("Syncing datasets from Domo API...");

            // Fetch all datasets (with pagination)
            const allDatasets: DatasetEntity[] = [];
            let offset = 0;
            const limit = 50;
            let hasMore = true;

            while (hasMore) {
                const response = await listDatasets({ limit, offset });
                if (response && Array.isArray(response)) {
                    allDatasets.push(...(response as DatasetEntity[]));
                    hasMore = response.length === limit;
                    offset += limit;
                } else {
                    hasMore = false;
                }
            }

            // Save all datasets to database
            if (allDatasets.length > 0) {
                await this.saveMany(allDatasets);
                await this.updateSyncTime();
                console.log(`Synced ${allDatasets.length} datasets`);
            } else {
                console.log("No datasets found to sync");
            }
        } catch (error) {
            console.error("Failed to sync datasets:", error);
            throw error;
        }
    }

    /**
     * Get dataset with optional sync
     */
    async getWithSync(
        id: string,
        forceSync: boolean = false,
    ): Promise<DatasetEntity | null> {
        // Check if we need to sync
        if (forceSync || (await this.needsSync())) {
            await this.sync();
        }

        return this.get(id);
    }

    /**
     * Find datasets by name pattern
     */
    async findByNamePattern(pattern: string): Promise<DatasetEntity[]> {
        const regex = new RegExp(pattern, "i");
        return this.list({
            filter: dataset => regex.test(dataset.name || ""),
        });
    }

    /**
     * Find datasets by owner
     */
    async findByOwner(ownerId: number): Promise<DatasetEntity[]> {
        return this.list({
            filter: dataset => {
                const owner = dataset.owner;
                if (typeof owner === "object" && owner && "id" in owner) {
                    return (owner as unknown as { id: number }).id === ownerId;
                } else if (typeof owner === "string") {
                    // Owner might be stored as a string ID
                    return owner === ownerId.toString();
                }
                return false;
            },
        });
    }

    /**
     * Get recently updated datasets
     */
    async getRecentlyUpdated(limit: number = 10): Promise<DatasetEntity[]> {
        return this.list({
            sort: (a, b) => {
                const dateA = new Date(a.updatedAt || 0).getTime();
                const dateB = new Date(b.updatedAt || 0).getTime();
                return dateB - dateA;
            },
            limit,
        });
    }

    /**
     * Get dataset statistics
     */
    async getStatistics(): Promise<{
        totalDatasets: number;
        totalRows: number;
        totalColumns: number;
        avgRowsPerDataset: number;
        avgColumnsPerDataset: number;
        lastSync: string | null;
    }> {
        const datasets = await this.list();
        const totalDatasets = datasets.length;

        let totalRows = 0;
        let totalColumns = 0;

        for (const dataset of datasets) {
            totalRows += dataset.rows || 0;
            totalColumns += dataset.columns || 0;
        }

        return {
            totalDatasets,
            totalRows,
            totalColumns,
            avgRowsPerDataset:
                totalDatasets > 0 ? totalRows / totalDatasets : 0,
            avgColumnsPerDataset:
                totalDatasets > 0 ? totalColumns / totalDatasets : 0,
            lastSync: this.getLastSync(),
        };
    }

    /**
     * Export datasets to CSV format
     */
    async exportToCSV(): Promise<string> {
        const datasets = await this.list();

        // CSV header
        const headers = [
            "ID",
            "Name",
            "Description",
            "Rows",
            "Columns",
            "Owner",
            "Created",
            "Updated",
        ];
        const rows = [headers.join(",")];

        // Add data rows
        for (const dataset of datasets) {
            const row = [
                dataset.id,
                `"${(dataset.name || "").replace(/"/g, '""')}"`,
                `"${(dataset.description || "").replace(/"/g, '""')}"`,
                dataset.rows || 0,
                dataset.columns || 0,
                typeof dataset.owner === "object" &&
                dataset.owner &&
                "name" in dataset.owner
                    ? (dataset.owner as unknown as { name: string }).name
                    : "",
                dataset.createdAt || "",
                dataset.updatedAt || "",
            ];
            rows.push(row.join(","));
        }

        return rows.join("\n");
    }
}
