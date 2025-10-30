import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository, UserEntity } from "./UserRepository";
import { JsonDatabase } from "../JsonDatabase";

// Mock JsonDatabase
vi.mock("../JsonDatabase");

describe("UserRepository", () => {
    let mockDb: JsonDatabase;
    let repository: UserRepository;

    beforeEach(() => {
        mockDb = {
            get: vi.fn(),
            set: vi.fn(),
            setMany: vi.fn(),
            delete: vi.fn(),
            list: vi.fn(),
        } as unknown as JsonDatabase;

        repository = new UserRepository(mockDb);
    });

    describe("constructor", () => {
        it("should initialize with correct collection name", () => {
            expect(repository).toBeInstanceOf(UserRepository);
        });
    });

    describe("get", () => {
        it("should retrieve a user by ID", async () => {
            const mockUser: UserEntity = {
                id: "123",
                name: "Test User",
                email: "test@example.com",
                role: "Admin",
            };

            vi.mocked(mockDb.get).mockResolvedValue(mockUser);

            const result = await repository.get("123");

            expect(mockDb.get).toHaveBeenCalledWith("users", "123");
            expect(result).toEqual(mockUser);
        });

        it("should return null when user not found", async () => {
            vi.mocked(mockDb.get).mockResolvedValue(null);

            const result = await repository.get("999");

            expect(result).toBeNull();
        });
    });

    describe("save", () => {
        it("should save a user entity", async () => {
            const user: UserEntity = {
                id: "123",
                name: "Test User",
                email: "test@example.com",
                role: "Admin",
            };

            await repository.save(user);

            expect(mockDb.set).toHaveBeenCalledWith("users", user);
        });
    });

    describe("saveMany", () => {
        it("should save multiple user entities", async () => {
            const users: UserEntity[] = [
                {
                    id: "123",
                    name: "User 1",
                    email: "user1@example.com",
                    role: "Admin",
                },
                {
                    id: "456",
                    name: "User 2",
                    email: "user2@example.com",
                    role: "Participant",
                },
            ];

            await repository.saveMany(users);

            expect(mockDb.setMany).toHaveBeenCalledWith("users", users);
        });
    });

    describe("delete", () => {
        it("should delete a user by ID", async () => {
            vi.mocked(mockDb.delete).mockResolvedValue(true);

            const result = await repository.delete("123");

            expect(mockDb.delete).toHaveBeenCalledWith("users", "123");
            expect(result).toBe(true);
        });

        it("should return false when user not found", async () => {
            vi.mocked(mockDb.delete).mockResolvedValue(false);

            const result = await repository.delete("999");

            expect(result).toBe(false);
        });
    });

    describe("list", () => {
        it("should list all users", async () => {
            const mockUsers: UserEntity[] = [
                {
                    id: "123",
                    name: "User 1",
                    email: "user1@example.com",
                    role: "Admin",
                },
                {
                    id: "456",
                    name: "User 2",
                    email: "user2@example.com",
                    role: "Participant",
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockUsers);

            const result = await repository.list();

            expect(mockDb.list).toHaveBeenCalledWith("users", undefined);
            expect(result).toEqual(mockUsers);
        });

        it("should list users with filter options", async () => {
            const filterOptions = {
                filter: (user: UserEntity) => user.role === "Admin",
            };

            await repository.list(filterOptions);

            expect(mockDb.list).toHaveBeenCalledWith("users", filterOptions);
        });
    });

    describe("findBy", () => {
        it("should find users by field value", async () => {
            const mockUsers: UserEntity[] = [
                {
                    id: "123",
                    name: "Admin User",
                    email: "admin@example.com",
                    role: "Admin",
                },
            ];

            vi.mocked(mockDb.list).mockResolvedValue(mockUsers);

            const result = await repository.findBy("role", "Admin");

            expect(mockDb.list).toHaveBeenCalled();
            expect(result).toEqual(mockUsers);
        });
    });
});
