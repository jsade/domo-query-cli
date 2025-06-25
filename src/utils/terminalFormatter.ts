import chalk from "chalk";

const UI_TABLE_MAX_SIZE = 120;

/**
 * Utility class for consistent terminal formatting across commands
 */
export class TerminalFormatter {
    /**
     * Formats data as a table with responsive columns
     * @param data - Array of objects to display
     * @param options - Optional table configuration
     * @returns Formatted table string
     */
    static table(
        data: Record<string, unknown>[],
        options?: {
            head?: string[];
            colWidths?: number[];
            showHeaders?: boolean;
            borderless?: boolean;
        },
    ): string {
        if (data.length === 0) {
            return "No data to display";
        }

        // Get headers from first object if not provided
        const headers = options?.head || Object.keys(data[0]);
        const showHeaders = options?.showHeaders !== false;
        const borderless = options?.borderless === true;

        // Calculate column widths
        const colWidths: number[] = headers.map((header, index) => {
            const headerWidth = showHeaders ? header.length : 0;
            const maxDataWidth = Math.max(
                ...data.map(row => String(row[header] || "").length),
            );
            return (
                options?.colWidths?.[index] ||
                Math.max(headerWidth, maxDataWidth) + 2
            );
        });

        // Calculate max width for last column to respect UI_TABLE_MAX_SIZE
        const lastColIndex = colWidths.length - 1;
        if (lastColIndex >= 0) {
            // Calculate total width of all columns except the last one
            // Include separators: " │ " = 3 chars between columns
            const separatorWidth = borderless ? 2 : 3;
            const totalWidthExceptLast =
                colWidths.slice(0, -1).reduce((sum, width) => sum + width, 0) +
                (colWidths.length - 1) * separatorWidth;

            // Calculate maximum allowed width for last column
            const maxLastColWidth = UI_TABLE_MAX_SIZE - totalWidthExceptLast;

            // Apply the constraint only if it would reduce the width
            if (
                maxLastColWidth > 0 &&
                colWidths[lastColIndex] > maxLastColWidth
            ) {
                colWidths[lastColIndex] = maxLastColWidth;
            }
        }

        // Build table
        const lines: string[] = [];

        // Header (if enabled)
        if (showHeaders) {
            const headerLine = headers
                .map((header, i) => {
                    // Don't pad the last column
                    const isLastColumn = i === headers.length - 1;
                    return chalk.bold(
                        isLastColumn ? header : header.padEnd(colWidths[i]),
                    );
                })
                .join(borderless ? "  " : " │ ");
            lines.push(headerLine);

            // Separator (if not borderless)
            if (!borderless) {
                const separator = colWidths
                    .map((width, i) => {
                        // For the last column, use the actual header length instead of padded width
                        const isLastColumn = i === colWidths.length - 1;
                        const actualWidth = isLastColumn
                            ? headers[i].length
                            : width;
                        return "─".repeat(actualWidth);
                    })
                    .join("─┼─");
                lines.push(separator);
            }
        }

        // Data rows
        data.forEach(row => {
            const rowLine = headers
                .map((header, i) => {
                    let value = String(row[header] || "");
                    const isLastColumn = i === headers.length - 1;

                    // Truncate if exceeds column width
                    if (value.length > colWidths[i]) {
                        value = value.substring(0, colWidths[i] - 3) + "...";
                    }

                    // Don't pad the last column
                    return isLastColumn ? value : value.padEnd(colWidths[i]);
                })
                .join(borderless ? "  " : " │ ");
            lines.push(rowLine);
        });

        return lines.join("\n");
    }

    /**
     * Creates a section header with consistent formatting
     * @param title - Section title
     * @param emoji - Optional emoji prefix
     * @returns Formatted header
     */
    static sectionHeader(title: string): string {
        const header = title;
        return chalk.cyan(`${header}:`);
    }

    /**
     * Creates a subsection header
     * @param title - Subsection title
     * @param emoji - Optional emoji prefix
     * @returns Formatted subsection header
     */
    static subHeader(title: string): string {
        const header = title;
        return chalk.cyan(header);
    }

    /**
     * Formats a list of items with bullets
     * @param items - Array of items
     * @param bullet - Bullet character (default: •)
     * @returns Formatted list
     */
    static bulletList(items: string[], bullet: string = "•"): string {
        return items.map(item => `${bullet} ${item}`).join("\n");
    }

    /**
     * Creates a key-value display
     * @param data - Object with key-value pairs
     * @param options - Display options
     * @returns Formatted key-value display
     */
    static keyValue(
        data: Record<string, unknown>,
        options: { separator?: string; keyWidth?: number } = {},
    ): string {
        const { separator = ":", keyWidth = 20 } = options;
        const lines: string[] = [];

        for (const [key, value] of Object.entries(data)) {
            const paddedKey = key.padEnd(keyWidth);
            lines.push(`${paddedKey}${separator} ${value}`);
        }

        return lines.join("\n");
    }

    /**
     * Creates a simple table without borders
     * @param data - Array of arrays representing rows
     * @param options - Table options
     * @returns Formatted table
     */
    static simpleTable(
        data: string[][],
        options?: { colWidths?: number[]; head?: string[] },
    ): string {
        const allRows = options?.head ? [options.head, ...data] : data;
        if (allRows.length === 0) return "";

        // Calculate column widths
        const numCols = allRows[0].length;
        const colWidths: number[] = [];

        for (let col = 0; col < numCols; col++) {
            const maxWidth = Math.max(
                ...allRows.map(row => (row[col] || "").length),
            );
            colWidths[col] = options?.colWidths?.[col] || maxWidth + 2;
        }

        // Calculate max width for last column to respect UI_TABLE_MAX_SIZE
        const lastColIndex = colWidths.length - 1;
        if (lastColIndex >= 0) {
            // Calculate total width of all columns except the last one
            // Include separators: "  " = 2 chars between columns
            const separatorWidth = 2;
            const totalWidthExceptLast =
                colWidths.slice(0, -1).reduce((sum, width) => sum + width, 0) +
                (colWidths.length - 1) * separatorWidth;

            // Calculate maximum allowed width for last column
            const maxLastColWidth = UI_TABLE_MAX_SIZE - totalWidthExceptLast;

            // Apply the constraint only if it would reduce the width
            if (
                maxLastColWidth > 0 &&
                colWidths[lastColIndex] > maxLastColWidth
            ) {
                colWidths[lastColIndex] = maxLastColWidth;
            }
        }

        // Format rows
        return allRows
            .map(row =>
                row
                    .map((cell, i) => {
                        let value = cell || "";

                        // Truncate if exceeds column width
                        if (value.length > colWidths[i]) {
                            value =
                                value.substring(0, colWidths[i] - 3) + "...";
                        }

                        // Don't pad the last column
                        const isLastColumn = i === row.length - 1;
                        return isLastColumn
                            ? value
                            : value.padEnd(colWidths[i]);
                    })
                    .join("  "),
            )
            .join("\n");
    }

    /**
     * Formats a success message
     * @param message - Success message
     * @returns Formatted success message
     */
    static success(message: string): string {
        return chalk.green(message);
    }

    /**
     * Formats an error message
     * @param message - Error message
     * @returns Formatted error message
     */
    static error(message: string): string {
        return chalk.red(message);
    }

    /**
     * Formats a warning message
     * @param message - Warning message
     * @returns Formatted warning message
     */
    static warning(message: string): string {
        return chalk.yellow(message);
    }

    /**
     * Formats an info message
     * @param message - Info message
     * @returns Formatted info message
     */
    static info(message: string): string {
        return chalk.blue(message);
    }

    /**
     * Creates a progress indicator
     * @param current - Current value
     * @param total - Total value
     * @param width - Bar width (default: 20)
     * @returns Progress bar string
     */
    static progressBar(
        current: number,
        total: number,
        width: number = 20,
    ): string {
        const percentage = Math.min(100, Math.round((current / total) * 100));
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        return `[${bar}] ${percentage}%`;
    }

    /**
     * Formats file size in human-readable format
     * @param bytes - Size in bytes
     * @returns Formatted size string
     */
    static fileSize(bytes: number): string {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * Formats a duration in human-readable format
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string
     */
    static duration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000)
            return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
        return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }

    /**
     * Formats text as bold using ANSI escape codes
     * @param text - Text to make bold
     * @returns Bold formatted text
     */
    static bold(text: string): string {
        return chalk.bold(text);
    }
}
