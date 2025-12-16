import * as esbuild from "esbuild";
import { readFileSync } from "fs";

// Read version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

// Build main CLI
await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile: "dist/main.cjs",
    // Don't mark dependencies as external - bundle them
    external: [],
    sourcemap: true,
    minify: false,
    logLevel: "info",
    define: {
        "process.env.APP_VERSION": JSON.stringify(packageJson.version),
    },
});
