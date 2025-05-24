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
 * Represents a benefit item
 */
export interface BenefitItem {
	/** Unique identifier for the benefit */
	id: string;

	/** Benefit title */
	title: string;

	/** Main benefit text/content */
	text: string;

	/** Page number (for books) */
	pageNumber?: number;

	/** Volume number (for multi-volume books) */
	volumeNumber?: number;

	/** Video timestamp in seconds (for videos) */
	timestamp?: number;

	/** Associated categories */
	categories: string[];

	/** Associated tags */
	tags: string[];

	/** Date when the benefit was created */
	dateCreated: string;

	/** Date when the benefit was last modified */
	dateModified?: string;

	/** File path of the note containing this benefit */
	filePath: string;

	/** Type of content (video/book) */
	contentType: "video" | "book";

	/** Title of the parent content (book/video title) */
	parentTitle?: string;

	/** Author (for books) or presenter (for videos) */
	author?: string;
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
 * Data structure for creating/editing a benefit
 */
export interface BenefitData {
	title: string;
	text: string;
	pageNumber?: number;
	volumeNumber?: number;
	timestamp?: number;
	categories: string[];
	tags: string[];
}

/**
 * Options for sharing benefits as images
 */
export interface BenefitShareOptions {
	/** Background color or gradient */
	backgroundColor: string;

	/** Text color */
	textColor: string;

	/** Font family */
	fontFamily: string;

	/** Font size for main text */
	fontSize: number;

	/** Whether to include metadata (page, timestamp, etc.) */
	includeMetadata: boolean;

	/** Whether to include categories/tags */
	includeTags: boolean;

	/** Whether to include author/presenter name */
	includeAuthor: boolean;

	/** Whether to include parent title */
	includeParentTitle: boolean;

	/** Image width in pixels */
	width: number;

	/** Padding in pixels */
	padding: number;

	/** Logo or watermark URL (optional) */
	logoUrl?: string;

	/** Custom CSS for additional styling */
	customCSS?: string;
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
