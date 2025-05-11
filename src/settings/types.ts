// src/core/settings/types.ts
/**
 * Settings types for Al-Rawi plugin
 */

/**
 * Table column configuration
 */
export interface TableColumnConfig {
	/** Unique identifier for the column */
	id: string;
	/** Whether the column is visible */
	enabled: boolean;
	/** Order in the table (0-based index) */
	order: number;
	/** Display label for the column */
	label: string;
	/** Key used for sorting (if different from id) */
	sortKey?: string;
}

/**
 * Progress tracking settings
 */
export interface ProgressTrackingSettings {
	/** Default status for new content */
	defaultStatus: string;
	/** Available status options */
	statusOptions: string[];
}

/**
 * Folder rules settings
 */
export interface FolderRulesSettings {
	/** Whether automatic folder organization is enabled */
	enabled: boolean;
	/** Folder structure pattern */
	structure: string;
	/** Default folder structure pattern */
	defaultStructure: string;
	/** Whether to show example previews */
	showExamples: boolean;
}

/**
 * Template settings
 */
export interface TemplateSettings {
	/** Template for single videos */
	video: string;
	/** Template for playlists */
	playlist: string;
}

/**
 * Main settings interface for Al-Rawi plugin
 */
export interface AlRawiSettings {
	/** YouTube API key for metadata fetching */
	youtubeApiKey: string;
	/** Default folder for videos */
	defaultFolder: string;
	/** Default presenter name */
	defaultPresenter: string;
	/** Date format for timestamps */
	dateFormat: string;
	/** Whether to show thumbnails in statistics view */
	showThumbnailsInStats: boolean;
	/** Maximum length for titles */
	maxTitleLength: number;
	/** Table column configurations */
	tableColumns: {
		videos: TableColumnConfig[];
	};
	/** Progress tracking settings */
	videosProgressTracking: ProgressTrackingSettings;
	/** Template settings */
	templates: TemplateSettings;
	/** Folder organization rules */
	folderRules: FolderRulesSettings;
	/** View mode (table or card) */
	viewMode: "table" | "card";
}

/**
 * Template placeholder documentation
 */
export interface PlaceholderDoc {
	/** Placeholder text */
	placeholder: string;
	/** Description of the placeholder */
	description: string;
}
