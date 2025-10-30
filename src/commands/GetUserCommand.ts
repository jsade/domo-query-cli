import { getUser, type DomoUser } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { CommandUtils } from "./CommandUtils";
import { JsonOutputFormatter } from "../utils/JsonOutputFormatter";
import { getDatabase } from "../core/database/JsonDatabase";
import {
    UserRepository,
    UserEntity,
} from "../core/database/repositories/UserRepository";
import chalk from "chalk";

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
            const parsedArgs = CommandUtils.parseCommandArgs(args);

            // Check for JSON output format
            if (parsedArgs.format?.toLowerCase() === "json") {
                this.isJsonOutput = true;
            }

            // Extract ID from positional args
            const userId = parsedArgs.positional[0];
            const saveOptions = parsedArgs.saveOptions;

            // Check for database options
            const forceSync = parsedArgs.flags?.has("sync") || false;
            const offlineMode = parsedArgs.flags?.has("offline") || false;

            if (!userId) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.error(
                            this.name,
                            "No user ID provided",
                            "MISSING_USER_ID",
                        ),
                    );
                } else {
                    console.log("Error: User ID is required");
                    this.showHelp();
                }
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
                        if (!this.isJsonOutput && !offlineMode) {
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
                        if (this.isJsonOutput) {
                            console.log(
                                JsonOutputFormatter.error(
                                    this.name,
                                    "User not found in local database (offline mode)",
                                    "NOT_FOUND_OFFLINE",
                                ),
                            );
                        } else {
                            console.log(
                                chalk.yellow(
                                    "User not found in local database (offline mode)",
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
                        if (!this.isJsonOutput) {
                            console.log(chalk.gray("(Updated local database)"));
                        }
                    }
                } catch (dbError) {
                    log.debug("Failed to update database:", dbError);
                }
            }

            if (user) {
                if (this.isJsonOutput) {
                    console.log(
                        JsonOutputFormatter.success(
                            this.name,
                            { user },
                            { entityType: "user", source },
                        ),
                    );
                } else {
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
                        console.log(
                            chalk.cyan(`\nGroups (${user.groups.length}):`),
                        );
                        user.groups.forEach(g => {
                            const groupId = g.groupId || g.id;
                            console.log(`  - ${g.name} (${groupId})`);
                        });
                    }

                    // Handle save options
                    if (saveOptions) {
                        await CommandUtils.exportData(
                            [user],
                            "User",
                            `user_${userId}`,
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
                            `User ${userId} not found`,
                            "USER_NOT_FOUND",
                        ),
                    );
                } else {
                    console.log(`User ${userId} not found`);
                }
            }
        } catch (error) {
            log.error("Error fetching user:", error);
            if (this.isJsonOutput) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch user";
                console.log(JsonOutputFormatter.error(this.name, message));
            } else {
                console.error("Failed to fetch user.");
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            }
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

        console.log(chalk.cyan("\nOptions:"));
        console.log("  --sync         Force sync from API (bypass cache)");
        console.log("  --offline      Use cached data only (no API calls)");
        console.log("  --format json  Output as JSON");
        console.log("  --save         Save to file");

        console.log(chalk.cyan("\nExamples:"));
        console.log("  get-user 871428330");
        console.log("  get-user 871428330 --format json");
        console.log("  get-user 871428330 --offline");
        console.log("  get-user 871428330 --sync");
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = ["--sync", "--offline", "--format", "--save"];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
