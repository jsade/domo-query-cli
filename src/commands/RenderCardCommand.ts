import * as fs from "fs/promises";
import inquirer from "inquirer";
import * as path from "path";
import type {
    KpiCardPart,
    KpiCardRenderOptions,
    KpiCardRenderResponse,
} from "../api/clients/domoClient";
import {
    renderKpiCard,
    listCards,
    getCardRaw,
} from "../api/clients/domoClient";
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

        // Parse render options from arguments
        const renderOptions: KpiCardRenderOptions = {
            width: parsedArgs.params.width
                ? Number(parsedArgs.params.width)
                : undefined,
            height: parsedArgs.params.height
                ? Number(parsedArgs.params.height)
                : undefined,
            scale: parsedArgs.params.scale
                ? Number(parsedArgs.params.scale)
                : undefined,
        };

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

            // Auto-compute missing dimensions using card metadata when available
            const hasWidth = renderOptions.width !== undefined;
            const hasHeight = renderOptions.height !== undefined;
            const needsAuto = !hasWidth || !hasHeight;

            const effectiveOptions: KpiCardRenderOptions = { ...renderOptions };

            let aspect: number | null = null; // height/width
            if (needsAuto) {
                try {
                    const raw = await getCardRaw(cardId, [
                        "masonData",
                        "properties",
                        "metadata",
                        "metadataOverrides",
                    ]);
                    aspect = this.extractAspectRatio(raw);
                } catch {
                    // Ignore; we'll use fallback aspect
                }

                if (
                    !aspect ||
                    !isFinite(aspect) ||
                    aspect <= 0.05 ||
                    aspect > 10
                ) {
                    // Fallback to a sensible landscape default
                    aspect = 9 / 16; // height per 1 width
                }

                if (!hasWidth && !hasHeight) {
                    const baseW = 1024;
                    effectiveOptions.width = baseW;
                    effectiveOptions.height = Math.round(baseW * aspect);
                } else if (hasWidth && !hasHeight) {
                    effectiveOptions.height = Math.round(
                        (renderOptions.width as number) * aspect,
                    );
                } else if (!hasWidth && hasHeight) {
                    effectiveOptions.width = Math.round(
                        (renderOptions.height as number) / aspect,
                    );
                }
            }

            if (!this.isJsonOutput) {
                console.log(`Rendering KPI card ${cardId}...`);
                const widthText = String(effectiveOptions.width ?? 1024);
                const heightText =
                    effectiveOptions.height !== undefined
                        ? String(effectiveOptions.height)
                        : "auto";
                console.log(
                    `Using dimensions: ${widthText}x${heightText} @ ${effectiveOptions.scale || 1}x scale`,
                );
            }

            const parts: KpiCardPart[] = ["image", "summary"];
            // Ensure height is present to satisfy API requirements
            if (effectiveOptions.height === undefined) {
                const w = effectiveOptions.width ?? 1024;
                const ratio = 9 / 16;
                effectiveOptions.height = Math.round(w * ratio);
            }

            const cardData = await renderKpiCard(
                cardId,
                parts,
                effectiveOptions,
            );

            // Handle the JSON response format
            if (
                cardData &&
                typeof cardData === "object" &&
                ("image" in cardData || "summary" in cardData)
            ) {
                const typedCardData = cardData as KpiCardRenderResponse;

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
                        // Provide helpful context about the status
                        const statusMessage = this.getStatusMessage(
                            typedCardData.summary.status,
                        );
                        console.log(
                            `Card status: ${typedCardData.summary.status} - ${statusMessage}`,
                        );
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
                                summary: {
                                    ...typedCardData.summary,
                                    statusDescription: typedCardData.summary
                                        ? this.getStatusMessage(
                                              typedCardData.summary.status,
                                          )
                                        : undefined,
                                    dimensions: {
                                        width: effectiveOptions.width ?? 1024,
                                        height: effectiveOptions.height ?? null,
                                        scale: effectiveOptions.scale ?? 1,
                                    },
                                },
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
     * Get a descriptive message for the card status
     * @param status - The status value from the API
     * @returns Human-readable status description
     */
    private getStatusMessage(status: string): string {
        switch (status) {
            case "success":
                return "Card rendered with data";
            case "not_ran":
                return "Card rendered but does not contain data";
            case "error":
                return "Configuration or data issues";
            default:
                return "Unknown status";
        }
    }

    // (removed parsePngSize helper; aspect now comes from card metadata)

    /**
     * Attempt to extract an aspect ratio (height/width) from raw card parts
     */
    private extractAspectRatio(raw: Record<string, unknown>): number | null {
        // Known locations/patterns to try
        const tryKeys = [
            ["masonData", "tile"],
            ["masonData", "layout"],
            ["masonData"],
            ["properties"],
            ["metadataOverrides"],
        ];

        for (const path of tryKeys) {
            let node: unknown = raw;
            for (const key of path) {
                if (node && typeof node === "object") {
                    const rec = node as Record<string, unknown>;
                    if (key in rec) {
                        node = rec[key] as unknown;
                    } else {
                        node = null;
                        break;
                    }
                } else {
                    node = null;
                    break;
                }
            }
            if (node && typeof node === "object") {
                const ratio = this.findAspectInObject(
                    node as Record<string, unknown>,
                );
                if (ratio) return ratio;
            }
        }

        return null;
    }

    private findAspectInObject(
        obj: Record<string, unknown>,
        depth = 0,
    ): number | null {
        if (depth > 4) return null;

        // Direct width/height keys
        const keys = Object.keys(obj);
        const widthKey = keys.find(k => /(^|_)w(idth)?$/i.test(k));
        const heightKey = keys.find(k => /(^|_)h(eight)?$/i.test(k));
        if (
            widthKey &&
            heightKey &&
            typeof obj[widthKey] === "number" &&
            typeof obj[heightKey] === "number"
        ) {
            const w = obj[widthKey] as number;
            const h = obj[heightKey] as number;
            if (w > 0 && h > 0) return h / w;
        }

        // Common tile/grid keys
        const colsKey = keys.find(k =>
            /(cols|columns|sizeX|gridWidth)/i.test(k),
        );
        const rowsKey = keys.find(k => /(rows|sizeY|gridHeight)/i.test(k));
        if (
            colsKey &&
            rowsKey &&
            typeof obj[colsKey] === "number" &&
            typeof obj[rowsKey] === "number"
        ) {
            const c = obj[colsKey] as number;
            const r = obj[rowsKey] as number;
            if (c > 0 && r > 0) return r / c;
        }

        // Recurse into nested objects/arrays likely to contain layout
        for (const k of keys) {
            const v = obj[k];
            if (v && typeof v === "object") {
                if (Array.isArray(v)) {
                    for (const item of v) {
                        if (item && typeof item === "object") {
                            const ratio = this.findAspectInObject(
                                item as Record<string, unknown>,
                                depth + 1,
                            );
                            if (ratio) return ratio;
                        }
                    }
                } else {
                    const ratio = this.findAspectInObject(
                        v as Record<string, unknown>,
                        depth + 1,
                    );
                    if (ratio) return ratio;
                }
            }
        }
        return null;
    }

    /**
     * Shows help for the render-card command
     */
    public showHelp(): void {
        console.log(
            "Renders a KPI card and saves the results as images and summary data",
        );
        console.log("\nUsage: render-card [card_id] [options]");
        console.log("\nCard Status Values:");
        console.log("  • success: Card rendered with data");
        console.log("  • not_ran: Card rendered but does not contain data");
        console.log("  • error: Configuration or data issues");

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
            {
                Option: "--width=<pixels>",
                Description:
                    "Image width in pixels (default: 1024). If height not provided, it is auto-computed from the card's aspect",
            },
            {
                Option: "--height=<pixels>",
                Description:
                    "Image height in pixels (optional). If width is not provided, it is auto-computed from the card's aspect",
            },
            {
                Option: "--scale=<factor>",
                Description: "Scale factor for image (default: 1)",
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
            {
                Command: "render-card abc123 --width=1600 --scale=2",
                Description:
                    "Render at width 1600px with auto height (preserves aspect) at 2x scale",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
