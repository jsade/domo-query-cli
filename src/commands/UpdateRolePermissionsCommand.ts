import chalk from "chalk";
import { updateRolePermissions, getRole } from "../api/clients/domoClient";
import type { DomoRole } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";
import { checkReadOnlyMode } from "../utils/readOnlyGuard";
import { CommandUtils } from "./CommandUtils";

/**
 * Updates permissions for a role
 */
export class UpdateRolePermissionsCommand extends BaseCommand {
    public readonly name = "update-role-permissions";
    public readonly description =
        "Updates the authorities/permissions for a role";

    /**
     * Executes the update-role-permissions command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            // Check read-only mode FIRST
            checkReadOnlyMode("update-role-permissions");

            const { config, parsed } = this.parseOutputConfig(args);

            // Extract role ID from positional args
            const roleId = parsed.positional[0];

            if (!roleId) {
                this.outputErrorResult({
                    message: "No role ID provided",
                    code: "MISSING_ROLE_ID",
                });
                return;
            }

            // Determine the operation mode
            const setMode = parsed.params.set !== undefined;
            const addMode = parsed.params.add !== undefined;
            const removeMode = parsed.params.remove !== undefined;

            // Validate that exactly one mode is specified
            const modesCount = [setMode, addMode, removeMode].filter(
                Boolean,
            ).length;
            if (modesCount === 0) {
                this.outputErrorResult({
                    message:
                        "Must specify one of: --set, --add, or --remove with comma-separated authorities",
                    code: "MISSING_OPERATION",
                });
                return;
            }
            if (modesCount > 1) {
                this.outputErrorResult({
                    message:
                        "Cannot use multiple operations (--set, --add, --remove) together",
                    code: "MULTIPLE_OPERATIONS",
                });
                return;
            }

            let finalAuthorities: string[] = [];

            if (setMode) {
                // Replace all permissions with provided list
                const authoritiesStr = String(parsed.params.set);
                finalAuthorities = authoritiesStr
                    .split(",")
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
            } else if (addMode || removeMode) {
                // Need to fetch current permissions first
                log.debug(`Fetching current role ${roleId} to get authorities`);
                const currentRole = await getRole(roleId);

                if (!currentRole) {
                    this.outputErrorResult({
                        message: `Role ${roleId} not found`,
                        code: "ROLE_NOT_FOUND",
                    });
                    return;
                }

                // Note: API returns `authority` as the field name, fallback to `name` for compatibility
                const currentAuthorities =
                    currentRole.authorities?.map(
                        a => a.authority || a.name || "",
                    ) || [];

                if (addMode) {
                    // Add permissions to current list
                    const toAdd = String(parsed.params.add)
                        .split(",")
                        .map(a => a.trim())
                        .filter(a => a.length > 0);

                    finalAuthorities = [
                        ...new Set([...currentAuthorities, ...toAdd]),
                    ];
                } else if (removeMode) {
                    // Remove permissions from current list
                    const toRemove = new Set(
                        String(parsed.params.remove)
                            .split(",")
                            .map(a => a.trim())
                            .filter(a => a.length > 0),
                    );

                    finalAuthorities = currentAuthorities.filter(
                        a => !toRemove.has(a),
                    );
                }
            }

            // Show confirmation unless --yes flag is passed
            if (!parsed.flags.has("yes") && !config.displayFormat) {
                const operationDesc = setMode
                    ? `Replace all permissions for role ${roleId} with ${finalAuthorities.length} authorities`
                    : addMode
                      ? `Add permissions to role ${roleId}`
                      : `Remove permissions from role ${roleId}`;

                const confirmed = await CommandUtils.promptConfirmation(
                    `${operationDesc}?`,
                );
                if (!confirmed) {
                    if (config.displayFormat !== "json") {
                        console.log("Operation cancelled");
                    }
                    return;
                }
            }

            // Perform the update
            await updateRolePermissions(roleId, finalAuthorities);

            // Fetch the updated role to confirm
            const updatedRole = await getRole(roleId);

            await this.output(
                {
                    success: true,
                    data: {
                        roleId,
                        roleName: updatedRole?.name,
                        authorities: finalAuthorities,
                        authoritiesCount: finalAuthorities.length,
                    },
                    metadata: {
                        entityType: "role",
                        operation: setMode ? "set" : addMode ? "add" : "remove",
                    },
                },
                () => this.displaySuccessTable(updatedRole, finalAuthorities),
                "update-role-permissions",
            );
        } catch (error) {
            log.error("Error updating role permissions:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update role permissions";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        "Failed to update role permissions.",
                    ),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display success message with updated permissions
     */
    private displaySuccessTable(
        role: DomoRole | null,
        authorities: string[],
    ): void {
        console.log(chalk.green("\n✓ Role permissions updated successfully"));
        if (role) {
            console.log(chalk.cyan(`\nRole: ${role.name} (ID: ${role.id})`));
        }
        console.log(chalk.cyan(`\nAuthorities (${authorities.length}):`));

        if (authorities.length === 0) {
            console.log("  (no authorities)");
        } else {
            const tableData = authorities.map((auth, index) => ({
                "#": index + 1,
                Authority: auth,
            }));
            console.log(TerminalFormatter.table(tableData));
        }
        console.log("");
    }

    /**
     * Shows help for the update-role-permissions command
     */
    public showHelp(): void {
        console.log(this.description);
        console.log("\nUsage: update-role-permissions <role_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        const argsData = [
            {
                Argument: "role_id",
                Type: "number",
                Description: "Required role ID to update",
            },
        ];
        console.log(TerminalFormatter.table(argsData));

        console.log(chalk.cyan("\nOperation Options (choose one):"));
        const opsData = [
            {
                Option: "--set=<auth1,auth2,...>",
                Description: "Replace all permissions with these authorities",
            },
            {
                Option: "--add=<auth1,auth2,...>",
                Description: "Add these authorities to current permissions",
            },
            {
                Option: "--remove=<auth1,auth2,...>",
                Description:
                    "Remove these authorities from current permissions",
            },
        ];
        console.log(TerminalFormatter.table(opsData));

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
                Command:
                    "update-role-permissions 123 --set VIEW_DATA,EDIT_DATA",
                Description: "Replace all permissions",
            },
            {
                Command: "update-role-permissions 123 --add ADMIN_DATA",
                Description: "Add a permission to existing ones",
            },
            {
                Command: "update-role-permissions 123 --remove VIEW_CARDS",
                Description: "Remove a specific permission",
            },
            {
                Command: "update-role-permissions 123 --set VIEW_DATA --yes",
                Description: "Update without confirmation",
            },
            {
                Command:
                    "update-role-permissions 123 --set VIEW_DATA --format json",
                Description: "Update and output as JSON",
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
            "--set=",
            "--add=",
            "--remove=",
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
