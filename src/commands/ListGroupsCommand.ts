import chalk from "chalk";
import { listGroups } from "../api/clients/domoClient";
import type { DomoGroup } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";

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
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            let limit = 50;
            let offset = 0;
            let searchQuery: string | undefined;
            let typeFilter: string | undefined;

            // Handle positional argument for search
            if (parsedArgs.positional.length > 0) {
                searchQuery = parsedArgs.positional[0];
            }

            // Process named parameters
            if (parsedArgs.params.limit !== undefined) {
                limit = Number(parsedArgs.params.limit);
            }

            if (parsedArgs.params.offset !== undefined) {
                offset = Number(parsedArgs.params.offset);
            }

            if (parsedArgs.params.type !== undefined) {
                typeFilter = String(parsedArgs.params.type);
            }

            if (!this.isJsonOutput) {
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

            if (this.groups.length > 0) {
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.groups.length,
                    };

                    if (searchQuery) {
                        metadata.filter = { search: searchQuery };
                    }

                    if (typeFilter) {
                        metadata.filter = {
                            ...((metadata.filter as Record<string, unknown>) ||
                                {}),
                            type: typeFilter,
                        };
                    }

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { groups: this.groups },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
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

                    await CommandUtils.exportData(
                        this.groups,
                        `Domo Groups${searchQuery ? ` matching "${searchQuery}"` : ""}`,
                        "groups",
                        parsedArgs.saveOptions,
                        this.isJsonOutput,
                    );

                    console.log(`\nTotal: ${this.groups.length} groups`);
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { groups: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log("No groups found.");
                }
            }
        } catch (error) {
            log.error("Error fetching groups:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch groups";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch groups."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            }
        }
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
                Option: "--format json",
                Description: "Output as JSON",
            },
            { Option: "--save", Description: "Save results to JSON file" },
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
        ];
        console.log(TerminalFormatter.table(optionsData));

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
                Command: 'list-groups "sales" --format json',
                Description: "Search and output JSON",
            },
            {
                Command: "list-groups --type user --save-md",
                Description: "Filter and save to markdown",
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
            "--format",
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
