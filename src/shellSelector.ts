import DomoShellWithTabComplete from "./DomoShellWithTabComplete.ts";

/**
 * Starts the shell with Tab Completion interface
 */
export async function selectAndStartShell(): Promise<void> {
    // Always use Tab Completion
    const shell = new DomoShellWithTabComplete();
    await shell.start();
}
