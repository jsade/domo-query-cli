import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { UpdateDatasetPropertiesCommand } from "./UpdateDatasetPropertiesCommand";
import * as domoClient from "../api/clients/domoClient";
import * as logger from "../utils/logger";
import fs from "fs/promises";

// Mock dependencies
vi.mock("../api/clients/domoClient");
vi.mock("../utils/logger");
vi.mock("fs/promises");

describe("UpdateDatasetPropertiesCommand", () => {
    let command: UpdateDatasetPropertiesCommand;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        command = new UpdateDatasetPropertiesCommand();
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        vi.clearAllMocks();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe("constructor", () => {
        it("should have correct name and description", () => {
            expect(command.name).toBe("update-dataset-properties");
            expect(command.description).toBe(
                "Updates properties (name, description, tags) of a specific dataset",
            );
        });
    });

    describe("execute", () => {
        it("should fail when no dataset ID is provided", async () => {
            await command.execute([]);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "No dataset ID provided.",
            );
        });

        it("should fail when no properties are provided", async () => {
            await command.execute(["dataset-123", "--format=json"]);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"NO_PROPERTIES"'),
            );
        });

        it("should update dataset with name property", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "New Dataset Name",
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                "--name=New Dataset Name",
                "--no-confirm",
            ]);

            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                { name: "New Dataset Name" },
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "✓ Dataset properties updated successfully",
                ),
            );
        });

        it("should update dataset with description property", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "Dataset",
                description: "New description",
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                "--description=New description",
                "--no-confirm",
            ]);

            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                { description: "New description" },
            );
        });

        it("should update dataset with tags as comma-separated list", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "Dataset",
                tags: ["tag1", "tag2", "tag3"],
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                "--tags=tag1,tag2,tag3",
                "--no-confirm",
            ]);

            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                { tags: ["tag1", "tag2", "tag3"] },
            );
        });

        it("should update dataset with tags as JSON array", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "Dataset",
                tags: ["tag1", "tag2"],
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                '--tags=["tag1","tag2"]',
                "--no-confirm",
            ]);

            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                { tags: ["tag1", "tag2"] },
            );
        });

        it("should update dataset with inline JSON", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "Updated Name",
                description: "Updated description",
                tags: ["new-tag"],
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            const jsonInput = JSON.stringify({
                name: "Updated Name",
                description: "Updated description",
                tags: ["new-tag"],
            });

            await command.execute([
                "dataset-123",
                `--json=${jsonInput}`,
                "--no-confirm",
            ]);

            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                {
                    name: "Updated Name",
                    description: "Updated description",
                    tags: ["new-tag"],
                },
            );
        });

        it("should update dataset from JSON file", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "File Name",
                description: "File description",
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            const fileContent = JSON.stringify({
                name: "File Name",
                description: "File description",
            });

            vi.mocked(fs.readFile).mockResolvedValue(fileContent);
            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                "--json-file=properties.json",
                "--no-confirm",
            ]);

            expect(fs.readFile).toHaveBeenCalledWith(
                "properties.json",
                "utf-8",
            );
            expect(domoClient.updateDatasetProperties).toHaveBeenCalledWith(
                "dataset-123",
                {
                    name: "File Name",
                    description: "File description",
                },
            );
        });

        it("should fail with invalid JSON", async () => {
            await command.execute(["dataset-123", "--json={invalid json}"]);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid JSON format");
        });

        it("should fail when JSON file cannot be read", async () => {
            vi.mocked(fs.readFile).mockRejectedValue(
                new Error("File not found"),
            );

            await command.execute([
                "dataset-123",
                "--json-file=nonexistent.json",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to read JSON file"),
            );
        });

        it("should validate name length", async () => {
            const longName = "a".repeat(256);
            await command.execute([
                "dataset-123",
                `--name=${longName}`,
                "--no-confirm",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Validation error: Name cannot exceed 255 characters",
            );
            expect(domoClient.updateDatasetProperties).not.toHaveBeenCalled();
        });

        it("should validate name for invalid characters", async () => {
            await command.execute([
                "dataset-123",
                "--name=<script>alert('xss')</script>",
                "--no-confirm",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Validation error: Name contains invalid characters (<>'\")",
            );
            expect(domoClient.updateDatasetProperties).not.toHaveBeenCalled();
        });

        it("should validate description length", async () => {
            const longDesc = "a".repeat(1001);
            await command.execute([
                "dataset-123",
                `--description=${longDesc}`,
                "--no-confirm",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Validation error: Description cannot exceed 1000 characters",
            );
            expect(domoClient.updateDatasetProperties).not.toHaveBeenCalled();
        });

        it("should validate tags format", async () => {
            await command.execute([
                "dataset-123",
                "--tags=valid-tag,invalid@tag",
                "--no-confirm",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Tag "invalid@tag" contains invalid characters',
                ),
            );
            expect(domoClient.updateDatasetProperties).not.toHaveBeenCalled();
        });

        it("should validate tag length", async () => {
            const longTag = "a".repeat(51);
            await command.execute([
                "dataset-123",
                `--tags=${longTag}`,
                "--no-confirm",
            ]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    `Tag "${longTag}" exceeds 50 characters`,
                ),
            );
            expect(domoClient.updateDatasetProperties).not.toHaveBeenCalled();
        });

        it("should handle API errors gracefully", async () => {
            vi.mocked(domoClient.updateDatasetProperties).mockRejectedValue(
                new Error("API Error: Dataset not found"),
            );

            await command.execute([
                "dataset-123",
                "--name=New Name",
                "--no-confirm",
            ]);

            expect(logger.log.error).toHaveBeenCalledWith(
                "Error updating dataset properties:",
                expect.any(Error),
            );
        });

        it("should output JSON format when requested", async () => {
            const mockDataset = {
                id: "dataset-123",
                name: "New Name",
                rows: 100,
                columns: 5,
                createdAt: "2024-01-01",
                updatedAt: "2024-01-02",
            };

            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                mockDataset,
            );

            await command.execute([
                "dataset-123",
                "--name=New Name",
                "--format=json",
                "--no-confirm",
            ]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"success": true'),
            );
        });

        it("should handle null response from API", async () => {
            vi.mocked(domoClient.updateDatasetProperties).mockResolvedValue(
                null,
            );

            await command.execute([
                "dataset-123",
                "--name=New Name",
                "--no-confirm",
            ]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Failed to update dataset properties.",
            );
        });
    });

    describe("showHelp", () => {
        it("should display help information", () => {
            command.showHelp();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Updates properties of a specific dataset",
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Usage:"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--name"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--description"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--tags"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--json"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("--json-file"),
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Examples:"),
            );
        });
    });
});
