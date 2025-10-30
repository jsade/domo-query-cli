import { BaseRepository } from "./BaseRepository";
import { DomoGroup } from "../../../api/clients/domoClient";
import { JsonDatabase } from "../JsonDatabase";

// Extend DomoGroup to satisfy Entity constraint
// Omit both groupId and id from DomoGroup and replace with string id for Entity
export interface GroupEntity extends Omit<DomoGroup, "groupId" | "id"> {
    id: string; // Override id to be string (Entity constraint)
    [key: string]: unknown;
}

export class GroupRepository extends BaseRepository<GroupEntity> {
    constructor(db: JsonDatabase) {
        super(db, "groups");
    }

    /**
     * Sync groups from Domo API (optional - can be implemented later)
     * @param silent - If true, suppress console output during sync
     */
    async sync(silent: boolean = false): Promise<void> {
        // TODO: Implement sync in Phase 3 when updating db-sync command
        if (!silent) {
            console.log("Group sync not yet implemented");
        }
    }

    /**
     * Get group with optional sync
     */
    async getWithSync(
        id: string,
        forceSync: boolean = false,
    ): Promise<GroupEntity | null> {
        // Check if we need to sync
        if (forceSync || (await this.needsSync())) {
            await this.sync();
        }

        return this.get(id);
    }

    /**
     * Find groups by name pattern
     */
    async findByNamePattern(pattern: string): Promise<GroupEntity[]> {
        const regex = new RegExp(pattern, "i");
        return this.list({
            filter: group => regex.test(group.name || ""),
        });
    }

    /**
     * Find groups by type
     */
    async findByType(type: "open" | "user" | "system"): Promise<GroupEntity[]> {
        return this.list({
            filter: group => group.groupType === type,
        });
    }
}
