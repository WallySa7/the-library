// src/views/unifiedView/types.ts
// Types specific to the UnifiedView component

import { App, WorkspaceLeaf } from "obsidian";
import { VideoItem, PlaylistItem } from "../types/contentTypes";
import { CONTENT_TYPE } from "../constants";
import { DataService } from "../dataService";
import { AlRawiSettings } from "../settings";
import { FilterState } from "../types/filterTypes";
// Content type type
export type ContentType = typeof CONTENT_TYPE.VIDEOS;

// Column configuration for tables
export interface ColumnConfig {
	id: string;
	label: string;
	enabled: boolean;
	order: number;
	sortKey?: string;
}

// Sort options
export interface SortOptions {
	sortBy: string;
	sortOrder: "asc" | "desc";
}

// Props for the UnifiedView component
export interface UnifiedViewProps {
	app: App;
	leaf: WorkspaceLeaf;
	plugin: any; // AlRawiPlugin
	settings: AlRawiSettings;
	dataService: DataService;
}

// Component props with children
export interface ComponentProps {
	app: App;
	plugin: any; // AlRawiPlugin
	settings: AlRawiSettings;
	dataService: DataService;
	contentType: ContentType;
	onRefresh: () => Promise<void>;
}

// Filtered data interface
export interface FilteredData {
	items: (VideoItem | PlaylistItem)[];
	totalItems: number;
}

// Export options
export interface ExportOptions {
	format: "json" | "jsonWithContent" | "csv";
	selectedItems?: string[];
}
