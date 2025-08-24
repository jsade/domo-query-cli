import { DataFlowManager } from "../../managers/DataFlowManager.ts";
import { log } from "../../utils/logger.ts";
import { validateDataflowSearchResponse } from "../../validators/dataflowSearchValidator.ts";
import { checkReadOnlyMode } from "../../utils/readOnlyGuard.ts";
import { createDataflowClient, DataflowAuthMethod } from "./dataflowClient.ts";
import {
    ApiResponseMerger,
    DualApiResponse,
} from "../../utils/apiResponseMerger.ts";
import type {
    CreateDataflowParams,
    DataflowExecutionListParams,
    DataflowListParams,
    DataflowLineageQueryParams,
    DataflowLineageResponse,
    DeleteDataflowResponse,
    DomoDataflow,
    DomoDataflowExecution,
    ExecuteDataflowParams,
    PatchDataflowParams,
    UpdateDataflowParams,
    V1DataflowResponse,
} from "./domoClient.ts";
import { getV3Client } from "./clientManager.ts";

/**
 * Get the DataFlowManager instance for managing dataflows with specific authentication method
 * @param authMethod - Optional specific authentication method to use
 * @returns A DataFlowManager instance
 */
export function getDataFlowManager(
    authMethod?: DataflowAuthMethod,
): DataFlowManager {
    // Use the default authentication selection logic in createDataflowClient
    const client = createDataflowClient(authMethod);
    return new DataFlowManager(client);
}

/**
 * Retrieves a list of dataflows based on the provided parameters.
 *
 * @param params - Parameters for filtering dataflows.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to an array of DomoDataflow objects.
 * @throws If the API request fails.
 */
export async function listDataflows(
    params: DataflowListParams = {},
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflow[]> {
    try {
        // Get the DataFlowManager instance
        const dataFlowManager = getDataFlowManager(authMethod);

        // Convert search parameters
        const searchTerm = params.nameLike || "*";
        const limit = params.limit || 50;
        const offset = params.offset || 0;
        const sort = params.sort;
        const order = params.order;

        log.debug(
            `Dataflow search parameters - term: "${searchTerm}", limit: ${limit}, offset: ${offset}, sort: ${sort}, order: ${order}`,
        );

        // Call DataFlowManager to get dataflows
        log.debug("Calling DataFlowManager.getDataflowsWithPagination...");
        const rawResponse = await dataFlowManager.getDataflowsWithPagination(
            searchTerm,
            limit,
            offset,
            sort,
            order,
        );

        // Validate the response structure
        const response = validateDataflowSearchResponse(rawResponse);

        log.debug(
            `Received search response with ${response.searchObjects.length} searchObjects`,
        );
        log.debug(
            `Response structure: ${JSON.stringify(Object.keys(response))}`,
        );

        // Helper to safely convert a timestamp (ms) to ISO string
        function safeToISOString(timestamp?: number): string | undefined {
            if (typeof timestamp !== "number" || !Number.isFinite(timestamp))
                return undefined;
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return undefined;
            try {
                return date.toISOString();
            } catch {
                return undefined;
            }
        }

        // Convert search results to DomoDataflow array
        const dataflows: DomoDataflow[] = response.searchObjects
            .filter(item => item.entityType === "dataflow")
            .map(item => ({
                id: item.databaseId,
                name: item.name,
                description: item.description,
                status: item.status,
                lastRun: safeToISOString(item.lastRunDate),
                lastUpdated: safeToISOString(item.lastModified),
                createdAt:
                    safeToISOString(item.createDate) ??
                    new Date().toISOString(),
                owner: item.ownedByName,
                inputCount: item.inputCount,
                outputCount: item.outputCount,
                executionCount: item.runCount,
                executionSuccessCount:
                    typeof item.runCount === "number" &&
                    typeof item.successRate === "number"
                        ? Math.round(item.runCount * item.successRate)
                        : undefined,
                enabled:
                    typeof item.paused === "boolean" ? !item.paused : undefined,
                inputs: item.inputDatasets?.map(ds => ({
                    id: ds.id,
                    name: ds.name,
                    dataSourceId: ds.id, // In search API, only id is available
                })),
                outputs: item.outputDatasets?.map(ds => ({
                    id: ds.id,
                    name: ds.name,
                    dataSourceId: ds.id, // In search API, only id is available
                })),
                // Preserve all additional metadata from search API
                permissionMask: item.permissionMask,
                passwordProtected: item.passwordProtected,
                ownedById: item.ownedById,
                ownedByType: item.ownedByType,
                owners: item.owners,
                successRate: item.successRate,
                runCount: item.runCount,
                computeCloud: item.computeCloud,
                dataFlowType: item.dataFlowType,
                language: item.language,
                tags: item.tags,
                useGraphUI: item.useGraphUI,
                paused: item.paused,
                lastIndexed: safeToISOString(item.lastIndexed),
                score: item.score,
                requestAccess: item.requestAccess,
            }));

        log.info(`Found ${dataflows.length} dataflows.`);

        // Log the first dataflow as an example (with sensitive data masked)
        if (dataflows.length > 0) {
            const sampleDataflow = { ...dataflows[0] };
            // Mask any potentially sensitive fields
            if (sampleDataflow.id)
                sampleDataflow.id = sampleDataflow.id.substring(0, 4) + "...";
            log.debug(
                `Sample dataflow: ${JSON.stringify(sampleDataflow, null, 2)}`,
            );
        }

        return dataflows;
    } catch (error) {
        // Enhanced error logging for validation failures
        if (error instanceof Error) {
            log.error("Error processing Domo dataflows:", {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack,
            });
        } else {
            log.error("Unknown error processing Domo dataflows:", error);
        }
        throw error;
    }
}

/**
 * Retrieves detailed information about a specific dataflow with dual API response.
 *
 * @param dataflowId - The unique identifier of the dataflow.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to a DualApiResponse containing v1, v2, and merged data.
 * @throws If the API request fails or the dataflow is not found.
 */
export async function getDataflowDual(
    dataflowId: string,
    authMethod?: DataflowAuthMethod,
): Promise<DualApiResponse<DomoDataflow, V1DataflowResponse>> {
    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    log.info(
        `Fetching details for dataflow ${dataflowId} from dual endpoints...`,
    );

    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const dualResponse = await dataFlowManager.getDataflowDual(dataflowId);

        log.info(
            `Successfully fetched dual response for dataflow ${dataflowId}`,
        );
        return dualResponse;
    } catch (error) {
        log.error(`Error fetching dataflow ${dataflowId}:`, error);
        throw error;
    }
}

/**
 * Retrieves detailed information about a specific dataflow.
 * This is the backward-compatible version that returns merged data.
 *
 * @param dataflowId - The unique identifier of the dataflow.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to a DomoDataflow object.
 * @throws If the API request fails or the dataflow is not found.
 */
export async function getDataflow(
    dataflowId: string,
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflow> {
    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    log.info(`Fetching details for dataflow ${dataflowId}...`);

    try {
        // Get dual response and return the best data
        const dualResponse = await getDataflowDual(dataflowId, authMethod);
        const dataflow = ApiResponseMerger.getBestData(
            dualResponse,
        ) as DomoDataflow;

        if (!dataflow) {
            throw new Error(`Dataflow ${dataflowId} not found`);
        }

        log.info(`Successfully fetched details for dataflow ${dataflowId}`);
        return dataflow;
    } catch (error) {
        log.error(`Error fetching dataflow ${dataflowId}:`, error);
        throw error;
    }
}

/**
 * Creates a new dataflow.
 *
 * @param params - Parameters for creating the dataflow.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to the newly created DomoDataflow object.
 * @throws If the API request fails.
 */
export async function createDataflow(
    params: CreateDataflowParams,
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflow> {
    // Check read-only mode before attempting to create
    checkReadOnlyMode("createDataflow");

    if (!params.name) {
        throw new Error("Dataflow name is required");
    }

    log.info(`Creating new dataflow '${params.name}'...`);
    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const dataflow = await dataFlowManager.createDataflow(params);

        log.info(
            `Successfully created dataflow '${params.name}' with ID ${dataflow.id}`,
        );
        return dataflow;
    } catch (error) {
        log.error(`Error creating dataflow '${params.name}':`, error);
        throw error;
    }
}

/**
 * Updates an existing dataflow with new properties and configuration.
 *
 * @param params - Parameters for updating the dataflow including the dataflowId.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to the updated DomoDataflow object.
 * @throws If the API request fails or the dataflow is not found.
 */
export async function updateDataflow(
    params: UpdateDataflowParams,
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflow> {
    // Check read-only mode before attempting to update
    checkReadOnlyMode("updateDataflow");

    if (!params.dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    log.info(
        `Updating dataflow '${params.name}' (ID: ${params.dataflowId})...`,
    );
    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const dataflow = await dataFlowManager.updateDataflow(
            params.dataflowId,
            params,
        );

        log.info(
            `Successfully updated dataflow '${params.name}' (ID: ${params.dataflowId})`,
        );
        return dataflow;
    } catch (error) {
        log.error(
            `Error updating dataflow '${params.name}' (ID: ${params.dataflowId}):`,
            error,
        );
        throw error;
    }
}

/**
 * Updates specific fields of an existing dataflow without requiring all fields.
 *
 * @param params - Parameters containing the dataflowId and the fields to update.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to the updated DomoDataflow object.
 * @throws If the API request fails or the dataflow is not found.
 */
export async function patchDataflow(
    params: PatchDataflowParams,
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflow> {
    // Check read-only mode before attempting to patch
    checkReadOnlyMode("patchDataflow");

    if (!params.dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    log.info(`Patching dataflow (ID: ${params.dataflowId})...`);

    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const currentDataflow = await dataFlowManager.getDataflow(
            params.dataflowId,
        );

        // Create updated dataflow object
        const updatedDataflow = { ...currentDataflow };

        // Update only provided fields
        if (params.name) updatedDataflow.name = params.name;
        if (params.description !== undefined)
            updatedDataflow.description = params.description;
        if (params.enabled !== undefined)
            updatedDataflow.enabled = params.enabled;
        if (params.tags) updatedDataflow.tags = params.tags;

        // Update dataflow
        const dataflow = await dataFlowManager.updateDataflow(
            params.dataflowId,
            updatedDataflow,
        );

        log.info(`Successfully patched dataflow (ID: ${params.dataflowId})`);
        return dataflow;
    } catch (error) {
        log.error(`Error patching dataflow (ID: ${params.dataflowId}):`, error);
        throw error;
    }
}

/**
 * Deletes a dataflow.
 *
 * @param dataflowId - The unique identifier of the dataflow to delete.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to the delete operation result.
 * @throws If the API request fails or the dataflow is not found.
 */
export async function deleteDataflow(
    dataflowId: string,
    authMethod?: DataflowAuthMethod,
): Promise<DeleteDataflowResponse> {
    // Check read-only mode before attempting to delete
    checkReadOnlyMode("deleteDataflow");

    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    log.info(`Deleting dataflow (ID: ${dataflowId})...`);

    try {
        const client = createDataflowClient(authMethod);

        // Use the client directly since DataFlowManager doesn't return our expected format
        await client.delete(`/api/dataprocessing/v2/dataflows/${dataflowId}`);

        log.info(`Successfully deleted dataflow (ID: ${dataflowId})`);

        return {
            success: true,
            message: `Dataflow ${dataflowId} successfully deleted`,
        };
    } catch (error) {
        log.error(`Error deleting dataflow (ID: ${dataflowId}):`, error);

        return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Lists executions of a dataflow.
 *
 * @param dataflowId - The unique identifier of the dataflow.
 * @param params - Parameters for filtering execution results.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to an array of DomoDataflowExecution objects.
 * @throws If the API request fails.
 */
export async function listDataflowExecutions(
    dataflowId: string,
    params: DataflowExecutionListParams = {},
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflowExecution[]> {
    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    const { limit = 50, offset = 0 } = params;

    log.info(`Fetching executions for dataflow ${dataflowId}...`);

    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const executions =
            await dataFlowManager.getDataflowExecutionsWithPagination(
                dataflowId,
                limit,
                offset,
            );

        // Convert to our expected format if needed
        const result = Array.isArray(executions) ? executions : [];

        log.info(
            `Found ${result.length} executions for dataflow ${dataflowId}`,
        );
        return result as DomoDataflowExecution[];
    } catch (error) {
        log.error(
            `Error fetching executions for dataflow ${dataflowId}:`,
            error,
        );
        throw error;
    }
}

/**
 * Gets detailed information about a specific dataflow execution.
 *
 * @param dataflowId - The unique identifier of the dataflow.
 * @param executionId - The unique identifier of the execution.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to a DomoDataflowExecution object.
 * @throws If the API request fails or the execution is not found.
 */
export async function getDataflowExecution(
    dataflowId: string,
    executionId: number | string,
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflowExecution> {
    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    if (!executionId) {
        throw new Error("Execution ID is required");
    }

    log.info(`Fetching execution ${executionId} for dataflow ${dataflowId}...`);

    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const execution = await dataFlowManager.getExecution(
            dataflowId,
            executionId,
        );

        log.info(
            `Successfully fetched execution ${executionId} for dataflow ${dataflowId}`,
        );
        return execution as DomoDataflowExecution;
    } catch (error) {
        log.error(
            `Error fetching execution ${executionId} for dataflow ${dataflowId}:`,
            error,
        );
        throw error;
    }
}

/**
 * Executes a dataflow.
 *
 * @param dataflowId - The unique identifier of the dataflow to execute.
 * @param params - Optional parameters for the execution.
 * @param authMethod - Optional specific authentication method to use.
 * @returns A promise that resolves to a DomoDataflowExecution object representing the started execution.
 * @throws If the API request fails.
 */
export async function executeDataflow(
    dataflowId: string,
    params: ExecuteDataflowParams = {},
    authMethod?: DataflowAuthMethod,
): Promise<DomoDataflowExecution> {
    // Check read-only mode before attempting to execute
    checkReadOnlyMode("executeDataflow");

    if (!dataflowId) {
        throw new Error("Dataflow ID is required");
    }

    const { mode = "NORMAL", comment: _ } = params;

    log.info(`Executing dataflow ${dataflowId} in ${mode} mode...`);

    try {
        const dataFlowManager = getDataFlowManager(authMethod);
        const execution = await dataFlowManager.runDataFlow(dataflowId);

        log.info(
            `Successfully started execution of dataflow ${dataflowId}, execution ID: ${execution.id}`,
        );
        return execution;
    } catch (error) {
        log.error(`Error executing dataflow ${dataflowId}:`, error);
        throw error;
    }
}

/**
 * Get lineage information for a dataflow
 * @param dataflowId - The ID of the dataflow
 * @param params - Query parameters for lineage traversal
 * @returns The lineage response from the API
 */
export async function getDataflowLineage(
    dataflowId: string,
    params?: DataflowLineageQueryParams,
): Promise<DataflowLineageResponse | null> {
    try {
        // This endpoint requires API token and customer domain
        const v3Client = getV3Client();
        if (!v3Client) {
            log.warn(
                "Dataflow lineage requires API token and DOMO_API_HOST configuration",
            );
            return null;
        }

        // Build query parameters
        const queryParams: Record<string, string> = {};
        if (params?.traverseUp !== undefined) {
            queryParams.traverseUp = params.traverseUp.toString();
        }
        if (params?.traverseDown !== undefined) {
            queryParams.traverseDown = params.traverseDown.toString();
        }
        if (params?.requestEntities) {
            queryParams.requestEntities = params.requestEntities;
        }

        const url = `/api/data/v1/lineage/DATAFLOW/${dataflowId}`;

        log.debug(
            `Fetching lineage for dataflow ${dataflowId} with params:`,
            queryParams,
        );

        const response = await v3Client.get<DataflowLineageResponse>(
            url,
            queryParams,
        );

        return response;
    } catch (error) {
        log.error(`Error fetching dataflow lineage for ${dataflowId}:`, error);
        throw error;
    }
}
