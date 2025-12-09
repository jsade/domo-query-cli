import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    parseTimeExpression,
    validateTimeRange,
    formatTimestamp,
    getStartOfDay,
    getEndOfDay,
    TimeParseError,
} from "./dateUtils.ts";

describe("dateUtils", () => {
    describe("parseTimeExpression", () => {
        beforeEach(() => {
            // Fix the current time for predictable tests
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should parse 'now' keyword", () => {
            const result = parseTimeExpression("now");
            expect(result).toBe(Date.now());
        });

        it("should parse 'today' keyword", () => {
            const result = parseTimeExpression("today");
            // Account for timezone differences
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(result).toBe(today.getTime());
        });

        it("should parse 'yesterday' keyword", () => {
            const result = parseTimeExpression("yesterday");
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            expect(result).toBe(yesterday.getTime());
        });

        it("should parse relative hours", () => {
            const result = parseTimeExpression("24h ago");
            const expected = Date.now() - 24 * 60 * 60 * 1000;
            expect(result).toBe(expected);
        });

        it("should parse relative days", () => {
            const result = parseTimeExpression("7d ago");
            const expected = Date.now() - 7 * 24 * 60 * 60 * 1000;
            expect(result).toBe(expected);
        });

        it("should parse relative minutes", () => {
            const result = parseTimeExpression("30m ago");
            const expected = Date.now() - 30 * 60 * 1000;
            expect(result).toBe(expected);
        });

        it("should parse relative weeks", () => {
            const result = parseTimeExpression("2w ago");
            const expected = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000;
            expect(result).toBe(expected);
        });

        it("should parse millisecond timestamp", () => {
            const timestamp = "1704067200000";
            const result = parseTimeExpression(timestamp);
            expect(result).toBe(1704067200000);
        });

        it("should parse second timestamp and convert to milliseconds", () => {
            const timestamp = "1704067200";
            const result = parseTimeExpression(timestamp);
            expect(result).toBe(1704067200000);
        });

        it("should parse ISO date string", () => {
            const result = parseTimeExpression("2024-01-15");
            const expected = new Date("2024-01-15").getTime();
            expect(result).toBe(expected);
        });

        it("should parse ISO datetime string", () => {
            const result = parseTimeExpression("2024-01-15T10:30:00Z");
            const expected = new Date("2024-01-15T10:30:00Z").getTime();
            expect(result).toBe(expected);
        });

        it("should handle case insensitivity", () => {
            const result = parseTimeExpression("NOW");
            expect(result).toBe(Date.now());
        });

        it("should handle whitespace", () => {
            const result = parseTimeExpression("  24h ago  ");
            const expected = Date.now() - 24 * 60 * 60 * 1000;
            expect(result).toBe(expected);
        });

        it("should throw TimeParseError for invalid expression", () => {
            expect(() => parseTimeExpression("invalid")).toThrow(
                TimeParseError,
            );
        });

        it("should throw TimeParseError with helpful message", () => {
            expect(() => parseTimeExpression("bad input")).toThrow(
                /Expected relative/,
            );
        });
    });

    describe("validateTimeRange", () => {
        it("should not throw for valid range", () => {
            expect(() => validateTimeRange(1000, 2000)).not.toThrow();
        });

        it("should throw for equal start and end", () => {
            expect(() => validateTimeRange(1000, 1000)).toThrow(TimeParseError);
        });

        it("should throw when start is after end", () => {
            expect(() => validateTimeRange(2000, 1000)).toThrow(TimeParseError);
        });

        it("should include meaningful error message", () => {
            expect(() => validateTimeRange(2000, 1000)).toThrow(
                /Start time must be before end time/,
            );
        });
    });

    describe("formatTimestamp", () => {
        it("should format as ISO by default", () => {
            const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
            const result = formatTimestamp(timestamp);
            expect(result).toBe("2024-01-15T10:30:00.000Z");
        });

        it("should format as ISO explicitly", () => {
            const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
            const result = formatTimestamp(timestamp, "iso");
            expect(result).toBe("2024-01-15T10:30:00.000Z");
        });

        it("should format as local string", () => {
            const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
            const result = formatTimestamp(timestamp, "local");
            // Local format varies by system, just verify it's a string
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        });

        it("should format as relative time", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));

            const twoHoursAgo = new Date("2024-06-15T10:00:00.000Z").getTime();
            const result = formatTimestamp(twoHoursAgo, "relative");
            expect(result).toBe("2 hours ago");

            vi.useRealTimers();
        });
    });

    describe("getStartOfDay", () => {
        it("should return start of current day", () => {
            const result = getStartOfDay();
            const date = new Date(result);
            expect(date.getHours()).toBe(0);
            expect(date.getMinutes()).toBe(0);
            expect(date.getSeconds()).toBe(0);
            expect(date.getMilliseconds()).toBe(0);
        });

        it("should return start of specific date", () => {
            const input = new Date("2024-06-15T15:30:00Z");
            const result = getStartOfDay(input);
            const date = new Date(result);
            expect(date.getHours()).toBe(0);
            expect(date.getMinutes()).toBe(0);
        });
    });

    describe("getEndOfDay", () => {
        it("should return end of current day", () => {
            const result = getEndOfDay();
            const date = new Date(result);
            expect(date.getHours()).toBe(23);
            expect(date.getMinutes()).toBe(59);
            expect(date.getSeconds()).toBe(59);
            expect(date.getMilliseconds()).toBe(999);
        });

        it("should return end of specific date", () => {
            const input = new Date("2024-06-15T15:30:00Z");
            const result = getEndOfDay(input);
            const date = new Date(result);
            expect(date.getHours()).toBe(23);
            expect(date.getMinutes()).toBe(59);
        });
    });
});
