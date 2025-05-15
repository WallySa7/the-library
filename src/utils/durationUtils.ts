/**
 * Utilities for handling time durations
 */

/**
 * Formats hours, minutes, seconds to HH:MM:SS format
 * @param hours Number of hours
 * @param minutes Number of minutes
 * @param seconds Number of seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatHMS(
	hours: number,
	minutes: number,
	seconds: number
): string {
	// For very long durations, don't limit hours to 2 digits
	return [
		Math.floor(hours).toString().padStart(2, "0"),
		Math.floor(minutes).toString().padStart(2, "0"),
		Math.floor(seconds).toString().padStart(2, "0"),
	].join(":");
}

/**
 * Converts total seconds to HH:MM:SS format
 * @param totalSeconds Total duration in seconds
 * @returns Formatted duration string (HH:MM:SS)
 */
export function secondsToHMS(totalSeconds: number): string {
	if (isNaN(totalSeconds) || totalSeconds < 0) {
		console.warn("Invalid seconds value", totalSeconds);
		return "00:00:00";
	}

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	return formatHMS(hours, minutes, seconds);
}

/**
 * Converts HH:MM:SS format to total seconds
 * @param hms Duration string (HH:MM:SS)
 * @returns Total seconds
 */
export function hmsToSeconds(hms: string): number {
	if (!hms || typeof hms !== "string") return 0;

	const parts = hms.split(":").map((part) => parseInt(part, 10) || 0);

	let hours = 0,
		minutes = 0,
		seconds = 0;

	// Handle different formats (HH:MM:SS, MM:SS, or SS)
	switch (parts.length) {
		case 3:
			[hours, minutes, seconds] = parts;
			break;
		case 2:
			[minutes, seconds] = parts;
			break;
		case 1:
			[seconds] = parts;
			break;
		default:
			return 0;
	}

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses ISO 8601 duration format (used by YouTube)
 * @param duration Duration string in ISO 8601 format (e.g., 'PT1H30M15S')
 * @returns Formatted duration string (HH:MM:SS)
 */
export function parseYouTubeDuration(duration: string): string {
	if (
		!duration ||
		typeof duration !== "string" ||
		!duration.startsWith("PT")
	) {
		console.warn("Invalid YouTube duration format", duration);
		return "00:00:00";
	}

	let hours = 0,
		minutes = 0,
		seconds = 0;

	const timeStr = duration.replace("PT", "");

	// Extract hours, minutes, and seconds using regex
	const hoursMatch = timeStr.match(/(\d+)H/);
	const minutesMatch = timeStr.match(/(\d+)M/);
	const secondsMatch = timeStr.match(/(\d+)S/);

	if (hoursMatch) hours = parseInt(hoursMatch[1], 10);
	if (minutesMatch) minutes = parseInt(minutesMatch[1], 10);
	if (secondsMatch) seconds = parseInt(secondsMatch[1], 10);

	// Handle long durations properly - don't limit to 2 digits for hours
	const formattedHours = Math.floor(hours).toString().padStart(2, "0");
	const formattedMinutes = Math.floor(minutes).toString().padStart(2, "0");
	const formattedSeconds = Math.floor(seconds).toString().padStart(2, "0");

	return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Parse duration text from various human-readable formats
 * @param text Duration text (e.g., '1h 30m 15s', '90 minutes', etc.)
 * @returns Total seconds
 */
export function parseDurationText(text: string): number {
	if (!text || typeof text !== "string") return 0;

	let hours = 0;
	let minutes = 0;
	let seconds = 0;

	// Extract hours
	const hourMatch = text.match(/(\d+)\s*h(?:our)?s?/i);
	if (hourMatch) {
		hours = parseInt(hourMatch[1], 10);
	}

	// Extract minutes
	const minuteMatch = text.match(/(\d+)\s*m(?:in(?:ute)?)?s?/i);
	if (minuteMatch) {
		minutes = parseInt(minuteMatch[1], 10);
	}

	// Extract seconds
	const secondMatch = text.match(/(\d+)\s*s(?:ec(?:ond)?)?s?/i);
	if (secondMatch) {
		seconds = parseInt(secondMatch[1], 10);
	}

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats duration in seconds to a human-readable string in Arabic
 * @param seconds Total seconds
 * @returns Formatted string (e.g., "2 ساعة و 30 دقيقة و 15 ثانية")
 */
export function formatDuration(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) return "";

	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	const parts = [];
	if (h > 0) parts.push(`${h} ساعة`);
	if (m > 0) parts.push(`${m} دقيقة`);
	if (s > 0 || parts.length === 0) parts.push(`${s} ثانية`);

	return parts.join(" و ");
}

/**
 * Formats duration in a concise way
 * @param seconds Total seconds
 * @returns Short formatted string (e.g., "2h 30m" or "15m 42s")
 */
export function formatDurationShort(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) return "";

	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	if (h > 0) {
		return `${h}h ${m}m`;
	}

	if (m > 0) {
		return `${m}m ${s}s`;
	}

	return `${s}s`;
}
