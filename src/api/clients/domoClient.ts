import fetch, { HeadersInit, RequestInit } from "node-fetch";
import { domoConfig, initializeConfig } from "../../config.ts";
import { getCacheManager } from "../../core/cache/CacheManager.ts";
import { getDomoClient, getV3Client } from "./clientManager.ts";
import { DomoApiTokenAuth, DomoAuth, DomoOAuthAuth } from "../../DomoAuth.ts";
import { log } from "../../utils/logger.ts";
import { getFetchOptionsWithProxy } from "../utils/proxyUtils.ts";
import { BaseClient } from "./baseClient.ts";
import {
    ApiResponseMerger,
    DualApiResponse,
} from "../../utils/apiResponseMerger.ts";

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

    // Additional fields from v1 endpoint
    gui?: unknown; // GUI canvas structure
    actions?: Array<{
        type?: string;
        id?: string;
        name?: string;
        dependsOn?: string[];
        settings?: Record<string, unknown>;
        gui?: Record<string, unknown>;
        input?: string;
        inputs?: string[];
        dataSource?: Record<string, unknown>;
        filter?: unknown;
        expressions?: unknown[];
        tables?: Array<{
            id?: string;
            name?: string;
        }>;
        versionChainType?: string;
        partitionIdColumns?: string[];
        schemaSource?: string;
        partitioned?: boolean;
        columns?: Array<Record<string, unknown>>;
        notes?: Array<Record<string, unknown>>;
    }>; // Transformation steps/actions from v1 API
    engineProperties?: Record<string, string>;
    triggerSettings?: {
        triggers?: Array<{
            title?: string;
            triggerId?: number;
            triggerEvents?: Array<{
                datasetId?: string;
                triggerOnDataChanged?: boolean;
                type?: string;
            }>;
            triggerConditions?: unknown[];
        }>;
        zoneId?: string;
        locale?: string;
    };
    hydrationState?: string;
    useLegacyTriggerBehavior?: boolean;
    abandoned?: boolean;
    neverAbandon?: boolean;
    settings?: Record<string, unknown>;
    deleted?: boolean;
    draft?: boolean;
    triggeredByInput?: boolean;
    magic?: boolean;
    container?: boolean;
    subsetProcessing?: boolean;
    onboardFlowVersionDetails?: {
        id?: number;
        timeStamp?: number;
        authorId?: number;
        description?: string;
        numInputs?: number;
        numOutputs?: number;
        executionCount?: number;
        executionSuccessCount?: number;
        versionNumber?: number;
    };
}

/**
 * V1 Dataflow API Response interface
 * Based on /api/dataprocessing/v1/dataflows/:id endpoint
 */
export interface V1DataflowResponse {
    gui?: {
        version?: string;
        canvases?: Record<
            string,
            {
                canvasSettings?: Record<string, unknown>;
                elements?: Array<{
                    x?: number;
                    y?: number;
                    id?: string;
                    type?: string;
                    color?: number | null;
                    colorSource?: string | null;
                }>;
            }
        >;
    };
    actions?: Array<{
        type?: string;
        id?: string;
        name?: string;
        dependsOn?: string[];
        settings?: Record<string, unknown>;
        gui?: {
            x?: number;
            y?: number;
            color?: number | null;
            colorSource?: string | null;
            sampleJson?: unknown;
        };
        input?: string;
        inputs?: string[];
        dataSource?: {
            guid?: string;
            type?: string;
            name?: string;
            cloudId?: string;
            description?: string;
        };
        filter?: unknown;
        expressions?: unknown[];
        tables?: Array<{
            id?: string;
            name?: string;
        }>;
        versionChainType?: string;
        partitionIdColumns?: string[];
        schemaSource?: string;
        partitioned?: boolean;
        columns?: Array<{
            name?: string;
            rename?: string;
            type?: string | null;
            dateFormat?: string | null;
            settings?: Record<string, unknown>;
            remove?: boolean;
        }>;
        notes?: Array<{
            x1?: number | null;
            y1?: number | null;
            x2?: number | null;
            y2?: number | null;
            body?: string;
        }>;
    }>;
    engineProperties?: Record<string, string>;
    inputs?: Array<{
        dataSourceId?: string;
        executeFlowWhenUpdated?: boolean;
        dataSourceName?: string;
        onlyLoadNewVersions?: boolean;
        recentVersionCutoffMs?: number;
    }>;
    outputs?: Array<{
        onboardFlowId?: string | null;
        dataSourceId?: string;
        dataSourceName?: string;
        versionChainType?: string;
    }>;
    executionCount?: number;
    executionSuccessCount?: number;
    hydrationState?: string;
    useLegacyTriggerBehavior?: boolean;
    passwordProtected?: boolean;
    deleted?: boolean;
    abandoned?: boolean;
    neverAbandon?: boolean;
    settings?: {
        sqlDialect?: string;
    };
    triggerSettings?: {
        triggers?: Array<{
            title?: string;
            triggerEvents?: Array<{
                datasetId?: string;
                triggerOnDataChanged?: boolean;
                type?: string;
            }>;
            triggerConditions?: unknown[];
            triggerId?: number;
        }>;
        zoneId?: string;
        locale?: string;
    };
    paused?: boolean;
    enabled?: boolean;
    onboardFlowVersion?: {
        id?: number;
        timeStamp?: number;
        authorId?: number;
        description?: string;
        numInputs?: number;
        numOutputs?: number;
        executionCount?: number;
        executionSuccessCount?: number;
        versionNumber?: number;
    };
    databaseType?: string;
    editable?: boolean;
    draft?: boolean;
    triggeredByInput?: boolean;
    numInputs?: number;
    numOutputs?: number;
    magic?: boolean;
    restricted?: boolean;
    subsetProcessing?: boolean;
    container?: boolean;
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
 * Parameters for querying dataflow lineage
 */
export interface DataflowLineageQueryParams {
    traverseUp?: boolean;
    traverseDown?: boolean;
    requestEntities?: string;
}

/**
 * Represents a lineage entity (parent or child) in the lineage response
 */
export interface LineageEntity {
    type: string;
    id: string;
    complete: boolean;
    children: LineageEntity[];
    parents: LineageEntity[];
}

/**
 * Response from the dataflow lineage API endpoint
 */
export interface DataflowLineageResponse {
    [key: string]: {
        type: string;
        id: string;
        descendantCounts: Record<string, number>;
        ancestorCounts: Record<string, number>;
        complete: boolean;
        children: LineageEntity[];
        parents: LineageEntity[];
    };
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
    type?: string;
    status?: string;
    state?: string;
    streamId?: number;
    accountId?: number;
    cardInfo?: {
        cardCount: number;
        cardViewCount: number;
    };
    cardCount?: number;
    permissions?: string;
    scheduleActive?: boolean;
    cloudId?: string;
    cloudName?: string;
    cloudEngine?: string;
    cryoStatus?: string;
    lastTouched?: number;
    nextUpdate?: number;
    validConfiguration?: boolean;
    validAccount?: boolean;
    transportType?: string;
    adc?: boolean;
    adcExternal?: boolean;
    adcSource?: string;
    masked?: boolean;
    currentUserFullAccess?: boolean;
    hidden?: boolean;
    properties?: {
        formulas?: {
            formulas?: Record<
                string,
                {
                    templateId?: number;
                    id?: string;
                    name?: string;
                    formula?: string;
                    status?: string;
                    dataType?: string;
                    persistedOnDataSource?: boolean;
                    isAggregatable?: boolean;
                    bignumber?: boolean;
                    columnPositions?: Array<{
                        columnName: string;
                        columnPosition: number;
                    }>;
                    variable?: boolean;
                }
            >;
        };
    };
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
 * Defines a Domo user
 * Based on Domo Platform API v1/users
 */
export interface DomoUser {
    id: number;
    name: string;
    email: string;
    alternateEmail?: string;
    role: "Admin" | "Privileged" | "Participant";
    roleId?: string;
    title?: string;
    phone?: string;
    location?: string;
    employeeNumber?: number;
    image?: string;
    groups?: DomoGroup[];
    createdAt?: string;
    updatedAt?: string;
    deleted?: boolean;
}

/**
 * Defines a Domo group
 * Based on Domo Content API v2/groups
 */
export interface DomoGroup {
    groupId: number; // Primary field (matches API)
    id?: number; // Alias for compatibility
    name: string;
    groupType?: "open" | "user" | "system";
    memberCount?: number;
    created?: string;
    groupMembers?: DomoGroupMember[];
}

/**
 * Defines a Domo group member
 */
export interface DomoGroupMember {
    id: number; // Match user ID type
    name: string;
    displayName?: string;
    email?: string;
}

/**
 * Parameters for listing users
 */
export interface UserListParams {
    limit?: number;
    offset?: number;
}

/**
 * Parameters for listing groups
 */
export interface GroupListParams {
    limit?: number;
    offset?: number;
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
 * Status values returned by the KPI card render API
 * - "success": Card rendered with data
 * - "not_ran": Card rendered but does not contain data
 * - "error": Configuration or data issues
 */
export type KpiCardStatus = "success" | "not_ran" | "error";

/**
 * Options for rendering a KPI card
 */
export interface KpiCardRenderOptions {
    /** Width of the rendered image in pixels (default: 1024) */
    width?: number;
    /** Height of the rendered image in pixels (default: 1024) */
    height?: number;
    /** Scale factor for the rendered image (default: 1) */
    scale?: number;
    /** Query overrides including filters */
    queryOverrides?: {
        filters?: Array<unknown>;
    };
}

/**
 * Response from the KPI card render API
 */
export interface KpiCardRenderResponse {
    image?: {
        data: string;
        notAllDataShown: boolean;
    };
    summary?: {
        label: string;
        value: string;
        number: number;
        data: Record<string, unknown>;
        status: KpiCardStatus;
    };
    limited: boolean;
    notAllDataShown: boolean;
}

/**
 * Function to get a single Domo card by ID
 * Uses the /api/content/v1/cards endpoint with urns query parameter
 */
export async function getCard(cardId: string): Promise<DomoCard> {
    // Check if we have the required configuration for content API endpoints
    if (!domoConfig.apiToken) {
        throw new Error(
            "API token is required for the get-card endpoint. Please set DOMO_API_TOKEN environment variable.",
        );
    }

    if (!domoConfig.apiHost) {
        throw new Error(
            "Domo API host is required for the get-card endpoint. Please set DOMO_API_HOST environment variable.",
        );
    }

    // Create client with API token authentication using the customer's domain
    const client = createApiTokenClient(
        domoConfig.apiToken,
        domoConfig.apiHost,
    );

    try {
        // Use the verified working endpoint with comprehensive parts
        const parts = [
            "metadata",
            "metadataOverrides",
            "problems",
            "properties",
            "certification",
            "datasources",
            "dateInfo",
            "domoapp",
            "drillPath",
            "drillPathURNs",
            "library",
            "masonData",
            "owner",
            "owners",
            "slicers",
        ];

        const url = `/api/content/v1/cards?urns=${cardId}&parts=${parts.join(",")}&includeFiltered=true`;
        const response = await client.get<unknown>(url);

        // The endpoint returns an array with the card object
        if (Array.isArray(response) && response.length > 0) {
            const card = response[0] as Record<string, unknown>;

            // Extract card URN and ID
            const cardUrn =
                typeof card.urn === "string"
                    ? card.urn
                    : typeof card.id === "number"
                      ? String(card.id)
                      : cardId;

            // Extract basic fields
            const cardTitle =
                typeof card.title === "string" ? card.title : undefined;
            const description =
                typeof card.description === "string"
                    ? card.description
                    : undefined;
            const type = typeof card.type === "string" ? card.type : undefined;
            const ownerId =
                typeof card.ownerId === "number" ? card.ownerId : undefined;

            // Extract timestamp (badgeUpdated is the last modified time)
            const lastModified =
                typeof card.badgeUpdated === "number"
                    ? card.badgeUpdated
                    : typeof card.created === "number"
                      ? card.created
                      : undefined;

            // Extract owner name from owners array
            let ownerName: string | undefined = undefined;
            if (Array.isArray(card.owners) && card.owners.length > 0) {
                const firstOwner = card.owners[0] as Record<string, unknown>;
                ownerName =
                    typeof firstOwner.displayName === "string"
                        ? firstOwner.displayName
                        : undefined;
            }

            // Extract dataset IDs from datasources array
            let datasets: string[] | undefined = undefined;
            if (
                Array.isArray(card.datasources) &&
                card.datasources.length > 0
            ) {
                datasets = card.datasources
                    .map((ds: unknown) => {
                        if (typeof ds === "object" && ds !== null) {
                            const datasource = ds as Record<string, unknown>;
                            return typeof datasource.dataSourceId === "string"
                                ? datasource.dataSourceId
                                : null;
                        }
                        return null;
                    })
                    .filter((id): id is string => id !== null);
            }

            // Extract metadata for definition
            let definition: DomoCard["definition"] = undefined;
            if (card.metadata && typeof card.metadata === "object") {
                const meta = card.metadata as Record<string, unknown>;
                definition = {
                    chartType:
                        typeof meta.chartType === "string"
                            ? meta.chartType
                            : undefined,
                    chartVersion:
                        typeof meta.chartVersion === "string"
                            ? meta.chartVersion
                            : undefined,
                    // Primary dataset from first datasource
                    dataSetId:
                        datasets && datasets.length > 0
                            ? datasets[0]
                            : undefined,
                    description: description,
                    title: cardTitle,
                    urn: cardUrn,
                    // Note: calculatedFields might not be in this response format
                    calculatedFields: undefined,
                };
            }

            return {
                id: cardUrn,
                cardUrn,
                cardTitle,
                title: cardTitle, // For backward compatibility
                description,
                lastModified,
                lastUpdated:
                    lastModified !== undefined
                        ? new Date(lastModified).toISOString()
                        : undefined,
                ownerId,
                ownerName,
                owner: ownerName, // For backward compatibility
                pages: undefined, // Not provided in this endpoint
                type,
                datasets,
                definition,
            };
        }

        // Empty array means card not found
        throw new Error(`Card with ID ${cardId} not found`);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes("404") ||
                error.message.includes("not found"))
        ) {
            throw new Error(`Card with ID ${cardId} not found`);
        }
        throw error;
    }
}

/**
 * Fetch raw card object with specified parts for advanced parsing (e.g., layout/aspect)
 */
export async function getCardRaw(
    cardId: string,
    parts: string[] = [
        "metadata",
        "metadataOverrides",
        "properties",
        "masonData",
        "library",
    ],
): Promise<Record<string, unknown>> {
    if (!domoConfig.apiToken) {
        throw new Error(
            "API token is required for the get-card endpoint. Please set DOMO_API_TOKEN environment variable.",
        );
    }
    if (!domoConfig.apiHost) {
        throw new Error(
            "Domo API host is required for the get-card endpoint. Please set DOMO_API_HOST environment variable.",
        );
    }
    const client = createApiTokenClient(
        domoConfig.apiToken,
        domoConfig.apiHost,
    );
    const url = `/api/content/v1/cards?urns=${cardId}&parts=${parts.join(",")}&includeFiltered=true`;
    const response = await client.get<unknown>(url);
    if (Array.isArray(response) && response.length > 0) {
        return (response as Record<string, unknown>[])[0] as Record<
            string,
            unknown
        >;
    }
    throw new Error(`Card with ID ${cardId} not found`);
}

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
 * Function to list Domo users with pagination
 * Uses the v1/users endpoint from the Domo Platform API
 * @param params - Pagination parameters (limit max 500, default 50)
 * @returns Array of DomoUser objects
 */
export async function listUsers(
    params: UserListParams = {},
): Promise<DomoUser[]> {
    const cacheManager = getCacheManager();

    // Create cache key based on parameters
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const cacheKey = `users_list_${limit}_${offset}`;

    // Check cache first
    const cached = await cacheManager.get<DomoUser[]>(cacheKey);
    if (cached) {
        log.debug(`Returning ${cached.length} users from cache`);
        return cached;
    }

    const client = getDomoClient(); // OAuth by default
    const apiParams: Record<string, string | number> = {
        limit: Math.min(limit, 500).toString(),
        offset: offset.toString(),
    };

    log.debug(`Fetching users with params:`, apiParams);

    const users = await client.get<DomoUser[]>("/v1/users", apiParams);

    if (Array.isArray(users)) {
        // Cache for 1 hour
        await cacheManager.set(cacheKey, users, 3600);
        log.debug(`Fetched and cached ${users.length} users`);
        return users;
    }

    return [];
}

/**
 * Function to get a specific user by ID
 * Uses the v1/users/:id endpoint from the Domo Platform API
 * @param userId - The user ID
 * @returns The DomoUser object
 */
export async function getUser(userId: number | string): Promise<DomoUser> {
    const cacheManager = getCacheManager();
    const cacheKey = `user_${userId}`;

    // Check cache first
    const cached = await cacheManager.get<DomoUser>(cacheKey);
    if (cached) {
        log.debug(`Returning user ${userId} from cache`);
        return cached;
    }

    const client = getDomoClient();

    log.debug(`Fetching user ${userId} from API`);

    const user = await client.get<DomoUser>(`/v1/users/${userId}`);

    // Cache for 1 hour
    await cacheManager.set(cacheKey, user, 3600);
    log.debug(`Fetched and cached user ${userId}`);

    return user;
}

/**
 * Function to list Domo groups with pagination
 * Uses the api/content/v2/groups endpoint from the Domo Content API
 * @param params - Pagination parameters (limit, offset)
 * @returns Array of DomoGroup objects
 */
export async function listGroups(
    params: GroupListParams = {},
): Promise<DomoGroup[]> {
    const cacheManager = getCacheManager();

    // Create cache key based on parameters
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const cacheKey = `groups_list_${limit}_${offset}`;

    // Check cache first
    const cached = await cacheManager.get<DomoGroup[]>(cacheKey);
    if (cached) {
        log.debug(`Returning ${cached.length} groups from cache`);
        return cached;
    }

    const client = getDomoClient();

    log.debug(`Fetching groups from API`);

    // Note: Content API v2 may not support pagination, so we fetch all groups
    // and handle pagination client-side if needed
    const groups = await client.get<DomoGroup[]>("/api/content/v2/groups");

    if (Array.isArray(groups)) {
        // Cache for 1 hour
        await cacheManager.set(cacheKey, groups, 3600);
        log.debug(`Fetched and cached ${groups.length} groups`);
        return groups;
    }

    return [];
}

/**
 * Function to get a specific group by ID with full member details
 * Uses the api/content/v2/groups/:id endpoint from the Domo Content API
 * @param groupId - The group ID
 * @returns The DomoGroup object with members
 */
export async function getGroup(groupId: number | string): Promise<DomoGroup> {
    const cacheManager = getCacheManager();
    const cacheKey = `group_${groupId}`;

    // Check cache first
    const cached = await cacheManager.get<DomoGroup>(cacheKey);
    if (cached) {
        log.debug(`Returning group ${groupId} from cache`);
        return cached;
    }

    const client = getDomoClient();

    log.debug(`Fetching group ${groupId} from API`);

    const group = await client.get<DomoGroup>(
        `/api/content/v2/groups/${groupId}`,
    );

    // Cache for 1 hour
    await cacheManager.set(cacheKey, group, 3600);
    log.debug(`Fetched and cached group ${groupId}`);

    return group;
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
    type?: string;
    status?: string;
    state?: string;
    streamId?: number;
    accountId?: number;
    cardInfo?: {
        cardCount: number;
        cardViewCount: number;
    };
    cardCount?: number;
    permissions?: string;
    scheduleActive?: boolean;
    cloudId?: string;
    cloudName?: string;
    cloudEngine?: string;
    cryoStatus?: string;
    created?: number;
    lastUpdated?: number;
    lastTouched?: number;
    nextUpdate?: number;
    rowCount?: number;
    columnCount?: number;
    owner?: {
        id: string;
        name: string;
        type: string;
        group?: boolean;
    };
    validConfiguration?: boolean;
    validAccount?: boolean;
    transportType?: string;
    adc?: boolean;
    adcExternal?: boolean;
    adcSource?: string;
    masked?: boolean;
    currentUserFullAccess?: boolean;
    hidden?: boolean;
    tags?: string; // JSON string like "[\"tag1\",\"tag2\"]"
    properties?: {
        formulas?: {
            formulas?: Record<
                string,
                {
                    templateId?: number;
                    id?: string;
                    name?: string;
                    formula?: string;
                    status?: string;
                    dataType?: string;
                    persistedOnDataSource?: boolean;
                    isAggregatable?: boolean;
                    bignumber?: boolean;
                    columnPositions?: Array<{
                        columnName: string;
                        columnPosition: number;
                    }>;
                    variable?: boolean;
                }
            >;
        };
    };
}

/**
 * Function to get a specific dataset by ID
 * Returns v1, v3, and merged data for complete visibility
 */
export async function getDataset(
    datasetId: string,
): Promise<DualApiResponse<DomoDataset, V3DatasetResponse>> {
    const cacheManager = getCacheManager();

    // Check cache first
    const cacheKey = `dataset_dual_${datasetId}`;
    const cachedDataset =
        await cacheManager.get<DualApiResponse<DomoDataset, V3DatasetResponse>>(
            cacheKey,
        );
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
        // Return empty response if v1 fails
        return ApiResponseMerger.mergeResponses<DomoDataset, V3DatasetResponse>(
            null,
            null,
        );
    }

    if (!v1Dataset) {
        return ApiResponseMerger.mergeResponses<DomoDataset, V3DatasetResponse>(
            null,
            null,
        );
    }

    // Optionally enhance with v3 data if API token and customer domain are available
    const v3Client = getV3Client();
    let v3Response: V3DatasetResponse | null = null;

    if (v3Client) {
        try {
            log.debug(
                `Attempting to fetch dataset ${datasetId} from v3 endpoint using customer domain`,
            );

            v3Response = await v3Client.get<V3DatasetResponse>(
                `/api/data/v3/datasources/${datasetId}?includeAllDetails=true`,
            );

            if (v3Response) {
                log.debug(
                    `Successfully fetched v3 metadata for dataset ${datasetId}`,
                );
            }
        } catch (error) {
            // Log but don't fail - v3 is optional enhancement only
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            log.debug(
                `v3 fetch failed for dataset ${datasetId}: ${errorMessage}`,
            );
        }
    } else {
        log.debug(
            "V3 fetch skipped - API token or customer domain not configured",
        );
    }

    // Create the dual response with v1, v3, and merged data
    const dualResponse = ApiResponseMerger.mergeResponses(
        v1Dataset,
        v3Response,
    );

    // If we have merged data, enhance it with proper field mappings
    if (dualResponse.merged && v3Response) {
        // Enhance merged dataset with all v3 fields
        dualResponse.merged = {
            ...dualResponse.merged,
            // v3 provides additional metadata not available in v1
            displayType: v3Response.displayType,
            dataProviderType: v3Response.dataProviderType,
            type: v3Response.type,
            status: v3Response.status,
            state: v3Response.state,
            streamId: v3Response.streamId,
            accountId: v3Response.accountId,
            cardInfo: v3Response.cardInfo,
            cardCount: v3Response.cardCount,
            permissions: v3Response.permissions,
            scheduleActive: v3Response.scheduleActive,
            cloudId: v3Response.cloudId,
            cloudName: v3Response.cloudName,
            cloudEngine: v3Response.cloudEngine,
            cryoStatus: v3Response.cryoStatus,
            lastTouched: v3Response.lastTouched,
            nextUpdate: v3Response.nextUpdate,
            validConfiguration: v3Response.validConfiguration,
            validAccount: v3Response.validAccount,
            transportType: v3Response.transportType,
            adc: v3Response.adc,
            adcExternal: v3Response.adcExternal,
            adcSource: v3Response.adcSource,
            masked: v3Response.masked,
            currentUserFullAccess: v3Response.currentUserFullAccess,
            hidden: v3Response.hidden,
            properties: v3Response.properties,
            // Handle tags - v3 returns as JSON string
            tags: v3Response.tags
                ? (() => {
                      try {
                          return JSON.parse(v3Response.tags);
                      } catch {
                          return [v3Response.tags]; // If not JSON, treat as single tag
                      }
                  })()
                : v1Dataset.tags,
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
    }

    // Cache the dual response
    await cacheManager.set(cacheKey, dualResponse, 300); // Cache for 5 minutes
    return dualResponse;
}

/**
 * Legacy function to get a dataset (returns only merged data for backward compatibility)
 * @deprecated Use getDataset() for full response data
 */
export async function getDatasetLegacy(
    datasetId: string,
): Promise<DomoDataset | null> {
    const dualResponse = await getDataset(datasetId);
    return ApiResponseMerger.getBestData(dualResponse) as DomoDataset | null;
}

/**
 * Get lineage information for a dataset
 * @param datasetId - The ID of the dataset to get lineage for
 * @param params - Query parameters for the lineage request
 * @returns The lineage response from the API
 */
export async function getDatasetLineage(
    datasetId: string,
    params?: DataflowLineageQueryParams,
): Promise<DataflowLineageResponse | null> {
    try {
        // This endpoint requires API token and customer domain
        const v3Client = getV3Client();
        if (!v3Client) {
            log.warn(
                "Dataset lineage requires API token and DOMO_API_HOST configuration",
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

        const url = `/api/data/v1/lineage/DATA_SOURCE/${datasetId}`;

        log.debug(
            `Fetching lineage for dataset ${datasetId} with params:`,
            queryParams,
        );

        const response = await v3Client.get<DataflowLineageResponse>(
            url,
            queryParams,
        );

        if (!response) {
            log.warn("No lineage response received from API");
            return null;
        }

        log.debug(
            `Successfully fetched lineage for dataset ${datasetId}`,
            response,
        );

        return response;
    } catch (error) {
        log.error("Error fetching dataset lineage:", error);
        throw error;
    }
}

/**
 * Function to render a KPI card
 */
export async function renderKpiCard(
    cardId: string,
    parts: KpiCardPart[],
    options?: KpiCardRenderOptions,
): Promise<KpiCardRenderResponse> {
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
    // Ensure both image and summary are requested for consistent output
    const partsSet = new Set<KpiCardPart>(parts || []);
    partsSet.add("image");
    partsSet.add("summary");
    const queryParams = `?parts=${Array.from(partsSet).join(",")}`;
    const url = `/api/content/v1/cards/kpi/${cardId}/render${queryParams}`;

    // Request body with configurable options
    // The API expects both width and height; omitting height can cause 400 Bad Request.
    // Upstream logic should compute a height that preserves aspect when possible.
    const requestBody = {
        queryOverrides: options?.queryOverrides || { filters: [] },
        width: options?.width ?? 1024,
        height: options?.height ?? 1024,
        scale: options?.scale ?? 1,
    };

    const response = await client.put<KpiCardRenderResponse>(url, requestBody);

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
