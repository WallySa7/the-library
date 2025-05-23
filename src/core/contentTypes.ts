/**
 * Types for content items (videos, books, benefits)
 */

/**
 * Base interface for all content items
 */
export interface ContentItem {
	/** Content title */
	title: string;

	/** Path to the note file in Obsidian vault */
	filePath: string;

	/** Content type */
	type: string;

	/** Viewing/reading status */
	status?: string;

	/** Language of the content */
	language?: string;

	/** Date when the item was added */
	dateAdded?: string;

	/** Date when watching/reading started */
	startDate?: string;

	/** Date when watching/reading completed */
	completionDate?: string;

	/** Associated tags */
	tags?: string[];

	/** Associated categories */
	categories?: string[];
}

/**
 * Represents a video content item
 */
export interface VideoItem extends ContentItem {
	/** Name of the presenter or lecturer */
	presenter: string;

	/** Duration in HH:MM:SS format */
	duration: string;

	/** Duration in seconds for sorting and calculations */
	durationSeconds: number;

	/** Full YouTube URL */
	url: string;

	/** URL to the video thumbnail image */
	thumbnailUrl?: string;

	/** YouTube video ID */
	videoId?: string;
}

/**
 * Represents a playlist (video series) content item
 */
export interface PlaylistItem extends ContentItem {
	/** Name of the presenter or lecturer */
	presenter: string;

	/** Number of videos in the playlist */
	itemCount: number;

	/** Total duration in HH:MM:SS format */
	duration: string;

	/** Full YouTube URL */
	url: string;

	/** URL to the playlist thumbnail image */
	thumbnailUrl?: string;

	/** YouTube playlist ID */
	playlistId?: string;
}

/**
 * Represents a book content item
 */
export interface BookItem extends ContentItem {
	/** Book author */
	author: string;

	/** Number of pages */
	pageCount: number;

	/** URL to the book cover image */
	coverUrl?: string;

	/** Publication date */
	publishYear?: string;

	/** Publisher name */
	publisher?: string;

	/** User's rating (1-5) */
	rating?: number;
}

/**
 * All types of content items supported by the plugin
 */
export type LibraryItem = VideoItem | PlaylistItem | BookItem;

/**
 * Data needed to create a new video note
 */
export interface VideoData {
	/** Full YouTube URL */
	url: string;

	/** YouTube video ID */
	videoId: string;

	/** Video title */
	title: string;

	/** Duration in HH:MM:SS format */
	duration: string;

	/** Name of the presenter or lecturer */
	presenter: string;

	/** Content type (video/series) */
	type: string;

	/** Video description */
	description: string;

	/** Associated tags */
	tags: string[];

	/** URL to the video thumbnail */
	thumbnailUrl: string;

	/** Viewing status */
	status?: string;

	language?: string;

	/** Start date */
	startDate?: string;

	/** Completion date */
	completionDate?: string;

	/** Associated categories */
	categories?: string[];
}

/**
 * Data needed to create a new playlist note
 */
export interface PlaylistData {
	/** Full YouTube URL */
	url: string;

	/** YouTube playlist ID */
	playlistId: string;

	/** Playlist title */
	title: string;

	/** Name of the presenter or lecturer */
	presenter: string;

	/** Content type (series) */
	type: string;

	/** Number of videos in the playlist */
	itemCount: number;

	/** Total duration in HH:MM:SS format */
	duration: string;

	/** Viewing status */
	status?: string;

	language?: string;

	/** Start date */
	startDate?: string;

	/** Completion date */
	completionDate?: string;

	/** URL to the playlist thumbnail */
	thumbnailUrl?: string;

	/** Associated tags */
	tags?: string[];

	/** Associated categories */
	categories?: string[];
}

/**
 * Data needed to create a new book note
 */
export interface BookData {
	/** Book title */
	title: string;

	/** Book author */
	author: string;

	/** Number of pages */
	pageCount: number;

	/** URL to the book cover image */
	coverUrl?: string;

	/** Publication date */
	publishYear?: string;

	/** Publisher name */
	publisher?: string;

	/** Description or synopsis */
	description?: string;

	/** Content type ("book") */
	type: string;

	/** Associated tags */
	tags: string[];

	/** Associated categories */
	categories?: string[];

	/** Reading status */
	status?: string;

	language?: string;

	/** Start date */
	startDate?: string;

	/** Completion date */
	completionDate?: string;

	/** User's rating (1-5) */
	rating?: number;
}

/**
 * Helper data for resolving folder paths
 */
export interface FolderData {
	/** Content type */
	type: string;

	/** Presenter name */
	presenter?: string;

	/** author name */
	author?: string;

	/** Formatted date */
	date?: string;

	/** First category (if available) */
	category?: string;
}

/**
 * Data for rendering templates
 */
export interface TemplateData extends Record<string, any> {
	title?: string;
	presenter?: string;
	type?: string;
	duration?: string;
	url?: string;
	date?: string;
	dateAdded?: string;
	videoId?: string;
	playlistId?: string;
	tags?: string[] | string;
	description?: string;
	thumbnailUrl?: string;
	itemCount?: number;
	status?: string;
	categories?: string[] | string;
}
