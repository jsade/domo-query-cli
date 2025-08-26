import * as esbuild from "esbuild";
import { writeFileSync, readFileSync } from "fs";

// Build MCP server as a standalone executable
await esbuild.build({
    entryPoints: ["mcp/mcp-server.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile: "mcp/dist/mcp-server.cjs",
    // Bundle everything including MCP SDK
    external: [],
    sourcemap: true,
    minify: false,
    logLevel: "info",
});

// Add shebang after build
const content = readFileSync("mcp/dist/mcp-server.cjs", "utf-8");
writeFileSync("mcp/dist/mcp-server.cjs", `#!/usr/bin/env node\n${content}`);

console.log("MCP server built successfully at mcp/dist/mcp-server.cjs");
