// src/types/contentTypes.ts
/**
 * Types for video and playlist content
 */

/**
 * Represents a video item
 */
export interface VideoItem {
	/** Video title */
	title: string;
	/** Name of the presenter or lecturer */
	presenter: string;
	/** Duration in HH:MM:SS format */
	duration: string;
	/** Duration in seconds */
	durationSeconds: number;
	/** Full YouTube URL */
	url: string;
	/** URL to the video thumbnail image */
	thumbnailUrl?: string;
	/** YouTube video ID */
	videoId?: string;
	/** Path to the note file */
	filePath: string;
	/** Content type (مقطع/سلسلة) */
	type: string;
	/** Viewing status */
	status?: string;
	/** Date added (formatted) */
	dateAdded?: string;
	/** Associated tags */
	tags?: string[];
	categories?: string[];
}

/**
 * Represents a playlist item
 */
export interface PlaylistItem {
	/** Playlist title */
	title: string;
	/** Name of the presenter or lecturer */
	presenter: string;
	/** Number of videos in the playlist */
	itemCount: number;
	/** Total duration in HH:MM:SS format */
	duration: string;
	/** Full YouTube URL */
	url: string;
	/** Path to the note file */
	filePath: string;
	/** Content type (سلسلة) */
	type: string;
	/** Viewing status */
	status?: string;
	/** Date added (formatted) */
	dateAdded?: string;
	/** URL to the playlist thumbnail image */
	thumbnailUrl?: string;
	/** Associated tags */
	tags?: string[];
	categories?: string[];
	/** YouTube playlist ID */
	playlistId?: string;
}
