import chalk from "chalk";
import { createRole } from "../api/clients/domoClient";
import type { DomoRole } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { checkReadOnlyMode } from "../utils/readOnlyGuard";
import { CommandUtils } from "./CommandUtils";

/**
 * Creates a new Domo role
 * Requires Admin privileges
 */
export class CreateRoleCommand extends BaseCommand {
    public readonly name = "create-role";
    public readonly description = "Creates a new Domo role (Admin required)";

    /**
     * Executes the create-role command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode before attempting to create
            checkReadOnlyMode("create-role");

            const { config, parsed } = this.parseOutputConfig(args);

            // Get role name from positional argument
            const name = parsed.positional[0];

            if (!name || name.trim() === "") {
                this.outputErrorResult(
                    {
                        message: "Role name is required",
                        code: "MISSING_ROLE_NAME",
                    },
                    () => {
                        console.error(
                            TerminalFormatter.error("Role name is required."),
                        );
                        console.error(
                            "Usage: create-role <name> [--description <text>]",
                        );
                    },
                );
                return;
            }

            // Get optional description parameter
            let description: string | undefined;
            if (parsed.params.description !== undefined) {
                description = String(parsed.params.description);
            }

            // Show confirmation if not skipped
            if (!parsed.flags.has("yes") && config.displayFormat !== "json") {
                console.log(chalk.cyan("\nRole to create:"));
                console.log(`  Name: ${name}`);
                if (description) {
                    console.log(`  Description: ${description}`);
                }

                const confirmed = await CommandUtils.promptConfirmation(
                    "\nDo you want to proceed with creating this role?",
                );
                if (!confirmed) {
                    console.log("Operation cancelled.");
                    return;
                }
            }

            // Create the role
            const role = await createRole(name, description);

            if (!role) {
                this.outputErrorResult(
                    {
                        message: "Failed to create role",
                        code: "CREATE_FAILED",
                    },
                    () => {
                        console.error(
                            TerminalFormatter.error("Failed to create role."),
                        );
                    },
                );
                return;
            }

            // Use unified output system
            await this.output(
                {
                    success: true,
                    data: { role },
                    metadata: {
                        roleId: role.id,
                        roleName: role.name,
                    },
                },
                () => this.displayResult(role),
                "role-created",
            );
        } catch (error) {
            log.error("Error creating role:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create role";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to create role."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error(
                    "Check your authentication and permissions, then try again.",
                );
            });
        }
    }

    /**
     * Display role creation result in terminal format
     */
    private displayResult(role: DomoRole): void {
        console.log(chalk.green("\n✓ Role created successfully"));
        console.log(chalk.cyan("\nRole Details:"));
        console.log("------------------------");
        console.log(`ID: ${role.id}`);
        console.log(`Name: ${role.name}`);
        if (role.description) {
            console.log(`Description: ${role.description}`);
        }
        if (role.isDefault !== undefined) {
            console.log(`Default: ${role.isDefault ? "Yes" : "No"}`);
        }
        if (role.memberCount !== undefined) {
            console.log(`Member Count: ${role.memberCount}`);
        }
    }

    /**
     * Shows help for the create-role command
     */
    public showHelp(): void {
        console.log("Creates a new Domo role");
        console.log("\nUsage: create-role <name> [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "name",
                Type: "string",
                Required: "Yes",
                Description: "The name of the new role",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nOptions:"));
        const optionsData = [
            {
                Option: "--description <text>",
                Description: "Optional description for the role",
            },
            {
                Option: "--yes",
                Description: "Skip confirmation prompt",
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
                " This command requires Admin privileges and cannot be run in read-only mode.",
        );

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: 'create-role "Data Analyst"',
                Description: "Create a role named 'Data Analyst'",
            },
            {
                Command:
                    'create-role "Data Analyst" --description "Analysts with data access"',
                Description: "Create a role with description",
            },
            {
                Command: 'create-role "Data Analyst" --yes',
                Description: "Create without confirmation prompt",
            },
            {
                Command: 'create-role "Data Analyst" --format json',
                Description: "Create and output result as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--description",
            "--yes",
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
