import * as fs from "fs/promises";
import inquirer from "inquirer";
import * as path from "path";
import type { KpiCardPart } from "../api/clients/domoClient";
import { renderKpiCard, listCards } from "../api/clients/domoClient";
import { domoConfig } from "../config";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Renders a KPI card and saves the results
 */
export class RenderCardCommand extends BaseCommand {
    public readonly name = "render-card";
    public readonly description = "Renders a KPI card and saves the results";

    /**
     * Creates a new RenderCardCommand
     */
    constructor() {
        super();
    }

    /**
     * Executes the render-card command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        const parsedArgs = CommandUtils.parseCommandArgs(args);

        // Check for JSON output format
        if (parsedArgs.format?.toLowerCase() === "json") {
            this.isJsonOutput = true;
        }

        const saveOptions = parsedArgs.saveOptions;
        let cardId: string | undefined;

        // Extract ID from positional args
        if (parsedArgs.positional && parsedArgs.positional.length > 0) {
            cardId = parsedArgs.positional[0];
            if (!this.isJsonOutput) {
                console.log("Using provided card ID:", cardId);
            }
        } else {
            // No card ID provided - need to fetch cards for selection
            if (this.isJsonOutput) {
                // Can't do interactive selection in JSON mode
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        "Card ID required when using JSON format",
                        "MISSING_CARD_ID",
                    ),
                );
                return;
            }

            try {
                console.log("Fetching available cards...");
                const cards = await listCards({ limit: 100, offset: 0 });

                if (cards.length === 0) {
                    console.log("No cards available to render.");
                    return;
                }

                const choices = cards.map((card, index) => ({
                    name: `${index + 1}. ${card.title || card.cardTitle || "Unknown"} (${card.type || "Unknown"})`,
                    value: card.id || card.cardUrn,
                }));

                const { selectedCard } = await inquirer.prompt([
                    {
                        type: "list",
                        name: "selectedCard",
                        message: "Select a card to render:",
                        choices,
                    },
                ]);

                cardId = selectedCard;
                console.log("Selected card ID:", cardId);
            } catch (error) {
                console.error("Error during card selection:", error);
                return;
            }
        }

        if (!cardId) {
            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        "No card selected",
                        "NO_CARD_SELECTED",
                    ),
                );
            } else {
                console.log("No card selected.");
            }
            return;
        }

        try {
            const exportDir = saveOptions?.path || domoConfig.exportPath;

            // Ensure we have a valid export directory
            if (!exportDir) {
                const errorMsg =
                    "Export directory is not configured. Set DOMO_EXPORT_PATH environment variable.";
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            errorMsg,
                            "EXPORT_PATH_NOT_CONFIGURED",
                        ),
                    );
                } else {
                    console.error(errorMsg);
                }
                return;
            }

            try {
                await fs.mkdir(exportDir, { recursive: true });
                log.debug(`Export directory ensured at: ${exportDir}`);
            } catch (error) {
                const errorMsg = `Failed to create export directory at "${exportDir}": ${error instanceof Error ? error.message : String(error)}`;
                log.error(errorMsg);

                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            errorMsg,
                            "EXPORT_DIR_ERROR",
                        ),
                    );
                } else {
                    console.error(errorMsg);
                }
                return;
            }

            if (!this.isJsonOutput) {
                console.log(`Rendering KPI card ${cardId}...`);
            }
            const parts: KpiCardPart[] = ["image", "summary"];
            const cardData = await renderKpiCard(cardId, parts);

            // Handle the JSON response format
            if (
                cardData &&
                typeof cardData === "object" &&
                "image" in cardData &&
                "summary" in cardData
            ) {
                const typedCardData = cardData as {
                    image: { data: string; notAllDataShown: boolean };
                    summary: {
                        label: string;
                        value: string;
                        number: number;
                        data: Record<string, unknown>;
                        status: string;
                    };
                    limited: boolean;
                    notAllDataShown: boolean;
                };

                const files: Record<string, string> = {};

                // Save image
                if (typedCardData.image && typedCardData.image.data) {
                    const imageBuffer = Buffer.from(
                        typedCardData.image.data,
                        "base64",
                    );
                    const fileName = `kpi-card-${cardId}.png`;
                    const filePath = path.join(exportDir, fileName);
                    await fs.writeFile(filePath, imageBuffer);
                    files.image = filePath;
                    if (!this.isJsonOutput) {
                        console.log(`Image saved to ${filePath}`);
                    }
                }

                // Save summary
                if (typedCardData.summary) {
                    const summaryFileName = `kpi-card-${cardId}-summary.json`;
                    const summaryPath = path.join(exportDir, summaryFileName);
                    await fs.writeFile(
                        summaryPath,
                        JSON.stringify(typedCardData.summary, null, 2),
                    );
                    files.summary = summaryPath;
                    if (!this.isJsonOutput) {
                        console.log(`Summary saved to ${summaryPath}`);
                    }
                }

                // Save full response
                const fullResponseFileName = `kpi-card-${cardId}-full-response.json`;
                const fullResponsePath = path.join(
                    exportDir,
                    fullResponseFileName,
                );
                await fs.writeFile(
                    fullResponsePath,
                    JSON.stringify(cardData, null, 2),
                );
                files.fullResponse = fullResponsePath;
                if (!this.isJsonOutput) {
                    console.log(`Full response saved to ${fullResponsePath}`);
                }

                // Output success in JSON format if requested
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            {
                                cardId,
                                files,
                                summary: typedCardData.summary,
                                notAllDataShown: typedCardData.notAllDataShown,
                            },
                            {
                                exportPath: exportDir,
                            },
                        ),
                    );
                }
            } else {
                // Unexpected response format
                const debugFileName = `kpi-card-${cardId}-debug.json`;
                const debugPath = path.join(exportDir, debugFileName);
                await fs.writeFile(
                    debugPath,
                    JSON.stringify(cardData, null, 2),
                );

                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "Unexpected response format from API",
                            "INVALID_API_RESPONSE",
                        ),
                    );
                } else {
                    console.log("Unexpected response format from API");
                    console.log(
                        "Response:",
                        JSON.stringify(cardData, null, 2).substring(0, 500),
                    );
                    console.log(`Debug output saved to ${debugPath}`);
                }
            }
        } catch (error) {
            let errorCode = "RENDER_ERROR";
            let errorMessage =
                error instanceof Error ? error.message : String(error);

            // Check if this is an API error with invalid columns (common issue)
            if (errorMessage.includes("Invalid column(s) referenced")) {
                errorCode = "CARD_DATA_ERROR";
                errorMessage = `Card ${cardId} has data configuration issues: ${errorMessage}`;
            } else if (errorMessage.includes("ENOENT")) {
                errorCode = "FILE_SYSTEM_ERROR";
            } else if (
                errorMessage.includes("400") ||
                errorMessage.includes("Bad Request")
            ) {
                errorCode = "API_BAD_REQUEST";
            }

            if (this.isJsonOutput) {
                console.log(
                    JsonOutputFormatter.error(
                        this.name,
                        errorMessage,
                        errorCode,
                    ),
                );
            } else {
                console.error("Error rendering KPI card:", error);
                if (error instanceof Error) {
                    console.error("Error message:", error.message);
                    if ("response" in error) {
                        console.error(
                            "API response:",
                            (error as Error & { response?: unknown }).response,
                        );
                    }
                }
            }
        }
    }

    /**
     * Shows help for the render-card command
     */
    public showHelp(): void {
        console.log(
            "Renders a KPI card and saves the results as images and summary data",
        );
        console.log("\nUsage: render-card [card_id] [options]");

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "card_id",
                Type: "string",
                Description:
                    "Optional card ID. If not provided, prompts for selection",
            },
        ];
        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--path=<directory>",
                Description: "Specify custom export directory",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "render-card",
                Description: "Prompt for card selection",
            },
            {
                Command: "render-card abc123",
                Description: "Render card with ID abc123",
            },
            {
                Command: "render-card abc123 --path=/custom/path",
                Description: "Render to custom directory",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
