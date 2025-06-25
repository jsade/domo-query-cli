/**
 * Types for the Domo Dataflow Search API response
 */

export interface DataflowSearchResponse {
    facetMap: {
        OWNER_ID: {
            facetValues: unknown[]; // not sure whether this is right
            fieldName: string;
            searchFacetEnum: string;
        };
    };
    hideSearchObjects: boolean;
    queryUuid: string;
    searchObjects: DataflowSearchObject[];
    searchResultsMap: {
        dataflow: DataflowSearchObject[];
    };
    sort: {
        activity: null;
        activitySortType: null;
        fieldSorts: null;
        isHotness: boolean;
        isRelevance: boolean;
        metricAction: null;
    };
    totalResultCount: number;
}

export interface DataflowSearchObject {
    abandoned: boolean;
    computeCloud: string;
    createDate: number;
    customer: string;
    databaseId: string;
    dataFlowType: string;
    deleted: boolean;
    description?: string;
    entityType: string;
    highlightedFields: Record<string, unknown>;
    inputCount: number;
    inputDatasets?: Array<DatasetReference>;
    language: string;
    lastIndexed: number;
    lastModified: number;
    lastRunDate: number;
    name: string;
    outputCount: number;
    outputDatasets?: Array<DatasetReference>;
    ownedById: string;
    ownedByName: string;
    ownedByType: string;
    owners: Array<Owner>;
    ownersLocalized: {
        count: number;
        localizedMessage: string;
    };
    passwordProtected: boolean;
    paused: boolean;
    permissionMask: number;
    requestAccess: boolean;
    runCount: number;
    score: number;
    searchId: {
        customer: string;
        databaseId: string;
        entityType: string;
        indexName: null;
    };
    status: string;
    statusOrderPriority: number;
    successRate: number;
    tags: string[];
    useGraphUI: boolean;
    winnerText: string;
}

export interface DatasetReference {
    id: string;
    name: string;
}

export interface Owner {
    displayName: string;
    id: string;
    type: string;
}
