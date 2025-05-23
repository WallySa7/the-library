/**
 * Types for service-related operations
 */

/**
 * API response wrapper for consistent error handling
 */
export interface APIResponse<T> {
	/** Whether the operation was successful */
	success: boolean;

	/** Response data (if successful) */
	data?: T;

	/** Error message (if not successful) */
	error?: string;
}

/**
 * YouTube video details response
 */
export interface VideoDetails {
	/** Video title */
	title: string;

	/** Duration in HH:MM:SS format */
	duration: string;

	/** URL to the video thumbnail */
	thumbnailUrl: string;

	/** Video description (if available) */
	description?: string;
}

/**
 * YouTube playlist details response
 */
export interface PlaylistDetails {
	/** Playlist title */
	title: string;

	/** Number of videos in the playlist */
	itemCount: number;

	/** Total duration in HH:MM:SS format */
	duration: string;

	/** URL to the playlist thumbnail */
	thumbnailUrl?: string;

	/** Playlist description (if available) */
	description?: string;
}

/**
 * Bulk operation for processing multiple items
 */
export interface BulkOperation {
	/** Operation type */
	type: "status" | "tag" | "category" | "delete";

	/** Value for status, tag, or category operations */
	value?: string;

	/** File paths of items to process */
	itemPaths: string[];
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
	/** Number of successfully processed items */
	success: number;

	/** Number of items that failed to process */
	failed: number;
}

/**
 * Statistics for content items
 */
export interface ContentStatistics {
	/** Total number of individual videos */
	videoCount: number;

	/** Total number of playlists */
	playlistCount: number;

	/** Total duration of all content in seconds */
	totalDurationSeconds: number;

	/** Watched duration in seconds */
	watchedDurationSeconds: number;

	/** Percentage of total content that has been watched */
	percentWatched: number;
}

/**
 * Result of import operations
 */
export interface ImportResult {
	/** Number of successfully imported items */
	success: number;

	/** Number of items that failed to import */
	failed: number;

	/** Optional detail messages */
	messages?: string[];
}
