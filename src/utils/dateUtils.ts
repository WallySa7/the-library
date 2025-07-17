/**
 * Enhanced utilities for date and time operations with Hijri calendar support
 */
import moment from "moment-hijri";
import { HijriCalendarSettings } from "../core/settings/types";

// Standard date format used throughout the application
export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
export const DEFAULT_HIJRI_FORMAT = "iYYYY/iMM/iDD";

/**
 * Enhanced date formatting options
 */
export interface DateFormatOptions {
	/** Whether to use Hijri calendar */
	useHijri?: boolean;
	/** Format string for Hijri dates */
	hijriFormat?: string;
	/** Format string for Gregorian dates */
	gregorianFormat?: string;
	/** Whether to show calendar type indicator */
	showType?: boolean;
	/** Settings object (if available) */
	settings?: HijriCalendarSettings;
}

/**
 * Formats a date according to the specified format and calendar system
 *
 * @param date - The date to format
 * @param options - Formatting options including calendar type and formats
 * @returns Formatted date string
 */
export function formatDate(
	date: Date,
	options: DateFormatOptions = {}
): string {
	// Validate input
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		console.warn("Invalid date provided to formatDate", date);
		return "";
	}

	// Use settings if provided
	const useHijri =
		options.settings?.useHijriCalendar ?? options.useHijri ?? false;
	const hijriFormat =
		options.settings?.hijriFormat ??
		options.hijriFormat ??
		DEFAULT_HIJRI_FORMAT;
	const gregorianFormat =
		options.settings?.gregorianFormat ??
		options.gregorianFormat ??
		DEFAULT_DATE_FORMAT;
	const showType =
		options.settings?.showCalendarType ?? options.showType ?? false;

	const momentDate = moment(date);
	let formattedDate: string;
	let typeIndicator = "";

	if (useHijri) {
		formattedDate = momentDate.format(hijriFormat);
		typeIndicator = showType ? " هـ" : "";
	} else {
		formattedDate = momentDate.format(gregorianFormat);
		typeIndicator = showType ? " م" : "";
	}

	return formattedDate + typeIndicator;
}

/**
 * Legacy formatDate function for backward compatibility
 *
 * @param date - The date to format
 * @param format - Format string (e.g., 'YYYY-MM-DD', 'YYYY/MM/DD HH:mm:ss')
 * @returns Formatted date string
 */
export function formatDateLegacy(date: Date, format: string): string {
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		console.warn("Invalid date provided to formatDate", date);
		return "";
	}

	// Helper to pad numbers with leading zeros
	const pad = (num: number): string => num.toString().padStart(2, "0");

	// Define replacements for format patterns
	const replacements: Record<string, string> = {
		YYYY: date.getFullYear().toString(),
		MM: pad(date.getMonth() + 1),
		DD: pad(date.getDate()),
		HH: pad(date.getHours()),
		mm: pad(date.getMinutes()),
		ss: pad(date.getSeconds()),
	};

	// Apply replacements
	let result = format;
	for (const [pattern, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(pattern, "g"), value);
	}

	return result;
}

/**
 * Formats a date with both Hijri and Gregorian dates for tooltips
 *
 * @param date - The date to format
 * @param settings - Hijri calendar settings
 * @returns Formatted string with both calendar systems
 */
export function formatDateWithBoth(
	date: Date,
	settings: HijriCalendarSettings
): string {
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		return "";
	}

	const momentDate = moment(date);
	const hijri = momentDate.format(settings.hijriFormat) + " هـ";
	const gregorian = momentDate.format(settings.gregorianFormat) + " م";

	if (settings.useHijriCalendar) {
		return `${hijri}\n(${gregorian})`;
	} else {
		return `${gregorian}\n(${hijri})`;
	}
}

/**
 * Gets current date string using the specified calendar system
 *
 * @param settings - Hijri calendar settings
 * @returns Current date formatted according to settings
 */
export function getCurrentDateString(settings: HijriCalendarSettings): string {
	return formatDate(new Date(), { settings });
}

/**
 * Converts a Hijri date string to Gregorian
 *
 * @param hijriDateString - Date string in Hijri format
 * @param hijriFormat - Format of the input Hijri date
 * @param gregorianFormat - Desired output format
 * @returns Gregorian date string
 */
export function hijriToGregorian(
	hijriDateString: string,
	hijriFormat: string = DEFAULT_HIJRI_FORMAT,
	gregorianFormat: string = DEFAULT_DATE_FORMAT
): string {
	try {
		const hijriMoment = moment(hijriDateString, hijriFormat);
		return hijriMoment.format(gregorianFormat);
	} catch (error) {
		console.error("Error converting Hijri to Gregorian:", error);
		return "Invalid date";
	}
}

/**
 * Converts a Gregorian date string to Hijri
 *
 * @param gregorianDateString - Date string in Gregorian format
 * @param gregorianFormat - Format of the input Gregorian date
 * @param hijriFormat - Desired output Hijri format
 * @returns Hijri date string
 */
export function gregorianToHijri(
	gregorianDateString: string,
	gregorianFormat: string = DEFAULT_DATE_FORMAT,
	hijriFormat: string = DEFAULT_HIJRI_FORMAT
): string {
	try {
		const gregorianMoment = moment(gregorianDateString, gregorianFormat);
		return gregorianMoment.format(hijriFormat);
	} catch (error) {
		console.error("Error converting Gregorian to Hijri:", error);
		return "Invalid date";
	}
}

/**
 * Parses a date string in either Hijri or Gregorian format
 *
 * @param dateStr - Date string to parse
 * @param format - Format of the date string
 * @param isHijri - Whether the date string is in Hijri format
 * @returns Date object or null if invalid
 */
export function parseDate(
	dateStr: string,
	format: string = DEFAULT_DATE_FORMAT,
	isHijri: boolean = false
): Date | null {
	if (!dateStr) return null;

	try {
		const parsedMoment = moment(dateStr, format);
		if (!parsedMoment.isValid()) return null;

		return parsedMoment.toDate();
	} catch (error) {
		console.warn("Error parsing date:", error);
		return null;
	}
}

/**
 * Gets today's date in the specified calendar format
 *
 * @param settings - Hijri calendar settings
 * @returns Today's date formatted according to settings
 */
export function getTodayFormatted(settings?: HijriCalendarSettings): string {
	if (settings) {
		return getCurrentDateString(settings);
	}
	return formatDateLegacy(new Date(), DEFAULT_DATE_FORMAT);
}

/**
 * Converts a date object to the beginning of the day (00:00:00)
 *
 * @param date - The date to convert
 * @returns New date set to the beginning of the day
 */
export function startOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

/**
 * Calculates the difference in days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between the dates
 */
export function daysBetween(date1: Date, date2: Date): number {
	// Convert both dates to start of day to ignore time components
	const start = startOfDay(date1);
	const end = startOfDay(date2);

	// Calculate difference in milliseconds and convert to days
	const diffMs = Math.abs(end.getTime() - start.getTime());
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Creates a date tooltip with both calendar systems (if enabled)
 *
 * @param date - The date to create tooltip for
 * @param settings - Hijri calendar settings
 * @returns Tooltip text or empty string
 */
export function createDateTooltip(
	date: Date,
	settings: HijriCalendarSettings
): string {
	if (!settings.showBothInTooltips) {
		return "";
	}

	return formatDateWithBoth(date, settings);
}
