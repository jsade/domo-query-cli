import chalk from "chalk";
import { listAuditLogs } from "../api/clients/domoClient";
import type { AuditEntry } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { TerminalFormatter } from "../utils/terminalFormatter";
import {
    parseTimeExpression,
    TimeParseError,
    formatTimestamp,
} from "../utils/dateUtils";
import { BaseCommand } from "./BaseCommand";

/**
 * Lists audit log entries from Domo with time range filtering
 */
export class ListAuditLogsCommand extends BaseCommand {
    public readonly name = "list-audit-logs";
    public readonly description =
        "Lists audit log entries from Domo with time range filtering";
    private auditLogs: AuditEntry[] = [];

    /**
     * Getter for the audit logs list
     */
    public getAuditLogs(): AuditEntry[] {
        return this.auditLogs;
    }

    /**
     * Executes the list-audit-logs command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            // Parse required time parameters
            let startTime: number;
            let endTime: number;

            try {
                if (!parsed.params.start) {
                    throw new TimeParseError(
                        "start",
                        "Start time is required (use --start)",
                    );
                }
                if (!parsed.params.end) {
                    throw new TimeParseError(
                        "end",
                        "End time is required (use --end)",
                    );
                }

                startTime = parseTimeExpression(String(parsed.params.start));
                endTime = parseTimeExpression(String(parsed.params.end));

                // Validate time range
                if (startTime >= endTime) {
                    throw new TimeParseError(
                        `${parsed.params.start} to ${parsed.params.end}`,
                        "Start time must be before end time",
                    );
                }
            } catch (error) {
                if (error instanceof TimeParseError) {
                    this.outputErrorResult({ message: error.message }, () => {
                        console.error(TerminalFormatter.error(error.message));
                        console.error(
                            '\nUse --help for examples of valid time expressions (e.g., "24h ago", "yesterday", ISO dates)',
                        );
                    });
                    return;
                }
                throw error;
            }

            // Parse optional parameters
            const limit = parsed.params.limit
                ? Math.min(Number(parsed.params.limit), 1000)
                : 100;
            const offset = parsed.params.offset
                ? Number(parsed.params.offset)
                : 0;
            const objectType = parsed.params.type
                ? String(parsed.params.type)
                : undefined;
            const user = parsed.params.user
                ? String(parsed.params.user)
                : undefined;

            // Fetch audit logs
            this.auditLogs = await listAuditLogs({
                start: startTime,
                end: endTime,
                limit,
                offset,
                objectType,
                user,
            });

            // Build metadata
            const metadata: Record<string, unknown> = {
                count: this.auditLogs.length,
                timeRange: {
                    start: formatTimestamp(startTime),
                    end: formatTimestamp(endTime),
                },
                pagination: {
                    offset,
                    limit,
                    hasMore: this.auditLogs.length === limit,
                },
            };

            if (objectType) {
                metadata.filter = { objectType };
            }
            if (user) {
                metadata.filter = {
                    ...((metadata.filter as Record<string, unknown>) || {}),
                    user,
                };
            }

            // Use unified output
            await this.output(
                {
                    success: true,
                    data: { auditLogs: this.auditLogs },
                    metadata,
                },
                () => this.displayTable(startTime, endTime, objectType, user),
                "audit-logs",
            );
        } catch (error) {
            log.error("Error fetching audit logs:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch audit logs";
            this.outputErrorResult({ message }, () => {
                console.error(
                    TerminalFormatter.error("Failed to fetch audit logs."),
                );
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                console.error("Check your authentication and try again.");
            });
        }
    }

    /**
     * Display audit logs in table format
     */
    private displayTable(
        startTime: number,
        endTime: number,
        objectType?: string,
        user?: string,
    ): void {
        if (this.auditLogs.length === 0) {
            console.log("No audit logs found for the specified criteria.");
            return;
        }

        const filters = [];
        if (objectType) filters.push(`type: ${objectType}`);
        if (user) filters.push(`user: ${user}`);
        const filterStr = filters.length > 0 ? ` (${filters.join(", ")})` : "";

        console.log(`\n${this.auditLogs.length} audit log entries${filterStr}`);
        console.log(
            `Time range: ${formatTimestamp(startTime, "local")} to ${formatTimestamp(endTime, "local")}`,
        );

        // Prepare data for table
        const tableData = this.auditLogs.map(entry => ({
            Time: formatTimestamp(entry.time, "local"),
            User:
                entry.userName.length > 20
                    ? entry.userName.substring(0, 17) + "..."
                    : entry.userName,
            Action: entry.actionType,
            Object: entry.objectType,
            Event:
                entry.eventText.length > 50
                    ? entry.eventText.substring(0, 47) + "..."
                    : entry.eventText,
        }));

        console.log(TerminalFormatter.table(tableData));
        console.log(`\nTotal: ${this.auditLogs.length} entries`);
    }

    /**
     * Shows help for the list-audit-logs command
     */
    public showHelp(): void {
        console.log(
            "Lists audit log entries from Domo with time range filtering",
        );
        console.log(
            "\nUsage: list-audit-logs --start <time> --end <time> [options]",
        );

        console.log(chalk.cyan("\nRequired Options:"));
        const requiredData = [
            {
                Option: "--start <time>",
                Description:
                    'Start time (e.g., "24h ago", "yesterday", "2024-01-15")',
            },
            {
                Option: "--end <time>",
                Description: 'End time (e.g., "now", "2024-01-16T23:59:59")',
            },
        ];
        console.log(TerminalFormatter.table(requiredData));

        console.log(chalk.cyan("\nOptional Filters:"));
        const filtersData = [
            {
                Option: "--type <type>",
                Description: "Filter by object type (e.g., DATASET, CARD)",
            },
            {
                Option: "--user <name>",
                Description: "Filter by username",
            },
            {
                Option: "--limit N",
                Description: "Max results (max 1000, default: 100)",
            },
            {
                Option: "--offset N",
                Description: "Pagination offset (default: 0)",
            },
        ];
        console.log(TerminalFormatter.table(filtersData));

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

        console.log(chalk.cyan("\nTime Expression Formats:"));
        const timeFormatsData = [
            {
                Format: "Relative",
                Example: '"24h ago", "7d ago", "30m ago", "2w ago"',
            },
            {
                Format: "Keywords",
                Example: '"now", "today", "yesterday"',
            },
            {
                Format: "ISO Date",
                Example: '"2024-01-15", "2024-01-15T10:30:00"',
            },
            {
                Format: "Timestamp",
                Example: '"1704067200000" (milliseconds)',
            },
        ];
        console.log(TerminalFormatter.table(timeFormatsData));

        console.log(chalk.cyan("\nExamples:"));
        const examplesData = [
            {
                Command: 'list-audit-logs --start "24h ago" --end "now"',
                Description: "Last 24 hours of activity",
            },
            {
                Command: 'list-audit-logs --start "yesterday" --end "today"',
                Description: "Yesterday's activity",
            },
            {
                Command:
                    'list-audit-logs --start "7d ago" --end "now" --type DATASET',
                Description: "Dataset changes in last week",
            },
            {
                Command:
                    'list-audit-logs --start "2024-01-01" --end "2024-01-31" --user john',
                Description: "John's activity in January",
            },
            {
                Command:
                    'list-audit-logs --start "24h ago" --end "now" --limit 500',
                Description: "Last 24h with higher limit",
            },
            {
                Command:
                    'list-audit-logs --start "7d ago" --end "now" --format json',
                Description: "Output as JSON",
            },
        ];
        console.log(TerminalFormatter.table(examplesData));

        console.log(
            chalk.yellow("\nNote:") +
                " Requires OAuth authentication with 'audit' scope",
        );
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--start",
            "--end",
            "--type",
            "--user",
            "--limit",
            "--offset",
            "--format",
            "--export",
            "--export-path",
            "--output",
            "--quiet",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
