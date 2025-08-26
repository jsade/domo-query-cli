/**
 * Configuration for response size limits
 */
export const RESPONSE_SIZE_LIMITS = {
    MAX_SINGLE_RESPONSE: 80 * 1024, // 80KB safe threshold
    MAX_SECTION_SIZE: 70 * 1024, // 70KB per section
    CHUNK_SIZE: 50 * 1024, // 50KB per chunk for very large sections
};

/**
 * Analysis result for a response section
 */
export interface SectionAnalysis {
    size: number;
    requiresChunking: boolean;
    chunkCount: number;
}

/**
 * Complete response analysis result
 */
export interface ResponseAnalysis {
    totalSize: number;
    exceedsLimit: boolean;
    sections: {
        [key: string]: SectionAnalysis;
    };
}

/**
 * Core information extracted from a dataflow
 */
export interface DataflowCoreInfo {
    id: string | number;
    name?: string;
    description?: string;
    status?: string;
    runState?: string;
    enabled?: boolean;
    createdAt?: string;
    modified?: string;
    lastModified?: string;
    owner?: string;
    responsibleUserId?: string;
    inputCount?: number;
    outputCount?: number;
    lastExecution?: unknown;
}

/**
 * Metadata extracted from a dataflow
 */
export interface DataflowMetadata {
    version?: unknown;
    onboardFlowVersionDetails?: unknown;
    engineProperties?: unknown;
    settings?: unknown;
    hydrationState?: unknown;
    magic?: unknown;
    subsetProcessing?: unknown;
}

/**
 * Utility class for analyzing response sizes and determining chunking strategy
 */
export class ResponseSizeAnalyzer {
    /**
     * Analyze the size of different parts of a dataflow response
     * @param dataflow - The dataflow object to analyze
     * @returns Analysis result with size information for each section
     */
    static analyzeDataflow(
        dataflow: Record<string, unknown>,
    ): ResponseAnalysis {
        const sections = {
            core: this.extractCoreInfo(dataflow),
            inputs: dataflow.inputs || [],
            outputs: dataflow.outputs || [],
            transformations: dataflow.transformations || dataflow.actions || [],
            triggers: dataflow.triggerSettings || {},
            history: dataflow.executionHistory || [],
            metadata: this.extractMetadata(dataflow),
        };

        const analysis: ResponseAnalysis = {
            totalSize: JSON.stringify(dataflow).length,
            exceedsLimit: false,
            sections: {},
        };

        // Analyze each section
        for (const [key, value] of Object.entries(sections)) {
            const size = JSON.stringify(value).length;
            analysis.sections[key] = {
                size,
                requiresChunking: size > RESPONSE_SIZE_LIMITS.MAX_SECTION_SIZE,
                chunkCount: Math.ceil(size / RESPONSE_SIZE_LIMITS.CHUNK_SIZE),
            };
        }

        analysis.exceedsLimit =
            analysis.totalSize > RESPONSE_SIZE_LIMITS.MAX_SINGLE_RESPONSE;

        return analysis;
    }

    /**
     * Extract core information from a dataflow
     * @param dataflow - The dataflow object
     * @returns Core information object
     */
    static extractCoreInfo(
        dataflow: Record<string, unknown>,
    ): DataflowCoreInfo {
        return {
            id: dataflow.id as string | number,
            name: dataflow.name as string | undefined,
            description: dataflow.description as string | undefined,
            status: (dataflow.status || dataflow.runState) as
                | string
                | undefined,
            runState: dataflow.runState as string | undefined,
            enabled: dataflow.enabled as boolean | undefined,
            createdAt: dataflow.createdAt as string | undefined,
            modified: (dataflow.modified || dataflow.lastModified) as
                | string
                | undefined,
            lastModified: dataflow.lastModified as string | undefined,
            owner: (dataflow.owner || dataflow.responsibleUserId) as
                | string
                | undefined,
            responsibleUserId: dataflow.responsibleUserId as string | undefined,
            inputCount:
                (dataflow.inputCount as number | undefined) ||
                (Array.isArray(dataflow.inputs) ? dataflow.inputs.length : 0),
            outputCount:
                (dataflow.outputCount as number | undefined) ||
                (Array.isArray(dataflow.outputs) ? dataflow.outputs.length : 0),
            lastExecution: dataflow.lastExecution,
        };
    }

    /**
     * Extract metadata from a dataflow
     * @param dataflow - The dataflow object
     * @returns Metadata object
     */
    static extractMetadata(
        dataflow: Record<string, unknown>,
    ): DataflowMetadata {
        return {
            version: dataflow.version,
            onboardFlowVersionDetails: dataflow.onboardFlowVersionDetails,
            engineProperties: dataflow.engineProperties,
            settings: dataflow.settings,
            hydrationState: dataflow.hydrationState,
            magic: dataflow.magic,
            subsetProcessing: dataflow.subsetProcessing,
        };
    }

    /**
     * Calculate the size of a value in bytes when stringified as JSON
     * @param value - The value to measure
     * @returns Size in bytes
     */
    static calculateJsonSize(value: unknown): number {
        return JSON.stringify(value).length;
    }

    /**
     * Check if a value would exceed the maximum response size
     * @param value - The value to check
     * @returns True if the value exceeds the limit
     */
    static exceedsResponseLimit(value: unknown): boolean {
        return (
            this.calculateJsonSize(value) >
            RESPONSE_SIZE_LIMITS.MAX_SINGLE_RESPONSE
        );
    }

    /**
     * Check if a value would require chunking
     * @param value - The value to check
     * @returns True if the value requires chunking
     */
    static requiresChunking(value: unknown): boolean {
        return (
            this.calculateJsonSize(value) >
            RESPONSE_SIZE_LIMITS.MAX_SECTION_SIZE
        );
    }
}
