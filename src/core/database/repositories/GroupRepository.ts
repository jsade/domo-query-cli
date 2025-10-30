import { BaseRepository } from "./BaseRepository";
import { DomoGroup, listGroups } from "../../../api/clients/domoClient";
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
     * Sync groups from Domo API
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
                console.log("Syncing groups from Domo API...");
            }

            // Fetch all groups (Platform API v1 may not support pagination)
            const groups = await listGroups();

            if (!Array.isArray(groups) || groups.length === 0) {
                if (!silent) {
                    console.log("No groups found to sync");
                }
                return;
            }

            let totalProcessed = 0;

            // Save each group to the database
            for (const group of groups) {
                if (group && (group.groupId || group.id)) {
                    // Use groupId if available, otherwise fall back to id
                    const groupId =
                        group.groupId || (group as { id?: number }).id;
                    if (groupId) {
                        // Convert numeric id to string for Entity constraint
                        const groupEntity: GroupEntity = {
                            ...group,
                            id: String(groupId),
                        };
                        await this.save(groupEntity);
                        totalProcessed++;

                        if (!silent && totalProcessed % 50 === 0) {
                            process.stdout.write(
                                `\rProcessed ${totalProcessed} groups...`,
                            );
                        }
                    }
                }
            }

            // Finalize
            await this.updateSyncTime();
            if (!silent) {
                if (totalProcessed > 0) {
                    process.stdout.write("\r");
                    console.log(`Synced ${totalProcessed} groups`);
                }
            }
        } catch (error) {
            if (!silent) {
                console.error("Failed to sync groups:", error);
            }
            throw error;
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
