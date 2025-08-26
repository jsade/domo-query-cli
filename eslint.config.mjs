import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import tsdoc from "eslint-plugin-tsdoc";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
    // Global ignores - replaces .eslintignore
    {
        ignores: [
            "node_modules/**",
            ".yarn/**",
            "dist/**",
            "mcp/dist/**",
            "build/**",
            "coverage/**",
            ".pnp.*",
            "dataflow_docs/**",
            "src/types/**/**",
            ".claude/**",
            ".vscode/**",
            "*.md",
            "eslint.config.mjs",
        ],
    },
    // Markdown files
    {
        files: ["**/*.{md,mdx}"],
        plugins: { markdown },
        language: "markdown/gfm",
        languageOptions: {
            frontmatter: "yaml",
        },
        rules: {
            ...markdown.configs.recommended.rules,
        },
    },
    // JSON files
    {
        files: ["**/*.{json}"],
        plugins: { json },
        ignores: ["package-lock.json", "prettierrc.json", ".vscode/**"],
        rules: {
            "json/no-duplicate-keys": "error",
            ...json.configs.recommended.rules,
        },
    },
    // JavaScript files
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: { js },
        linterOptions: {
            reportUnusedDisableDirectives: true,
        },
        rules: js.configs.recommended.rules,
    },
    // Browser globals
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: { globals: globals.browser },
    },
    // TypeScript files (main src)
    {
        files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
        plugins: {
            "@typescript-eslint": tseslint,
            tsdoc: tsdoc,
        },
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: "./tsconfig.json",
            },
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "tsdoc/syntax": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                },
            ],
        },
    },
    // TypeScript files (MCP)
    {
        files: ["mcp/**/*.ts"],
        plugins: {
            "@typescript-eslint": tseslint,
            tsdoc: tsdoc,
        },
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: "./tsconfig.mcp.json",
            },
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "tsdoc/syntax": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                },
            ],
        },
    },
    // Prettier integration - MUST BE LAST
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            ...prettierConfig.rules, // This disables conflicting ESLint rules
            "prettier/prettier": "error",
        },
    },
]);
