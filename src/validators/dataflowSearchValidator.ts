import type {
    DataflowSearchObject,
    DataflowSearchResponse,
    DatasetReference,
    Owner,
} from "../types/dataflowSearch";

/**
 * Type guard to check if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Validates a dataset reference object
 * @throws Error if validation fails
 */
function validateDatasetReference(data: unknown): DatasetReference {
    if (!isObject(data)) {
        throw new Error("Dataset reference must be an object");
    }

    if (typeof data.id !== "string" || typeof data.name !== "string") {
        throw new Error(
            "Dataset reference must have string id and name properties",
        );
    }

    return {
        id: data.id,
        name: data.name,
    };
}

/**
 * Validates an owner object
 * @throws Error if validation fails
 */
function validateOwner(data: unknown): Owner {
    if (!isObject(data)) {
        throw new Error("Owner must be an object");
    }

    if (
        typeof data.displayName !== "string" ||
        typeof data.id !== "string" ||
        typeof data.type !== "string"
    ) {
        throw new Error(
            "Owner must have string displayName, id, and type properties",
        );
    }

    return {
        displayName: data.displayName,
        id: data.id,
        type: data.type,
    };
}

/**
 * Validates a dataflow search object
 * @throws Error if validation fails
 */
function validateDataflowSearchObject(data: unknown): DataflowSearchObject {
    if (!isObject(data)) {
        throw new Error("Dataflow search object must be an object");
    }

    // Validate required fields with their expected types
    if (typeof data.abandoned !== "boolean")
        throw new Error("abandoned must be boolean");
    if (typeof data.computeCloud !== "string")
        throw new Error("computeCloud must be string");
    if (typeof data.createDate !== "number")
        throw new Error("createDate must be number");
    if (typeof data.customer !== "string")
        throw new Error("customer must be string");
    if (typeof data.databaseId !== "string")
        throw new Error("databaseId must be string");
    if (typeof data.dataFlowType !== "string")
        throw new Error("dataFlowType must be string");
    if (typeof data.deleted !== "boolean")
        throw new Error("deleted must be boolean");
    if (typeof data.entityType !== "string")
        throw new Error("entityType must be string");
    if (typeof data.inputCount !== "number")
        throw new Error("inputCount must be number");
    if (typeof data.lastIndexed !== "number")
        throw new Error("lastIndexed must be number");
    if (typeof data.lastModified !== "number")
        throw new Error("lastModified must be number");
    if (typeof data.lastRunDate !== "number")
        throw new Error("lastRunDate must be number");
    if (typeof data.name !== "string") throw new Error("name must be string");
    if (typeof data.outputCount !== "number")
        throw new Error("outputCount must be number");
    if (typeof data.ownedById !== "string")
        throw new Error("ownedById must be string");
    if (typeof data.ownedByName !== "string")
        throw new Error("ownedByName must be string");
    if (typeof data.ownedByType !== "string")
        throw new Error("ownedByType must be string");
    if (!Array.isArray(data.owners)) throw new Error("owners must be array");
    if (typeof data.passwordProtected !== "boolean")
        throw new Error("passwordProtected must be boolean");
    if (typeof data.paused !== "boolean")
        throw new Error("paused must be boolean");
    if (typeof data.permissionMask !== "number")
        throw new Error("permissionMask must be number");
    if (typeof data.requestAccess !== "boolean")
        throw new Error("requestAccess must be boolean");
    if (typeof data.runCount !== "number")
        throw new Error("runCount must be number");
    if (typeof data.score !== "number") throw new Error("score must be number");
    if (typeof data.status !== "string")
        throw new Error("status must be string");
    if (typeof data.statusOrderPriority !== "number")
        throw new Error("statusOrderPriority must be number");
    if (typeof data.successRate !== "number")
        throw new Error("successRate must be number");
    if (!Array.isArray(data.tags)) throw new Error("tags must be array");
    if (typeof data.useGraphUI !== "boolean")
        throw new Error("useGraphUI must be boolean");
    if (typeof data.language !== "string")
        throw new Error("language must be string");
    if (typeof data.winnerText !== "string")
        throw new Error("winnerText must be string");

    // Validate complex objects
    if (!isObject(data.highlightedFields))
        throw new Error("highlightedFields must be object");
    if (!isObject(data.ownersLocalized))
        throw new Error("ownersLocalized must be object");
    if (!isObject(data.searchId)) throw new Error("searchId must be object");

    // Validate owners array
    const validatedOwners = data.owners.map(validateOwner);

    // Validate optional dataset arrays
    const validatedInputDatasets = Array.isArray(data.inputDatasets)
        ? data.inputDatasets.map(validateDatasetReference)
        : undefined;

    const validatedOutputDatasets = Array.isArray(data.outputDatasets)
        ? data.outputDatasets.map(validateDatasetReference)
        : undefined;

    // Return the validated object with proper types
    return {
        abandoned: data.abandoned,
        computeCloud: data.computeCloud,
        createDate: data.createDate,
        customer: data.customer,
        databaseId: data.databaseId,
        dataFlowType: data.dataFlowType,
        deleted: data.deleted,
        description:
            typeof data.description === "string" ? data.description : undefined,
        entityType: data.entityType,
        highlightedFields: data.highlightedFields,
        inputCount: data.inputCount,
        inputDatasets: validatedInputDatasets,
        language: data.language,
        lastIndexed: data.lastIndexed,
        lastModified: data.lastModified,
        lastRunDate: data.lastRunDate,
        name: data.name,
        outputCount: data.outputCount,
        outputDatasets: validatedOutputDatasets,
        ownedById: data.ownedById,
        ownedByName: data.ownedByName,
        ownedByType: data.ownedByType,
        owners: validatedOwners,
        ownersLocalized: {
            count: Number(data.ownersLocalized.count || 0),
            localizedMessage: String(
                data.ownersLocalized.localizedMessage || "",
            ),
        },
        passwordProtected: data.passwordProtected,
        paused: data.paused,
        permissionMask: data.permissionMask,
        requestAccess: data.requestAccess,
        runCount: data.runCount,
        score: data.score,
        searchId: {
            customer: String(data.searchId.customer || ""),
            databaseId: String(data.searchId.databaseId || ""),
            entityType: String(data.searchId.entityType || ""),
            indexName: null,
        },
        status: data.status,
        statusOrderPriority: data.statusOrderPriority,
        successRate: data.successRate,
        tags: data.tags.map(String),
        useGraphUI: data.useGraphUI,
        winnerText: data.winnerText,
    };
}

/**
 * Validates a complete dataflow search response
 * @throws Error if validation fails
 */
export function validateDataflowSearchResponse(
    data: unknown,
): DataflowSearchResponse {
    if (!isObject(data)) {
        throw new Error("Search response must be an object");
    }

    if (!Array.isArray(data.searchObjects)) {
        throw new Error("Search response must have searchObjects array");
    }

    // Validate each search object
    const validatedSearchObjects = data.searchObjects.map((obj, index) => {
        try {
            // Add debugging info
            // Add detailed debugging info
            // console.log(`Object ${index} full data:`, JSON.stringify(obj, null, 2));
            // console.log(`Object ${index} keys:`, Object.keys(obj));
            // console.log(`Object ${index} abandoned value:`, obj.abandoned);
            // console.log(`Object ${index} abandoned type:`, typeof obj.abandoned);
            return validateDataflowSearchObject(obj) as DataflowSearchObject;
        } catch (error) {
            throw new Error(
                `Invalid search object at index ${index}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    });

    if (typeof data.totalResultCount !== "number") {
        throw new Error("Search response must have number totalResultCount");
    }

    if (typeof data.hideSearchObjects !== "boolean") {
        throw new Error("Search response must have boolean hideSearchObjects");
    }

    if (typeof data.queryUuid !== "string") {
        throw new Error("Search response must have string queryUuid");
    }

    // Return validated response with explicit type assertion after validation
    return {
        searchObjects: validatedSearchObjects,
        totalResultCount: data.totalResultCount,
        hideSearchObjects: data.hideSearchObjects,
        queryUuid: data.queryUuid,
    } as DataflowSearchResponse;
}

/**
 * Safe version of validateDataflowSearchResponse that returns null instead of throwing
 */
export function safeValidateDataflowSearchResponse(
    data: unknown,
): DataflowSearchResponse | null {
    try {
        return validateDataflowSearchResponse(data);
    } catch (error) {
        console.error(
            "Validation error:",
            error instanceof Error ? error.message : "Unknown error",
        );
        return null;
    }
}
