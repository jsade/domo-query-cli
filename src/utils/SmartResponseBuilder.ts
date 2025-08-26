import {
    ResponseSizeAnalyzer,
    ResponseAnalysis,
    RESPONSE_SIZE_LIMITS,
} from "./ResponseSizeAnalyzer.js";

/**
 * Types of smart responses
 */
export type SmartResponseType = "complete" | "summary" | "section" | "chunk";

/**
 * Metadata for response sections
 */
export interface SectionMetadata {
    name: string;
    size: number;
    sizeFormatted: string;
    requiresChunking?: boolean;
    chunkCount?: number;
}

/**
 * Metadata for smart responses
 */
export interface SmartResponseMetadata {
    totalSize?: number;
    exceedsLimit?: boolean;
    message?: string;
    availableSections?: SectionMetadata[];
    section?: string;
    complete?: boolean;
    chunkIndex?: number;
    totalChunks?: number;
    hasMore?: boolean;
    nextChunkIndex?: number;
}

/**
 * Smart response structure
 */
export interface SmartResponse {
    type: SmartResponseType;
    data: unknown;
    metadata?: SmartResponseMetadata;
}

/**
 * Utility class for building smart responses that handle large data gracefully
 */
export class SmartResponseBuilder {
    /**
     * Build a smart response that handles large data gracefully
     * @param dataflow - The dataflow object
     * @param requestedSection - Optional specific section to retrieve
     * @param chunkIndex - Optional chunk index for chunked sections
     * @returns Smart response with appropriate data and metadata
     */
    static buildDataflowResponse(
        dataflow: Record<string, unknown>,
        requestedSection?: string,
        chunkIndex?: number,
    ): SmartResponse {
        const analysis = ResponseSizeAnalyzer.analyzeDataflow(dataflow);

        // If small enough, return everything
        if (!analysis.exceedsLimit && !requestedSection) {
            return {
                type: "complete",
                data: dataflow,
            };
        }

        // If requesting a specific section
        if (requestedSection) {
            return this.getSectionResponse(
                dataflow,
                requestedSection,
                chunkIndex,
            );
        }

        // Return summary with section metadata
        return this.buildSummaryResponse(dataflow, analysis);
    }

    /**
     * Build a summary response with metadata about available sections
     * @param dataflow - The dataflow object
     * @param analysis - The response analysis
     * @returns Summary response
     */
    private static buildSummaryResponse(
        dataflow: Record<string, unknown>,
        analysis: ResponseAnalysis,
    ): SmartResponse {
        const coreInfo = ResponseSizeAnalyzer.extractCoreInfo(dataflow);

        return {
            type: "summary",
            data: {
                ...coreInfo,
                _metadata: {
                    totalSize: analysis.totalSize,
                    exceedsLimit: true,
                    message:
                        "Response contains large data. Use get_dataflow_section tool to retrieve specific sections.",
                    availableSections: Object.entries(analysis.sections).map(
                        ([name, info]) => ({
                            name,
                            size: info.size,
                            sizeFormatted: this.formatBytes(info.size),
                            requiresChunking: info.requiresChunking,
                            chunkCount: info.requiresChunking
                                ? info.chunkCount
                                : undefined,
                        }),
                    ),
                },
            },
        };
    }

    /**
     * Get a response for a specific section
     * @param dataflow - The dataflow object
     * @param sectionName - The name of the section to retrieve
     * @param chunkIndex - Optional chunk index for chunked sections
     * @returns Section response
     */
    private static getSectionResponse(
        dataflow: Record<string, unknown>,
        sectionName: string,
        chunkIndex: number = 0,
    ): SmartResponse {
        const sectionData = this.extractSection(dataflow, sectionName);

        if (!sectionData) {
            throw new Error(`Section '${sectionName}' not found`);
        }

        const sectionStr = JSON.stringify(sectionData);
        const sectionSize = sectionStr.length;

        // If section fits in one response
        if (sectionSize <= RESPONSE_SIZE_LIMITS.MAX_SECTION_SIZE) {
            return {
                type: "section",
                data: sectionData,
                metadata: {
                    section: sectionName,
                    complete: true,
                },
            };
        }

        // Return chunked section
        const chunks = this.chunkData(sectionData);

        if (chunkIndex >= chunks.length) {
            throw new Error(
                `Invalid chunk index ${chunkIndex} for section '${sectionName}' (total chunks: ${chunks.length})`,
            );
        }

        return {
            type: "chunk",
            data: chunks[chunkIndex],
            metadata: {
                section: sectionName,
                chunkIndex,
                totalChunks: chunks.length,
                hasMore: chunkIndex < chunks.length - 1,
                nextChunkIndex:
                    chunkIndex < chunks.length - 1 ? chunkIndex + 1 : undefined,
            },
        };
    }

    /**
     * Extract a specific section from the dataflow
     * @param dataflow - The dataflow object
     * @param sectionName - The name of the section
     * @returns The section data or null if not found
     */
    private static extractSection(
        dataflow: Record<string, unknown>,
        sectionName: string,
    ): unknown {
        switch (sectionName) {
            case "core":
                return ResponseSizeAnalyzer.extractCoreInfo(dataflow);
            case "inputs":
                return { inputs: dataflow.inputs || [] };
            case "outputs":
                return { outputs: dataflow.outputs || [] };
            case "transformations":
                return {
                    transformations:
                        dataflow.transformations || dataflow.actions || [],
                    guiCanvas: dataflow.guiCanvas,
                };
            case "triggers":
                return { triggers: dataflow.triggerSettings || {} };
            case "history":
                return { executionHistory: dataflow.executionHistory || [] };
            case "metadata":
                return ResponseSizeAnalyzer.extractMetadata(dataflow);
            default:
                return null;
        }
    }

    /**
     * Chunk data into smaller pieces
     * @param data - The data to chunk
     * @returns Array of chunks
     */
    private static chunkData(data: unknown): unknown[] {
        // For arrays, split into smaller arrays
        if (Array.isArray(data)) {
            return this.chunkArray(data);
        }

        // For objects with array properties, split the arrays
        if (typeof data === "object" && data !== null) {
            const largestArray = this.findLargestArrayProperty(data);

            if (largestArray) {
                const [key, array] = largestArray;
                const arrayChunks = this.chunkArray(array);

                return arrayChunks.map(chunk => ({
                    ...data,
                    [key]: chunk,
                }));
            }
        }

        // If can't chunk further, return as single item
        return [data];
    }

    /**
     * Chunk an array into smaller arrays
     * @param array - The array to chunk
     * @returns Array of chunks
     */
    private static chunkArray<T>(array: T[]): T[][] {
        if (array.length === 0) return [[]];

        const chunks: T[][] = [];
        const targetChunkSize = Math.ceil(
            JSON.stringify(array).length /
                Math.ceil(
                    JSON.stringify(array).length /
                        RESPONSE_SIZE_LIMITS.CHUNK_SIZE,
                ),
        );

        // Calculate items per chunk based on average item size
        const avgItemSize = JSON.stringify(array).length / array.length;
        const itemsPerChunk = Math.max(
            1,
            Math.floor(targetChunkSize / avgItemSize),
        );

        for (let i = 0; i < array.length; i += itemsPerChunk) {
            chunks.push(array.slice(i, i + itemsPerChunk));
        }

        return chunks;
    }

    /**
     * Find the largest array property in an object
     * @param data - The object to search
     * @returns Tuple of [key, array] or null
     */
    private static findLargestArrayProperty(
        data: unknown,
    ): [string, unknown[]] | null {
        if (typeof data !== "object" || data === null) {
            return null;
        }

        const arrayProperties = Object.entries(data as Record<string, unknown>)
            .filter(([_, value]) => Array.isArray(value))
            .sort(
                (a, b) =>
                    JSON.stringify(b[1]).length - JSON.stringify(a[1]).length,
            );

        return arrayProperties.length > 0
            ? (arrayProperties[0] as [string, unknown[]])
            : null;
    }

    /**
     * Format bytes as human-readable string
     * @param bytes - Number of bytes
     * @returns Formatted string
     */
    private static formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + " bytes";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    /**
     * Build a response for when a dataflow is not found
     * @param id - The dataflow ID that was not found
     * @returns Error response
     */
    static buildNotFoundResponse(id: string): SmartResponse {
        return {
            type: "complete",
            data: {
                error: `Dataflow with ID ${id} not found`,
            },
        };
    }

    /**
     * Build an error response
     * @param error - The error message or object
     * @returns Error response
     */
    static buildErrorResponse(error: unknown): SmartResponse {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return {
            type: "complete",
            data: {
                error: errorMessage,
            },
        };
    }
}
