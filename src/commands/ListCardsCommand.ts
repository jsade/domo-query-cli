import type { CardListParams, DomoCard } from "../api/clients/domoClient";
import { listCards } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Lists all accessible Domo cards
 */
export class ListCardsCommand extends BaseCommand {
    public readonly name = "list-cards";
    public readonly description = "Lists all accessible Domo cards";
    private cards: DomoCard[] = [];

    /**
     * Getter for the cards list
     */
    public getCards(): DomoCard[] {
        return this.cards;
    }

    /**
     * Executes the list-cards command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            const [remainingArgs, saveOptions] =
                CommandUtils.parseSaveOptions(args);
            let params: CardListParams = { limit: 35, offset: 0 };
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;

            if (remainingArgs.length > 0) {
                for (const arg of remainingArgs) {
                    if (arg.includes("=")) {
                        const [key, value] = arg.split("=");
                        if (key === "limit" && !isNaN(Number(value))) {
                            const limitValue = Number(value);
                            if (limitValue < 1 || limitValue > 50) {
                                console.log(
                                    TerminalFormatter.error(
                                        `Invalid limit value: ${limitValue}. Must be between 1 and 50.`,
                                    ),
                                );
                                return; // Exit early
                            }
                            params.limit = limitValue;
                            hasExplicitLimit = true;
                        } else if (key === "offset" && !isNaN(Number(value))) {
                            params.offset = Number(value);
                            hasExplicitOffset = true;
                        }
                    }
                }
            }

            // If no explicit limit/offset, fetch all data
            if (
                !hasExplicitLimit &&
                !hasExplicitOffset &&
                remainingArgs.length === 0
            ) {
                // Fetch all cards with automatic pagination
                this.cards = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                if (!this.isJsonOutput) {
                    console.log("Fetching all cards...");
                }

                while (hasMoreData) {
                    const pageParams = {
                        limit: pageSize,
                        offset: currentOffset,
                    };
                    const pageData = await listCards(pageParams);

                    if (pageData.length === 0) {
                        hasMoreData = false;
                    } else {
                        this.cards.push(...pageData);

                        // If we got less than the limit, we've reached the end
                        if (pageData.length < pageSize) {
                            hasMoreData = false;
                        } else {
                            currentOffset += pageSize;
                            // Show progress
                            if (!this.isJsonOutput) {
                                process.stdout.write(
                                    `\rFetched ${this.cards.length} cards...`,
                                );
                            }
                        }
                    }
                }

                if (this.cards.length > 0 && !this.isJsonOutput) {
                    process.stdout.write("\r"); // Clear the progress line
                }
            } else {
                // Use explicit parameters
                this.cards = await listCards(params);
            }
            if (this.cards.length > 0) {
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.cards.length,
                    };

                    if (hasExplicitLimit || hasExplicitOffset) {
                        metadata.pagination = {
                            offset: params.offset || 0,
                            limit: params.limit || 35,
                            hasMore: this.cards.length === (params.limit || 35),
                        };
                    }

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { cards: this.cards },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
                    console.log(`\n📊 ${this.cards.length} cards`);

                    // Prepare data for table - Title first for better readability
                    const tableData = this.cards.map(card => {
                        const id = card.id || card.cardUrn || "N/A";
                        const title = card.title || card.cardTitle || "N/A";
                        const type = card.type || "N/A";
                        const owner = card.owner || card.ownerName || "N/A";
                        const lastModified = card.lastModified
                            ? new Date(card.lastModified).toLocaleDateString()
                            : card.lastUpdated || "N/A";

                        return {
                            Title:
                                title.length > 35
                                    ? title.substring(0, 32) + "..."
                                    : title,
                            Type: type,
                            Owner:
                                owner.length > 18
                                    ? owner.substring(0, 15) + "..."
                                    : owner,
                            Modified: lastModified,
                            ID: id,
                        };
                    });

                    console.log(TerminalFormatter.table(tableData));

                    await CommandUtils.exportData(
                        this.cards,
                        "Domo Cards",
                        "cards",
                        saveOptions,
                        this.isJsonOutput,
                    );

                    console.log("\nTip: list-cards limit=n offset=m --save-md");
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { cards: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log("No accessible cards found.");
                }
            }
        } catch (error) {
            log.error("Error fetching cards:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch cards";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch cards."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error(
                    "Check your parameters and authentication, then try again.",
                );
            }
        }
    }

    /**
     * Shows help for the list-cards command
     */
    public showHelp(): void {
        console.log("Lists all accessible Domo cards");
        console.log("\nUsage: list-cards [parameters] [options]");

        console.log(chalk.cyan("\nParameters:"));
        const paramsData = [
            {
                Parameter: "limit",
                Type: "number",
                Description: "Maximum cards to return (default: 35)",
            },
            {
                Parameter: "offset",
                Type: "number",
                Description: "Offset for pagination (default: 0)",
            },
        ];
        console.log(TerminalFormatter.table(paramsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--save",
                Description: "Save results to JSON file (default)",
            },
            { Option: "--save-json", Description: "Save results to JSON file" },
            {
                Option: "--save-md",
                Description: "Save results to Markdown file",
            },
            {
                Option: "--save-both",
                Description: "Save to both JSON and Markdown",
            },
            {
                Option: "--path=<directory>",
                Description: "Specify custom export directory",
            },
            {
                Option: "--format=json",
                Description:
                    "Output results in JSON format for programmatic use",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-cards",
                Description: "List all cards (auto-paginate)",
            },
            {
                Command: "list-cards --limit 10",
                Description: "List first 10 cards",
            },
            {
                Command: "list-cards limit=50",
                Description: "List first 50 cards (old format)",
            },
            {
                Command: "list-cards --limit 50 --offset 50",
                Description: "List second page of 50",
            },
            {
                Command: "list-cards --save-md",
                Description: "Fetch all cards and save to markdown",
            },
            {
                Command: "list-cards --format=json",
                Description: "Output all cards as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }
}
