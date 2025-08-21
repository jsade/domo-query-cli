import fetch, { HeadersInit, RequestInit } from "node-fetch";
import { domoConfig, initializeConfig } from "../../config.ts";
import { getCacheManager } from "../../core/cache/CacheManager.ts";
import { getDomoClient, getV3Client } from "./clientManager.ts";
import { DomoApiTokenAuth, DomoAuth, DomoOAuthAuth } from "../../DomoAuth.ts";
import { log } from "../../utils/logger.ts";
import { getFetchOptionsWithProxy } from "../utils/proxyUtils.ts";
import { BaseClient } from "./baseClient.ts";

/**
 * Defines a Domo dataflow
 * Based on both the search API response and get-dataflow response
 */
export interface DomoDataflow {
    id: string;
    name: string;
    description?: string;
    documentVersion?: number;
    editable?: boolean;
    enabled?: boolean;
    restricted?: boolean;
    databaseType?: string;
    dapDataFlowId?: string;
    responsibleUserId?: number;
    runState?: string;
    onboardFlowVersion?: number;
    lastSuccessfulExecution?: number;
    createdAt: string;
    modified?: number;
    inputCount?: number;
    outputCount?: number;
    executionCount?: number;
    executionSuccessCount?: number;
    status?: string;
    lastRun?: string;
    lastUpdated?: string;
    owner?: string;
    tags?: string[];
    lastExecution?: DomoDataflowExecution;
    scheduleInfo?: {
        frequency: string;
        startTime?: string;
        startDate?: number;
        timeZone?: string;
    };
    inputs?: Array<{
        id: string;
        name: string;
        dataSourceId: string;
    }>;
    outputs?: Array<{
        id: string;
        name: string;
        dataSourceId: string;
    }>;
    actions?: Array<{
        name: string;
        type: string;
        configuration: Record<string, unknown>;
    }>;

    // Additional fields from search API that were being discarded
    permissionMask?: number;
    passwordProtected?: boolean;
    ownedById?: string;
    ownedByType?: string;
    owners?: Array<{
        displayName: string;
        id: string;
        type: string;
    }>;
    successRate?: number;
    runCount?: number;
    computeCloud?: string;
    dataFlowType?: string;
    language?: string;
    useGraphUI?: boolean;
    paused?: boolean;
    lastIndexed?: string;
    score?: number;
    requestAccess?: boolean;
}

/**
 * Defines a Domo dataflow execution
 */
export interface DomoDataflowExecution {
    id: number;
    beginTime?: number;
    endTime?: number;
    state?: string;
    activationType?: string;
    dataFlowVersion?: number;
    dataProcessor?: string;
    totalRowsRead?: number;
    totalBytesRead?: number;
    totalRowsWritten?: number;
    totalBytesWritten?: number;
    meanDownloadRateKbps?: number;
    inputDataSources?: Array<{
        dataSourceId: string;
        dataVersionId?: string;
        rowsRead?: number;
        bytesRead?: number;
        downloadTime?: number;
        onlyLoadNewVersions?: boolean;
    }>;
    outputDataSources?: Array<{
        dataSourceId: string;
        dataVersionId?: string;
        rowsWritten?: number;
        bytesWritten?: number;
    }>;
    executionEngine?: {
        platform?: string;
        engine?: string;
    };
    logs?: Array<{
        timestamp: number;
        level: string;
        message: string;
    }>;
}

/**
 * Parameters for listing dataflows
 */
export interface DataflowListParams {
    limit?: number;
    offset?: number;
    nameLike?: string;
    sort?: DataflowSort;
    order?: "asc" | "desc";
    fields?: string;
    tags?: string;
}

/**
 * Available sort options for dataflows
 */
export type DataflowSort =
    | "name"
    | "nameDescending"
    | "status"
    | "lastRun"
    | "owner";

/**
 * Parameters for listing dataflow executions
 */
export interface DataflowExecutionListParams {
    limit?: number;
    offset?: number;
    status?: "SUCCESS" | "FAILED" | "RUNNING";
    fromDate?: number;
    toDate?: number;
}

/**
 * Parameters for executing a dataflow
 */
export interface ExecuteDataflowParams {
    mode?: "NORMAL" | "DEBUG" | "PROFILE";
    comment?: string;
}

/**
 * Parameters for creating a dataflow
 */
export interface CreateDataflowParams {
    name: string;
    description?: string;
    [key: string]: unknown;
}

/**
 * Parameters for updating a dataflow
 */
export interface UpdateDataflowParams {
    dataflowId: string;
    name?: string;
    description?: string;
    enabled?: boolean;
    tags?: string[];
    [key: string]: unknown;
}

/**
 * Parameters for patching a dataflow
 */
export interface PatchDataflowParams {
    dataflowId: string;
    name?: string;
    description?: string;
    enabled?: boolean;
    tags?: string[];
}

/**
 * Response for deleting a dataflow
 */
export interface DeleteDataflowResponse {
    success: boolean;
    message: string;
}

/**
 * Defines a Domo dataset
 * Based on Domo API Schema v1/datasets
 */
export interface DomoDataset {
    id: string;
    name: string;
    description?: string;
    rows: number;
    columns: number;
    schema?: Array<{
        name: string;
        type: string;
        id?: string;
        visible?: boolean;
        metadata?: {
            colLabel?: string;
            colFormat?: string;
            isEncrypted?: boolean;
        };
    }>;
    createdAt: string;
    updatedAt: string;
    dataCurrentAt?: string;
    owner?:
        | string
        | {
              id?: string;
              name?: string;
              displayName?: string;
              avatarKey?: string;
              type?: string;
              group?: boolean;
          };
    dataStatus?: string;
    pdpEnabled?: boolean;
    policies?: Array<{
        id?: number;
        type?: string;
        name?: string;
        filters?: Array<{
            column: string;
            values: string[];
            operator: string;
            not: boolean;
        }>;
        users?: number[];
        groups?: Array<Record<string, unknown>>;
    }>;
    certification?: {
        state?: string;
        certifiedBy?: string;
        certifiedAt?: string;
    };
    tags?: string[];

    // v3-exclusive fields (optional, only available when API token is configured)
    displayType?: string;
    dataProviderType?: string;
    streamId?: number;
    accountId?: number;
    cardInfo?: {
        cardCount: number;
        cardViewCount: number;
    };
    permissions?: string;
    scheduleActive?: boolean;
    cloudId?: string;
    cloudName?: string;
    cryoStatus?: string;
}

/**
 * Parameters for listing datasets
 * Based on Domo API Schema v1/datasets
 */
export interface DatasetListParams {
    limit?: number;
    offset?: number;
    nameLike?: string;
    sort?: DatasetSort;
}

/**
 * Available sort options for datasets
 * Based on Domo API Schema v1/datasets
 */
export type DatasetSort =
    | "name"
    | "nameDescending"
    | "lastTouched"
    | "lastTouchedAscending"
    | "lastUpdated"
    | "lastUpdatedAscending"
    | "createdAt"
    | "createdAtAscending"
    | "cardCount"
    | "cardCountAscending"
    | "cardViewCount"
    | "cardViewCountAscending"
    | "errorState"
    | "errorStateDescending"
    | "dataSourceId";

/**
 * Defines a Domo card
 * Based on Domo API Schema v1/cards
 */
export interface DomoCard {
    id: string;
    cardUrn?: string;
    cardTitle?: string;
    title?: string; // For backward compatibility
    description?: string;
    type?: string;
    lastModified?: number; // Timestamp format
    lastUpdated?: string; // String format (for backward compatibility)
    ownerId?: number;
    ownerName?: string;
    owner?: string; // For backward compatibility
    datasets?: string[];
    pages?: number[];
    definition?: {
        calculatedFields?: Array<{
            formula: string;
            id: string;
            name: string;
            saveToDataSet: boolean;
        }>;
        chartType?: string;
        chartVersion?: string;
        dataSetId?: string;
        description?: string;
        title?: string;
        urn?: string;
    };
}

/**
 * Defines a Domo page
 */
export interface DomoPage {
    id: string;
    name: string;
    description?: string;
    visibility?: string;
    cardCount?: number;
    owner?: string;
}

/**
 * Parameters for listing cards
 * Based on Domo API Schema v1/cards
 */
export interface CardListParams {
    limit?: number;
    offset?: number;
}

/**
 * Defines parts of a KPI card that can be rendered
 */
export type KpiCardPart =
    | "image"
    | "summary"
    | "title"
    | "imagePNG"
    | "imagePDF"
    | "all";

/**
 * Function to list Domo cards
 * Uses the v1/cards endpoint from the Domo API Schema
 */
export async function listCards(
    params: CardListParams = {},
): Promise<DomoCard[]> {
    const client = getDomoClient();
    const apiParams: Record<string, string | number> = {};

    // Set defaults per API schema if not specified
    apiParams.limit = params.limit ?? 35; // Default per API schema
    apiParams.offset = params.offset ?? 0;

    // Use the v1/cards endpoint as specified in the API schema
    const response = await client.get<unknown>("/v1/cards", apiParams);

    // Process the response based on the API schema
    if (response && typeof response === "object" && "cards" in response) {
        // API returns { cards: [] }
        const cardsData = (response as { cards: Record<string, unknown>[] })
            .cards;

        if (Array.isArray(cardsData)) {
            return cardsData.map(card => {
                // Defensive extraction and type guards
                const cardUrn =
                    typeof card.cardUrn === "string" ? card.cardUrn : undefined;
                const cardTitle =
                    typeof card.cardTitle === "string"
                        ? card.cardTitle
                        : undefined;
                const lastModified =
                    typeof card.lastModified === "number"
                        ? card.lastModified
                        : undefined;
                const ownerId =
                    typeof card.ownerId === "number" ? card.ownerId : undefined;
                const ownerName =
                    typeof card.ownerName === "string"
                        ? card.ownerName
                        : undefined;
                const pages = Array.isArray(card.pages)
                    ? card.pages
                    : undefined;
                const type =
                    typeof card.type === "string" ? card.type : undefined;
                return {
                    id: cardUrn || "", // Use cardUrn as id, fallback to empty string
                    cardUrn,
                    cardTitle,
                    title: cardTitle, // For backward compatibility
                    lastModified,
                    lastUpdated:
                        lastModified !== undefined
                            ? new Date(lastModified).toISOString()
                            : undefined,
                    ownerId,
                    ownerName,
                    owner: ownerName, // For backward compatibility
                    pages,
                    type,
                };
            });
        }
    }

    // Fallback to legacy endpoint if v1/cards doesn't work
    // This ensures backward compatibility during migration
    try {
        const legacyResponse = await client.get<unknown>(
            "/api/content/v1/cards",
        );
        if (Array.isArray(legacyResponse)) {
            return legacyResponse;
        }
    } catch (error) {
        // Log but don't throw, we already tried the main endpoint
        log.warn("Failed to fetch cards from legacy endpoint:", error);
    }

    return [];
}

/**
 * Function to list Domo pages
 */
export async function listPages(): Promise<DomoPage[]> {
    const client = getDomoClient();
    const response = await client.get<unknown>("/api/content/v1/pages");
    return Array.isArray(response) ? response : [];
}

/**
 * Function to list Domo datasets
 * Uses the v1/datasets endpoint from the Domo API Schema
 */
export async function listDatasets(
    params: DatasetListParams = {},
): Promise<DomoDataset[]> {
    const cacheManager = getCacheManager();

    // Check cache first
    const cachedDatasets = await cacheManager.getDatasetList(params);
    if (cachedDatasets) {
        return cachedDatasets;
    }

    const client = getDomoClient();
    const apiParams: Record<string, string | number> = {};

    // Set defaults per API schema if not specified
    apiParams.limit = params.limit ?? 50;
    apiParams.offset = params.offset ?? 0;

    // Add optional parameters
    if (params.nameLike) apiParams.nameLike = params.nameLike;
    if (params.sort) apiParams.sort = params.sort;

    // Use the v1/datasets endpoint as specified in the API schema
    const response = await client.get<unknown>("/v1/datasets", apiParams);

    let datasets: DomoDataset[] = [];

    if (Array.isArray(response)) {
        // Transform response to match DomoDataset interface if needed
        datasets = response.map(dataset => ({
            ...dataset,
            // Ensure backward compatibility by setting expected properties
            id: dataset.id || "",
            name: dataset.name || "",
            rows: dataset.rows || 0,
            columns: dataset.columns || 0,
            createdAt: dataset.createdAt || "",
            updatedAt: dataset.updatedAt || "",
        }));

        // Cache the datasets
        await cacheManager.setDatasetList(datasets, params);
    }

    return datasets;
}

/**
 * Function to update dataset properties
 * Uses the v3/datasources endpoint with API token authentication
 * @param datasetId - The ID of the dataset to update
 * @param properties - The properties to update (name, description, tags)
 * @returns The updated dataset or null if error
 */
export async function updateDatasetProperties(
    datasetId: string,
    properties: {
        name?: string;
        description?: string;
        tags?: string[];
    },
): Promise<DomoDataset | null> {
    // Ensure we have an API token since this endpoint requires it
    if (!domoConfig.initialized) {
        initializeConfig();
    }

    if (!domoConfig.apiToken) {
        throw new Error(
            "API token is required for the update-dataset-properties endpoint. Please set DOMO_API_TOKEN environment variable.",
        );
    }

    if (!domoConfig.apiHost) {
        throw new Error(
            "Domo API host is required for the update-dataset-properties endpoint. Please set DOMO_API_HOST environment variable.",
        );
    }

    try {
        // Create client with API token authentication using the customer's domain
        const client = createApiTokenClient(
            domoConfig.apiToken,
            domoConfig.apiHost,
        );

        // Build the request body
        const requestBody: Record<string, unknown> = {};
        if (properties.name !== undefined) {
            requestBody.name = properties.name;
        }
        if (properties.description !== undefined) {
            requestBody.description = properties.description;
        }
        if (properties.tags !== undefined) {
            requestBody.tags = properties.tags;
        }

        log.debug(`Updating dataset ${datasetId} properties:`, requestBody);

        // Make the PUT request to update properties
        const response = await client.put<DomoDataset>(
            `/api/data/v3/datasources/${datasetId}/properties`,
            requestBody,
        );

        if (response) {
            // Clear cache for this dataset since it's been updated
            const cacheManager = getCacheManager();
            await cacheManager.invalidate(`dataset_${datasetId}`);

            return response;
        }
    } catch (error) {
        log.error("Error updating dataset properties:", error);
        throw error;
    }

    return null;
}

/**
 * V3 API response structure for dataset endpoint
 */
interface V3DatasetResponse {
    id?: string;
    name?: string;
    description?: string;
    displayType?: string;
    dataProviderType?: string;
    streamId?: number;
    accountId?: number;
    cardInfo?: {
        cardCount: number;
        cardViewCount: number;
    };
    permissions?: string;
    scheduleActive?: boolean;
    cloudId?: string;
    cloudName?: string;
    cryoStatus?: string;
    created?: number;
    lastUpdated?: number;
    rowCount?: number;
    columnCount?: number;
}

/**
 * Function to get a specific dataset by ID
 * Uses the v1/datasets endpoint by default
 * v3/datasources endpoint code is commented out due to frequent 404 errors
 */
export async function getDataset(
    datasetId: string,
): Promise<DomoDataset | null> {
    const cacheManager = getCacheManager();

    // Check cache first
    const cacheKey = `dataset_${datasetId}`;
    const cachedDataset = await cacheManager.get<DomoDataset>(cacheKey);
    if (cachedDataset) {
        return cachedDataset;
    }

    // First, get v1 data (always needed for schema and policies)
    const client = getDomoClient(); // Uses OAuth by default
    let v1Dataset: DomoDataset | null = null;

    try {
        const response = await client.get<DomoDataset>(
            `/v1/datasets/${datasetId}`,
        );

        if (response) {
            v1Dataset = response;
            log.debug(
                `Successfully fetched dataset ${datasetId} from v1 endpoint`,
            );
        }
    } catch (error) {
        log.error("Error fetching dataset from v1:", error);
        return null;
    }

    if (!v1Dataset) {
        return null;
    }

    // Optionally enhance with v3 data if API token and customer domain are available
    const v3Client = getV3Client();
    if (v3Client) {
        try {
            log.debug(
                `Attempting to enhance dataset ${datasetId} with v3 metadata using customer domain`,
            );

            const v3Response = await v3Client.get<V3DatasetResponse>(
                `/api/data/v3/datasources/${datasetId}?includeAllDetails=true`,
            );

            if (v3Response) {
                log.debug(
                    `Successfully fetched v3 metadata for dataset ${datasetId}`,
                );

                // Enhance v1 dataset with v3-exclusive fields
                const enhancedDataset: DomoDataset = {
                    ...v1Dataset,
                    // v3 provides additional metadata not available in v1
                    displayType: v3Response.displayType,
                    dataProviderType: v3Response.dataProviderType,
                    streamId: v3Response.streamId,
                    accountId: v3Response.accountId,
                    cardInfo: v3Response.cardInfo,
                    permissions: v3Response.permissions,
                    scheduleActive: v3Response.scheduleActive,
                    cloudId: v3Response.cloudId,
                    cloudName: v3Response.cloudName,
                    cryoStatus: v3Response.cryoStatus,
                    // Convert v3 timestamps to ISO strings if needed
                    createdAt: v3Response.created
                        ? new Date(v3Response.created).toISOString()
                        : v1Dataset.createdAt,
                    updatedAt: v3Response.lastUpdated
                        ? new Date(v3Response.lastUpdated).toISOString()
                        : v1Dataset.updatedAt,
                    // Keep v1 schema and policies as v3 doesn't provide them
                    schema: v1Dataset.schema,
                    policies: v1Dataset.policies,
                    pdpEnabled: v1Dataset.pdpEnabled,
                };

                // Cache the enhanced result
                await cacheManager.set(cacheKey, enhancedDataset, 300); // Cache for 5 minutes
                return enhancedDataset;
            }
        } catch (error) {
            // Log but don't fail - v3 is optional enhancement only
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            log.debug(
                `v3 enhancement failed for dataset ${datasetId}: ${errorMessage}`,
            );
        }
    } else {
        log.debug(
            "V3 enhancement skipped - API token or customer domain not configured",
        );
    }

    // Cache and return v1 dataset if v3 enhancement wasn't available
    await cacheManager.set(cacheKey, v1Dataset, 300); // Cache for 5 minutes
    return v1Dataset;
}

/**
 * Function to render a KPI card
 */
export async function renderKpiCard(
    cardId: string,
    parts: KpiCardPart[],
): Promise<unknown> {
    console.log("renderKpiCard called with:", { cardId, parts });

    // Ensure we have an API token since this endpoint requires it
    if (!domoConfig.initialized) {
        initializeConfig();
    }

    if (!domoConfig.apiToken) {
        throw new Error(
            "API token is required for the render-card endpoint. Please set DOMO_API_TOKEN environment variable.",
        );
    }

    if (!domoConfig.apiHost) {
        throw new Error(
            "Domo API host is required for the render-card endpoint. Please set DOMO_API_HOST environment variable.",
        );
    }

    // Create client with API token authentication using the customer's domain
    const client = createApiTokenClient(
        domoConfig.apiToken,
        domoConfig.apiHost,
    );

    // Build URL with query parameters
    const queryParams = `?parts=${parts.join(",")}`;
    const url = `/api/content/v1/cards/kpi/${cardId}/render${queryParams}`;

    // Request body as specified
    const requestBody = {
        queryOverrides: {
            filters: [],
        },
        width: 1024,
        height: 1024,
        scale: 2,
    };

    const response = await client.put<unknown>(url, requestBody);

    // The response should be a JSON object with image and summary properties
    return response;
}

/**
 * Client for making authenticated requests to the Domo API
 */
export class DomoClient implements BaseClient {
    private domain: string;
    private auth: DomoAuth;

    /**
     * Constructor
     * @param auth - The authentication handler
     * @param domain - The Domo instance domain
     */
    constructor(auth: DomoAuth, domain: string) {
        this.auth = auth;
        this.domain = domain;
    }

    /**
     * Ensures the client is authenticated before making requests
     * @returns Authentication status
     */
    async ensureAuthenticated(): Promise<boolean> {
        return await this.auth.ensureAuthenticated(this);
    }

    /**
     * Make a GET request to the Domo API
     * @param url - The API endpoint path
     * @param params - Optional query parameters
     * @returns The API response
     */
    async get<T>(
        url: string,
        params: Record<string, string | number> = {},
    ): Promise<T> {
        log.info(`Preparing GET request to endpoint: ${url}`);

        // Ensure we're authenticated before making the request
        const authSuccess = await this.ensureAuthenticated();
        log.debug(
            `Authentication status: ${authSuccess ? "Authenticated" : "Not authenticated"}`,
        );

        if (!authSuccess) {
            const error = new Error(
                "Authentication failed before making API request",
            );
            log.error(error);
            throw error;
        }

        // Build query string
        const queryString =
            Object.keys(params).length > 0
                ? "?" +
                  new URLSearchParams(
                      Object.entries(params).map(([key, value]) => [
                          key,
                          String(value),
                      ]),
                  ).toString()
                : "";

        const requestUrl = `https://${this.domain}${url}${queryString}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making GET request to ${requestUrl}`);

        // Record start time for duration tracking
        const startTime = Date.now();

        const fetchOptions = getFetchOptionsWithProxy(requestUrl, {
            method: "GET",
            headers: config.headers,
        });

        const response = await fetch(requestUrl, fetchOptions);

        // Log completion time
        const requestDuration = Date.now() - startTime;
        log.info(
            `GET ${url} completed with status ${response.status} in ${requestDuration}ms`,
        );

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        // Special handling for render endpoints which might return different content types
        const contentType = response.headers.get("content-type");
        if (
            url.includes("/render") &&
            contentType &&
            !contentType.includes("application/json")
        ) {
            // For render endpoints, return the response object itself
            return response as unknown as T;
        }

        const data = await response.json();
        return data as T;
    }

    /**
     * Make a POST request to the Domo API
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    async post<T>(
        url: string,
        body: Record<string, unknown> | null = null,
    ): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making POST request to ${requestUrl}`);

        const requestOptions: RequestInit = {
            method: "POST",
            headers: config.headers,
        };

        // Add body if provided
        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        const fetchOptions = getFetchOptionsWithProxy(
            requestUrl,
            requestOptions,
        );
        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        const data = await response.json();
        return data as T;
    }

    /**
     * Make a PUT request to the Domo API
     * @param url - The API endpoint path
     * @param body - Optional request body
     * @returns The API response
     */
    async put<T>(
        url: string,
        body: Record<string, unknown> | null = null,
    ): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making PUT request to ${requestUrl}`);

        const requestOptions: RequestInit = {
            method: "PUT",
            headers: config.headers,
        };

        // Add body if provided
        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        const fetchOptions = getFetchOptionsWithProxy(
            requestUrl,
            requestOptions,
        );
        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        // Special handling for render endpoints which might return different content types
        const contentType = response.headers.get("content-type");
        if (
            url.includes("/render") &&
            contentType &&
            !contentType.includes("application/json")
        ) {
            // For render endpoints, return the response object itself
            return response as unknown as T;
        }

        const data = await response.json();
        return data as T;
    }

    /**
     * Make a DELETE request to the Domo API
     * @param url - The API endpoint path
     * @returns The API response
     */
    async delete<T>(url: string): Promise<T> {
        await this.ensureAuthenticated();

        const requestUrl = `https://${this.domain}${url}`;

        // Create headers with auth
        const headers: HeadersInit = {
            Accept: "application/json",
        };

        // Apply auth interceptor to add auth headers
        const config = this.auth.getAuthInterceptor(this)({ headers });

        log.debug(`Making DELETE request to ${requestUrl}`);

        const fetchOptions = getFetchOptionsWithProxy(requestUrl, {
            method: "DELETE",
            headers: config.headers,
        });
        const response = await fetch(requestUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            log.error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
            );
            throw new Error(
                `API request failed: ${response.statusText} - ${errorText}`,
            );
        }

        try {
            const data = await response.json();
            return data as T;
        } catch {
            // Some DELETE endpoints might not return JSON
            return {} as T;
        }
    }

    /**
     * Get the domain of this client
     * @returns The domain
     */
    getDomain(): string {
        return this.domain;
    }
}

/**
 * Creates an authenticated Domo client based on the configuration
 * For regular API endpoints (non-dataflow) that use api.domo.com
 * @param useOAuth - Force the use of OAuth authentication even if API token is available
 * @returns A new DomoClient instance
 */
export function createDomoClient(useOAuth: boolean = true): DomoClient {
    if (!domoConfig.initialized) {
        initializeConfig();
    }

    let auth: DomoAuth;

    // Use OAuth authentication if requested or if API token isn't available
    if (useOAuth || !domoConfig.apiToken) {
        log.debug("Using OAuth authentication for api.domo.com");
        auth = new DomoOAuthAuth(); // Token will be retrieved by OAuthTokenManager
    }
    // Otherwise use API token authentication as fallback
    else {
        log.debug("Using API token authentication for api.domo.com");
        auth = new DomoApiTokenAuth(domoConfig.apiToken);
    }

    // For regular API endpoints (non-dataflow), always use api.domo.com
    return new DomoClient(auth, "api.domo.com");
}

/**
 * Create a Domo client with API token authentication
 * @param apiToken - The Domo API token
 * @param domain - The Domo instance domain (defaults to api.domo.com)
 * @returns A new DomoClient instance
 */
export function createApiTokenClient(
    apiToken: string,
    domain: string = "api.domo.com",
): DomoClient {
    return new DomoClient(new DomoApiTokenAuth(apiToken), domain);
}

/**
 * Create a Domo client with OAuth authentication
 * @param domain - The Domo instance domain (defaults to api.domo.com)
 * @returns A new DomoClient instance
 */
export function createOAuthClient(domain: string = "api.domo.com"): DomoClient {
    return new DomoClient(new DomoOAuthAuth(), domain);
}
