import { BaseRepository } from "./BaseRepository";
import { DomoDataflow } from "../../../api/clients/domoClient";
import { JsonDatabase } from "../JsonDatabase";
import { DataflowSearchObject } from "../../../types/dataflowSearch";

// Extend DomoDataflow to satisfy Entity constraint
export interface DataflowEntity extends DomoDataflow {
    type?: string;
    lastRunDate?: string;
    ownerId?: string;
    inputDatasets?: Array<{ id: string; name: string }>;
    outputDatasets?: Array<{ id: string; name: string }>;
    [key: string]: unknown;
}

export class DataflowRepository extends BaseRepository<DataflowEntity> {
    constructor(db: JsonDatabase) {
        super(db, "dataflows");
    }

    /**
     * Sync dataflows from Domo API
     */
    async sync(): Promise<void> {
        if (this.options.offlineMode) {
            console.log("Offline mode enabled, skipping sync");
            return;
        }

        try {
            console.log("Syncing dataflows from Domo API...");
            // For now, we can't directly search dataflows without proper API implementation
            // This would need to be implemented with the proper API client
            console.log(
                "Dataflow sync not fully implemented - API integration needed",
            );
            const searchResults = null;

            if (
                searchResults &&
                (searchResults as { searchObjects?: DataflowSearchObject[] })
                    .searchObjects
            ) {
                // Convert search objects to DataflowEntity format
                const dataflows: DataflowEntity[] = (
                    searchResults as { searchObjects: DataflowSearchObject[] }
                ).searchObjects.map(this.convertSearchObjectToDataflow);

                if (dataflows.length > 0) {
                    await this.saveMany(dataflows);
                    await this.updateSyncTime();
                    console.log(`Synced ${dataflows.length} dataflows`);
                } else {
                    console.log("No dataflows found to sync");
                }
            }
        } catch (error) {
            console.error("Failed to sync dataflows:", error);
            throw error;
        }
    }

    /**
     * Convert DataflowSearchObject to DataflowEntity
     */
    private convertSearchObjectToDataflow(
        searchObj: DataflowSearchObject,
    ): DataflowEntity {
        return {
            id: searchObj.databaseId,
            name: searchObj.name,
            description: searchObj.description,
            type: searchObj.dataFlowType,
            status: searchObj.status,
            lastRunDate: searchObj.lastRunDate
                ? new Date(searchObj.lastRunDate).toISOString()
                : undefined,
            createdAt: searchObj.createDate
                ? new Date(searchObj.createDate).toISOString()
                : "", // Required field
            lastUpdated: searchObj.lastModified
                ? new Date(searchObj.lastModified).toISOString()
                : undefined,
            ownerId: searchObj.ownedById,
            owner: searchObj.ownedByName,
            runCount: searchObj.runCount,
            successRate: searchObj.successRate,
            paused: searchObj.paused,
            inputCount: searchObj.inputCount,
            outputCount: searchObj.outputCount,
            inputDatasets: searchObj.inputDatasets,
            outputDatasets: searchObj.outputDatasets,
        } as unknown as DataflowEntity;
    }

    /**
     * Get dataflow with optional sync
     */
    async getWithSync(
        id: string,
        forceSync: boolean = false,
    ): Promise<DataflowEntity | null> {
        // Check if we need to sync
        if (forceSync || (await this.needsSync())) {
            await this.sync();
        }

        return this.get(id);
    }

    /**
     * Find dataflows by status
     */
    async findByStatus(status: string): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow => dataflow.status === status,
        });
    }

    /**
     * Find failed dataflows
     */
    async findFailed(): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow =>
                dataflow.status?.toLowerCase() === "failed" ||
                dataflow.status?.toLowerCase() === "error",
        });
    }

    /**
     * Find paused dataflows
     */
    async findPaused(): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow => dataflow.paused === true,
        });
    }

    /**
     * Find dataflows by type
     */
    async findByType(type: string): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow => dataflow.type === type,
        });
    }

    /**
     * Find dataflows by owner
     */
    async findByOwner(ownerId: string): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow => dataflow.ownerId === ownerId,
        });
    }

    /**
     * Find dataflows using a specific dataset as input
     */
    async findByInputDataset(datasetId: string): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow =>
                dataflow.inputDatasets?.some(ds => ds.id === datasetId) ||
                false,
        });
    }

    /**
     * Find dataflows producing a specific dataset as output
     */
    async findByOutputDataset(datasetId: string): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow =>
                dataflow.outputDatasets?.some(ds => ds.id === datasetId) ||
                false,
        });
    }

    /**
     * Get recently run dataflows
     */
    async getRecentlyRun(limit: number = 10): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow => dataflow.lastRunDate !== undefined,
            sort: (a, b) => {
                const dateA = new Date(a.lastRunDate || 0).getTime();
                const dateB = new Date(b.lastRunDate || 0).getTime();
                return dateB - dateA;
            },
            limit,
        });
    }

    /**
     * Get dataflows with low success rate
     */
    async getLowSuccessRate(threshold: number = 50): Promise<DataflowEntity[]> {
        return this.list({
            filter: dataflow =>
                dataflow.successRate !== undefined &&
                dataflow.successRate < threshold,
            sort: (a, b) => (a.successRate || 0) - (b.successRate || 0),
        });
    }

    /**
     * Get dataflow statistics
     */
    async getStatistics(): Promise<{
        totalDataflows: number;
        activeDataflows: number;
        pausedDataflows: number;
        failedDataflows: number;
        avgSuccessRate: number;
        totalRuns: number;
        dataflowsByType: Record<string, number>;
        lastSync: string | null;
    }> {
        const dataflows = await this.list();
        const totalDataflows = dataflows.length;

        let activeDataflows = 0;
        let pausedDataflows = 0;
        let failedDataflows = 0;
        let totalSuccessRate = 0;
        let totalRuns = 0;
        const dataflowsByType: Record<string, number> = {};

        for (const dataflow of dataflows) {
            if (dataflow.paused) {
                pausedDataflows++;
            } else if (
                dataflow.status?.toLowerCase() === "failed" ||
                dataflow.status?.toLowerCase() === "error"
            ) {
                failedDataflows++;
            } else {
                activeDataflows++;
            }

            if (dataflow.successRate !== undefined) {
                totalSuccessRate += dataflow.successRate;
            }

            totalRuns += dataflow.runCount || 0;

            const type = dataflow.type || "Unknown";
            dataflowsByType[type] = (dataflowsByType[type] || 0) + 1;
        }

        return {
            totalDataflows,
            activeDataflows,
            pausedDataflows,
            failedDataflows,
            avgSuccessRate:
                totalDataflows > 0 ? totalSuccessRate / totalDataflows : 0,
            totalRuns,
            dataflowsByType,
            lastSync: this.getLastSync(),
        };
    }

    /**
     * Build lineage graph for dataflows
     */
    async buildLineageGraph(): Promise<{
        nodes: Array<{ id: string; name: string; type: string }>;
        edges: Array<{ source: string; target: string; type: string }>;
    }> {
        const dataflows = await this.list();
        const nodes: Array<{ id: string; name: string; type: string }> = [];
        const edges: Array<{ source: string; target: string; type: string }> =
            [];
        const datasetNodes = new Set<string>();

        // Add dataflow nodes and collect dataset references
        for (const dataflow of dataflows) {
            nodes.push({
                id: dataflow.id,
                name: dataflow.name || "Unnamed",
                type: "dataflow",
            });

            // Add edges for input datasets
            if (dataflow.inputDatasets) {
                for (const dataset of dataflow.inputDatasets) {
                    datasetNodes.add(dataset.id);
                    edges.push({
                        source: dataset.id,
                        target: dataflow.id,
                        type: "input",
                    });
                }
            }

            // Add edges for output datasets
            if (dataflow.outputDatasets) {
                for (const dataset of dataflow.outputDatasets) {
                    datasetNodes.add(dataset.id);
                    edges.push({
                        source: dataflow.id,
                        target: dataset.id,
                        type: "output",
                    });
                }
            }
        }

        // Add dataset nodes
        for (const datasetId of datasetNodes) {
            nodes.push({
                id: datasetId,
                name: `Dataset ${datasetId}`,
                type: "dataset",
            });
        }

        return { nodes, edges };
    }
}
