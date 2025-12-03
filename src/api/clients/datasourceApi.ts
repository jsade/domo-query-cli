import { createDataflowClient } from "./dataflowClient.ts";
import type { DataflowAuthMethod } from "./dataflowClient.ts";
import { log } from "../../utils/logger.ts";
import { checkReadOnlyMode } from "../../utils/readOnlyGuard.ts";
import type {
    DatasourceExecution,
    DatasourceExecutionState,
    ExecuteDatasourceParams,
    ExecuteDatasourceResult,
} from "./domoClient.ts";
import { TERMINAL_EXECUTION_STATES } from "./domoClient.ts";

/**
 * Default polling interval for waiting on execution completion (5 seconds)
 */
const DEFAULT_POLL_INTERVAL = 5000;

/**
 * Default timeout for waiting on execution completion (10 minutes)
 */
const DEFAULT_TIMEOUT = 600000;

/**
 * Response from stream search API
 */
interface StreamSearchResult {
    id: number;
    dataSet?: {
        id: string;
        name?: string;
    };
    updateMethod?: string;
    createdAt?: string;
    modifiedAt?: string;
}

/**
 * Response from stream execution API
 */
interface StreamExecutionResponse {
    streamId: number;
    executionId: number;
    currentState: string;
    startedAt?: number;
    endedAt?: number;
    rowsInserted?: number;
    bytesInserted?: number;
    startedBy?: string;
    runType?: string;
    errors?: Array<{ message?: string }>;
}

/**
 * Response from stream details API (used for polling)
 */
interface StreamDetailsResponse {
    id: number;
    dataSource?: {
        id: string;
        name?: string;
        status?: string;
    };
    lastExecution?: StreamExecutionResponse;
    currentExecution?: StreamExecutionResponse | null;
    currentExecutionState?: string;
}

/**
 * Gets the stream ID associated with a dataset
 *
 * @param datasetId - The dataset UUID
 * @param authMethod - Authentication method to use
 * @returns Promise resolving to the numeric stream ID
 * @throws If no stream is found for the dataset
 */
async function getStreamIdForDataset(
    datasetId: string,
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<number> {
    const client = createDataflowClient(authMethod);
    await client.ensureAuthenticated();

    log.debug(`Looking up stream ID for dataset ${datasetId}...`);

    // Search for streams by dataset ID
    const searchUrl = `/api/data/v1/streams/search?q=dataSource.id:${datasetId}`;
    const results = await client.get<StreamSearchResult[]>(searchUrl);

    if (!results || results.length === 0) {
        throw new Error(
            `No stream found for dataset ${datasetId}. ` +
                `This dataset may not be a connector-based datasource.`,
        );
    }

    const streamId = results[0].id;
    log.debug(`Found stream ID ${streamId} for dataset ${datasetId}`);

    return streamId;
}

/**
 * Triggers execution of a datasource (connector-based dataset update)
 *
 * Uses the internal Stream API to trigger a manual execution.
 * Endpoint: POST /api/data/v1/streams/\{streamId\}/executions
 *
 * @param datasetId - The dataset ID (UUID) to execute
 * @param authMethod - Authentication method (default: apiToken)
 * @returns Promise resolving to the execution object
 * @throws If the API request fails or dataset doesn't support execution
 */
export async function triggerDatasourceExecution(
    datasetId: string,
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<DatasourceExecution> {
    checkReadOnlyMode("execute-datasource");

    if (!datasetId) {
        throw new Error("Dataset ID is required");
    }

    const client = createDataflowClient(authMethod);

    log.info(`Triggering datasource execution for dataset ${datasetId}...`);

    // Step 1: Get the stream ID for this dataset
    const streamId = await getStreamIdForDataset(datasetId, authMethod);

    // Step 2: Trigger execution on the stream
    await client.ensureAuthenticated();

    const url = `/api/data/v1/streams/${streamId}/executions`;
    const response = await client.post<StreamExecutionResponse>(url, {
        runType: "MANUAL",
    });

    log.info(
        `Execution triggered: streamId=${response.streamId}, executionId=${response.executionId}`,
    );

    return transformStreamExecutionResponse(datasetId, streamId, response);
}

/**
 * Gets the current status of a datasource execution
 *
 * @param datasetId - The dataset ID
 * @param executionId - The execution ID to check
 * @param authMethod - Authentication method
 * @returns Promise resolving to the execution status
 */
export async function getDatasourceExecution(
    datasetId: string,
    executionId: string,
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<DatasourceExecution> {
    if (!datasetId || !executionId) {
        throw new Error("Dataset ID and execution ID are required");
    }

    const client = createDataflowClient(authMethod);
    await client.ensureAuthenticated();

    // Get stream ID first
    const streamId = await getStreamIdForDataset(datasetId, authMethod);

    log.debug(`Fetching execution status for stream ${streamId}...`);

    // Get stream details which includes last execution
    const url = `/api/data/v1/streams/${streamId}?fields=all`;
    const response = await client.get<StreamDetailsResponse>(url);

    // Check if the requested execution matches current or last execution
    const execution =
        response.currentExecution || response.lastExecution || null;

    if (!execution) {
        throw new Error(`No execution found for stream ${streamId}`);
    }

    // Verify this is the execution we're looking for
    if (String(execution.executionId) !== executionId) {
        log.warn(
            `Requested execution ${executionId} not found, returning latest execution ${execution.executionId}`,
        );
    }

    return transformStreamExecutionResponse(datasetId, streamId, execution);
}

/**
 * Waits for a datasource execution to complete by polling
 *
 * @param datasetId - The dataset ID
 * @param executionId - The execution ID to monitor
 * @param options - Polling options
 * @param authMethod - Authentication method
 * @returns Promise resolving to the final execution state
 */
export async function waitForExecution(
    datasetId: string,
    executionId: string,
    options: ExecuteDatasourceParams = {},
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<DatasourceExecution> {
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const startTime = Date.now();

    log.info(`Waiting for execution ${executionId} to complete...`);

    while (true) {
        const execution = await getDatasourceExecution(
            datasetId,
            executionId,
            authMethod,
        );

        // Check if execution is in a terminal state
        if (isTerminalState(execution.state)) {
            log.info(
                `Execution ${executionId} completed with state: ${execution.state}`,
            );
            return execution;
        }

        // Check for timeout
        if (Date.now() - startTime > timeout) {
            throw new Error(
                `Execution ${executionId} timed out after ${timeout / 1000} seconds. ` +
                    `Current state: ${execution.state}`,
            );
        }

        log.debug(
            `Execution ${executionId} state: ${execution.state}, polling again in ${pollInterval}ms...`,
        );

        // Wait before next poll
        await sleep(pollInterval);
    }
}

/**
 * Executes a datasource with optional wait for completion
 *
 * @param datasetId - The dataset ID to execute
 * @param options - Execution options including wait behavior
 * @param authMethod - Authentication method
 * @returns Promise resolving to the execution result
 */
export async function executeDatasource(
    datasetId: string,
    options: ExecuteDatasourceParams = {},
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<ExecuteDatasourceResult> {
    try {
        const execution = await triggerDatasourceExecution(
            datasetId,
            authMethod,
        );

        if (options.wait && execution.executionId) {
            const finalExecution = await waitForExecution(
                datasetId,
                execution.executionId,
                options,
                authMethod,
            );

            return {
                datasetId,
                success: finalExecution.state === "SUCCESS",
                execution: finalExecution,
                error: finalExecution.errorMessage,
                errorCode:
                    finalExecution.state === "FAILED"
                        ? "EXECUTION_FAILED"
                        : undefined,
            };
        }

        return {
            datasetId,
            success: true,
            execution,
        };
    } catch (error) {
        return {
            datasetId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            errorCode: getErrorCode(error),
        };
    }
}

/**
 * Executes multiple datasources in parallel
 *
 * @param datasetIds - Array of dataset IDs to execute
 * @param options - Execution options
 * @param authMethod - Authentication method
 * @returns Promise resolving to array of results
 */
export async function executeDatasources(
    datasetIds: string[],
    options: ExecuteDatasourceParams = {},
    authMethod: DataflowAuthMethod = "apiToken",
): Promise<ExecuteDatasourceResult[]> {
    checkReadOnlyMode("execute-datasource");

    if (!datasetIds || datasetIds.length === 0) {
        throw new Error("At least one dataset ID is required");
    }

    log.info(`Executing ${datasetIds.length} datasource(s)...`);

    // Execute all in parallel
    const results = await Promise.all(
        datasetIds.map(id => executeDatasource(id, options, authMethod)),
    );

    return results;
}

// ============ Helper Functions ============

/**
 * Transforms stream execution response to DatasourceExecution
 */
function transformStreamExecutionResponse(
    datasetId: string,
    _streamId: number,
    response: StreamExecutionResponse,
): DatasourceExecution {
    // Map currentState to our state type
    // API returns: ACTIVE, SUCCESS, FAILED, etc.
    const state = mapExecutionState(response.currentState);

    return {
        executionId: String(response.executionId),
        datasetId,
        state,
        startTime:
            typeof response.startedAt === "number"
                ? Math.floor(response.startedAt * 1000) // Convert seconds to ms if needed
                : undefined,
        endTime:
            typeof response.endedAt === "number"
                ? Math.floor(response.endedAt * 1000)
                : undefined,
        triggeredBy: response.startedBy,
        errorMessage:
            response.errors && response.errors.length > 0
                ? response.errors.map(e => e.message).join("; ")
                : undefined,
        rowsProcessed: response.rowsInserted,
    };
}

/**
 * Maps API state string to typed execution state
 */
function mapExecutionState(state: unknown): DatasourceExecutionState {
    if (typeof state !== "string") return "UNKNOWN";

    const normalized = state.toUpperCase();

    // Map ACTIVE to RUNNING for consistency
    if (normalized === "ACTIVE") return "RUNNING";

    const validStates: DatasourceExecutionState[] = [
        "PENDING",
        "QUEUED",
        "RUNNING",
        "SUCCESS",
        "FAILED",
        "CANCELLED",
    ];

    return validStates.includes(normalized as DatasourceExecutionState)
        ? (normalized as DatasourceExecutionState)
        : "UNKNOWN";
}

/**
 * Checks if execution state is terminal (completed)
 */
function isTerminalState(state: DatasourceExecutionState): boolean {
    return TERMINAL_EXECUTION_STATES.includes(state);
}

/**
 * Extracts error code from error
 */
function getErrorCode(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes("not found")) return "NOT_FOUND";
        if (error.message.includes("No stream found")) return "NOT_CONNECTOR";
        if (error.message.includes("authentication")) return "AUTH_FAILED";
        if (error.message.includes("rate limit")) return "RATE_LIMITED";
        if (error.message.includes("not supported")) return "NOT_SUPPORTED";
    }
    return "EXECUTION_ERROR";
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
