import { updateDatasetProperties } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import chalk from "chalk";
import fs from "fs/promises";
import readline from "readline";

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
        // Sanitize against potential XSS/SQL injection
        const sanitized = name.replace(/[<>'"]/g, "");
        if (sanitized !== name) {
            return {
                valid: false,
                error: "Name contains invalid characters (<>\'\")",
            };
        }
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
        // Sanitize against potential XSS/SQL injection
        const sanitized = description.replace(/[<>'"]/g, "");
        if (sanitized !== description) {
            return {
                valid: false,
                error: "Description contains invalid characters (<>\'\")",
            };
        }
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
            // Allow alphanumeric, spaces, hyphens, underscores
            const tagPattern = /^[a-zA-Z0-9\s\-_]+$/;
            if (!tagPattern.test(tag)) {
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
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        `Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`,
                        "JSON_FILE_ERROR",
                    ),
                );
            } else {
                console.error(
                    `Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
            return null;
        }
    }

    /**
     * Prompts user for input
     * @param prompt - The prompt message
     * @returns User input
     */
    private async promptUser(prompt: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise(resolve => {
            rl.question(prompt, answer => {
                rl.close();
                resolve(answer);
            });
        });
    }

    /**
     * Executes the update-dataset-properties command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract dataset ID from positional args
            const datasetId = parsedArgs.positional[0];

            if (!datasetId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No dataset ID provided",
                            "MISSING_DATASET_ID",
                        ),
                    );
                } else {
                    console.log("No dataset ID provided.");
                }
                return;
            }

            let properties: DatasetPropertiesUpdate = {};

            // Check for JSON file input
            if (parsedArgs.params["json-file"]) {
                const filePath = String(parsedArgs.params["json-file"]);
                const fileProperties = await this.parseJsonFile(filePath);
                if (!fileProperties) {
                    return;
                }
                properties = fileProperties;
            }
            // Check for inline JSON input
            else if (parsedArgs.params["json"]) {
                try {
                    properties = JSON.parse(String(parsedArgs.params["json"]));
                } catch {
                    if (this.isJsonOutput) {
                        console.log(
                            JsonOutputFormatter.error(
                                this.name,
                                "Invalid JSON format",
                                "JSON_PARSE_ERROR",
                            ),
                        );
                    } else {
                        console.error("Invalid JSON format");
                    }
                    return;
                }
            }
            // Check for individual property arguments
            else {
                if (parsedArgs.params["name"]) {
                    properties.name = String(parsedArgs.params["name"]);
                }
                if (parsedArgs.params["description"]) {
                    properties.description = String(
                        parsedArgs.params["description"],
                    );
                }
                if (parsedArgs.params["tags"]) {
                    const tagsParam = String(parsedArgs.params["tags"]);
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
            if (Object.keys(properties).length === 0 && !this.isJsonOutput) {
                console.log(
                    chalk.cyan(
                        "No properties provided. Enter the properties you want to update (press Enter to skip):",
                    ),
                );

                const nameInput = await this.promptUser(
                    "New name (or press Enter to skip): ",
                );
                if (nameInput.trim()) {
                    properties.name = nameInput.trim();
                }

                const descInput = await this.promptUser(
                    "New description (or press Enter to skip): ",
                );
                if (descInput.trim()) {
                    properties.description = descInput.trim();
                }

                const tagsInput = await this.promptUser(
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
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No properties provided to update",
                            "NO_PROPERTIES",
                        ),
                    );
                } else {
                    console.log("No properties provided to update.");
                }
                return;
            }

            // Validate properties
            if (properties.name) {
                const nameValidation = this.validateName(properties.name);
                if (!nameValidation.valid) {
                    if (this.isJsonOutput) {
                        console.log(
                            JsonOutputFormatter.error(
                                this.name,
                                nameValidation.error!,
                                "VALIDATION_ERROR",
                            ),
                        );
                    } else {
                        console.error(
                            `Validation error: ${nameValidation.error}`,
                        );
                    }
                    return;
                }
            }

            if (properties.description) {
                const descValidation = this.validateDescription(
                    properties.description,
                );
                if (!descValidation.valid) {
                    if (this.isJsonOutput) {
                        console.log(
                            JsonOutputFormatter.error(
                                this.name,
                                descValidation.error!,
                                "VALIDATION_ERROR",
                            ),
                        );
                    } else {
                        console.error(
                            `Validation error: ${descValidation.error}`,
                        );
                    }
                    return;
                }
            }

            if (properties.tags) {
                const tagsValidation = this.validateTags(properties.tags);
                if (!tagsValidation.valid) {
                    if (this.isJsonOutput) {
                        console.log(
                            JsonOutputFormatter.error(
                                this.name,
                                tagsValidation.error!,
                                "VALIDATION_ERROR",
                            ),
                        );
                    } else {
                        console.error(
                            `Validation error: ${tagsValidation.error}`,
                        );
                    }
                    return;
                }
            }

            // Show confirmation if not in JSON mode
            if (!this.isJsonOutput && !parsedArgs.flags.has("no-confirm")) {
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

                const confirm = await this.promptUser(
                    "\nDo you want to proceed with the update? (y/n): ",
                );
                if (
                    confirm.toLowerCase() !== "y" &&
                    confirm.toLowerCase() !== "yes"
                ) {
                    console.log("Update cancelled.");
                    return;
                }
            }

            // Perform the update
            const result = await updateDatasetProperties(datasetId, properties);

            if (result) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            {
                                datasetId,
                                updatedProperties: properties,
                                result,
                            },
                            { entityType: "dataset" },
                        ),
                    );
                } else {
                    console.log(
                        chalk.green(
                            "\n✓ Dataset properties updated successfully",
                        ),
                    );
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
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Failed to update dataset properties",
                            "UPDATE_FAILED",
                        ),
                    );
                } else {
                    console.log("Failed to update dataset properties.");
                }
            }
        } catch (error) {
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        error instanceof Error ? error.message : String(error),
                        "UPDATE_ERROR",
                    ),
                );
            } else {
                log.error("Error updating dataset properties:", error);
            }
        }
    }

    /**
     * Shows help for the update-dataset-properties command
     */
    public showHelp(): void {
        console.log("Updates properties of a specific dataset");
        console.log("Usage: update-dataset-properties <dataset_id> [options]");
        console.log(chalk.cyan("\nParameters:"));
        console.log("  dataset_id          Required dataset ID to update");
        console.log(chalk.cyan("\nOptions:"));
        console.log("  --name=<name>       New name for the dataset");
        console.log("  --description=<desc> New description for the dataset");
        console.log("  --tags=<tags>       Comma-separated list of tags");
        console.log(
            "  --json=<json>       Inline JSON with properties to update",
        );
        console.log("  --json-file=<path>  Path to JSON file with properties");
        console.log("  --no-confirm        Skip confirmation prompt");
        console.log("  --format=json       Output results in JSON format");
        console.log(chalk.cyan("\nValidation Rules:"));
        console.log("  - Name: Required non-empty string, max 255 characters");
        console.log("  - Description: Optional string, max 1000 characters");
        console.log(
            "  - Tags: Array of alphanumeric strings (plus spaces, hyphens, underscores)",
        );
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            '  update-dataset-properties abc-123 --name="Sales Data 2024"',
        );
        console.log(
            '  update-dataset-properties abc-123 --tags="sales,finance,2024"',
        );
        console.log(
            '  update-dataset-properties abc-123 --json=\'{"name":"New Name","tags":["tag1","tag2"]}\'',
        );
        console.log(
            "  update-dataset-properties abc-123 --json-file=properties.json",
        );
        console.log("  update-dataset-properties abc-123  # Interactive mode");
        console.log("");
    }
}
