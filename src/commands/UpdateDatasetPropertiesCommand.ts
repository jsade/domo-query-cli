import { updateDatasetProperties } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { checkReadOnlyMode } from "../utils/readOnlyGuard";
import chalk from "chalk";
import fs from "fs/promises";
import validator from "validator";

/**
 * Interface for dataset properties update
 */
export interface DatasetPropertiesUpdate {
    name?: string;
    description?: string;
    tags?: string[];
}

/**
 * Updates properties of a specific dataset
 */
export class UpdateDatasetPropertiesCommand extends BaseCommand {
    public readonly name = "update-dataset-properties";
    public readonly description =
        "Updates properties (name, description, tags) of a specific dataset";

    /**
     * Validates the dataset name
     * @param name - The name to validate
     * @returns Validation result with error message if invalid
     */
    private validateName(name: string): { valid: boolean; error?: string } {
        if (!name || name.trim().length === 0) {
            return { valid: false, error: "Name cannot be empty" };
        }
        if (name.length > 255) {
            return { valid: false, error: "Name cannot exceed 255 characters" };
        }
        // Use validator library for XSS protection and sanitization
        if (
            validator.contains(name, "<script") ||
            validator.contains(name, "javascript:")
        ) {
            return {
                valid: false,
                error: "Name contains potentially malicious content",
            };
        }
        // Allow the name but it will be escaped when used
        return { valid: true };
    }

    /**
     * Validates the dataset description
     * @param description - The description to validate
     * @returns Validation result with error message if invalid
     */
    private validateDescription(description: string): {
        valid: boolean;
        error?: string;
    } {
        if (description.length > 1000) {
            return {
                valid: false,
                error: "Description cannot exceed 1000 characters",
            };
        }
        // Use validator library for XSS protection and sanitization
        if (
            validator.contains(description, "<script") ||
            validator.contains(description, "javascript:")
        ) {
            return {
                valid: false,
                error: "Description contains potentially malicious content",
            };
        }
        // Allow the description but it will be escaped when used
        return { valid: true };
    }

    /**
     * Validates tags array
     * @param tags - The tags to validate
     * @returns Validation result with error message if invalid
     */
    private validateTags(tags: string[]): { valid: boolean; error?: string } {
        if (!Array.isArray(tags)) {
            return { valid: false, error: "Tags must be an array" };
        }

        for (const tag of tags) {
            if (typeof tag !== "string") {
                return { valid: false, error: "All tags must be strings" };
            }
            // Use validator to check for alphanumeric with allowed special chars
            if (!validator.matches(tag, /^[a-zA-Z0-9\s\-_]+$/)) {
                return {
                    valid: false,
                    error: `Tag "${tag}" contains invalid characters. Only alphanumeric, spaces, hyphens, and underscores are allowed.`,
                };
            }
            if (tag.length > 50) {
                return {
                    valid: false,
                    error: `Tag "${tag}" exceeds 50 characters`,
                };
            }
            // Check for potentially malicious content
            if (
                validator.contains(tag, "<script") ||
                validator.contains(tag, "javascript:")
            ) {
                return {
                    valid: false,
                    error: `Tag "${tag}" contains potentially malicious content`,
                };
            }
        }
        return { valid: true };
    }

    /**
     * Parses properties from a JSON file
     * @param filePath - Path to the JSON file
     * @returns Parsed properties or null if error
     */
    private async parseJsonFile(
        filePath: string,
    ): Promise<DatasetPropertiesUpdate | null> {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const properties = JSON.parse(content);
            return properties;
        } catch (error) {
            this.outputErrorResult({
                message: `Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`,
                code: "JSON_FILE_ERROR",
            });
            return null;
        }
    }

    /**
     * Executes the update-dataset-properties command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode before attempting to modify
            checkReadOnlyMode("update-dataset-properties");

            const { parsed } = this.parseOutputConfig(args);

            // Extract dataset ID from positional args
            const datasetId = parsed.positional[0];

            if (!datasetId) {
                this.outputErrorResult({
                    message: "No dataset ID provided",
                    code: "MISSING_DATASET_ID",
                });
                return;
            }

            let properties: DatasetPropertiesUpdate = {};

            // Check for JSON file input
            if (parsed.params["json-file"]) {
                const filePath = String(parsed.params["json-file"]);
                const fileProperties = await this.parseJsonFile(filePath);
                if (!fileProperties) {
                    return;
                }
                properties = fileProperties;
            }
            // Check for inline JSON input
            else if (parsed.params["json"]) {
                try {
                    properties = JSON.parse(String(parsed.params["json"]));
                } catch {
                    this.outputErrorResult({
                        message: "Invalid JSON format",
                        code: "JSON_PARSE_ERROR",
                    });
                    return;
                }
            }
            // Check for individual property arguments
            else {
                if (parsed.params["name"]) {
                    properties.name = String(parsed.params["name"]);
                }
                if (parsed.params["description"]) {
                    properties.description = String(
                        parsed.params["description"],
                    );
                }
                if (parsed.params["tags"]) {
                    const tagsParam = String(parsed.params["tags"]);
                    // Support both comma-separated and JSON array formats
                    if (tagsParam.startsWith("[")) {
                        try {
                            properties.tags = JSON.parse(tagsParam);
                        } catch {
                            properties.tags = tagsParam
                                .split(",")
                                .map(t => t.trim());
                        }
                    } else {
                        properties.tags = tagsParam
                            .split(",")
                            .map(t => t.trim());
                    }
                }
            }

            // If no properties provided via arguments, prompt interactively
            if (Object.keys(properties).length === 0 && !this.isJsonMode) {
                console.log(
                    chalk.cyan(
                        "No properties provided. Enter the properties you want to update (press Enter to skip):",
                    ),
                );

                const nameInput = await CommandUtils.promptUser(
                    "New name (or press Enter to skip): ",
                );
                if (nameInput.trim()) {
                    properties.name = nameInput.trim();
                }

                const descInput = await CommandUtils.promptUser(
                    "New description (or press Enter to skip): ",
                );
                if (descInput.trim()) {
                    properties.description = descInput.trim();
                }

                const tagsInput = await CommandUtils.promptUser(
                    "New tags (comma-separated, or press Enter to skip): ",
                );
                if (tagsInput.trim()) {
                    properties.tags = tagsInput
                        .split(",")
                        .map(t => t.trim())
                        .filter(t => t.length > 0);
                }
            }

            // Check if we have any properties to update
            if (Object.keys(properties).length === 0) {
                this.outputErrorResult({
                    message: "No properties provided to update",
                    code: "NO_PROPERTIES",
                });
                return;
            }

            // Validate and sanitize properties
            if (properties.name) {
                const nameValidation = this.validateName(properties.name);
                if (!nameValidation.valid) {
                    this.outputErrorResult({
                        message: nameValidation.error!,
                        code: "VALIDATION_ERROR",
                    });
                    return;
                }
                // Sanitize the name before using it
                properties.name = validator.escape(properties.name);
            }

            if (properties.description) {
                const descValidation = this.validateDescription(
                    properties.description,
                );
                if (!descValidation.valid) {
                    this.outputErrorResult({
                        message: descValidation.error!,
                        code: "VALIDATION_ERROR",
                    });
                    return;
                }
                // Sanitize the description before using it
                properties.description = validator.escape(
                    properties.description,
                );
            }

            if (properties.tags) {
                const tagsValidation = this.validateTags(properties.tags);
                if (!tagsValidation.valid) {
                    this.outputErrorResult({
                        message: tagsValidation.error!,
                        code: "VALIDATION_ERROR",
                    });
                    return;
                }
                // Sanitize each tag before using it
                properties.tags = properties.tags.map(tag =>
                    validator.escape(tag),
                );
            }

            // Show confirmation if not skipped
            if (!parsed.flags.has("no-confirm") && !this.isJsonMode) {
                console.log(chalk.cyan("\nProperties to update:"));
                if (properties.name) {
                    console.log(`  Name: ${properties.name}`);
                }
                if (properties.description) {
                    console.log(`  Description: ${properties.description}`);
                }
                if (properties.tags) {
                    console.log(`  Tags: ${properties.tags.join(", ")}`);
                }

                const confirmed = await CommandUtils.promptConfirmation(
                    "\nDo you want to proceed with the update?",
                );
                if (!confirmed) {
                    console.log("Update cancelled.");
                    return;
                }
            }

            // Perform the update
            const result = await updateDatasetProperties(datasetId, properties);

            if (result) {
                await this.output(
                    {
                        success: true,
                        data: {
                            datasetId,
                            updatedProperties: properties,
                            result,
                        },
                        metadata: { entityType: "dataset" },
                    },
                    () => this.displaySuccessTable(properties),
                    "update-dataset-properties",
                );
            } else {
                this.outputErrorResult({
                    message: "Failed to update dataset properties",
                    code: "UPDATE_FAILED",
                });
            }
        } catch (error) {
            log.error("Error updating dataset properties:", error);
            this.outputErrorResult({
                message: error instanceof Error ? error.message : String(error),
                code: "UPDATE_ERROR",
            });
        }
    }

    /**
     * Display success message with updated properties
     */
    private displaySuccessTable(properties: DatasetPropertiesUpdate): void {
        console.log(chalk.green("\n✓ Dataset properties updated successfully"));
        console.log(chalk.cyan("\nUpdated properties:"));
        if (properties.name) {
            console.log(`  Name: ${properties.name}`);
        }
        if (properties.description) {
            console.log(`  Description: ${properties.description}`);
        }
        if (properties.tags) {
            console.log(`  Tags: ${properties.tags.join(", ")}`);
        }
        console.log("");
    }

    /**
     * Shows help for the update-dataset-properties command
     */
    public showHelp(): void {
        console.log(this.description);
        console.log(
            "\nUsage: update-dataset-properties <dataset_id> [options]",
        );

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "dataset_id",
                Description: "Required dataset ID to update",
            },
        ];
        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nProperty Options:"));
        const propOptionsData = [
            {
                Option: "--name=<name>",
                Description: "New name for the dataset",
            },
            { Option: "--description=<desc>", Description: "New description" },
            {
                Option: "--tags=<tags>",
                Description: "Comma-separated list of tags",
            },
            {
                Option: "--json=<json>",
                Description: "Inline JSON with properties",
            },
            {
                Option: "--json-file=<path>",
                Description: "Path to JSON file with properties",
            },
            { Option: "--no-confirm", Description: "Skip confirmation prompt" },
        ];
        console.log(TerminalFormatter.table(propOptionsData));

        console.log(chalk.cyan("\nOutput Options:"));
        const outputOptionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            { Option: "--export=md", Description: "Export as Markdown" },
            { Option: "--export=both", Description: "Export both formats" },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            { Option: "--quiet", Description: "Suppress export messages" },
        ];
        console.log(TerminalFormatter.table(outputOptionsData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

        console.log(chalk.cyan("\nValidation Rules:"));
        const validationData = [
            { Property: "Name", Rule: "Non-empty string, max 255 characters" },
            {
                Property: "Description",
                Rule: "Optional string, max 1000 characters",
            },
            {
                Property: "Tags",
                Rule: "Alphanumeric with spaces, hyphens, underscores",
            },
        ];
        console.log(TerminalFormatter.table(validationData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command:
                    'update-dataset-properties abc-123 --name="Sales Data 2024"',
                Description: "Update dataset name",
            },
            {
                Command:
                    'update-dataset-properties abc-123 --tags="sales,finance,2024"',
                Description: "Update dataset tags",
            },
            {
                Command:
                    'update-dataset-properties abc-123 --json=\'{"name":"New Name"}\'',
                Description: "Update with inline JSON",
            },
            {
                Command:
                    "update-dataset-properties abc-123 --json-file=props.json",
                Description: "Update from JSON file",
            },
            {
                Command: "update-dataset-properties abc-123 --export",
                Description: "Update and export result",
            },
            {
                Command: "update-dataset-properties abc-123",
                Description: "Interactive mode",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
        console.log("");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--name=",
            "--description=",
            "--tags=",
            "--json=",
            "--json-file=",
            "--no-confirm",
            // Unified output flags
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy flags (still supported)
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
