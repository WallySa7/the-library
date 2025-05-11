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
