import * as fs from "fs/promises";
import inquirer from "inquirer";
import * as path from "path";
import type { DomoCard, KpiCardPart } from "../api/clients/domoClient";
import { renderKpiCard } from "../api/clients/domoClient";
import { domoConfig } from "../config";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Renders a KPI card and saves the results
 */
export class RenderCardCommand extends BaseCommand {
    public readonly name = "render-card";
    public readonly description = "Renders a KPI card and saves the results";
    private cardsProvider: () => DomoCard[];

    /**
     * Creates a new RenderCardCommand
     * @param cardsProvider - Function that provides the list of cards
     */
    constructor(cardsProvider: () => DomoCard[]) {
        super();
        this.cardsProvider = cardsProvider;
    }

    /**
     * Executes the render-card command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        console.log("RenderCardCommand.execute called with args:", args);

        const [_, saveOptions] = CommandUtils.parseSaveOptions(args || []);

        let cardId: string | undefined;
        const cards = this.cardsProvider();

        console.log("Available cards count:", cards.length);

        if (cards.length === 0) {
            console.log(
                "No cards available to select from. Please run 'list-cards' first.",
            );
            return;
        }

        if (_ && _.length > 0) {
            cardId = _[0];
            console.log("Using provided card ID:", cardId);
        } else {
            console.log("No card ID provided, showing selection prompt...");
            const choices = cards.map((card, index) => ({
                name: `${index + 1}. ${card.title || card.cardTitle || "Unknown"} (${card.type || "Unknown"})`,
                value: card.id || card.cardUrn,
            }));

            console.log("Choices available:", choices.length);

            if (choices.length === 0) {
                console.log("No cards available to render.");
                return;
            }

            try {
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
            } catch (promptError) {
                console.error("Error during card selection:", promptError);
                return;
            }
        }

        if (!cardId) {
            console.log("No card selected.");
            return;
        }

        try {
            const exportDir = saveOptions?.path || domoConfig.exportPath;
            try {
                await fs.mkdir(exportDir, { recursive: true });
            } catch (error) {
                log.debug(
                    "Exports directory already exists or couldn't be created",
                    error,
                );
            }

            console.log(`Rendering KPI card ${cardId}...`);
            const parts: KpiCardPart[] = ["image", "summary"];
            const cardData = await renderKpiCard(cardId, parts);

            // Debug: log the actual response structure
            console.log("API Response type:", typeof cardData);

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

                console.log(
                    "Processing JSON response with image and summary...",
                );

                // Save image
                if (typedCardData.image && typedCardData.image.data) {
                    const imageBuffer = Buffer.from(
                        typedCardData.image.data,
                        "base64",
                    );
                    const fileName = `kpi-card-${cardId}.png`;
                    await fs.writeFile(
                        path.join(exportDir, fileName),
                        imageBuffer,
                    );
                    console.log(`Image saved to ${exportDir}/${fileName}`);
                }

                // Save summary
                if (typedCardData.summary) {
                    const summaryFileName = `kpi-card-${cardId}-summary.json`;
                    await fs.writeFile(
                        path.join(exportDir, summaryFileName),
                        JSON.stringify(typedCardData.summary, null, 2),
                    );
                    console.log(
                        `Summary saved to ${exportDir}/${summaryFileName}`,
                    );
                }

                // Save full response for debugging
                const fullResponseFileName = `kpi-card-${cardId}-full-response.json`;
                await fs.writeFile(
                    path.join(exportDir, fullResponseFileName),
                    JSON.stringify(cardData, null, 2),
                );
                console.log(
                    `Full response saved to ${exportDir}/${fullResponseFileName}`,
                );
            } else {
                console.log("Unexpected response format from API");
                console.log(
                    "Response:",
                    JSON.stringify(cardData, null, 2).substring(0, 500),
                );

                // Save whatever we got for debugging
                const debugFileName = `kpi-card-${cardId}-debug.json`;
                await fs.writeFile(
                    path.join(exportDir, debugFileName),
                    JSON.stringify(cardData, null, 2),
                );
                console.log(
                    `Debug output saved to ${exportDir}/${debugFileName}`,
                );
            }
        } catch (error) {
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
