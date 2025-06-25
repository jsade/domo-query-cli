import * as esbuild from "esbuild";
import { readFileSync } from "fs";

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const external = Object.keys(pkg.dependencies || {});

await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile: "dist/main.js",
    external: external,
    sourcemap: true,
    minify: false,
    logLevel: "info",
});
