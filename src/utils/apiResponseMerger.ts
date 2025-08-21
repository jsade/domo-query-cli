/**
 * Utility for merging responses from multiple API endpoints
 * Provides a centralized way to handle dual API responses (v1 and v3)
 */

/**
 * Structure for dual API responses
 */
export interface DualApiResponse<T1, T2> {
    v1: T1 | null;
    v3: T2 | null;
    merged: (T1 & Partial<T2>) | null;
}

/**
 * Utility class for merging API responses from different endpoints
 */
export class ApiResponseMerger {
    /**
     * Merges v1 and v3 API responses into a combined structure
     * @param v1Data - Data from v1 API endpoint
     * @param v3Data - Data from v3 API endpoint (optional)
     * @returns Combined response structure with v1, v3, and merged data
     */
    static mergeResponses<T1, T2>(
        v1Data: T1 | null,
        v3Data?: T2 | null,
    ): DualApiResponse<T1, T2> {
        // If no v1 data, return nulls
        if (!v1Data) {
            return {
                v1: null,
                v3: v3Data || null,
                merged: null,
            };
        }

        // If no v3 data, return v1 as merged
        if (!v3Data) {
            return {
                v1: v1Data,
                v3: null,
                merged: v1Data as T1 & Partial<T2>,
            };
        }

        // Merge v1 and v3 data
        // v1 takes precedence for common fields, v3 adds additional fields
        const merged = {
            ...v1Data,
            ...Object.entries(v3Data as Record<string, unknown>).reduce(
                (acc, [key, value]) => {
                    // Only add v3 fields that don't exist in v1 or have undefined/null values in v1
                    const v1Obj = v1Data as Record<string, unknown>;
                    if (
                        !(key in v1Obj) ||
                        v1Obj[key] === undefined ||
                        v1Obj[key] === null
                    ) {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, unknown>,
            ),
        } as T1 & Partial<T2>;

        return {
            v1: v1Data,
            v3: v3Data,
            merged,
        };
    }

    /**
     * Formats the dual response for JSON output
     * @param response - The dual API response
     * @param includeV1 - Whether to include v1 data in output (default: true)
     * @param includeV3 - Whether to include v3 data in output (default: true)
     * @param includeMerged - Whether to include merged data in output (default: true)
     * @returns Formatted object for JSON output
     */
    static formatForOutput<T1, T2>(
        response: DualApiResponse<T1, T2>,
        includeV1 = true,
        includeV3 = true,
        includeMerged = true,
    ): Record<string, unknown> {
        const output: Record<string, unknown> = {};

        if (includeV1 && response.v1) {
            output.v1 = response.v1;
        }

        if (includeV3 && response.v3) {
            output.v3 = response.v3;
        }

        if (includeMerged && response.merged) {
            output.merged = response.merged;
        }

        return output;
    }

    /**
     * Gets the best available data from a dual response
     * Prefers merged data, then v1, then v3
     * @param response - The dual API response
     * @returns The best available data
     */
    static getBestData<T1, T2>(
        response: DualApiResponse<T1, T2>,
    ): (T1 & Partial<T2>) | T1 | T2 | null {
        return response.merged || response.v1 || response.v3 || null;
    }
}
