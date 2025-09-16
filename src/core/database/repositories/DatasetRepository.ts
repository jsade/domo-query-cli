import { BaseRepository } from "./BaseRepository";
import {
    DomoDataset,
    listDatasets,
    getDataset,
} from "../../../api/clients/domoClient";
import { ApiResponseMerger } from "../../../utils/apiResponseMerger";
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
     * @param silent - If true, suppress console output during sync
     */
    async sync(silent: boolean = false): Promise<void> {
        if (this.options.offlineMode) {
            if (!silent) {
                console.log("Offline mode enabled, skipping sync");
            }
            return;
        }

        try {
            if (!silent) {
                console.log("Syncing datasets from Domo API (full details)...");
            }

            // Concurrency limit for per-dataset detail fetches
            const concurrency = Math.max(
                1,
                Number(process.env.DOMO_SYNC_CONCURRENCY || 5),
            );

            let offset = 0;
            const limit = 50;
            let totalProcessed = 0;
            let pageNum = 0;

            // Process pages of dataset summaries, then fetch detailed records
            while (true) {
                const page = await listDatasets({ limit, offset });
                pageNum++;

                if (!Array.isArray(page) || page.length === 0) {
                    if (pageNum === 1 && !silent) {
                        console.log("No datasets found to sync");
                    }
                    break;
                }

                // Build list of IDs to fetch details for
                const ids = page
                    .map(d => d?.id)
                    .filter((id): id is string => typeof id === "string");

                // Fetch details in chunks with limited concurrency
                for (let i = 0; i < ids.length; i += concurrency) {
                    const chunk = ids.slice(i, i + concurrency);
                    await Promise.all(
                        chunk.map(async id => {
                            try {
                                const dual = await getDataset(id);
                                const merged = ApiResponseMerger.getBestData(
                                    dual,
                                ) as DomoDataset | null;
                                if (merged) {
                                    await this.save(merged as DatasetEntity);
                                }
                            } catch (err) {
                                if (!silent) {
                                    const msg =
                                        err instanceof Error
                                            ? err.message
                                            : String(err);
                                    console.error(
                                        `Failed to fetch details for dataset ${id}: ${msg}`,
                                    );
                                }
                            }
                        }),
                    );

                    totalProcessed += chunk.length;
                    if (!silent && totalProcessed % 50 === 0) {
                        // Periodic progress output
                        process.stdout.write(
                            `\rProcessed ${totalProcessed} datasets...`,
                        );
                    }
                }

                // Next page
                if (page.length < limit) {
                    break;
                }
                offset += limit;
            }

            // Finalize
            await this.updateSyncTime();
            if (!silent) {
                if (totalProcessed > 0) {
                    process.stdout.write("\r");
                    console.log(`Synced ${totalProcessed} datasets`);
                }
            }
        } catch (error) {
            if (!silent) {
                console.error("Failed to sync datasets:", error);
            }
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
