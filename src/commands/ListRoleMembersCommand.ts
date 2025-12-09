import chalk from "chalk";
import { listRoleMembers } from "../api/clients/domoClient";
import type { DomoRoleMember } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists users who have a specific role
 */
export class ListRoleMembersCommand extends BaseCommand {
    public readonly name = "list-role-members";
    public readonly description = "Lists users who have a specific role";
    private roleMembers: DomoRoleMember[] = [];

    /**
     * Getter for the role members list
     */
    public getRoleMembers(): DomoRoleMember[] {
        return this.roleMembers;
    }

    /**
     * Executes the list-role-members command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            // Get role ID from positional argument
            const roleId = parsed.positional[0];

            if (!roleId) {
                this.outputErrorResult(
                    {
                        message: "Role ID is required",
                        code: "MISSING_ROLE_ID",
                    },
                    () => {
                        console.error(
                            TerminalFormatter.error("Role ID is required."),
                        );
                        console.error(
                            "Usage: list-role-members <role_id> [search_term]",
                        );
                    },
                );
                return;
            }

            let searchQuery: string | undefined;

            // Handle optional positional argument for search
            if (parsed.positional.length > 1) {
                searchQuery = parsed.positional[1];
            }

            // Fetch role members from API
            this.roleMembers = await listRoleMembers(roleId);

            // Client-side filtering by search query
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                this.roleMembers = this.roleMembers.filter(
                    member =>
                        member.name.toLowerCase().includes(lowerQuery) ||
                        (member.email?.toLowerCase().includes(lowerQuery) ??
                            false),
                );
            }

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.roleMembers.length,
                roleId: roleId,
            };

            if (searchQuery) {
                metadata.filter = { search: searchQuery };
            }

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { roleMembers: this.roleMembers },
                    metadata,
                },
                () => this.displayTable(roleId, searchQuery),
                "role-members",
            );
        } catch (error) {
            log.error("Error fetching role members:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch role members";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch role members."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error(
                    "Check your authentication and role ID, then try again.",
                );
            });
        }
    }

    /**
     * Display role members in table format
     */
    private displayTable(roleId: string, searchQuery?: string): void {
        if (this.roleMembers.length === 0) {
            console.log("No role members found.");
            return;
        }

        console.log(
            `\n${this.roleMembers.length} member${this.roleMembers.length === 1 ? "" : "s"}` +
                ` in role ${roleId}${searchQuery ? ` matching "${searchQuery}"` : ""}`,
        );

        // Prepare data for table
        const tableData = this.roleMembers.map(member => ({
            "User ID": member.id,
            Name:
                member.name.length > 40
                    ? member.name.substring(0, 37) + "..."
                    : member.name,
            Email: member.email || "-",
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(
            `\nTotal: ${this.roleMembers.length} member${this.roleMembers.length === 1 ? "" : "s"}`,
        );
    }

    /**
     * Shows help for the list-role-members command
     */
    public showHelp(): void {
        console.log("Lists users who have a specific role");
        console.log(
            "\nUsage: list-role-members <role_id> [search_term] [options]",
        );

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "role_id",
                Type: "string",
                Required: "Yes",
                Description: "The ID of the role to list members for",
            },
            {
                Argument: "search_term",
                Type: "string",
                Required: "No",
                Description: "Optional text to filter members by name/email",
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
                Command: "list-role-members 123",
                Description: "List all members of role 123",
            },
            {
                Command: 'list-role-members 123 "john"',
                Description: "Search for members matching 'john' in role 123",
            },
            {
                Command: "list-role-members 123 --format json",
                Description: "Output members as JSON",
            },
            {
                Command: "list-role-members 123 --export",
                Description: "Export members to timestamped file",
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
