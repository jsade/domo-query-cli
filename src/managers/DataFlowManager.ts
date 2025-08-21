import { DataflowClient } from "../api/clients/dataflowClient.ts";
import {
    DomoDataflow,
    DomoDataflowExecution,
    V1DataflowResponse,
} from "../api/clients/domoClient.ts";
import { CacheManager, getCacheManager } from "../core/cache/CacheManager.ts";
import {
    SearchManager,
    SearchRequest,
    SearchResponse,
} from "./SearchManager.ts";
import {
    ApiResponseMerger,
    DualApiResponse,
} from "../utils/apiResponseMerger.ts";
import { log } from "../utils/logger.ts";
import { getV3Client } from "../api/clients/clientManager.ts";

/**
 * DataFlowManager class for interacting with Domo dataflows
 */
export class DataFlowManager {
    static DEFAULT_LIMIT = 100;
    static DEFAULT_OFFSET = 0;

    private searchManager: SearchManager;
    private cacheManager: CacheManager;

    /**
     * Constructor
     * @param client - The authenticated Dataflow client specifically for dataflow operations
     */
    constructor(private client: DataflowClient) {
        this.searchManager = new SearchManager(client);
        this.cacheManager = getCacheManager({
            ttl: 300000, // 5 minutes default TTL
            useFileCache: false, // Use memory cache only for now
        });
    }

    /**
     * Get dataflows with default parameters
     * @returns The search response containing dataflows
     */
    async getDataflows(): Promise<SearchResponse> {
        return await this.getDataflowsByName("*");
    }

    /**
     * Get dataflows by name
     * @param name - Name to filter dataflows by (can use wildcards)
     * @returns The search response containing dataflows
     */
    async getDataflowsByName(name: string): Promise<SearchResponse> {
        return await this.getDataflowsWithPagination(
            name,
            DataFlowManager.DEFAULT_LIMIT,
            DataFlowManager.DEFAULT_OFFSET,
        );
    }

    /**
     * Get dataflows with pagination
     * @param name - Name to filter dataflows by (can use wildcards)
     * @param limit - Maximum number of results to return
     * @param offset - Starting offset for pagination
     * @param sort - Field to sort by
     * @param order - Sort direction (asc or desc)
     * @returns The search response containing dataflows
     */
    async getDataflowsWithPagination(
        name: string,
        limit: number,
        offset: number,
        sort?: string,
        order?: "asc" | "desc",
    ): Promise<SearchResponse> {
        return await this.getDataflowsWithFilters(
            name,
            null,
            null,
            limit,
            offset,
            sort,
            order,
        );
    }

    /**
     * Get dataflows with all filters
     * @param name - Name to filter dataflows by (can use wildcards)
     * @param owner - Owner ID to filter by
     * @param dataflowType - Type of dataflow to filter by
     * @param limit - Maximum number of results to return
     * @param offset - Starting offset for pagination
     * @param sort - Field to sort by
     * @param order - Sort direction (asc or desc)
     * @returns The search response containing dataflows
     */
    async getDataflowsWithFilters(
        name: string,
        owner: number | null = null,
        dataflowType: string | null = null,
        limit: number = DataFlowManager.DEFAULT_LIMIT,
        offset: number = DataFlowManager.DEFAULT_OFFSET,
        sort?: string,
        order?: "asc" | "desc",
    ): Promise<SearchResponse> {
        // Create cache key parameters
        const cacheParams = {
            name,
            owner,
            dataflowType,
            limit,
            offset,
            sort,
            order,
        };

        // Check cache first
        const cachedResponse = await this.cacheManager.get<SearchResponse>(
            this.cacheManager.generateKey("dataflow-search", cacheParams),
        );

        if (cachedResponse) {
            return cachedResponse;
        }

        // Ensure client is authenticated before proceeding
        await this.client.ensureAuthenticated();

        // Create search request using the updated SearchRequest interface
        const entityTypes = ["dataflow"];
        const searchRequest: SearchRequest = {
            query: name || "*", // Changed from term to query
            entityTypes: entityTypes,
            limit: limit || DataFlowManager.DEFAULT_LIMIT,
            offset: offset || DataFlowManager.DEFAULT_OFFSET,
        };

        // Add sort if specified
        if (sort) {
            // Handle special combined sort+direction values
            if (sort === "nameDescending") {
                searchRequest.sort = {
                    field: "name",
                    direction: "desc",
                };
            } else {
                searchRequest.sort = {
                    field: sort,
                    direction: order || "asc",
                };
            }
        }

        // Add filters if specified
        const filters = [];
        if (owner) {
            filters.push({
                name: "ownerId",
                values: [owner.toString()],
            });
        }

        if (dataflowType) {
            filters.push({
                name: "dataflowType",
                values: [dataflowType],
            });
        }

        if (filters.length > 0) {
            searchRequest.filters = filters;
        }

        // Execute the search through SearchManager
        const response = await this.searchManager.searchDomo(searchRequest);

        // Cache the response
        await this.cacheManager.set(
            this.cacheManager.generateKey("dataflow-search", cacheParams),
            response,
        );

        return response;
    }

    /**
     * Get a specific dataflow by ID with dual API response (v1 and v2)
     * @param dataflowId - The ID of the dataflow to retrieve
     * @returns Dual API response with v1, v2, and merged data
     */
    async getDataflowDual(
        dataflowId: string,
    ): Promise<DualApiResponse<DomoDataflow, V1DataflowResponse>> {
        // Check cache first for dual response
        const cacheKey = `dataflow_dual_${dataflowId}`;
        const cachedDualDataflow =
            await this.cacheManager.get<
                DualApiResponse<DomoDataflow, V1DataflowResponse>
            >(cacheKey);
        if (cachedDualDataflow) {
            return cachedDualDataflow;
        }

        await this.client.ensureAuthenticated();

        // First, fetch v2 data (current implementation)
        let v2Dataflow: DomoDataflow | null = null;
        try {
            const url = `/api/dataprocessing/v2/dataflows/${dataflowId}`;
            const response =
                await this.client.get<Record<string, unknown>>(url);
            v2Dataflow = this.transformDataflowResponse(response);
        } catch (error) {
            log.error(
                `Failed to fetch dataflow ${dataflowId} from v2 endpoint:`,
                error,
            );
        }

        // Try to fetch v1 data if using API token with customer domain
        let v1Response: V1DataflowResponse | null = null;
        const v3Client = getV3Client(); // This client uses API token and customer domain
        if (v3Client) {
            try {
                log.debug(
                    `Attempting to fetch dataflow ${dataflowId} from v1 endpoint using customer domain`,
                );
                // v1 endpoint also requires customer domain and API token like v3
                v1Response = await v3Client.get<V1DataflowResponse>(
                    `/api/dataprocessing/v1/dataflows/${dataflowId}`,
                );
                if (v1Response) {
                    log.debug(
                        `Successfully fetched v1 data for dataflow ${dataflowId}`,
                    );
                }
            } catch (error) {
                // Log but don't fail - v1 is optional enhancement only
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                log.debug(
                    `v1 fetch failed for dataflow ${dataflowId}: ${errorMessage}`,
                );
            }
        }

        // Merge responses
        const dualResponse = ApiResponseMerger.mergeResponses<
            DomoDataflow,
            V1DataflowResponse
        >(v2Dataflow, v1Response);

        // If we have v1 data, merge additional fields into the main dataflow object
        if (dualResponse.merged && v1Response) {
            // Map v1-specific fields to DomoDataflow fields
            const merged = dualResponse.merged as DomoDataflow;

            // Map onboardFlowVersion details if available
            if (v1Response.onboardFlowVersion) {
                merged.onboardFlowVersionDetails =
                    v1Response.onboardFlowVersion;
            }

            // Map trigger settings
            if (v1Response.triggerSettings) {
                merged.triggerSettings = v1Response.triggerSettings;
            }

            // Map engine properties
            if (v1Response.engineProperties) {
                merged.engineProperties = v1Response.engineProperties;
            }

            // Map additional boolean flags
            if (v1Response.hydrationState !== undefined)
                merged.hydrationState = v1Response.hydrationState;
            if (v1Response.abandoned !== undefined)
                merged.abandoned = v1Response.abandoned;
            if (v1Response.neverAbandon !== undefined)
                merged.neverAbandon = v1Response.neverAbandon;
            if (v1Response.deleted !== undefined)
                merged.deleted = v1Response.deleted;
            if (v1Response.draft !== undefined) merged.draft = v1Response.draft;
            if (v1Response.triggeredByInput !== undefined)
                merged.triggeredByInput = v1Response.triggeredByInput;
            if (v1Response.magic !== undefined) merged.magic = v1Response.magic;
            if (v1Response.container !== undefined)
                merged.container = v1Response.container;
            if (v1Response.subsetProcessing !== undefined)
                merged.subsetProcessing = v1Response.subsetProcessing;

            // Map settings
            if (v1Response.settings) {
                merged.settings = v1Response.settings;
            }

            // Map GUI structure (for visual representation)
            if (v1Response.gui) {
                merged.gui = v1Response.gui;
            }

            // Map transformation actions (the actual dataflow logic)
            if (v1Response.actions) {
                merged.actions = v1Response.actions;
            }
        }

        // Cache the dual response
        await this.cacheManager.set(cacheKey, dualResponse, 300); // Cache for 5 minutes

        return dualResponse;
    }

    /**
     * Get a specific dataflow by ID (backward compatible method)
     * @param dataflowId - The ID of the dataflow to retrieve
     * @returns The dataflow object
     */
    async getDataflow(dataflowId: string): Promise<DomoDataflow> {
        // Try to get dual response and return the best data
        const dualResponse = await this.getDataflowDual(dataflowId);
        const dataflow = ApiResponseMerger.getBestData(
            dualResponse,
        ) as DomoDataflow;

        if (dataflow) {
            // Cache the dataflow for backward compatibility
            await this.cacheManager.setDataflow(dataflow);
            return dataflow;
        }

        // Fallback to original v2-only implementation if dual fetch fails
        await this.client.ensureAuthenticated();
        const url = `/api/dataprocessing/v2/dataflows/${dataflowId}`;
        const response = await this.client.get<Record<string, unknown>>(url);
        const v2Dataflow = this.transformDataflowResponse(response);
        await this.cacheManager.setDataflow(v2Dataflow);
        return v2Dataflow;
    }

    /**
     * Transform API response to DomoDataflow format
     * @param response - Raw API response
     * @returns Formatted DomoDataflow object
     */
    private transformDataflowResponse(
        response: Record<string, unknown>,
    ): DomoDataflow {
        // Map lastExecution if present
        let lastExecution: undefined | DomoDataflowExecution = undefined;
        if (
            response.lastExecution &&
            typeof response.lastExecution === "object"
        ) {
            const exec = response.lastExecution as Record<string, unknown>;
            lastExecution = {
                id: typeof exec.id === "number" ? exec.id : 0,
                beginTime:
                    typeof exec.beginTime === "number"
                        ? exec.beginTime
                        : undefined,
                endTime:
                    typeof exec.endTime === "number" ? exec.endTime : undefined,
                state: typeof exec.state === "string" ? exec.state : undefined,
                activationType:
                    typeof exec.activationType === "string"
                        ? exec.activationType
                        : undefined,
                dataFlowVersion:
                    typeof exec.dataFlowVersion === "number"
                        ? exec.dataFlowVersion
                        : undefined,
                totalRowsRead:
                    typeof exec.totalRowsRead === "number"
                        ? exec.totalRowsRead
                        : undefined,
                totalBytesRead:
                    typeof exec.totalBytesRead === "number"
                        ? exec.totalBytesRead
                        : undefined,
                totalRowsWritten:
                    typeof exec.totalRowsWritten === "number"
                        ? exec.totalRowsWritten
                        : undefined,
                totalBytesWritten:
                    typeof exec.totalBytesWritten === "number"
                        ? exec.totalBytesWritten
                        : undefined,
            };
        }

        return {
            id: String(response.id || ""),
            name: String(response.name || ""),
            description:
                typeof response.description === "string"
                    ? response.description
                    : undefined,
            documentVersion:
                typeof response.documentVersion === "number"
                    ? (response.documentVersion as number)
                    : undefined,
            editable:
                typeof response.editable === "boolean"
                    ? response.editable
                    : undefined,
            enabled:
                typeof response.enabled === "boolean"
                    ? response.enabled
                    : undefined,
            restricted:
                typeof response.restricted === "boolean"
                    ? response.restricted
                    : undefined,
            databaseType:
                typeof response.databaseType === "string"
                    ? response.databaseType
                    : undefined,
            dapDataFlowId:
                typeof response.dapDataFlowId === "string"
                    ? response.dapDataFlowId
                    : undefined,
            responsibleUserId:
                typeof response.responsibleUserId === "number"
                    ? (response.responsibleUserId as number)
                    : undefined,
            runState:
                typeof response.runState === "string"
                    ? response.runState
                    : undefined,
            onboardFlowVersion:
                typeof response.onboardFlowVersion === "number"
                    ? (response.onboardFlowVersion as number)
                    : undefined,
            lastSuccessfulExecution:
                typeof response.lastSuccessfulExecution === "number"
                    ? (response.lastSuccessfulExecution as number)
                    : undefined,
            createdAt:
                typeof response.created === "number"
                    ? new Date(response.created as number).toISOString()
                    : new Date().toISOString(),
            modified:
                typeof response.modified === "number"
                    ? (response.modified as number)
                    : undefined,
            inputCount:
                typeof response.numInputs === "number"
                    ? (response.numInputs as number)
                    : undefined,
            outputCount:
                typeof response.numOutputs === "number"
                    ? (response.numOutputs as number)
                    : undefined,
            executionCount:
                typeof response.executionCount === "number"
                    ? (response.executionCount as number)
                    : undefined,
            executionSuccessCount:
                typeof response.executionSuccessCount === "number"
                    ? (response.executionSuccessCount as number)
                    : undefined,
            // Map nested lastExecution
            lastExecution,
            // Additional fields from API response
            status:
                typeof response.status === "string"
                    ? response.status
                    : undefined,
            lastRun:
                typeof response.lastRun === "string"
                    ? response.lastRun
                    : undefined,
            lastUpdated:
                typeof response.lastUpdated === "string"
                    ? response.lastUpdated
                    : undefined,
            owner:
                typeof response.owner === "string" ? response.owner : undefined,
            tags: Array.isArray(response.tags)
                ? (response.tags as string[])
                : undefined,
            // Map scheduleInfo if present
            scheduleInfo:
                response.scheduleInfo &&
                typeof response.scheduleInfo === "object"
                    ? {
                          frequency: String(
                              (response.scheduleInfo as Record<string, unknown>)
                                  .frequency || "",
                          ),
                          startTime:
                              typeof (
                                  response.scheduleInfo as Record<
                                      string,
                                      unknown
                                  >
                              ).startTime === "string"
                                  ? String(
                                        (
                                            response.scheduleInfo as Record<
                                                string,
                                                unknown
                                            >
                                        ).startTime,
                                    )
                                  : undefined,
                          startDate:
                              typeof (
                                  response.scheduleInfo as Record<
                                      string,
                                      unknown
                                  >
                              ).startDate === "number"
                                  ? Number(
                                        (
                                            response.scheduleInfo as Record<
                                                string,
                                                unknown
                                            >
                                        ).startDate,
                                    )
                                  : undefined,
                          timeZone:
                              typeof (
                                  response.scheduleInfo as Record<
                                      string,
                                      unknown
                                  >
                              ).timeZone === "string"
                                  ? String(
                                        (
                                            response.scheduleInfo as Record<
                                                string,
                                                unknown
                                            >
                                        ).timeZone,
                                    )
                                  : undefined,
                      }
                    : undefined,
            // Add inputs mapping with complete fields from API
            inputs: Array.isArray(response.inputs)
                ? (response.inputs as Record<string, unknown>[]).map(input => ({
                      id: String(input.id || ""),
                      name: String(input.name || input.dataSourceName || ""),
                      dataSourceId: String(input.dataSourceId || ""),
                      dataSourceName:
                          typeof input.dataSourceName === "string"
                              ? input.dataSourceName
                              : undefined,
                      executeFlowWhenUpdated:
                          typeof input.executeFlowWhenUpdated === "boolean"
                              ? input.executeFlowWhenUpdated
                              : undefined,
                      onlyLoadNewVersions:
                          typeof input.onlyLoadNewVersions === "boolean"
                              ? input.onlyLoadNewVersions
                              : undefined,
                      recentVersionCutoffMs:
                          typeof input.recentVersionCutoffMs === "number"
                              ? input.recentVersionCutoffMs
                              : undefined,
                  }))
                : undefined,
            // Add outputs mapping with complete fields from API
            outputs: Array.isArray(response.outputs)
                ? (response.outputs as Record<string, unknown>[]).map(
                      output => ({
                          id: String(output.id || ""),
                          name: String(
                              output.name || output.dataSourceName || "",
                          ),
                          dataSourceId: String(output.dataSourceId || ""),
                          dataSourceName:
                              typeof output.dataSourceName === "string"
                                  ? output.dataSourceName
                                  : undefined,
                          onboardFlowId:
                              output.onboardFlowId !== null &&
                              typeof output.onboardFlowId !== "undefined"
                                  ? String(output.onboardFlowId)
                                  : undefined,
                          versionChainType:
                              typeof output.versionChainType === "string"
                                  ? output.versionChainType
                                  : undefined,
                      }),
                  )
                : undefined,
            // Map actions array if present
            actions: Array.isArray(response.actions)
                ? (response.actions as Record<string, unknown>[]).map(
                      action => ({
                          id: String(action.id || ""),
                          name: String(action.name || ""),
                          type: String(action.type || ""),
                          configuration:
                              typeof action.configuration === "object"
                                  ? (action.configuration as Record<
                                        string,
                                        unknown
                                    >)
                                  : {},
                      }),
                  )
                : undefined,
        };
    }

    /**
     * Get multiple dataflows by IDs
     * @param dataflowIds - Array of dataflow IDs to retrieve
     * @returns Array of dataflow objects
     */
    async getDataFlows(dataflowIds: string[]): Promise<DomoDataflow[]> {
        await this.client.ensureAuthenticated();

        // Fetch all dataflows in parallel
        const dataflowPromises = dataflowIds.map(id => this.getDataflow(id));
        return await Promise.all(dataflowPromises);
    }

    /**
     * Update an existing dataflow
     * @param dataflowId - The ID of the dataflow to update
     * @param dataflow - The updated dataflow object
     * @returns The updated dataflow
     */
    async updateDataflow(
        dataflowId: string,
        dataflow: Record<string, unknown>,
    ): Promise<DomoDataflow> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataflowId}`;
        const response = await this.client.put<Record<string, unknown>>(
            url,
            dataflow,
        );

        const updatedDataflow = this.transformDataflowResponse(response);

        // Invalidate caches
        await this.cacheManager.invalidate(
            this.cacheManager.generateKey("dataflow", { id: dataflowId }),
        );
        await this.cacheManager.invalidatePattern(/^dataflow-search/);
        // Also invalidate dual response cache
        await this.cacheManager.invalidate(`dataflow_dual_${dataflowId}`);

        // Cache the updated dataflow
        await this.cacheManager.setDataflow(updatedDataflow);

        // Also cache as dual response for consistency
        const dualResponse = ApiResponseMerger.mergeResponses<
            DomoDataflow,
            V1DataflowResponse
        >(
            updatedDataflow,
            null, // We don't have v1 data after update, but that's okay
        );
        await this.cacheManager.set(
            `dataflow_dual_${dataflowId}`,
            dualResponse,
            300,
        );

        return updatedDataflow;
    }

    /**
     * Create a new dataflow
     * @param dataflow - The dataflow object to create
     * @returns The created dataflow
     */
    async createDataflow(
        dataflow: Record<string, unknown>,
    ): Promise<DomoDataflow> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows`;
        const response = await this.client.post<Record<string, unknown>>(
            url,
            dataflow,
        );

        return this.transformDataflowResponse(response);
    }

    /**
     * Get versions of a specific dataflow
     * @param dataflowId - The ID of the dataflow
     * @returns Array of dataflow versions
     */
    async getDataflowVersion(dataflowId: string): Promise<unknown[]> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataflowId}/versions`;
        return await this.client.get<unknown[]>(url);
    }

    /**
     * Get executions of a specific dataflow
     * @param dataflowId - The ID of the dataflow
     * @returns Array of dataflow executions
     */
    async getDataflowExecutions(dataflowId: string): Promise<unknown[]> {
        return await this.getDataflowExecutionsWithPagination(
            dataflowId,
            DataFlowManager.DEFAULT_LIMIT,
            DataFlowManager.DEFAULT_OFFSET,
        );
    }

    /**
     * Get executions of a specific dataflow with pagination
     * @param dataflowId - The ID of the dataflow
     * @param limit - Maximum number of results to return
     * @param offset - Starting offset for pagination
     * @returns Array of dataflow executions
     */
    async getDataflowExecutionsWithPagination(
        dataflowId: string,
        limit: number,
        offset: number,
    ): Promise<unknown[]> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataflowId}/executions`;
        const params = {
            limit: limit || DataFlowManager.DEFAULT_LIMIT,
            offset: offset || DataFlowManager.DEFAULT_OFFSET,
        };

        return await this.client.get<unknown[]>(url, params);
    }

    /**
     * Get latest executions of a dataflow since a specific time
     * @param dataflowId - The ID of the dataflow
     * @param startTime - Starting timestamp
     * @returns Array of dataflow executions
     */
    async getLatestDataflowExecutions(
        dataflowId: string,
        startTime: number,
    ): Promise<unknown[]> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataflowId}/executions`;
        const params = {
            limit: DataFlowManager.DEFAULT_LIMIT,
            offset: 0,
            startTime: startTime,
        };

        return await this.client.get<unknown[]>(url, params);
    }

    /**
     * Get a specific execution of a dataflow
     * @param dataflowId - The ID of the dataflow
     * @param executionId - The ID of the execution
     * @returns The dataflow execution
     */
    async getExecution(
        dataflowId: string,
        executionId: number | string,
    ): Promise<unknown> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataflowId}/executions/${executionId}`;
        return await this.client.get<unknown>(url);
    }

    /**
     * Run a dataflow
     * @param dataFlowId - The ID of the dataflow to run
     * @returns The execution object
     */
    async runDataFlow(dataFlowId: string): Promise<DomoDataflowExecution> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataFlowId}/executions`;
        const response = await this.client.post<Record<string, unknown>>(url);

        // Invalidate dataflow cache since execution state has changed
        await this.cacheManager.invalidate(
            this.cacheManager.generateKey("dataflow", { id: dataFlowId }),
        );
        // Also invalidate dual response cache
        await this.cacheManager.invalidate(`dataflow_dual_${dataFlowId}`);

        return {
            id: typeof response.id === "number" ? response.id : 0,
            beginTime:
                typeof response.beginTime === "number"
                    ? response.beginTime
                    : undefined,
            state:
                typeof response.state === "string" ? response.state : undefined,
        };
    }

    /**
     * Enable or disable a dataflow
     * @param dataFlowId - The ID of the dataflow
     * @param enable - Whether to enable or disable the dataflow
     * @returns The updated dataflow
     */
    async enableDataFlow(
        dataFlowId: string,
        enable: boolean,
    ): Promise<DomoDataflow> {
        await this.client.ensureAuthenticated();

        const dataflow = await this.getDataflow(dataFlowId);

        if (!dataflow) {
            throw new Error(`Dataflow with ID ${dataFlowId} not found`);
        }

        // Update the enabled property
        const updatedDataflow = { ...dataflow, enabled: enable };

        // Update the dataflow
        return await this.updateDataflow(dataFlowId, updatedDataflow);
    }

    /**
     * Set the owner of multiple dataflows
     * @param dataFlowIds - Array of dataflow IDs or a single dataflow ID
     * @param owner - The ID of the new owner
     * @returns Promise that resolves when all operations are complete
     */
    async setDataFlowOwner(
        dataFlowIds: string[] | string,
        owner: number,
    ): Promise<void> {
        if (Array.isArray(dataFlowIds)) {
            // Handle array of dataflow IDs
            const promises = dataFlowIds.map(id =>
                this.setDataFlowOwner(id, owner),
            );
            await Promise.all(promises);
            return;
        }

        // Handle single dataflow ID
        await this.client.ensureAuthenticated();

        const dataFlowId = dataFlowIds; // Single ID case

        const url = `/api/dataprocessing/v1/dataflows/${dataFlowId}/patch`;
        const body = {
            operation: "replace",
            path: "/responsibleUser",
            value: {
                id: owner,
            },
        };

        await this.client.put<Record<string, unknown>>(url, body);
    }

    /**
     * Subscribe or unsubscribe from a dataflow
     * @param dataFlowId - The ID of the dataflow
     * @param subscribe - Whether to subscribe or unsubscribe
     * @returns Success status
     */
    async subscribeDataFlow(
        dataFlowId: string,
        subscribe: boolean,
    ): Promise<boolean> {
        await this.client.ensureAuthenticated();

        const url = `/api/dataprocessing/v1/dataflows/${dataFlowId}/subscription`;

        if (subscribe) {
            await this.client.post<unknown>(url);
        } else {
            await this.client.delete<unknown>(url);
        }

        return true;
    }
}
