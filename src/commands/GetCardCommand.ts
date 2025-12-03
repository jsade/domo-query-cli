import { getCard, DomoCard } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { TerminalFormatter } from "../utils/terminalFormatter";
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
            const { parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const cardId = parsed.positional[0];

            if (!cardId) {
                this.outputErrorResult(
                    {
                        message: "No card ID provided",
                        code: "MISSING_CARD_ID",
                    },
                    () => {
                        console.log(
                            "No card ID provided. Please specify a card ID.",
                        );
                        console.log("Usage: get-card <card_id>");
                    },
                );
                return;
            }

            const card = await getCard(cardId);

            if (card) {
                await this.output(
                    {
                        success: true,
                        data: { card },
                        metadata: { entityType: "card" },
                    },
                    () => this.displayCard(card),
                    "card",
                );
            } else {
                this.outputErrorResult(
                    {
                        message: "Card not found",
                        code: "CARD_NOT_FOUND",
                    },
                    () => {
                        console.log("No card found.");
                    },
                );
            }
        } catch (error) {
            log.error("Error fetching card:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch card",
                    code: "FETCH_ERROR",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to fetch card."),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                },
            );
        }
    }

    /**
     * Display card details in table format
     */
    private displayCard(card: DomoCard): void {
        console.log(chalk.cyan("\nCard Details:"));
        console.log("-------------");
        console.log(`ID: ${card.id}`);
        console.log(`URN: ${card.cardUrn || "N/A"}`);
        console.log(`Title: ${card.cardTitle || card.title || "N/A"}`);
        console.log(`Type: ${card.type || "N/A"}`);
        console.log(`Description: ${card.description || "N/A"}`);

        if (card.lastModified) {
            console.log(
                `Last Modified: ${new Date(card.lastModified).toLocaleString()}`,
            );
        }

        console.log(`Owner ID: ${card.ownerId || "N/A"}`);
        console.log(`Owner Name: ${card.ownerName || card.owner || "N/A"}`);

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
            card.datasets.forEach((datasetId: string) => {
                console.log(`  - ${datasetId}`);
            });
        }

        // Display definition details if available
        if (card.definition) {
            console.log(chalk.cyan("\nCard Definition:"));
            console.log("----------------");

            if (card.definition.chartType) {
                console.log(`Chart Type: ${card.definition.chartType}`);
            }
            if (card.definition.chartVersion) {
                console.log(`Chart Version: ${card.definition.chartVersion}`);
            }
            if (card.definition.dataSetId) {
                console.log(`Primary Dataset: ${card.definition.dataSetId}`);
            }
            if (card.definition.title) {
                console.log(`Definition Title: ${card.definition.title}`);
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
                    console.log(`    Save to Dataset: ${field.saveToDataSet}`);
                });
            }
        }

        console.log("");
    }

    /**
     * Shows help for the get-card command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific card");
        console.log("Usage: get-card <card_id> [options]");

        console.log(chalk.cyan("\nParameters:"));
        console.log("  card_id             Required card ID or URN to view");

        console.log(chalk.cyan("\nOutput Options:"));
        const optionsData = [
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
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

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
            "  get-card abc-123 --export=md    Get details and save to markdown",
        );
        console.log(
            "  get-card abc-123 --format=json  Get details in JSON format",
        );
        console.log("");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
