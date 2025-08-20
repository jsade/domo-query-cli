import type { DomoPage } from "../api/clients/domoClient";
import { listPages } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import chalk from "chalk";

/**
 * Lists all accessible Domo pages
 */
export class ListPagesCommand extends BaseCommand {
    public readonly name = "list-pages";
    public readonly description = "Lists all accessible Domo pages";
    private pages: DomoPage[] = [];

    /**
     * Getter for the pages list
     */
    public getPages(): DomoPage[] {
        return this.pages;
    }

    /**
     * Executes the list-pages command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            const [_, saveOptions] = CommandUtils.parseSaveOptions(args || []);

            this.pages = await listPages();

            if (this.pages.length > 0) {
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.pages.length,
                    };

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { pages: this.pages },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
                    console.log(chalk.cyan("\nAccessible Pages:"));
                    console.log("----------------");

                    this.pages.forEach((page, index) => {
                        console.log(
                            `${index + 1}. ID: ${page.id}, Name: ${page.name}`,
                        );
                    });

                    await CommandUtils.exportData(
                        this.pages,
                        "Domo Pages",
                        "pages",
                        saveOptions,
                    );

                    console.log("");
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { pages: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log("No accessible pages found.");
                }
            }
        } catch (error) {
            log.error("Error fetching pages:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch pages";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch pages."),
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
     * Shows help for the list-pages command
     */
    public showHelp(): void {
        console.log("Lists all accessible Domo pages");
        console.log("Usage: list-pages [options]");

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
                Command: "list-pages",
                Description: "List all accessible pages",
            },
            {
                Command: "list-pages --save-both",
                Description: "List pages and save to both formats",
            },
            {
                Command: "list-pages --format=json",
                Description: "Output all pages as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
        console.log("");
    }
}
