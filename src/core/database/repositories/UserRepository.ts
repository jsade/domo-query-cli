import { BaseRepository } from "./BaseRepository";
import { DomoUser, listUsers } from "../../../api/clients/domoClient";
import { JsonDatabase } from "../JsonDatabase";

// Extend DomoUser to satisfy Entity constraint
// Omit the numeric id from DomoUser and replace with string id for Entity
export interface UserEntity extends Omit<DomoUser, "id"> {
    id: string; // Override id to be string (Entity constraint)
    [key: string]: unknown;
}

export class UserRepository extends BaseRepository<UserEntity> {
    constructor(db: JsonDatabase) {
        super(db, "users");
    }

    /**
     * Sync users from Domo API
     * @param silent - If true, suppress console output during sync
     */
    async sync(silent: boolean = false): Promise<void> {
        if (this.options.offlineMode) {
            if (!silent) {
                console.log("Offline mode enabled, skipping sync");
            }
            return;
        }

        try {
            if (!silent) {
                console.log("Syncing users from Domo API...");
            }

            let offset = 0;
            const limit = 50;
            let totalProcessed = 0;
            let pageNum = 0;

            // Process pages of users
            while (true) {
                const page = await listUsers({ limit, offset });
                pageNum++;

                if (!Array.isArray(page) || page.length === 0) {
                    if (pageNum === 1 && !silent) {
                        console.log("No users found to sync");
                    }
                    break;
                }

                // Save each user to the database
                for (const user of page) {
                    if (user && user.id) {
                        // Convert numeric id to string for Entity constraint
                        const userEntity: UserEntity = {
                            ...user,
                            id: String(user.id),
                        };
                        await this.save(userEntity);
                        totalProcessed++;
                    }
                }

                if (!silent && totalProcessed % 50 === 0) {
                    process.stdout.write(
                        `\rProcessed ${totalProcessed} users...`,
                    );
                }

                // Next page
                if (page.length < limit) {
                    break;
                }
                offset += limit;
            }

            // Finalize
            await this.updateSyncTime();
            if (!silent) {
                if (totalProcessed > 0) {
                    process.stdout.write("\r");
                    console.log(`Synced ${totalProcessed} users`);
                }
            }
        } catch (error) {
            if (!silent) {
                console.error("Failed to sync users:", error);
            }
            throw error;
        }
    }

    /**
     * Get user with optional sync
     */
    async getWithSync(
        id: string,
        forceSync: boolean = false,
    ): Promise<UserEntity | null> {
        // Check if we need to sync
        if (forceSync || (await this.needsSync())) {
            await this.sync();
        }

        return this.get(id);
    }

    /**
     * Find users by name pattern
     */
    async findByNamePattern(pattern: string): Promise<UserEntity[]> {
        const regex = new RegExp(pattern, "i");
        return this.list({
            filter: user => regex.test(user.name || ""),
        });
    }

    /**
     * Find users by email pattern
     */
    async findByEmailPattern(pattern: string): Promise<UserEntity[]> {
        const regex = new RegExp(pattern, "i");
        return this.list({
            filter: user => regex.test(user.email || ""),
        });
    }

    /**
     * Find users by role
     */
    async findByRole(
        role: "Admin" | "Privileged" | "Participant",
    ): Promise<UserEntity[]> {
        return this.list({
            filter: user => user.role === role,
        });
    }
}
