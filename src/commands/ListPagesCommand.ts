import type { DomoPage } from "../api/clients/domoClient";
import { listPages } from "../api/clients/domoClient";
import { log } from "../utils/logger";
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
            const [_, saveOptions] = CommandUtils.parseSaveOptions(args || []);

            this.pages = await listPages();

            if (this.pages.length > 0) {
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
            } else {
                console.log("No accessible pages found.");
            }
        } catch (error) {
            log.error("Error fetching pages:", error);
        }
    }

    /**
     * Shows help for the list-pages command
     */
    public showHelp(): void {
        console.log("Lists all accessible Domo pages");
        console.log("Usage: list-pages [options]");
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
        console.log("\nExample: list-pages --save-both");
        console.log("");
    }
}
