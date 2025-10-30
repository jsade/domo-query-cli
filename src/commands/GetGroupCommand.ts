import { getGroup, type DomoGroup } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { getDatabase } from "../core/database/JsonDatabase";
import {
    GroupRepository,
    GroupEntity,
} from "../core/database/repositories/GroupRepository";
import chalk from "chalk";

/**
 * Gets detailed information about a specific group
 */
export class GetGroupCommand extends BaseCommand {
    public readonly name = "get-group";
    public readonly description =
        "Gets detailed information about a specific group";

    /**
     * Executes the get-group command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract ID from positional args
            const groupId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            // Check for database options
            const forceSync = parsedArgs.flags?.has("sync") || false;
            const offlineMode = parsedArgs.flags?.has("offline") || false;

            if (!groupId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No group ID provided",
                            "MISSING_GROUP_ID",
                        ),
                    );
                } else {
                    console.log("Error: Group ID is required");
                    this.showHelp();
                }
                return;
            }

            let group: DomoGroup | null = null;
            let source = "api";

            // Try to use database first if not forcing sync
            if (!forceSync) {
                try {
                    const db = await getDatabase();
                    const groupRepo = new GroupRepository(db);

                    // Check if group exists in database
                    const cachedGroup = await groupRepo.get(groupId);

                    if (cachedGroup) {
                        // Convert GroupEntity back to DomoGroup
                        const { id: stringId, ...rest } = cachedGroup;
                        group = {
                            ...rest,
                            groupId: Number(stringId),
                            id: Number(stringId),
                        } as DomoGroup;
                        source = "database";
                        if (!this.isJsonOutput && !offlineMode) {
                            console.log(
                                chalk.gray(
                                    "(Using cached data. Use --sync to refresh from API)",
                                ),
                            );
                        }
                    } else if (!offlineMode) {
                        // Group not in database and not offline mode, fetch from API
                        group = await getGroup(groupId);

                        // Save to database for future use
                        if (group) {
                            await groupRepo.save({
                                ...group,
                                id: String(group.groupId || group.id),
                            } as GroupEntity);
                        }
                    } else {
                        // Offline mode and group not in database
                        if (this.isJsonOutput) {
                            console.log(
                                JsonOutputFormatter.error(
                                    this.name,
                                    "Group not found in local database (offline mode)",
                                    "NOT_FOUND_OFFLINE",
                                ),
                            );
                        } else {
                            console.log(
                                chalk.yellow(
                                    "Group not found in local database (offline mode)",
                                ),
                            );
                        }
                        return;
                    }
                } catch (dbError) {
                    // Database error, fall back to API if not offline
                    if (!offlineMode) {
                        log.debug(
                            "Database error, falling back to API:",
                            dbError,
                        );
                        group = await getGroup(groupId);
                    } else {
                        throw dbError;
                    }
                }
            } else {
                // Force sync from API
                group = await getGroup(groupId);

                // Update database
                try {
                    const db = await getDatabase();
                    const groupRepo = new GroupRepository(db);
                    if (group) {
                        await groupRepo.save({
                            ...group,
                            id: String(group.groupId || group.id),
                        } as GroupEntity);
                        if (!this.isJsonOutput) {
                            console.log(chalk.gray("(Updated local database)"));
                        }
                    }
                } catch (dbError) {
                    log.debug("Failed to update database:", dbError);
                }
            }

            if (group) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { group },
                            { entityType: "group", source },
                        ),
                    );
                } else {
                    const displayGroupId = group.groupId || group.id;
                    console.log(chalk.cyan("\nGroup Details:"));
                    console.log("-------------");
                    console.log(`Group: ${group.name} (${displayGroupId})`);
                    console.log(`Type: ${group.groupType || "-"}`);
                    console.log(
                        `Member Count: ${group.memberCount || group.groupMembers?.length || 0}`,
                    );

                    if (group.created) {
                        console.log(`Created: ${group.created}`);
                    }

                    if (group.groupMembers && group.groupMembers.length > 0) {
                        console.log(
                            chalk.cyan(
                                `\nGroup Members (${group.groupMembers.length}):`,
                            ),
                        );

                        // Display members in table format
                        const membersData = group.groupMembers.map(member => ({
                            ID: member.id,
                            Name: member.displayName || member.name,
                            Email: member.email || "-",
                        }));

                        console.log(TerminalFormatter.table(membersData));
                    } else {
                        console.log(chalk.gray("\nNo members in this group"));
                    }

                    // Handle save options
                    if (saveOptions) {
                        await CommandUtils.exportData(
                            [group],
                            "Group",
                            `group_${groupId}`,
                            saveOptions,
                            this.isJsonOutput,
                        );
                    }
                }
            } else {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            `Group ${groupId} not found`,
                            "GROUP_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log(`Group ${groupId} not found`);
                }
            }
        } catch (error) {
            log.error("Error fetching group:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch group";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error("Failed to fetch group.");
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            }
        }
    }

    /**
     * Shows help for the get-group command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific group");
        console.log("\nUsage: get-group <group_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        console.log("  group_id (required): Group ID");

        console.log(chalk.cyan("\nOptions:"));
        console.log("  --sync         Force sync from API (bypass cache)");
        console.log("  --offline      Use cached data only (no API calls)");
        console.log("  --format json  Output as JSON");
        console.log("  --save         Save to file");

        console.log(chalk.cyan("\nExamples:"));
        console.log("  get-group 1324037627");
        console.log("  get-group 1324037627 --format json");
        console.log("  get-group 1324037627 --offline");
        console.log("  get-group 1324037627 --sync");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = ["--sync", "--offline", "--format", "--save"];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
