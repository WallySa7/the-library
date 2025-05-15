/**
 * Core constants used throughout the plugin
 */

/**
 * View type identifier for the main library view
 */
export const VIEW_TYPE_LIBRARY = "library-view";

/**
 * Content types supported by the plugin
 */
export const CONTENT_TYPE = {
	/**
	 * Video content type
	 */
	VIDEO: "video" as const,

	/**
	 * Book content type (planned for future)
	 */
	BOOK: "book" as const,

	/**
	 * Benefit content type (planned for future)
	 */
	BENEFIT: "benefit" as const,
};

/**
 * View modes for displaying content
 */
export const VIEW_MODE = {
	/**
	 * Table view mode (structured, data-focused)
	 */
	TABLE: "table" as const,

	/**
	 * Card view mode (visual, thumbnail-focused)
	 */
	CARD: "card" as const,
};

/**
 * Status values for content viewing progress
 */
export const STATUS = {
	/** Watched */
	WATCHED: "تمت المشاهدة",
	/** In progress */
	IN_PROGRESS: "قيد المشاهدة",
	/** Not watched */
	NOT_WATCHED: "لم يشاهد",
	/** In queue */
	IN_QUEUE: "في قائمة الانتظار",
};

/**
 * Default status values array
 */
export const DEFAULT_STATUS_OPTIONS = [
	STATUS.IN_QUEUE,
	STATUS.WATCHED,
	STATUS.IN_PROGRESS,
	STATUS.NOT_WATCHED,
];

/**
 * Default status
 */
export const DEFAULT_STATUS = STATUS.NOT_WATCHED;

/**
 * Frontmatter field names for videos
 */
export const FRONTMATTER = {
	/** Type (video/playlist) */
	TYPE: "النوع",
	/** Presenter name */
	PRESENTER: "الملقي",
	/** Duration */
	DURATION: "المدة",
	/** Date added */
	DATE_ADDED: "تاريخ الإضافة",
	/** Start date */
	START_DATE: "تاريخ البدء",
	/** Completion date */
	COMPLETION_DATE: "تاريخ الانتهاء",
	/** URL */
	URL: "رابط",
	/** Video ID */
	VIDEO_ID: "معرف المقطع",
	/** Tags */
	TAGS: "الوسوم",
	/** Thumbnail */
	THUMBNAIL: "الصورة المصغرة",
	/** Categories */
	CATEGORIES: "التصنيفات",
	/** Status */
	STATUS: "الحالة",
	/** Title */
	TITLE: "title",
	/** Playlist URL */
	PLAYLIST_URL: "رابط السلسلة",
	/** Playlist ID */
	PLAYLIST_ID: "معرف السلسلة",
	/** Item count */
	ITEM_COUNT: "عدد المقاطع",
	/** Total duration */
	TOTAL_DURATION: "المدة الإجمالية",
};

/**
 * Default page size options for pagination
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Local storage keys for persisting user preferences
 */
export const LOCAL_STORAGE_KEYS = {
	/**
	 * Key for storing the current content type
	 */
	CONTENT_TYPE: "library-content-type",

	/**
	 * Key for storing the current view mode
	 */
	VIEW_MODE: "library-view-mode",

	/**
	 * Key for storing the current items per page setting
	 */
	ITEMS_PER_PAGE: "library-items-per-page",
};

/**
 * Asset paths for plugin resources
 */
export const ASSETS = {
	/**
	 * Default placeholder image for missing thumbnails
	 */
	DEFAULT_THUMBNAIL:
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1wbGF5Ij48cG9seWdvbiBwb2ludHM9IjUgMyAxOSAxMiA1IDIxIDUgMyIvPjwvc3ZnPg==",
};
