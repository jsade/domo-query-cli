import chalk from "chalk";
import { listGroups } from "../api/clients/domoClient";
import type { DomoGroup } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists all Domo groups with optional search
 */
export class ListGroupsCommand extends BaseCommand {
    public readonly name = "list-groups";
    public readonly description = "Lists all Domo groups with optional search";
    private groups: DomoGroup[] = [];

    /**
     * Getter for the groups list
     */
    public getGroups(): DomoGroup[] {
        return this.groups;
    }

    /**
     * Executes the list-groups command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            let limit = 50;
            let offset = 0;
            let searchQuery: string | undefined;
            let typeFilter: string | undefined;

            // Handle positional argument for search
            if (parsed.positional.length > 0) {
                searchQuery = parsed.positional[0];
            }

            // Process named parameters
            if (parsed.params.limit !== undefined) {
                limit = Number(parsed.params.limit);
            }

            if (parsed.params.offset !== undefined) {
                offset = Number(parsed.params.offset);
            }

            if (parsed.params.type !== undefined) {
                typeFilter = String(parsed.params.type);
            }

            if (!this.isJsonMode) {
                console.log("Fetching all groups...");
            }

            // Fetch groups (API may not support pagination, so we fetch all)
            this.groups = await listGroups({ limit, offset });

            // Client-side filtering by search query
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                this.groups = this.groups.filter(g =>
                    g.name.toLowerCase().includes(lowerQuery),
                );
            }

            // Client-side filtering by type
            if (typeFilter) {
                this.groups = this.groups.filter(
                    g => g.groupType === typeFilter,
                );
            }

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.groups.length,
            };

            if (searchQuery) {
                metadata.filter = { search: searchQuery };
            }

            if (typeFilter) {
                metadata.filter = {
                    ...((metadata.filter as Record<string, unknown>) || {}),
                    type: typeFilter,
                };
            }

            // Unified output handling
            await this.output(
                { success: true, data: { groups: this.groups }, metadata },
                () => this.displayTable(searchQuery, typeFilter),
                "groups",
            );
        } catch (error) {
            log.error("Error fetching groups:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch groups",
                },
                () => {
                    console.error(
                        TerminalFormatter.error("Failed to fetch groups."),
                    );
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error("Check your authentication and try again.");
                },
            );
        }
    }

    /**
     * Display groups in table format
     */
    private displayTable(searchQuery?: string, typeFilter?: string): void {
        if (this.groups.length === 0) {
            console.log("No groups found.");
            return;
        }

        console.log(
            `\n${this.groups.length} groups${searchQuery ? ` matching "${searchQuery}"` : ""}${typeFilter ? ` with type "${typeFilter}"` : ""}`,
        );

        // Prepare data for table
        const tableData = this.groups.map(group => ({
            ID: group.groupId || group.id,
            Name:
                group.name.length > 40
                    ? group.name.substring(0, 37) + "..."
                    : group.name,
            Type: group.groupType || "-",
            Members: group.memberCount || 0,
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(`\nTotal: ${this.groups.length} groups`);
    }

    /**
     * Shows help for the list-groups command
     */
    public showHelp(): void {
        console.log("Lists all Domo groups with optional search");
        console.log("\nUsage: list-groups [search_term] [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "search_term",
                Type: "string",
                Description: "Optional text to filter groups by name",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--type TYPE",
                Description: "Filter by type (open, user, system)",
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

        console.log(chalk.cyan("\nLegacy Aliases (deprecated):"));
        console.log("  --save, --save-json   → --export");
        console.log("  --save-md             → --export=md");
        console.log("  --save-both           → --export=both");
        console.log("  --path                → --export-path");

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-groups",
                Description: "List all groups",
            },
            {
                Command: "list-groups engineering",
                Description: "Search for groups matching 'engineering'",
            },
            {
                Command: "list-groups --type open",
                Description: "Show only open groups",
            },
            {
                Command: 'list-groups "sales" --format=json',
                Description: "Search and output JSON",
            },
            {
                Command: "list-groups --type user --export=md",
                Description: "Filter and export to markdown",
            },
            {
                Command: "list-groups --format=json --export",
                Description: "Output JSON and export to file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--type",
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            // Legacy aliases
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
