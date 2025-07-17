/**
 * Settings types for The Library plugin
 */
import { TableColumnConfig } from "../uiTypes";

/**
 * Hijri calendar settings
 */
export interface HijriCalendarSettings {
	/** Whether to use Hijri calendar by default */
	useHijriCalendar: boolean;

	/** Format for displaying Hijri dates */
	hijriFormat: string;

	/** Format for displaying Gregorian dates */
	gregorianFormat: string;

	/** Whether to show calendar type indicator */
	showCalendarType: boolean;

	/** Whether to show both calendars in tooltips */
	showBothInTooltips: boolean;
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
 * Folder organization rules settings
 */
export interface FolderRulesSettings {
	/** Whether automatic folder organization is enabled */
	enabled: boolean;

	/** Folder structure pattern using placeholders */
	structure: string;

	/** Default folder structure pattern to fall back to */
	defaultStructure: string;
}

/**
 * Template settings for note generation
 */
export interface TemplateSettings {
	/** Template for single videos */
	video: string;

	/** Template for playlists */
	playlist: string;

	/** Template for books */
	book: string;
}

/**
 * Main settings interface for The Library plugin
 */
export interface LibrarySettings {
	/** YouTube API key for metadata fetching */
	youtubeApiKey: string;

	/** Default folder for video content files */
	videosFolder: string;

	/** Default folder for book content files */
	booksFolder: string;

	/** Default presenter name when not specified */
	defaultPresenter: string;

	/** Default author name when not specified for books */
	defaultAuthor: string;

	/** Date format for timestamps */
	dateFormat: string;

	/** Hijri calendar configuration */
	hijriCalendar: HijriCalendarSettings;

	/** Whether to show thumbnails in videos views */
	showVideosThumbnails: boolean;

	/** Whether to show thumbnails in books views */
	showBooksThumbnails: boolean;

	/** Maximum length for titles (to prevent too long filenames) */
	maxTitleLength: number;

	/** Table column configurations */
	tableColumns: {
		video: TableColumnConfig[];
		book: TableColumnConfig[];
	};

	/** Progress tracking settings */
	videoTracking: ProgressTrackingSettings;

	/** Book reading progress settings */
	bookTracking: ProgressTrackingSettings;

	/** Template settings for note generation */
	templates: TemplateSettings;

	/** Folder organization rules */
	videoFolderRules: FolderRulesSettings;

	/** Book folder organization rules */
	bookFolderRules: FolderRulesSettings;

	/** View mode (table or card) */
	viewMode: "table" | "card";
}
