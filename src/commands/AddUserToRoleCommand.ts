import chalk from "chalk";
import { addUserToRole, getRole, getUser } from "../api/clients/domoClient";
import type { DomoRole, DomoUser } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { checkReadOnlyMode } from "../utils/readOnlyGuard";
import { CommandUtils } from "./CommandUtils";

/**
 * Adds a user to a role
 */
export class AddUserToRoleCommand extends BaseCommand {
    public readonly name = "add-user-to-role";
    public readonly description = "Adds a user to a role";

    /**
     * Executes the add-user-to-role command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode FIRST
            checkReadOnlyMode("add-user-to-role");

            const { config, parsed } = this.parseOutputConfig(args);

            // Extract role ID and user ID from positional args
            const roleId = parsed.positional[0];
            const userId = parsed.positional[1];

            if (!roleId) {
                this.outputErrorResult({
                    message: "No role ID provided",
                    code: "MISSING_ROLE_ID",
                });
                return;
            }

            if (!userId) {
                this.outputErrorResult({
                    message: "No user ID provided",
                    code: "MISSING_USER_ID",
                });
                return;
            }

            // Optionally fetch role and user details for confirmation
            let role: DomoRole | null = null;
            let user: DomoUser | null = null;

            if (!parsed.flags.has("yes") && config.displayFormat !== "json") {
                try {
                    role = await getRole(roleId);
                    user = await getUser(userId);
                } catch (error) {
                    log.debug("Could not fetch role/user details:", error);
                    // Continue without details
                }
            }

            // Show confirmation unless --yes flag is passed
            if (!parsed.flags.has("yes") && config.displayFormat !== "json") {
                const roleDesc = role ? `"${role.name}" (${roleId})` : roleId;
                const userDesc = user ? `${user.name} (${userId})` : userId;

                const confirmed = await CommandUtils.promptConfirmation(
                    `Add user ${userDesc} to role ${roleDesc}?`,
                );
                if (!confirmed) {
                    console.log("Operation cancelled");
                    return;
                }
            }

            // Perform the operation
            await addUserToRole(roleId, userId);

            // Fetch details for output if not already fetched
            if (!role) {
                try {
                    role = await getRole(roleId);
                } catch (error) {
                    log.debug("Could not fetch role details:", error);
                }
            }
            if (!user) {
                try {
                    user = await getUser(userId);
                } catch (error) {
                    log.debug("Could not fetch user details:", error);
                }
            }

            await this.output(
                {
                    success: true,
                    data: {
                        roleId,
                        roleName: role?.name,
                        userId,
                        userName: user?.name,
                        userEmail: user?.email,
                    },
                    metadata: { entityType: "role", operation: "add-user" },
                },
                () => this.displaySuccessTable(role, user),
                "add-user-to-role",
            );
        } catch (error) {
            log.error("Error adding user to role:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to add user to role";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to add user to role."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display success message
     */
    private displaySuccessTable(
        role: DomoRole | null,
        user: DomoUser | null,
    ): void {
        console.log(chalk.green("\n✓ User added to role successfully"));

        if (role) {
            console.log(chalk.cyan(`\nRole: ${role.name} (ID: ${role.id})`));
            if (role.description) {
                console.log(`Description: ${role.description}`);
            }
        }

        if (user) {
            console.log(chalk.cyan(`\nUser:`));
            const userData = [
                {
                    Field: "Name",
                    Value: user.name,
                },
                {
                    Field: "Email",
                    Value: user.email,
                },
                {
                    Field: "ID",
                    Value: user.id.toString(),
                },
            ];
            console.log(TerminalFormatter.table(userData));
        }
        console.log("");
    }

    /**
     * Shows help for the add-user-to-role command
     */
    public showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: add-user-to-role <role_id> <user_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "role_id",
                Type: "number",
                Description: "Required role ID",
            },
            {
                Argument: "user_id",
                Type: "number",
                Description: "Required user ID to add to the role",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nControl Options:"));
        const controlData = [
            {
                Option: "--yes",
                Description: "Skip confirmation prompt",
            },
        ];
        console.log(TerminalFormatter.table(controlData));

        console.log(chalk.cyan("\nOutput Options:"));
        const outputOptionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            { Option: "--export=md", Description: "Export as Markdown" },
            { Option: "--export=both", Description: "Export both formats" },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            { Option: "--quiet", Description: "Suppress export messages" },
        ];
        console.log(TerminalFormatter.table(outputOptionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "add-user-to-role 123 456",
                Description: "Add user 456 to role 123 (with confirmation)",
            },
            {
                Command: "add-user-to-role 123 456 --yes",
                Description: "Add user without confirmation",
            },
            {
                Command: "add-user-to-role 123 456 --format json",
                Description: "Add user and output as JSON",
            },
            {
                Command: "add-user-to-role 123 456 --export",
                Description: "Add user and export result",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(
            chalk.yellow(
                "\nNote: Requires Admin privileges and will fail in read-only mode",
            ),
        );
        console.log("");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--yes",
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
