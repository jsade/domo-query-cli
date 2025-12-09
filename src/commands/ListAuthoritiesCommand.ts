import chalk from "chalk";
import { listAuthorities } from "../api/clients/domoClient";
import type { DomoAuthority } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists all available Domo authorities/permissions
 */
export class ListAuthoritiesCommand extends BaseCommand {
    public readonly name = "list-authorities";
    public readonly description =
        "Lists all available Domo authorities/permissions";
    private authorities: DomoAuthority[] = [];

    /**
     * Getter for the authorities list
     */
    public getAuthorities(): DomoAuthority[] {
        return this.authorities;
    }

    /**
     * Executes the list-authorities command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            let searchQuery: string | undefined;
            let categoryFilter: string | undefined;

            // Handle positional argument for search
            if (parsed.positional.length > 0) {
                searchQuery = parsed.positional[0];
            }

            // Process named parameters
            if (parsed.params.category !== undefined) {
                categoryFilter = String(parsed.params.category);
            }

            // Fetch all authorities
            this.authorities = await listAuthorities();

            // Client-side filtering by search query
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                this.authorities = this.authorities.filter(
                    a =>
                        a.name.toLowerCase().includes(lowerQuery) ||
                        a.displayName?.toLowerCase().includes(lowerQuery) ||
                        a.description?.toLowerCase().includes(lowerQuery),
                );
            }

            // Client-side filtering by category
            if (categoryFilter) {
                const lowerCategory = categoryFilter.toLowerCase();
                this.authorities = this.authorities.filter(
                    a => a.category?.toLowerCase() === lowerCategory,
                );
            }

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.authorities.length,
            };

            if (searchQuery) {
                metadata.filter = { search: searchQuery };
            }

            if (categoryFilter) {
                metadata.filter = {
                    ...((metadata.filter as Record<string, unknown>) || {}),
                    category: categoryFilter,
                };
            }

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { authorities: this.authorities },
                    metadata,
                },
                () => this.displayTable(searchQuery, categoryFilter),
                "authorities",
            );
        } catch (error) {
            log.error("Error fetching authorities:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch authorities";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch authorities."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display authorities in table format
     */
    private displayTable(searchQuery?: string, categoryFilter?: string): void {
        if (this.authorities.length === 0) {
            console.log("No authorities found.");
            return;
        }

        console.log(
            `\n${this.authorities.length} ${this.authorities.length !== 1 ? "authorities" : "authority"}${searchQuery ? ` matching "${searchQuery}"` : ""}${categoryFilter ? ` in category "${categoryFilter}"` : ""}`,
        );

        // Prepare data for table
        const tableData = this.authorities.map(auth => ({
            Name:
                auth.name.length > 35
                    ? auth.name.substring(0, 32) + "..."
                    : auth.name,
            "Display Name":
                auth.displayName && auth.displayName.length > 30
                    ? auth.displayName.substring(0, 27) + "..."
                    : auth.displayName || "-",
            Description:
                auth.description && auth.description.length > 50
                    ? auth.description.substring(0, 47) + "..."
                    : auth.description || "-",
            Category: auth.category || "-",
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(
            `\nTotal: ${this.authorities.length} ${this.authorities.length !== 1 ? "authorities" : "authority"}`,
        );
    }

    /**
     * Shows help for the list-authorities command
     */
    public showHelp(): void {
        console.log("Lists all available Domo authorities/permissions");
        console.log("\nUsage: list-authorities [search_term] [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "search_term",
                Type: "string",
                Description:
                    "Optional text to filter authorities by name/description",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--category CATEGORY",
                Description: "Filter by category (e.g., admin, content, data)",
            },
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

        console.log(
            chalk.yellow("\nNote:") +
                " Legacy flags (--save, --save-json, --save-md, --save-both, --path) are still supported",
        );

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-authorities",
                Description: "List all authorities",
            },
            {
                Command: "list-authorities manage",
                Description: "Search for authorities matching 'manage'",
            },
            {
                Command: "list-authorities --category admin",
                Description: "Show only admin category authorities",
            },
            {
                Command: "list-authorities card --category content",
                Description: "Search and filter by category",
            },
            {
                Command: "list-authorities --format json",
                Description: "Output as JSON",
            },
            {
                Command: "list-authorities --export=md",
                Description: "Export as Markdown",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--category",
            "--format",
            "--export",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy flags (still supported)
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
