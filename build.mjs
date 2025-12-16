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

// Detect current platform and architecture
function getCurrentPlatform() {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "darwin") {
        if (arch === "arm64") {
            return {
                target: "node18-macos-arm64",
                output: "domo-query-cli",
                name: "macos-arm64",
            };
        } else {
            return {
                target: "node18-macos-x64",
                output: "domo-query-cli",
                name: "macos-x64",
            };
        }
    } else if (platform === "win32") {
        return {
            target: "node18-win-x64",
            output: "domo-query-cli.exe",
            name: "windows",
        };
    } else if (platform === "linux") {
        if (arch === "arm64") {
            return {
                target: "node18-linux-arm64",
                output: "domo-query-cli",
                name: "linux-arm64",
            };
        } else {
            return {
                target: "node18-linux-x64",
                output: "domo-query-cli",
                name: "linux",
            };
        }
    } else {
        console.error(`Unsupported platform: ${platform} ${arch}`);
        process.exit(1);
    }
}

// Package for current platform only
console.log("\nCreating executable for current platform...");
const currentPlatform = getCurrentPlatform();
console.log(
    `Building for ${currentPlatform.target} (${process.platform} ${process.arch})...`,
);

try {
    execSync(
        `npx pkg dist/main.cjs -t ${currentPlatform.target} -o release/${currentPlatform.output} --compress GZip`,
        {
            stdio: "inherit",
        },
    );
    console.log(`✓ Built ${currentPlatform.output}`);
} catch (error) {
    console.error(
        `Failed to build for ${currentPlatform.target}:`,
        error.message,
    );
    process.exit(1);
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

// Create distribution archive for current platform
console.log("\nCreating distribution archive...");
const archive = {
    name: currentPlatform.name,
    files: [currentPlatform.output, ".env.example", "README.md"],
    binaryName: currentPlatform.output,
};

// Check if we're in CI environment and zip is available
const isCI = process.env.CI === "true";

process.chdir("release");
const fileName = `domo-query-cli-${archive.name}.zip`;
console.log(`Creating ${fileName}...`);

// Check if all required files exist
const missingFiles = archive.files.filter(file => !existsSync(file));
if (missingFiles.length > 0) {
    console.error(
        `Cannot create archive - missing files: ${missingFiles.join(", ")}`,
    );
    process.exit(1);
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

            execSync(`cd ${tempDir} && npx archiver-cli * -o ../${fileName}`, {
                stdio: "inherit",
                shell: true,
            });

            // Clean up temp directory
            rmSync(tempDir, { recursive: true, force: true });

            console.log(`✓ Created ${fileName} using archiver-cli`);
        } catch (fallbackError) {
            console.error(`Fallback also failed:`, fallbackError.message);
        }
    }
}
process.chdir("..");

console.log(
    `\n✅ Build complete! Built for ${currentPlatform.name} (${process.platform} ${process.arch})`,
);
console.log(`\nExecutable: release/${currentPlatform.output}`);
console.log(`Archive: release/${fileName}`);
