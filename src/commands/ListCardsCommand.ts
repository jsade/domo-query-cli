import type { CardListParams, DomoCard } from "../api/clients/domoClient";
import { listCards } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
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
            // Parse output configuration (handles all output-related flags)
            const { config, parsed } = this.parseOutputConfig(args);

            let params: CardListParams = { limit: 35, offset: 0 };
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;

            // Extract limit and offset from parsed params
            if (parsed.params.limit !== undefined) {
                const limitValue = Number(parsed.params.limit);
                if (limitValue < 1 || limitValue > 50) {
                    this.outputErrorResult(
                        {
                            message: `Invalid limit value: ${limitValue}. Must be between 1 and 50.`,
                            code: "INVALID_LIMIT",
                        },
                        () =>
                            console.log(
                                TerminalFormatter.error(
                                    `Invalid limit value: ${limitValue}. Must be between 1 and 50.`,
                                ),
                            ),
                    );
                    return;
                }
                params.limit = limitValue;
                hasExplicitLimit = true;
            }

            if (parsed.params.offset !== undefined) {
                params.offset = Number(parsed.params.offset);
                hasExplicitOffset = true;
            }

            // If no explicit limit/offset, fetch all data
            if (
                !hasExplicitLimit &&
                !hasExplicitOffset &&
                parsed.positional.length === 0
            ) {
                // Fetch all cards with automatic pagination
                this.cards = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                if (config.displayFormat !== "json") {
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
                            if (config.displayFormat !== "json") {
                                process.stdout.write(
                                    `\rFetched ${this.cards.length} cards...`,
                                );
                            }
                        }
                    }
                }

                if (this.cards.length > 0 && config.displayFormat !== "json") {
                    process.stdout.write("\r"); // Clear the progress line
                }
            } else {
                // Use explicit parameters
                this.cards = await listCards(params);
            }

            // Build metadata
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

            // Output using unified system
            await this.output(
                { success: true, data: { cards: this.cards }, metadata },
                () => this.displayTable(),
                "cards",
            );
        } catch (error) {
            log.error("Error fetching cards:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch cards";

            this.outputErrorResult({ message, details: error }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch cards."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error(
                    "Check your parameters and authentication, then try again.",
                );
            });
        }
    }

    /**
     * Display cards as a formatted table
     */
    private displayTable(): void {
        if (this.cards.length === 0) {
            console.log("No accessible cards found.");
            return;
        }

        console.log(`\n${this.cards.length} cards`);

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
                    title.length > 35 ? title.substring(0, 32) + "..." : title,
                Type: type,
                Owner:
                    owner.length > 18 ? owner.substring(0, 15) + "..." : owner,
                Modified: lastModified,
                ID: id,
            };
        });

        console.log(TerminalFormatter.table(tableData));
        console.log("\nTip: list-cards limit=n offset=m --export=md");
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
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            {
                Option: "--export=md",
                Description: "Export as Markdown",
            },
            {
                Option: "--export=both",
                Description: "Export both formats",
            },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            {
                Option: "--quiet",
                Description: "Suppress export messages",
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
                Command: "list-cards --export=md",
                Description: "Fetch all cards and export to markdown",
            },
            {
                Command: "list-cards --format=json",
                Description: "Output all cards as JSON",
            },
            {
                Command: "list-cards --format=json --export",
                Description: "JSON output + export to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Provides autocomplete suggestions for this command
     */
    public async autocomplete(args: string[]): Promise<string[]> {
        const suggestions: string[] = [];

        // Parameter suggestions
        if (args.length === 0 || args[args.length - 1].startsWith("limit")) {
            suggestions.push("limit=10", "limit=25", "limit=50");
        }
        if (args.length === 0 || args[args.length - 1].startsWith("offset")) {
            suggestions.push("offset=0", "offset=50");
        }

        // Flag suggestions
        const flags = [
            "--format=json",
            "--export",
            "--export=md",
            "--export=both",
            "--export-path=",
            "--output=",
            "--quiet",
        ];
        suggestions.push(...flags);

        return suggestions;
    }
}
