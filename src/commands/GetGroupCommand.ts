import { getGroup, type DomoGroup } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
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
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const groupId = parsed.positional[0];

            // Check for database options
            const forceSync = parsed.flags.has("sync");
            const offlineMode = parsed.flags.has("offline");

            if (!groupId) {
                this.outputErrorResult(
                    {
                        message: "No group ID provided",
                        code: "MISSING_GROUP_ID",
                    },
                    () => {
                        console.log("Error: Group ID is required");
                        this.showHelp();
                    },
                );
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
                        if (config.displayFormat !== "json" && !offlineMode) {
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
                        this.outputErrorResult(
                            {
                                message:
                                    "Group not found in local database (offline mode)",
                                code: "NOT_FOUND_OFFLINE",
                            },
                            () => {
                                console.log(
                                    chalk.yellow(
                                        "Group not found in local database (offline mode)",
                                    ),
                                );
                            },
                        );
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
                        if (config.displayFormat !== "json") {
                            console.log(chalk.gray("(Updated local database)"));
                        }
                    }
                } catch (dbError) {
                    log.debug("Failed to update database:", dbError);
                }
            }

            if (group) {
                await this.output(
                    {
                        success: true,
                        data: { group },
                        metadata: { entityType: "group", source },
                    },
                    () => this.displayGroup(group!, groupId),
                    `group_${groupId}`,
                );
            } else {
                this.outputErrorResult(
                    {
                        message: `Group ${groupId} not found`,
                        code: "GROUP_NOT_FOUND",
                    },
                    () => {
                        console.log(`Group ${groupId} not found`);
                    },
                );
            }
        } catch (error) {
            log.error("Error fetching group:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch group",
                },
                () => {
                    console.error("Failed to fetch group.");
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error("Check your authentication and try again.");
                },
            );
        }
    }

    /**
     * Display group details in table format
     */
    private displayGroup(group: DomoGroup, _groupId: string): void {
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
                chalk.cyan(`\nGroup Members (${group.groupMembers.length}):`),
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
    }

    /**
     * Shows help for the get-group command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific group");
        console.log("\nUsage: get-group <group_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        console.log("  group_id (required): Group ID");

        console.log(chalk.cyan("\nDatabase Options:"));
        console.log("  --sync         Force sync from API (bypass cache)");
        console.log("  --offline      Use cached data only (no API calls)");

        console.log(chalk.cyan("\nOutput Options:"));
        const optionsData = [
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
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

        console.log(chalk.cyan("\nExamples:"));
        console.log("  get-group 1324037627");
        console.log("  get-group 1324037627 --format=json");
        console.log("  get-group 1324037627 --offline");
        console.log("  get-group 1324037627 --sync");
        console.log("  get-group 1324037627 --export=md");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--sync",
            "--offline",
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
