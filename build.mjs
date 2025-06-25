#!/usr/bin/env node
import { execSync } from "child_process";
import { copyFileSync, mkdirSync, rmSync, existsSync } from "fs";
import process from "process";

console.log("🔨 Building Domo Query CLI...\n");

// Clean previous builds
console.log("Cleaning previous builds...");
if (existsSync("dist")) rmSync("dist", { recursive: true, force: true });
if (existsSync("release")) rmSync("release", { recursive: true, force: true });

// Create directories
mkdirSync("dist", { recursive: true });
mkdirSync("release", { recursive: true });

// Build TypeScript
console.log("Compiling TypeScript...");
execSync("yarn build", {
    stdio: "inherit",
});

// Ensure .env.example exists in the project root
if (!existsSync(".env.example")) {
    console.error("ERROR: .env.example not found in project root!");
    process.exit(1);
}

// Copy necessary files
console.log("Copying configuration files...");
copyFileSync(".env.example", "dist/.env.example");

// Ensure pkg is available
console.log("Ensuring pkg is available...");

// Package for different platforms
console.log("\nCreating executables...");
const platforms = [
    { target: "node18-macos-arm64", output: "domo-query-cli" },
    { target: "node18-win-x64", output: "domo-query-cli.exe" },
    { target: "node18-linux-x64", output: "domo-query-cli" },
];

for (const platform of platforms) {
    console.log(`Building for ${platform.target}...`);
    try {
        execSync(
            `npx pkg dist/main.js -t ${platform.target} -o release/${platform.output} --compress GZip`,
            {
                stdio: "inherit",
            },
        );
    } catch (error) {
        console.error(`Failed to build for ${platform.target}:`, error.message);
    }
}

// Copy README.md to release directory
console.log("\nCopying README to distribution...");
if (existsSync("README.md")) {
    copyFileSync("README.md", "release/README.md");
} else {
    console.error("ERROR: README.md not found in project root!");
    process.exit(1);
}

// Copy .env.example to release
copyFileSync(".env.example", "release/.env.example");

// Create distribution archives
console.log("\nCreating distribution archives...");
const archivePlatforms = [
    {
        name: "macos-arm64",
        files: ["domo-query-cli", ".env.example", "README.md"],
        binaryName: "domo-query-cli",
    },
    {
        name: "windows",
        files: ["domo-query-cli.exe", ".env.example", "README.md"],
        binaryName: "domo-query-cli.exe",
    },
    {
        name: "linux",
        files: ["domo-query-cli", ".env.example", "README.md"],
        binaryName: "domo-query-cli",
    },
];

// Check if we're in CI environment and zip is available
const isCI = process.env.CI === "true";

process.chdir("release");
for (const archive of archivePlatforms) {
    const fileName = `domo-query-cli-${archive.name}.zip`;
    console.log(`Creating ${fileName}...`);

    // Check if all required files exist
    const missingFiles = archive.files.filter(file => !existsSync(file));
    if (missingFiles.length > 0) {
        console.warn(
            `Skipping ${fileName} - missing files: ${missingFiles.join(", ")}`,
        );
        continue;
    }

    try {
        // Create a temporary directory for this archive
        const tempDir = `temp-${archive.name}`;
        mkdirSync(tempDir, { recursive: true });

        // Copy files to temp directory with renamed binary
        for (const file of archive.files) {
            if (file.startsWith("domo-query-cli")) {
                // This is the binary, rename it
                copyFileSync(file, `${tempDir}/${archive.binaryName}`);
            } else {
                // Copy other files as-is
                copyFileSync(file, `${tempDir}/${file}`);
            }
        }

        if (process.platform === "win32" && !isCI) {
            execSync(
                `powershell Compress-Archive -Path ${tempDir}/* -DestinationPath ${fileName} -Force`,
                { stdio: "inherit" },
            );
        } else {
            // Use zip command (available on most Unix systems and CI environments)
            execSync(`cd ${tempDir} && zip -q ../${fileName} *`, {
                stdio: "inherit",
                shell: true,
            });
        }

        // Clean up temp directory
        rmSync(tempDir, { recursive: true, force: true });

        console.log(`✓ Created ${fileName}`);
    } catch (error) {
        console.error(`Failed to create archive ${fileName}:`, error.message);
        // In CI, try using Node.js based archiving as fallback
        if (isCI) {
            console.log("Attempting Node.js based archiving...");
            try {
                // Create a temporary directory for this archive
                const tempDir = `temp-${archive.name}`;
                mkdirSync(tempDir, { recursive: true });

                // Copy files to temp directory with renamed binary
                for (const file of archive.files) {
                    if (file.startsWith("domo-query-cli")) {
                        // This is the binary, rename it
                        copyFileSync(file, `${tempDir}/${archive.binaryName}`);
                    } else {
                        // Copy other files as-is
                        copyFileSync(file, `${tempDir}/${file}`);
                    }
                }

                execSync(
                    `cd ${tempDir} && npx archiver-cli * -o ../${fileName}`,
                    {
                        stdio: "inherit",
                        shell: true,
                    },
                );

                // Clean up temp directory
                rmSync(tempDir, { recursive: true, force: true });

                console.log(`✓ Created ${fileName} using archiver-cli`);
            } catch (fallbackError) {
                console.error(`Fallback also failed:`, fallbackError.message);
            }
        }
    }
}
process.chdir("..");

console.log(
    "\n✅ Build complete! Check the release/ directory for executables and archives.",
);
console.log(
    "\nTo share via Slack, use the .zip files in the release/ directory.",
);
