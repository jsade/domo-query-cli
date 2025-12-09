import chalk from "chalk";
import { listAuditObjectTypes } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists available audit log object types for filtering
 */
export class ListAuditObjectTypesCommand extends BaseCommand {
    public readonly name = "list-audit-object-types";
    public readonly description =
        "Lists available audit log object types for filtering";
    private objectTypes: string[] = [];

    /**
     * Getter for the object types list
     */
    public getObjectTypes(): string[] {
        return this.objectTypes;
    }

    /**
     * Executes the list-audit-object-types command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            this.parseOutputConfig(args);

            // Fetch object types
            this.objectTypes = await listAuditObjectTypes();

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.objectTypes.length,
            };

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { objectTypes: this.objectTypes },
                    metadata,
                },
                () => this.displayTable(),
                "audit-object-types",
            );
        } catch (error) {
            log.error("Error fetching audit object types:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch audit object types";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error(
                        "Failed to fetch audit object types.",
                    ),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display object types in table format
     */
    private displayTable(): void {
        if (this.objectTypes.length === 0) {
            console.log("No audit object types found.");
            return;
        }

        console.log(`\n${this.objectTypes.length} audit object types`);

        // Sort alphabetically for easier reading
        const sortedTypes = [...this.objectTypes].sort();

        // Prepare data for table with index
        const tableData = sortedTypes.map((type, index) => ({
            "#": index + 1,
            "Object Type": type,
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(`\nTotal: ${this.objectTypes.length} types`);
        console.log(
            chalk.gray("\nUse these types with list-audit-logs --type <type>"),
        );
    }

    /**
     * Shows help for the list-audit-object-types command
     */
    public showHelp(): void {
        console.log("Lists available audit log object types for filtering");
        console.log("\nUsage: list-audit-object-types [options]");

        console.log(chalk.cyan("\nOutput Options:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            {
                Option: "--export=md",
                Description: "Export as Markdown",
            },
            {
                Option: "--export=both",
                Description: "Export both formats",
            },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            {
                Option: "--quiet",
                Description: "Suppress export messages",
            },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: "list-audit-object-types",
                Description: "List all object types (table format)",
            },
            {
                Command: "list-audit-object-types --format json",
                Description: "Output as JSON",
            },
            {
                Command: "list-audit-object-types --export",
                Description: "Export to JSON file",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(
            chalk.yellow("\nNote:") +
                " Requires OAuth authentication with 'audit' scope",
        );
        console.log(
            chalk.gray(
                "\nUse these types with: list-audit-logs --start <time> --end <time> --type <type>",
            ),
        );
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--format",
            "--export",
            "--export-path",
            "--output",
            "--quiet",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
