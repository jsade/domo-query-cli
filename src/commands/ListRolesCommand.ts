import chalk from "chalk";
import { listRoles } from "../api/clients/domoClient";
import type { DomoRole } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists all Domo roles with optional search
 */
export class ListRolesCommand extends BaseCommand {
    public readonly name = "list-roles";
    public readonly description = "Lists all Domo roles with optional search";
    private roles: DomoRole[] = [];

    /**
     * Getter for the roles list
     */
    public getRoles(): DomoRole[] {
        return this.roles;
    }

    /**
     * Executes the list-roles command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            let searchQuery: string | undefined;

            // Handle positional argument for search
            if (parsed.positional.length > 0) {
                searchQuery = parsed.positional[0];
            }

            // Fetch all roles
            this.roles = await listRoles();

            // Client-side filtering by search query
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                this.roles = this.roles.filter(
                    r =>
                        r.name.toLowerCase().includes(lowerQuery) ||
                        r.description?.toLowerCase().includes(lowerQuery),
                );
            }

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.roles.length,
            };

            if (searchQuery) {
                metadata.filter = { search: searchQuery };
            }

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { roles: this.roles },
                    metadata,
                },
                () => this.displayTable(searchQuery),
                "roles",
            );
        } catch (error) {
            log.error("Error fetching roles:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch roles";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch roles."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display roles in table format
     */
    private displayTable(searchQuery?: string): void {
        if (this.roles.length === 0) {
            console.log("No roles found.");
            return;
        }

        console.log(
            `\n${this.roles.length} role${this.roles.length !== 1 ? "s" : ""}${searchQuery ? ` matching "${searchQuery}"` : ""}`,
        );

        // Prepare data for table
        const tableData = this.roles.map(role => ({
            ID: role.id,
            Name:
                role.name.length > 30
                    ? role.name.substring(0, 27) + "..."
                    : role.name,
            Description:
                role.description && role.description.length > 50
                    ? role.description.substring(0, 47) + "..."
                    : role.description || "-",
            "Member Count": role.userCount ?? 0,
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(
            `\nTotal: ${this.roles.length} role${this.roles.length !== 1 ? "s" : ""}`,
        );
    }

    /**
     * Shows help for the list-roles command
     */
    public showHelp(): void {
        console.log("Lists all Domo roles with optional search");
        console.log("\nUsage: list-roles [search_term] [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "search_term",
                Type: "string",
                Description:
                    "Optional text to filter roles by name/description",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

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

        console.log(
            chalk.yellow("\nNote:") +
                " Legacy flags (--save, --save-json, --save-md, --save-both, --path) are still supported",
        );

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-roles",
                Description: "List all roles",
            },
            {
                Command: "list-roles admin",
                Description: "Search for roles matching 'admin'",
            },
            {
                Command: "list-roles --format json",
                Description: "Output as JSON",
            },
            {
                Command: "list-roles --export",
                Description: "Export to timestamped JSON file",
            },
            {
                Command: "list-roles --export=md",
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
