import chalk from "chalk";
import { getRole } from "../api/clients/domoClient";
import type { DomoRole } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Gets details for a specific Domo role
 */
export class GetRoleCommand extends BaseCommand {
    public readonly name = "get-role";
    public readonly description = "Gets details for a specific Domo role";
    private role: DomoRole | null = null;

    /**
     * Getter for the role
     */
    public getRole(): DomoRole | null {
        return this.role;
    }

    /**
     * Executes the get-role command
     * @param args - Command arguments (requires role_id)
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            // Validate role_id argument
            if (parsed.positional.length === 0) {
                console.error(
                    TerminalFormatter.error("Error: role_id is required"),
                );
                console.log("\nUsage: get-role <role_id> [options]");
                console.log("Example: get-role 123");
                console.log("\nRun 'help get-role' for more information.");
                return;
            }

            const roleId = parsed.positional[0];

            // Fetch role details
            this.role = await getRole(roleId);

            // Build metadata
            const metadata: Record<string, unknown> = {
                roleId,
            };

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { role: this.role },
                    metadata,
                },
                () => this.displayRole(),
                "role",
            );
        } catch (error) {
            log.error("Error fetching role:", error);
            const message =
                error instanceof Error ? error.message : "Failed to fetch role";
            this.outputErrorResult({ message }, () => {
                console.error(TerminalFormatter.error("Failed to fetch role."));
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check the role ID and your authentication.");
            });
        }
    }

    /**
     * Display role details in a formatted way
     */
    private displayRole(): void {
        if (!this.role) {
            console.log("No role found.");
            return;
        }

        console.log(chalk.cyan("\n=== Role Details ===\n"));

        // Display basic information
        const basicInfo = [
            { Field: "ID", Value: this.role.id },
            { Field: "Name", Value: this.role.name },
            {
                Field: "Description",
                Value: this.role.description || "-",
            },
            {
                Field: "Default Role",
                Value: this.role.isDefault ? "Yes" : "No",
            },
            {
                Field: "Member Count",
                Value: this.role.memberCount ?? 0,
            },
        ];
        console.log(TerminalFormatter.table(basicInfo));

        // Display authorities if present
        if (this.role.authorities && this.role.authorities.length > 0) {
            console.log(chalk.cyan("\n=== Authorities/Permissions ===\n"));
            console.log(
                `This role has ${this.role.authorities.length} permission${this.role.authorities.length !== 1 ? "s" : ""}:\n`,
            );

            const authoritiesData = this.role.authorities.map(auth => ({
                Name: auth.name,
                "Display Name": auth.displayName || "-",
                Description:
                    auth.description && auth.description.length > 60
                        ? auth.description.substring(0, 57) + "..."
                        : auth.description || "-",
                Category: auth.category || "-",
            }));

            console.log(TerminalFormatter.table(authoritiesData));
        } else {
            console.log(
                chalk.yellow(
                    "\nNo authorities/permissions found for this role.",
                ),
            );
        }
    }

    /**
     * Shows help for the get-role command
     */
    public showHelp(): void {
        console.log("Gets details for a specific Domo role");
        console.log("\nUsage: get-role <role_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "role_id",
                Type: "number",
                Required: "Yes",
                Description: "The ID of the role to retrieve",
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
                Command: "get-role 123",
                Description: "Get details for role with ID 123",
            },
            {
                Command: "get-role 456 --format json",
                Description: "Output role details as JSON",
            },
            {
                Command: "get-role 789 --export",
                Description: "Export role details to timestamped JSON file",
            },
            {
                Command: "get-role 789 --export=md",
                Description: "Export role details as Markdown",
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
