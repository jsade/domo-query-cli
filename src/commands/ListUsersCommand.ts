import chalk from "chalk";
import { listUsers } from "../api/clients/domoClient";
import type { DomoUser } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";

/**
 * Lists all Domo users with optional search
 */
export class ListUsersCommand extends BaseCommand {
    public readonly name = "list-users";
    public readonly description = "Lists all Domo users with optional search";
    private users: DomoUser[] = [];

    /**
     * Getter for the users list
     */
    public getUsers(): DomoUser[] {
        return this.users;
    }

    /**
     * Executes the list-users command
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
            let hasExplicitLimit = false;
            let hasExplicitOffset = false;
            let searchQuery: string | undefined;
            let roleFilter: string | undefined;

            // Handle positional argument for search
            if (parsedArgs.positional.length > 0) {
                searchQuery = parsedArgs.positional[0];
            }

            // Process named parameters
            if (parsedArgs.params.limit !== undefined) {
                limit = Math.min(Number(parsedArgs.params.limit), 500);
                hasExplicitLimit = true;
            }

            if (parsedArgs.params.offset !== undefined) {
                offset = Number(parsedArgs.params.offset);
                hasExplicitOffset = true;
            }

            if (parsedArgs.params.role !== undefined) {
                roleFilter = String(parsedArgs.params.role);
            }

            // If no explicit limit/offset, fetch all users with auto-pagination
            if (!hasExplicitLimit && !hasExplicitOffset) {
                this.users = [];
                let currentOffset = 0;
                const pageSize = 50;
                let hasMoreData = true;

                if (!this.isJsonOutput) {
                    console.log("Fetching all users...");
                }

                while (hasMoreData) {
                    const pageData = await listUsers({
                        limit: pageSize,
                        offset: currentOffset,
                    });

                    if (pageData.length === 0) {
                        hasMoreData = false;
                    } else {
                        this.users.push(...pageData);

                        // If we got less than the limit, we've reached the end
                        if (pageData.length < pageSize) {
                            hasMoreData = false;
                        } else {
                            currentOffset += pageSize;
                            // Show progress
                            if (!this.isJsonOutput) {
                                process.stdout.write(
                                    `\rFetched ${this.users.length} users...`,
                                );
                            }
                        }
                    }
                }

                if (this.users.length > 0 && !this.isJsonOutput) {
                    process.stdout.write("\r"); // Clear the progress line
                }
            } else {
                // Use explicit parameters
                this.users = await listUsers({ limit, offset });
            }

            // Client-side filtering by search query
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                this.users = this.users.filter(
                    u =>
                        u.name.toLowerCase().includes(lowerQuery) ||
                        u.email.toLowerCase().includes(lowerQuery),
                );
            }

            // Client-side filtering by role
            if (roleFilter) {
                this.users = this.users.filter(u => u.role === roleFilter);
            }

            if (this.users.length > 0) {
                if (this.isJsonOutput) {
                    // JSON output
                    const metadata: Record<string, unknown> = {
                        count: this.users.length,
                    };

                    if (hasExplicitLimit || hasExplicitOffset) {
                        metadata.pagination = {
                            offset,
                            limit,
                            hasMore: this.users.length === limit,
                        };
                    }

                    if (searchQuery) {
                        metadata.filter = { search: searchQuery };
                    }

                    if (roleFilter) {
                        metadata.filter = {
                            ...((metadata.filter as Record<string, unknown>) ||
                                {}),
                            role: roleFilter,
                        };
                    }

                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { users: this.users },
                            metadata,
                        ),
                    );
                } else {
                    // Default table output
                    console.log(
                        `\n${this.users.length} users${searchQuery ? ` matching "${searchQuery}"` : ""}${roleFilter ? ` with role "${roleFilter}"` : ""}`,
                    );

                    // Prepare data for table
                    const tableData = this.users.map(user => ({
                        ID: user.id,
                        Name:
                            user.name.length > 30
                                ? user.name.substring(0, 27) + "..."
                                : user.name,
                        Email:
                            user.email.length > 35
                                ? user.email.substring(0, 32) + "..."
                                : user.email,
                        Role: user.role,
                        Title: user.title || "-",
                        Groups: user.groups?.length || 0,
                    }));

                    console.log(TerminalFormatter.table(tableData));

                    await CommandUtils.exportData(
                        this.users,
                        `Domo Users${searchQuery ? ` matching "${searchQuery}"` : ""}`,
                        "users",
                        parsedArgs.saveOptions,
                        this.isJsonOutput,
                    );

                    console.log(`\nTotal: ${this.users.length} users`);
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { users: [] },
                            { count: 0 },
                        ),
                    );
                } else {
                    console.log("No users found.");
                }
            }
        } catch (error) {
            log.error("Error fetching users:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch users";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error(
                    TerminalFormatter.error("Failed to fetch users."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            }
        }
    }

    /**
     * Shows help for the list-users command
     */
    public showHelp(): void {
        console.log("Lists all Domo users with optional search");
        console.log("\nUsage: list-users [search_term] [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "search_term",
                Type: "string",
                Description: "Optional text to filter users by name/email",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--limit N",
                Description:
                    "Number of users per page (max 500, default: fetch all)",
            },
            {
                Option: "--offset N",
                Description: "Pagination offset (default: 0)",
            },
            {
                Option: "--role ROLE",
                Description: "Filter by role (Admin, Privileged, Participant)",
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
                Command: "list-users",
                Description: "List all users (auto-paginate)",
            },
            {
                Command: "list-users euler",
                Description: "Search for users matching 'euler'",
            },
            {
                Command: "list-users --role Admin",
                Description: "Show only admins",
            },
            {
                Command: "list-users --limit 100",
                Description: "Show first 100 users",
            },
            {
                Command: 'list-users "john" --format json',
                Description: "Search and output JSON",
            },
            {
                Command: "list-users --role Admin --save-md",
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
            "--limit",
            "--offset",
            "--role",
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
