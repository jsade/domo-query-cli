import { BaseRepository } from "./BaseRepository";
import { DomoDataflow } from "../../../api/clients/domoClient";
import { listDataflows } from "../../../api/clients/dataflowApi";
import { JsonDatabase } from "../JsonDatabase";

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
                console.log("Syncing dataflows from Domo API...");
            }

            // Fetch all dataflows (with pagination)
            const allDataflows: DataflowEntity[] = [];
            let offset = 0;
            const limit = 50;
            let hasMore = true;

            while (hasMore) {
                const response = await listDataflows({ limit, offset });
                if (response && Array.isArray(response)) {
                    // Convert DomoDataflow to DataflowEntity format
                    const dataflows = response.map(df =>
                        this.convertDomoDataflowToEntity(df),
                    );
                    allDataflows.push(...dataflows);
                    hasMore = response.length === limit;
                    offset += limit;
                } else {
                    hasMore = false;
                }
            }

            // Save all dataflows to database
            if (allDataflows.length > 0) {
                await this.saveMany(allDataflows);
                await this.updateSyncTime();
                if (!silent) {
                    console.log(`Synced ${allDataflows.length} dataflows`);
                }
            } else {
                if (!silent) {
                    console.log("No dataflows found to sync");
                }
            }
        } catch (error) {
            if (!silent) {
                console.error("Failed to sync dataflows:", error);
            }
            throw error;
        }
    }

    /**
     * Convert DomoDataflow to DataflowEntity
     */
    private convertDomoDataflowToEntity(
        dataflow: DomoDataflow,
    ): DataflowEntity {
        return {
            id: dataflow.id,
            name: dataflow.name || "",
            description: dataflow.description,
            type: dataflow.databaseType,
            status: dataflow.status,
            lastRunDate: dataflow.lastRun,
            createdAt: dataflow.createdAt || new Date().toISOString(),
            lastUpdated: dataflow.lastUpdated,
            ownerId: dataflow.responsibleUserId?.toString(),
            owner: dataflow.owner,
            runCount: dataflow.executionCount,
            successRate:
                dataflow.executionSuccessCount && dataflow.executionCount
                    ? (dataflow.executionSuccessCount /
                          dataflow.executionCount) *
                      100
                    : undefined,
            paused: dataflow.enabled === false,
            inputCount: dataflow.inputCount,
            outputCount: dataflow.outputCount,
            inputDatasets: dataflow.inputs?.map(input => ({
                id: input.dataSourceId || input.id,
                name: input.name || "",
            })),
            outputDatasets: dataflow.outputs?.map(output => ({
                id: output.dataSourceId || output.id,
                name: output.name || "",
            })),
            enabled: dataflow.enabled,
            restricted: dataflow.restricted,
            databaseType: dataflow.databaseType,
            dapDataFlowId: dataflow.dapDataFlowId,
            responsibleUserId: dataflow.responsibleUserId,
            runState: dataflow.runState,
            lastSuccessfulExecution: dataflow.lastSuccessfulExecution,
            executionCount: dataflow.executionCount,
            executionSuccessCount: dataflow.executionSuccessCount,
        } as DataflowEntity;
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
