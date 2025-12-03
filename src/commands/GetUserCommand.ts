import { getUser, type DomoUser } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { getDatabase } from "../core/database/JsonDatabase";
import {
    UserRepository,
    UserEntity,
} from "../core/database/repositories/UserRepository";
import chalk from "chalk";
import { TerminalFormatter } from "../utils/terminalFormatter";

/**
 * Gets detailed information about a specific user
 */
export class GetUserCommand extends BaseCommand {
    public readonly name = "get-user";
    public readonly description =
        "Gets detailed information about a specific user";

    /**
     * Executes the get-user command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { config, parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const userId = parsed.positional[0];

            // Check for database options
            const forceSync = parsed.flags.has("sync");
            const offlineMode = parsed.flags.has("offline");

            if (!userId) {
                this.outputErrorResult(
                    {
                        message: "No user ID provided",
                        code: "MISSING_USER_ID",
                    },
                    () => {
                        console.log("Error: User ID is required");
                        this.showHelp();
                    },
                );
                return;
            }

            let user: DomoUser | null = null;
            let source = "api";

            // Try to use database first if not forcing sync
            if (!forceSync) {
                try {
                    const db = await getDatabase();
                    const userRepo = new UserRepository(db);

                    // Check if user exists in database
                    const cachedUser = await userRepo.get(userId);

                    if (cachedUser) {
                        // Convert UserEntity back to DomoUser
                        user = {
                            ...cachedUser,
                            id: Number(cachedUser.id),
                        } as DomoUser;
                        source = "database";
                        if (config.displayFormat !== "json" && !offlineMode) {
                            console.log(
                                chalk.gray(
                                    "(Using cached data. Use --sync to refresh from API)",
                                ),
                            );
                        }
                    } else if (!offlineMode) {
                        // User not in database and not offline mode, fetch from API
                        user = await getUser(userId);

                        // Save to database for future use
                        if (user) {
                            await userRepo.save({
                                ...user,
                                id: String(user.id),
                            } as UserEntity);
                        }
                    } else {
                        // Offline mode and user not in database
                        this.outputErrorResult(
                            {
                                message:
                                    "User not found in local database (offline mode)",
                                code: "NOT_FOUND_OFFLINE",
                            },
                            () => {
                                console.log(
                                    chalk.yellow(
                                        "User not found in local database (offline mode)",
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
                        user = await getUser(userId);
                    } else {
                        throw dbError;
                    }
                }
            } else {
                // Force sync from API
                user = await getUser(userId);

                // Update database
                try {
                    const db = await getDatabase();
                    const userRepo = new UserRepository(db);
                    if (user) {
                        await userRepo.save({
                            ...user,
                            id: String(user.id),
                        } as UserEntity);
                        if (config.displayFormat !== "json") {
                            console.log(chalk.gray("(Updated local database)"));
                        }
                    }
                } catch (dbError) {
                    log.debug("Failed to update database:", dbError);
                }
            }

            if (user) {
                await this.output(
                    {
                        success: true,
                        data: { user },
                        metadata: { entityType: "user", source },
                    },
                    () => this.displayUser(user),
                    `user_${userId}`,
                );
            } else {
                this.outputErrorResult(
                    {
                        message: `User ${userId} not found`,
                        code: "USER_NOT_FOUND",
                    },
                    () => {
                        console.log(`User ${userId} not found`);
                    },
                );
            }
        } catch (error) {
            log.error("Error fetching user:", error);
            this.outputErrorResult(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Failed to fetch user",
                },
                () => {
                    console.error("Failed to fetch user.");
                    if (error instanceof Error) {
                        console.error("Error details:", error.message);
                    }
                    console.error("Check your authentication and try again.");
                },
            );
        }
    }

    /**
     * Display user details in table format
     */
    private displayUser(user: DomoUser): void {
        console.log(chalk.cyan("\nUser Details:"));
        console.log("-------------");
        console.log(`User: ${user.name} (${user.id})`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);

        if (user.title) {
            console.log(`Title: ${user.title}`);
        }
        if (user.phone) {
            console.log(`Phone: ${user.phone}`);
        }
        if (user.location) {
            console.log(`Location: ${user.location}`);
        }
        if (user.employeeNumber) {
            console.log(`Employee Number: ${user.employeeNumber}`);
        }

        if (user.groups && user.groups.length > 0) {
            console.log(chalk.cyan(`\nGroups (${user.groups.length}):`));
            user.groups.forEach(g => {
                const groupId = g.groupId || g.id;
                console.log(`  - ${g.name} (${groupId})`);
            });
        }
    }

    /**
     * Shows help for the get-user command
     */
    public showHelp(): void {
        console.log("Gets detailed information about a specific user");
        console.log("\nUsage: get-user <user_id> [options]");

        console.log(chalk.cyan("\nArguments:"));
        console.log("  user_id (required): User ID");

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
        console.log("  get-user 871428330");
        console.log("  get-user 871428330 --format=json");
        console.log("  get-user 871428330 --offline");
        console.log("  get-user 871428330 --sync");
        console.log("  get-user 871428330 --export=md");
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
