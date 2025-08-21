import { getCard } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import chalk from "chalk";

/**
 * Gets detailed information about a specific card
 */
export class GetCardCommand extends BaseCommand {
    public readonly name = "get-card";
    public readonly description =
        "Gets detailed information about a specific card";

    /**
     * Executes the get-card command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract ID from positional args
            const cardId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            if (!cardId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No card ID provided",
                            "MISSING_CARD_ID",
                        ),
                    );
                } else {
                    console.log(
                        "No card ID provided. Please specify a card ID.",
                    );
                    console.log("Usage: get-card <card_id>");
                }
                return;
            }

            const card = await getCard(cardId);

            if (card) {
                if (this.isJsonOutput) {
                    // For JSON output, return complete card data
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { card },
                            { entityType: "card" },
                        ),
                    );
                } else {
                    console.log(chalk.cyan("\nCard Details:"));
                    console.log("-------------");
                    console.log(`ID: ${card.id}`);
                    console.log(`URN: ${card.cardUrn || "N/A"}`);
                    console.log(
                        `Title: ${card.cardTitle || card.title || "N/A"}`,
                    );
                    console.log(`Type: ${card.type || "N/A"}`);
                    console.log(`Description: ${card.description || "N/A"}`);

                    if (card.lastModified) {
                        console.log(
                            `Last Modified: ${new Date(card.lastModified).toLocaleString()}`,
                        );
                    }

                    console.log(`Owner ID: ${card.ownerId || "N/A"}`);
                    console.log(
                        `Owner Name: ${card.ownerName || card.owner || "N/A"}`,
                    );

                    // Display pages if available
                    if (card.pages && card.pages.length > 0) {
                        console.log(chalk.cyan("\nPages:"));
                        console.log("------");
                        card.pages.forEach(pageId => {
                            console.log(`  - Page ${pageId}`);
                        });
                    }

                    // Display datasets if available
                    if (card.datasets && card.datasets.length > 0) {
                        console.log(chalk.cyan("\nDatasets:"));
                        console.log("---------");
                        card.datasets.forEach(datasetId => {
                            console.log(`  - ${datasetId}`);
                        });
                    }

                    // Display definition details if available
                    if (card.definition) {
                        console.log(chalk.cyan("\nCard Definition:"));
                        console.log("----------------");

                        if (card.definition.chartType) {
                            console.log(
                                `Chart Type: ${card.definition.chartType}`,
                            );
                        }
                        if (card.definition.chartVersion) {
                            console.log(
                                `Chart Version: ${card.definition.chartVersion}`,
                            );
                        }
                        if (card.definition.dataSetId) {
                            console.log(
                                `Primary Dataset: ${card.definition.dataSetId}`,
                            );
                        }
                        if (card.definition.title) {
                            console.log(
                                `Definition Title: ${card.definition.title}`,
                            );
                        }
                        if (card.definition.description) {
                            console.log(
                                `Definition Description: ${card.definition.description}`,
                            );
                        }

                        // Display calculated fields if available
                        if (
                            card.definition.calculatedFields &&
                            card.definition.calculatedFields.length > 0
                        ) {
                            console.log(chalk.cyan("\nCalculated Fields:"));
                            console.log("------------------");
                            card.definition.calculatedFields.forEach(field => {
                                console.log(`  - ${field.name} (${field.id})`);
                                console.log(`    Formula: ${field.formula}`);
                                console.log(
                                    `    Save to Dataset: ${field.saveToDataSet}`,
                                );
                            });
                        }
                    }

                    await CommandUtils.exportData(
                        [card],
                        `Domo Card ${card.cardTitle || card.title || card.id}`,
                        "card",
                        saveOptions,
                    );

                    console.log("");
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Card not found",
                            "CARD_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log("No card found.");
                }
            }
        } catch (error) {
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        error instanceof Error ? error.message : String(error),
                        "FETCH_ERROR",
                    ),
                );
            } else {
                log.error("Error fetching card:", error);
            }
        }
    }

    /**
     * Shows help for the get-card command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific card");
        console.log("Usage: get-card <card_id> [options]");
        console.log(chalk.cyan("\nParameters:"));
        console.log("  card_id             Required card ID or URN to view");
        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --save              Save results to JSON file (default)",
        );
        console.log("  --save-json         Save results to JSON file");
        console.log("  --save-md           Save results to Markdown file");
        console.log(
            "  --save-both         Save results to both JSON and Markdown files",
        );
        console.log("  --path=<directory>  Specify custom export directory");
        console.log("  --format=json       Output results in JSON format");
        console.log(chalk.cyan("\nInfo Displayed:"));
        console.log(
            "  - Basic card properties: ID, URN, Title, Type, Description",
        );
        console.log("  - Owner information: ID and Name");
        console.log("  - Associated pages and datasets");
        console.log(
            "  - Card definition details including chart type and version",
        );
        console.log("  - Calculated fields with formulas");
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  get-card abc-123-def            Get details for card with ID abc-123-def",
        );
        console.log(
            "  get-card abc-123 --save-md      Get details and save to markdown",
        );
        console.log(
            "  get-card abc-123 --format=json  Get details in JSON format",
        );
        console.log("");
    }
}
