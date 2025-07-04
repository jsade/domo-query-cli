import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.mjs";

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            watch: false,
            coverage: {
                reporter: ["text", "json-summary", "json"],
            },
        },
    }),
);
