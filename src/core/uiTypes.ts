/**
 * Types for UI components
 */
import { App, WorkspaceLeaf } from "obsidian";
import { LibrarySettings } from "./settings";
import { FilterState } from "./state/FilterState";
import { SelectionState } from "./state/SelectionState";
import { CONTENT_TYPE } from "./constants";

/**
 * Type for content type string literals
 */
export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE];

/**
 * Base properties shared by all components
 */
export interface ComponentProps {
	/** Obsidian app instance */
	app: App;

	/** Plugin instance */
	plugin: any;

	/** Plugin settings */
	settings: LibrarySettings;

	/** Current content type being displayed */
	contentType: ContentType;

	/** Callback to refresh content */
	onRefresh: () => Promise<void>;
}

/**
 * Properties for view components
 */
export interface ViewProps extends ComponentProps {
	/** Workspace leaf the view is attached to */
	leaf: WorkspaceLeaf;
}

/**
 * Properties for filterable/selectable content components
 */
export interface ContentComponentProps extends ComponentProps {
	/** Filter state for controlling visible items */
	filterState: FilterState;

	/** Selection state for bulk operations */
	selectionState: SelectionState;
}

/**
 * Table column configuration
 */
export interface TableColumnConfig {
	/** Unique identifier for the column */
	id: string;

	/** Whether the column is visible */
	enabled: boolean;

	/** Display order in the table (0-based index) */
	order: number;

	/** Display label for the column */
	label: string;

	/** Key used for sorting (if different from id) */
	sortKey?: string;
}

/**
 * Sort options for content lists
 */
export interface SortOptions {
	/** Field to sort by */
	sortBy: string;

	/** Sort direction */
	sortOrder: "asc" | "desc";
}

/**
 * Options for exporting content
 */
export interface ExportOptions {
	/** Export format */
	format: "json" | "jsonWithContent" | "csv";

	/** Optional file paths of selected items to export */
	selectedItems?: string[];

	/** Content type (video or book) */
	contentType?: ContentType;
}

/**
 * Placeholder documentation for templates
 */
export interface PlaceholderDoc {
	/** Placeholder text */
	placeholder: string;

	/** Description of the placeholder */
	description: string;
}
