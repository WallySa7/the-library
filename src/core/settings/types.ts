/**
 * Settings types for The Library plugin
 */
import { TableColumnConfig } from "../uiTypes";

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
 * Folder organization rules settings
 */
export interface FolderRulesSettings {
	/** Whether automatic folder organization is enabled */
	enabled: boolean;

	/** Folder structure pattern using placeholders */
	structure: string;

	/** Default folder structure pattern to fall back to */
	defaultStructure: string;

	/** Whether to show example previews in settings */
	showExamples: boolean;
}

/**
 * Template settings for note generation
 */
export interface TemplateSettings {
	/** Template for single videos */
	video: string;

	/** Template for playlists */
	playlist: string;
}

/**
 * Main settings interface for The Library plugin
 */
export interface LibrarySettings {
	/** YouTube API key for metadata fetching */
	youtubeApiKey: string;

	/** Default folder for content files */
	defaultFolder: string;

	/** Default presenter name when not specified */
	defaultPresenter: string;

	/** Date format for timestamps */
	dateFormat: string;

	/** Whether to show thumbnails in content views */
	showThumbnails: boolean;

	/** Maximum length for titles (to prevent too long filenames) */
	maxTitleLength: number;

	/** Table column configurations */
	tableColumns: {
		video: TableColumnConfig[];
	};

	/** Progress tracking settings */
	progressTracking: ProgressTrackingSettings;

	/** Template settings for note generation */
	templates: TemplateSettings;

	/** Folder organization rules */
	folderRules: FolderRulesSettings;

	/** View mode (table or card) */
	viewMode: "table" | "card";
}
