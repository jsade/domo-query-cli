import { BaseRepository } from "./BaseRepository";
import { JsonDatabase } from "../JsonDatabase";
import { listCards } from "../../../api/clients/domoClient";

// Define DomoCard type based on the API response with Entity constraint
export interface DomoCard {
    id: string;
    cardTitle?: string;
    cardUrn?: string;
    lastModified?: number;
    ownerId?: number;
    ownerName?: string;
    pages?: number[];
    type?: string;
    dataSetId?: string;
    description?: string;
    [key: string]: unknown;
}

export class CardRepository extends BaseRepository<DomoCard> {
    constructor(db: JsonDatabase) {
        super(db, "cards");
    }

    /**
     * Sync cards from Domo API
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
                console.log("Syncing cards from Domo API...");
            }

            // Fetch all cards (with pagination)
            const allCards: DomoCard[] = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                const response = await listCards({ limit, offset });

                if (response && Array.isArray(response)) {
                    // Convert API response to our DomoCard format
                    const cards = response.map(card =>
                        this.convertApiCardToDomoCard(
                            card as unknown as Record<string, unknown>,
                        ),
                    );
                    allCards.push(...cards);

                    // Check if there are more cards to fetch
                    hasMore = response.length === limit;
                    offset += limit;
                } else {
                    hasMore = false;
                }
            }

            // Save all cards to database
            if (allCards.length > 0) {
                await this.saveMany(allCards);
                await this.updateSyncTime();
                if (!silent) {
                    console.log(`Synced ${allCards.length} cards`);
                }
            } else {
                if (!silent) {
                    console.log("No cards found to sync");
                }
            }
        } catch (error) {
            if (!silent) {
                console.error("Failed to sync cards:", error);
            }
            throw error;
        }
    }

    /**
     * Convert API card response to DomoCard format
     */
    private convertApiCardToDomoCard(
        apiCard: Record<string, unknown>,
    ): DomoCard {
        return {
            id: (apiCard.id as string) || (apiCard.cardUrn as string) || "",
            cardTitle:
                (apiCard.title as string) ||
                (apiCard.cardTitle as string) ||
                undefined,
            cardUrn:
                (apiCard.cardUrn as string) ||
                (apiCard.id as string) ||
                undefined,
            lastModified: (apiCard.lastModified as number) || undefined,
            ownerId: (apiCard.ownerId as number) || undefined,
            ownerName: (apiCard.ownerName as string) || undefined,
            pages: (apiCard.pages as number[]) || undefined,
            type: (apiCard.type as string) || undefined,
        };
    }

    /**
     * Get card with optional sync
     */
    async getWithSync(
        id: string,
        forceSync: boolean = false,
    ): Promise<DomoCard | null> {
        // Check if we need to sync
        if (forceSync || (await this.needsSync())) {
            await this.sync();
        }

        return this.get(id);
    }

    /**
     * Get detailed card information from API
     */
    async getCardDetails(
        _cardUrn: string,
    ): Promise<Record<string, unknown> | null> {
        // This would need a proper API implementation
        // For now, returning null
        // Note: console.log removed to prevent JSON output corruption
        return null;
    }

    /**
     * Find cards by title pattern
     */
    async findByTitlePattern(pattern: string): Promise<DomoCard[]> {
        const regex = new RegExp(pattern, "i");
        return this.list({
            filter: card => regex.test(card.cardTitle || ""),
        });
    }

    /**
     * Find cards by owner
     */
    async findByOwner(ownerId: number): Promise<DomoCard[]> {
        return this.list({
            filter: card => card.ownerId === ownerId,
        });
    }

    /**
     * Find cards by page
     */
    async findByPage(pageId: number): Promise<DomoCard[]> {
        return this.list({
            filter: card => card.pages?.includes(pageId) || false,
        });
    }

    /**
     * Find cards by type
     */
    async findByType(type: string): Promise<DomoCard[]> {
        return this.list({
            filter: card => card.type === type,
        });
    }

    /**
     * Get recently modified cards
     */
    async getRecentlyModified(limit: number = 10): Promise<DomoCard[]> {
        return this.list({
            filter: card => card.lastModified !== undefined,
            sort: (a, b) => (b.lastModified || 0) - (a.lastModified || 0),
            limit,
        });
    }

    /**
     * Get cards without pages (orphaned cards)
     */
    async getOrphanedCards(): Promise<DomoCard[]> {
        return this.list({
            filter: card => !card.pages || card.pages.length === 0,
        });
    }

    /**
     * Get card statistics
     */
    async getStatistics(): Promise<{
        totalCards: number;
        cardsByType: Record<string, number>;
        cardsWithPages: number;
        orphanedCards: number;
        avgPagesPerCard: number;
        uniqueOwners: number;
        lastSync: string | null;
    }> {
        const cards = await this.list();
        const totalCards = cards.length;
        const cardsByType: Record<string, number> = {};
        const uniqueOwners = new Set<number>();

        let cardsWithPages = 0;
        let totalPages = 0;

        for (const card of cards) {
            // Count by type
            const type = card.type || "Unknown";
            cardsByType[type] = (cardsByType[type] || 0) + 1;

            // Count cards with pages
            if (card.pages && card.pages.length > 0) {
                cardsWithPages++;
                totalPages += card.pages.length;
            }

            // Track unique owners
            if (card.ownerId) {
                uniqueOwners.add(card.ownerId);
            }
        }

        return {
            totalCards,
            cardsByType,
            cardsWithPages,
            orphanedCards: totalCards - cardsWithPages,
            avgPagesPerCard:
                cardsWithPages > 0 ? totalPages / cardsWithPages : 0,
            uniqueOwners: uniqueOwners.size,
            lastSync: this.getLastSync(),
        };
    }

    /**
     * Export cards to CSV format
     */
    async exportToCSV(): Promise<string> {
        const cards = await this.list();

        // CSV header
        const headers = [
            "ID",
            "Title",
            "Type",
            "Owner ID",
            "Owner Name",
            "Last Modified",
            "Pages",
        ];
        const rows = [headers.join(",")];

        // Add data rows
        for (const card of cards) {
            const row = [
                card.cardUrn || card.id,
                `"${(card.cardTitle || "").replace(/"/g, '""')}"`,
                card.type || "",
                card.ownerId || "",
                `"${(card.ownerName || "").replace(/"/g, '""')}"`,
                card.lastModified
                    ? new Date(card.lastModified).toISOString()
                    : "",
                card.pages?.join(";") || "",
            ];
            rows.push(row.join(","));
        }

        return rows.join("\n");
    }

    /**
     * Build card-dataset relationships
     */
    async buildCardDatasetRelationships(): Promise<
        Array<{
            cardId: string;
            cardTitle: string;
            datasetId: string;
        }>
    > {
        const relationships: Array<{
            cardId: string;
            cardTitle: string;
            datasetId: string;
        }> = [];

        const cards = await this.list();

        for (const card of cards) {
            if (card.cardUrn) {
                // Get detailed card info to find dataset reference
                const details = await this.getCardDetails(card.cardUrn);
                if (details?.dataSetId) {
                    relationships.push({
                        cardId: card.id,
                        cardTitle: card.cardTitle || "Unnamed",
                        datasetId: details.dataSetId as string,
                    });
                }
            }
        }

        return relationships;
    }
}
