import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomoShell } from "./shell.ts";
//import * as domoClient from "./domoClient";

vi.mock("./domoClient.js", () => ({
    listCards: vi.fn(),
    listPages: vi.fn(),
    renderKpiCard: vi.fn(),
}));

vi.mock("inquirer", () => ({
    default: {
        prompt: vi.fn(),
    },
}));

vi.mock("fs/promises", () => ({
    default: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
    },
}));

describe("DomoShell", () => {
    let shell: DomoShell;

    beforeEach(() => {
        shell = new DomoShell();
        vi.clearAllMocks();
    });

    it("should instantiate", () => {
        expect(shell).toBeDefined();
    });

    // Add more tests as needed
});
