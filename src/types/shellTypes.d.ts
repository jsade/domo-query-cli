// Shell-related types and interfaces

/**
 * Represents options for saving command results
 */
export interface SaveOptions {
    format: "json" | "md" | "both";
    path?: string;
}

/**
 * Represents options for writing command output to a file
 */
export interface OutputOptions {
    format: "json";
    path: string;
}

/**
 * Command interface representing a shell command
 */
export interface Command {
    name: string;
    description: string;
    execute: (args?: string[]) => Promise<void>;
}
