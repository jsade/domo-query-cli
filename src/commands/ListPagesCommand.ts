import type { DomoPage } from "../api/clients/domoClient";
import { listPages } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
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
            this.parseOutputConfig(args);

            this.pages = await listPages();

            const metadata: Record<string, unknown> = {
                count: this.pages.length,
            };

            await this.output(
                { success: true, data: { pages: this.pages }, metadata },
                () => this.displayTable(),
                "pages",
            );
        } catch (error) {
            log.error("Error fetching pages:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch pages";

            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch pages."),
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
     * Displays pages in table format
     */
    private displayTable(): void {
        if (this.pages.length > 0) {
            console.log(chalk.cyan("\nAccessible Pages:"));
            console.log("----------------");

            this.pages.forEach((page, index) => {
                console.log(`${index + 1}. ID: ${page.id}, Name: ${page.name}`);
            });

            console.log("");
        } else {
            console.log("No accessible pages found.");
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
                Command: "list-pages",
                Description: "List all accessible pages",
            },
            {
                Command: "list-pages --export=both",
                Description: "List pages and export to both formats",
            },
            {
                Command: "list-pages --format=json",
                Description: "Output all pages as JSON",
            },
            {
                Command: "list-pages --format=json --export",
                Description: "JSON output and also export to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
        console.log("");
    }

    /**
     * Provides autocomplete suggestions for the command
     * @returns Array of autocomplete suggestions
     */
    public async autocomplete(): Promise<string[]> {
        const suggestions: string[] = [
            "--format=json",
            "--export",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
        ];

        return suggestions;
    }
}
