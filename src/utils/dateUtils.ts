/**
 * Date utilities for parsing time expressions
 * Used primarily by audit log commands for flexible time range filtering
 */

/**
 * Error thrown when a time expression cannot be parsed
 */
export class TimeParseError extends Error {
    constructor(expression: string, reason?: string) {
        const message = reason
            ? `Invalid time expression '${expression}': ${reason}`
            : `Invalid time expression '${expression}'`;
        super(message);
        this.name = "TimeParseError";
    }
}

/**
 * Parse a user-friendly time expression into a timestamp (milliseconds since epoch)
 *
 * Supported formats:
 * - Relative: "24h ago", "7d ago", "30m ago", "2w ago"
 * - Keywords: "now", "today", "yesterday"
 * - ISO date: "2024-01-15", "2024-01-15T10:30:00"
 * - Timestamp: "1704067200000" (milliseconds)
 *
 * @param expression - The time expression to parse
 * @returns Timestamp in milliseconds since epoch
 * @throws TimeParseError if the expression cannot be parsed
 */
export function parseTimeExpression(expression: string): number {
    const trimmed = expression.trim().toLowerCase();
    const now = Date.now();

    // Handle keywords
    if (trimmed === "now") {
        return now;
    }

    if (trimmed === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.getTime();
    }

    if (trimmed === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return yesterday.getTime();
    }

    // Handle relative expressions (e.g., "24h ago", "7d ago")
    const relativeMatch = trimmed.match(/^(\d+)\s*(m|h|d|w)\s*ago$/);
    if (relativeMatch) {
        const value = parseInt(relativeMatch[1], 10);
        const unit = relativeMatch[2];

        const multipliers: Record<string, number> = {
            m: 60 * 1000, // minutes
            h: 60 * 60 * 1000, // hours
            d: 24 * 60 * 60 * 1000, // days
            w: 7 * 24 * 60 * 60 * 1000, // weeks
        };

        return now - value * multipliers[unit];
    }

    // Handle numeric timestamp (milliseconds)
    if (/^\d{13}$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    // Handle numeric timestamp (seconds) - convert to milliseconds
    if (/^\d{10}$/.test(trimmed)) {
        return parseInt(trimmed, 10) * 1000;
    }

    // Handle ISO date strings
    const isoDate = new Date(expression.trim());
    if (!isNaN(isoDate.getTime())) {
        return isoDate.getTime();
    }

    throw new TimeParseError(
        expression,
        'Expected relative (e.g., "24h ago"), keyword ("today", "yesterday"), ISO date, or timestamp',
    );
}

/**
 * Validate that a time range is valid (start before end)
 *
 * @param start - Start timestamp in milliseconds
 * @param end - End timestamp in milliseconds
 * @throws TimeParseError if start is greater than or equal to end
 */
export function validateTimeRange(start: number, end: number): void {
    if (start >= end) {
        throw new TimeParseError(
            `${start} to ${end}`,
            "Start time must be before end time",
        );
    }
}

/**
 * Format a timestamp for display
 *
 * @param timestamp - Timestamp in milliseconds since epoch
 * @param format - Output format: "iso" (default), "local", or "relative"
 * @returns Formatted date string
 */
export function formatTimestamp(
    timestamp: number,
    format: "iso" | "local" | "relative" = "iso",
): string {
    const date = new Date(timestamp);

    switch (format) {
        case "local":
            return date.toLocaleString();
        case "relative":
            return formatRelativeTime(timestamp);
        case "iso":
        default:
            return date.toISOString();
    }
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) {
        return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    }
    if (days > 0) {
        return `${days} day${days === 1 ? "" : "s"} ago`;
    }
    if (hours > 0) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    return "just now";
}

/**
 * Get the start of the current day in milliseconds
 */
export function getStartOfDay(date: Date = new Date()): number {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
}

/**
 * Get the end of the current day in milliseconds
 */
export function getEndOfDay(date: Date = new Date()): number {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
}
