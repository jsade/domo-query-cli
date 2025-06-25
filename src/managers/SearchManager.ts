import { BaseClient } from "../api/clients/baseClient.ts";
import type { DataflowSearchObject } from "../types/dataflowSearch";
import { log } from "../utils/logger.ts";

/**
 * SearchManager class for performing search operations in Domo
 */
export class SearchManager {
    /**
     * Constructor
     * @param client - The authenticated client (can be DomoClient or DataflowClient)
     */
    constructor(private client: BaseClient) {}

    /**
     * Execute a search request against Domo's search API
     * @param searchRequest - The search request object
     * @returns The search response
     */
    async searchDomo(searchRequest: SearchRequest): Promise<SearchResponse> {
        // Ensure client is authenticated before proceeding
        await this.client.ensureAuthenticated();

        log.info(`Searching Domo with query: ${searchRequest.query}`);

        try {
            // Create a properly formatted request based on the Domo Search API schema
            const apiRequest: DomoSearchApiRequest = {
                count: searchRequest.limit,
                offset: searchRequest.offset,
                query: searchRequest.query || "*",
                filters: searchRequest.filters || [],
                sort: searchRequest.sort
                    ? {
                          field: searchRequest.sort.field,
                          direction: searchRequest.sort.direction,
                      }
                    : {},
                facetValuesToInclude: [],
                facetValueLimit: 0,
                facetValueOffset: 0,
                includePhonetic: true,
                entityList: this.formatEntityTypes(searchRequest.entityTypes),
            };

            // Log the sort parameters for debugging
            if (searchRequest.sort) {
                log.debug(
                    `Search request sort parameters - field: "${searchRequest.sort.field}", direction: "${searchRequest.sort.direction}"`,
                );
                log.debug(
                    `Final API request sort object: ${JSON.stringify(apiRequest.sort)}`,
                );
            }

            // Make the search request
            const response = await this.client.post<DomoSearchApiResponse>(
                "/api/search/v1/query",
                apiRequest as unknown as Record<string, unknown>,
            );

            // Add detailed logging for search API response debugging
            log.debug("Raw search response structure:", Object.keys(response));

            // Check for searchResultsMap
            if (response.searchResultsMap) {
                log.debug(
                    "searchResultsMap keys:",
                    Object.keys(response.searchResultsMap),
                );
                if (response.searchResultsMap.dataflow) {
                    log.debug(
                        `Found ${response.searchResultsMap.dataflow.length} dataflows in searchResultsMap.dataflow`,
                    );
                }
            }

            // Check for searchObjects
            if (response.searchObjects) {
                log.debug(
                    `Found ${response.searchObjects.length} items in searchObjects`,
                );
            }

            // Check for results (legacy)
            if (response.results) {
                log.debug(
                    `Found ${response.results.length} items in results array`,
                );
            }

            // Transform the response to match our expected format
            const transformedResponse = this.transformSearchResponse(response);
            log.debug(
                `Transformed response contains ${transformedResponse.searchObjects.length} objects`,
            );

            return transformedResponse;
        } catch (error) {
            log.error("Error searching Domo:", error);

            // Log detailed error information
            if (error instanceof Error) {
                log.error(`Search error details: ${error.message}`);
                if (error.stack) {
                    log.error(`Stack trace: ${error.stack}`);
                }
            } else {
                log.error(`Non-Error search exception: ${String(error)}`);
            }

            // Rethrow the error
            throw error;
        }
    }

    /**
     * Format entity types array into the format expected by Domo Search API
     * @param entityTypes - Array of entity types
     * @returns Array of arrays of entity types
     */
    private formatEntityTypes(entityTypes: string[]): string[][] {
        return entityTypes.map(type => [type]);
    }

    /**
     * Transform API response to our internal format
     * @param response - Raw API response
     * @returns Formatted SearchResponse
     */
    private transformSearchResponse(
        response: DomoSearchApiResponse,
    ): SearchResponse {
        // Helper to map a raw object to a full DataflowSearchObject
        function mapToDataflowSearchObject(
            item: Record<string, unknown>,
        ): DataflowSearchObject {
            return {
                abandoned: Boolean(item.abandoned),
                computeCloud: String(item.computeCloud || ""),
                createDate: Number(item.createDate),
                customer: String(item.customer || ""),
                databaseId: String(item.databaseId || ""),
                dataFlowType: String(item.dataFlowType || ""),
                deleted: Boolean(item.deleted),
                description:
                    typeof item.description === "string"
                        ? item.description
                        : undefined,
                entityType: String(item.entityType || "dataflow"),
                highlightedFields:
                    (item.highlightedFields as Record<string, unknown>) || {},
                inputCount: Number(item.inputCount),
                inputDatasets: Array.isArray(item.inputDatasets)
                    ? (item.inputDatasets as Record<string, unknown>[]).map(
                          ds => ({
                              id: String(ds.id),
                              name: String(ds.name),
                          }),
                      )
                    : undefined,
                language: String(item.language || ""),
                lastIndexed: Number(item.lastIndexed),
                lastModified: Number(item.lastModified),
                lastRunDate: Number(item.lastRunDate),
                name: String(item.name || ""),
                outputCount: Number(item.outputCount),
                outputDatasets: Array.isArray(item.outputDatasets)
                    ? (item.outputDatasets as Record<string, unknown>[]).map(
                          ds => ({
                              id: String(ds.id),
                              name: String(ds.name),
                          }),
                      )
                    : undefined,
                ownedById: String(item.ownedById || ""),
                ownedByName: String(item.ownedByName || ""),
                ownedByType: String(item.ownedByType || ""),
                owners: Array.isArray(item.owners)
                    ? (item.owners as Record<string, unknown>[]).map(owner => ({
                          displayName: String(owner.displayName),
                          id: String(owner.id),
                          type: String(owner.type),
                      }))
                    : [],
                ownersLocalized:
                    item.ownersLocalized &&
                    typeof item.ownersLocalized === "object"
                        ? {
                              count: Number(
                                  (item.ownersLocalized as { count?: number })
                                      .count || 0,
                              ),
                              localizedMessage: String(
                                  (
                                      item.ownersLocalized as {
                                          localizedMessage?: string;
                                      }
                                  ).localizedMessage || "",
                              ),
                          }
                        : { count: 0, localizedMessage: "" },
                passwordProtected: Boolean(item.passwordProtected),
                paused: Boolean(item.paused),
                permissionMask: Number(item.permissionMask),
                requestAccess: Boolean(item.requestAccess),
                runCount: Number(item.runCount),
                score: Number(item.score),
                searchId:
                    item.searchId && typeof item.searchId === "object"
                        ? {
                              customer: String(
                                  (item.searchId as { customer?: string })
                                      .customer || "",
                              ),
                              databaseId: String(
                                  (item.searchId as { databaseId?: string })
                                      .databaseId || "",
                              ),
                              entityType: String(
                                  (item.searchId as { entityType?: string })
                                      .entityType || "",
                              ),
                              indexName: null,
                          }
                        : {
                              customer: "",
                              databaseId: "",
                              entityType: "",
                              indexName: null,
                          },
                status: String(item.status || ""),
                statusOrderPriority: Number(item.statusOrderPriority),
                successRate: Number(item.successRate),
                tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
                useGraphUI: Boolean(item.useGraphUI),
                winnerText: String(item.winnerText || ""),
            };
        }

        let searchObjects: (DataflowSearchObject | SearchObject)[] = [];

        // 1. Try to get from searchResultsMap.dataflow (based on example response)
        if (
            response.searchResultsMap &&
            Array.isArray(response.searchResultsMap.dataflow)
        ) {
            searchObjects = response.searchResultsMap.dataflow.map(item =>
                item.entityType === "dataflow"
                    ? mapToDataflowSearchObject(item)
                    : {
                          id: item.id || "",
                          name: item.name || "",
                          type:
                              typeof item.type === "string"
                                  ? item.type
                                  : "dataflow",
                          description: item.description,
                          metadata: item.metadata || {},
                      },
            );
        }
        // 2. If no results in searchResultsMap, try searchObjects
        else if (response.searchObjects && response.searchObjects.length > 0) {
            searchObjects = response.searchObjects.map(item =>
                item.entityType === "dataflow"
                    ? mapToDataflowSearchObject(item)
                    : {
                          id: item.id || "",
                          name: item.name || "",
                          type:
                              typeof item.type === "string"
                                  ? item.type
                                  : "dataflow",
                          description: item.description,
                          metadata: item.metadata || {},
                      },
            );
        }
        // 3. Fallback to legacy results field
        else if (response.results && response.results.length > 0) {
            searchObjects = response.results.map(item =>
                item.entityType === "dataflow"
                    ? mapToDataflowSearchObject(item)
                    : {
                          id: item.id || "",
                          name: item.name || "",
                          type:
                              typeof item.type === "string"
                                  ? item.type
                                  : "dataflow",
                          description: item.description,
                          metadata: item.metadata || {},
                      },
            );
        }

        return {
            searchObjects: searchObjects as DataflowSearchObject[],
            totalResultCount:
                typeof response.totalResultCount === "number"
                    ? response.totalResultCount
                    : searchObjects.length,
            hideSearchObjects:
                typeof response.hideSearchObjects === "boolean"
                    ? response.hideSearchObjects
                    : false,
            queryUuid:
                typeof response.queryUuid === "string"
                    ? response.queryUuid
                    : "",
            count: response.count || searchObjects.length || 0,
            totalMatches:
                response.totalResultCount ||
                response.totalMatches ||
                searchObjects.length ||
                0,
            offset: response.offset || 0,
            limit: response.count || searchObjects.length || 0,
        };
    }
}

/**
 * Search request parameters (our internal format)
 */
export interface SearchRequest {
    query: string;
    entityTypes: string[];
    limit: number;
    offset: number;
    filters?: SearchFilter[];
    sort?: SearchSort;
}

/**
 * Search filter structure
 */
export interface SearchFilter {
    name: string;
    values: string[];
}

/**
 * Search sort parameters
 */
export interface SearchSort {
    field?: string;
    direction?: "asc" | "desc";
}

/**
 * Search response structure (our internal format)
 */
export interface SearchResponse {
    count: number;
    totalMatches: number;
    offset: number;
    limit: number;
    searchObjects: (DataflowSearchObject | SearchObject)[];
    facets?: Record<string, unknown>;
    totalResultCount: number;
    hideSearchObjects: boolean;
    queryUuid: string;
}

/**
 * Search result object
 */
export interface SearchObject {
    id: string;
    name: string;
    type: string;
    description?: string;
    owner?: {
        id: number;
        displayName: string;
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Domo Search API request format
 * Based on https://developer.domo.com/portal/fce416aea276f-search-product-api
 */
interface DomoSearchApiRequest {
    count: number;
    offset: number;
    query: string;
    filters: Array<SearchFilter>;
    orFilters?: Array<SearchFilter>;
    notFilters?: Array<SearchFilter>;
    sort: Record<string, unknown>;
    facetValuesToInclude: string[];
    facetValueLimit: number;
    facetValueOffset: number;
    includePhonetic: boolean;
    entityList: string[][];
    fieldsToReturn?: string[];
}

/**
 * Domo Search API response format based on actual API response
 */
interface DomoSearchApiResponse {
    facetMap?: Record<
        string,
        {
            fieldName?: string;
            searchFacetEnum?: string;
            facetValues?: unknown[];
        }
    >;
    totalResultCount?: number;
    sort?: {
        fieldSorts?: unknown;
        activity?: unknown;
        activitySortType?: unknown;
        metricAction?: unknown;
        isHotness?: boolean;
        isRelevance?: boolean;
    };
    queryUuid?: string;
    hideSearchObjects?: boolean;
    searchObjects?: Array<{
        id?: string;
        name?: string;
        type?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        [key: string]: unknown;
    }>;
    searchResultsMap?: {
        dataflow?: Array<{
            id?: string;
            name?: string;
            description?: string;
            metadata?: Record<string, unknown>;
            [key: string]: unknown;
        }>;
        [key: string]:
            | Array<{
                  id?: string;
                  name?: string;
                  description?: string;
                  metadata?: Record<string, unknown>;
                  [key: string]: unknown;
              }>
            | undefined;
    };
    // For backward compatibility
    count?: number;
    totalMatches?: number;
    offset?: number;
    results?: Array<{
        id?: string;
        name?: string;
        type?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        [key: string]: unknown;
    }>;
    facets?: Record<string, unknown>;
}
