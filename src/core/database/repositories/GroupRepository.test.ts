import { describe, it, expect, beforeEach, vi } from "vitest";
import { GroupRepository, GroupEntity } from "./GroupRepository";
import { JsonDatabase } from "../JsonDatabase";

// Mock JsonDatabase
vi.mock("../JsonDatabase");

describe("GroupRepository", () => {
    let mockDb: JsonDatabase;
    let repository: GroupRepository;

    beforeEach(() => {
        mockDb = {
            get: vi.fn(),
            set: vi.fn(),
            setMany: vi.fn(),
            delete: vi.fn(),
            list: vi.fn(),
        } as unknown as JsonDatabase;

        repository = new GroupRepository(mockDb);
    });

    describe("constructor", () => {
        it("should initialize with correct collection name", () => {
            expect(repository).toBeInstanceOf(GroupRepository);
        });
    });

    describe("get", () => {
        it("should retrieve a group by ID", async () => {
            const mockGroup: GroupEntity = {
                id: "123",
                name: "Engineering Team",
                groupType: "open",
                memberCount: 25,
            };

            vi.mocked(mockDb.get).mockResolvedValue(mockGroup);

            const result = await repository.get("123");

            expect(mockDb.get).toHaveBeenCalledWith("groups", "123");
            expect(result).toEqual(mockGroup);
        });

        it("should return null when group not found", async () => {
            vi.mocked(mockDb.get).mockResolvedValue(null);

            const result = await repository.get("999");

            expect(result).toBeNull();
        });
    });

    describe("save", () => {
        it("should save a group entity", async () => {
            const group: GroupEntity = {
                id: "123",
                name: "Engineering Team",
                groupType: "open",
                memberCount: 25,
            };

            await repository.save(group);

            expect(mockDb.set).toHaveBeenCalledWith("groups", group);
        });
    });

    describe("saveMany", () => {
        it("should save multiple group entities", async () => {
            const groups: GroupEntity[] = [
                {
                    id: "123",
                    name: "Engineering",
                    groupType: "open",
                    memberCount: 25,
                },
                {
                    id: "456",
                    name: "Sales",
                    groupType: "user",
                    memberCount: 15,
                },
            ];

            await repository.saveMany(groups);

            expect(mockDb.setMany).toHaveBeenCalledWith("groups", groups);
        });
    });

    describe("delete", () => {
        it("should delete a group by ID", async () => {
            vi.mocked(mockDb.delete).mockResolvedValue(true);

            const result = await repository.delete("123");

            expect(mockDb.delete).toHaveBeenCalledWith("groups", "123");
            expect(result).toBe(true);
        });

        it("should return false when group not found", async () => {
            vi.mocked(mockDb.delete).mockResolvedValue(false);

            const result = await repository.delete("999");

            expect(result).toBe(false);
        });
    });

    describe("list", () => {
        it("should list all groups", async () => {
            const mockGroups: GroupEntity[] = [
                {
                    id: "123",
                    name: "Engineering",
                    groupType: "open",
                    memberCount: 25,
                },
                {
                    id: "456",
                    name: "Sales",
                    groupType: "user",
                    memberCount: 15,
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockGroups);

            const result = await repository.list();

            expect(mockDb.list).toHaveBeenCalledWith("groups", undefined);
            expect(result).toEqual(mockGroups);
        });

        it("should list groups with filter options", async () => {
            const filterOptions = {
                filter: (group: GroupEntity) => group.groupType === "open",
            };

            await repository.list(filterOptions);

            expect(mockDb.list).toHaveBeenCalledWith("groups", filterOptions);
        });
    });

    describe("findBy", () => {
        it("should find groups by field value", async () => {
            const mockGroups: GroupEntity[] = [
                {
                    id: "123",
                    name: "Engineering",
                    groupType: "open",
                    memberCount: 25,
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockGroups);

            const result = await repository.findBy("groupType", "open");

            expect(mockDb.list).toHaveBeenCalled();
            expect(result).toEqual(mockGroups);
        });
    });

    describe("findByNamePattern", () => {
        it("should find groups matching name pattern", async () => {
            const mockGroups: GroupEntity[] = [
                {
                    id: "123",
                    name: "Engineering Team",
                    groupType: "open",
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockGroups);

            const result = await repository.findByNamePattern("Engineering");

            expect(mockDb.list).toHaveBeenCalled();
            expect(result).toEqual(mockGroups);
        });
    });

    describe("findByType", () => {
        it("should find groups by type", async () => {
            const mockGroups: GroupEntity[] = [
                {
                    id: "123",
                    name: "Engineering",
                    groupType: "open",
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockGroups);

            const result = await repository.findByType("open");

            expect(mockDb.list).toHaveBeenCalled();
            expect(result).toEqual(mockGroups);
        });
    });
});
