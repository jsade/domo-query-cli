import { BaseRepository } from "./BaseRepository";
import { DomoUser } from "../../../api/clients/domoClient";
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
     * Sync users from Domo API (optional - can be implemented later)
     * @param silent - If true, suppress console output during sync
     */
    async sync(silent: boolean = false): Promise<void> {
        // TODO: Implement sync in Phase 3 when updating db-sync command
        if (!silent) {
            console.log("User sync not yet implemented");
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
