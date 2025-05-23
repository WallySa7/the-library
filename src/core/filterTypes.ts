/**
 * Types for filtering and sorting content
 */

/**
 * Filter state for content
 */
export interface FilterState {
	/** Selected status values */
	statuses: string[];

	/** Selected presenter values */
	presenters: string[];

	authors: string[];

	/** Selected content types */
	types: string[];

	/** Selected categories */
	categories: string[];

	/** Selected tags */
	tags: string[];

	/** Date range filter */
	dateRange: {
		from: string | null;
		to: string | null;
	};

	/** Search query text */
	searchQuery: string;

	/** Current page number (for pagination) */
	page: number;

	/** Number of items per page */
	itemsPerPage: number;

	/** Field to sort by */
	sortBy: string;

	/** Sort direction */
	sortOrder: "asc" | "desc";
}

/**
 * Available filter option sets for dynamic filtering
 */
export interface FilterOptions {
	/** Available status options */
	statuses: Set<string>;

	/** Available presenter options */
	presenters: Set<string>;

	authors: Set<string>;

	/** Available content type options */
	types: Set<string>;

	/** Available category options */
	categories: Set<string>;

	/** Available tag options */
	tags: Set<string>;
}
