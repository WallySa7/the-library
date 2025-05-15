/**
 * Default settings for The Library plugin
 */
import {
	LibrarySettings,
	ProgressTrackingSettings,
	FolderRulesSettings,
	TemplateSettings,
} from "./types";
import { TableColumnConfig } from "../uiTypes";
import {
	DEFAULT_STATUS,
	DEFAULT_STATUS_OPTIONS,
	FRONTMATTER,
} from "../constants";

/**
 * Default table columns for videos
 */
export const DEFAULT_VIDEO_COLUMNS: TableColumnConfig[] = [
	{ id: "checkbox", enabled: true, order: 0, label: "" },
	{
		id: "title",
		enabled: true,
		order: 1,
		label: "العنوان",
		sortKey: "title",
	},
	{
		id: "presenter",
		enabled: true,
		order: 2,
		label: "الملقي",
		sortKey: "presenter",
	},
	{ id: "type", enabled: true, order: 3, label: "النوع", sortKey: "type" },
	{
		id: "status",
		enabled: true,
		order: 4,
		label: "الحالة",
		sortKey: "status",
	},
	{
		id: "duration",
		enabled: true,
		order: 5,
		label: "المدة",
		sortKey: "duration",
	},
	{ id: "tags", enabled: false, order: 6, label: "الوسوم" },
	{ id: "categories", enabled: false, order: 7, label: "التصنيفات" },
	{
		id: "dateAdded",
		enabled: true,
		order: 8,
		label: "تاريخ الإضافة",
		sortKey: "dateAdded",
	},
	{ id: "actions", enabled: true, order: 9, label: "إجراءات" },
];

/**
 * Default progress tracking settings
 */
export const DEFAULT_PROGRESS_TRACKING: ProgressTrackingSettings = {
	defaultStatus: DEFAULT_STATUS,
	statusOptions: DEFAULT_STATUS_OPTIONS,
};

/**
 * Default folder rules settings
 */
export const DEFAULT_FOLDER_RULES: FolderRulesSettings = {
	enabled: true,
	structure: "{{type}}/{{presenter}}",
	defaultStructure: "{{type}}/{{presenter}}",
	showExamples: true,
};

/**
 * Default video template
 */
export const DEFAULT_VIDEO_TEMPLATE = `---
${FRONTMATTER.TYPE}: {{type}}
${FRONTMATTER.PRESENTER}: {{presenter}}
${FRONTMATTER.DURATION}: {{duration}}
${FRONTMATTER.DATE_ADDED}: {{date}}
${FRONTMATTER.URL}: {{url}}
${FRONTMATTER.VIDEO_ID}: {{videoId}}
${FRONTMATTER.TAGS}: {{tags}}
${FRONTMATTER.THUMBNAIL}: {{thumbnailUrl}}
${FRONTMATTER.CATEGORIES}: {{categories}}
${FRONTMATTER.STATUS}: {{status}}
---

# {{title}}

{{description}}

## تفاصيل المقطع
- **المدة:** {{duration}}
- **النوع:** {{type}}
- **الملقي:** {{presenter}}
- **الحالة:** {{status}}

[مشاهدة على يوتيوب]({{url}})`;

/**
 * Default playlist template
 */
export const DEFAULT_PLAYLIST_TEMPLATE = `---
title: "{{title}}"
${FRONTMATTER.PLAYLIST_URL}: "{{url}}"
${FRONTMATTER.PLAYLIST_ID}: "{{playlistId}}"
${FRONTMATTER.PRESENTER}: "{{presenter}}"
${FRONTMATTER.TYPE}: "{{type}}"
${FRONTMATTER.ITEM_COUNT}: {{itemCount}}
${FRONTMATTER.TOTAL_DURATION}: "{{duration}}"
${FRONTMATTER.STATUS}: "{{status}}"
${FRONTMATTER.DATE_ADDED}: "{{dateAdded}}"
${FRONTMATTER.CATEGORIES}: {{categories}}
${FRONTMATTER.THUMBNAIL}: "{{thumbnailUrl}}"
${FRONTMATTER.TAGS}: {{tags}}
---

# {{title}}

- **الملقي**: {{presenter}}
- **عدد المقاطع**: {{itemCount}}
- **المدة الإجمالية**: {{duration}}
- **الحالة**: {{status}}
- **تاريخ الإضافة**: {{date}}

## الرابط
[مشاهدة السلسلة على يوتيوب]({{url}})

## الفوائد`;

/**
 * Default template settings
 */
export const DEFAULT_TEMPLATES: TemplateSettings = {
	video: DEFAULT_VIDEO_TEMPLATE,
	playlist: DEFAULT_PLAYLIST_TEMPLATE,
};

/**
 * Default settings for The Library plugin
 */
export const DEFAULT_SETTINGS: LibrarySettings = {
	youtubeApiKey: "",
	defaultFolder: "The Library",
	defaultPresenter: "غير معروف",
	dateFormat: "YYYY-MM-DD",
	showThumbnails: true,
	maxTitleLength: 100,
	tableColumns: {
		video: DEFAULT_VIDEO_COLUMNS,
	},
	progressTracking: DEFAULT_PROGRESS_TRACKING,
	templates: DEFAULT_TEMPLATES,
	folderRules: DEFAULT_FOLDER_RULES,
	viewMode: "table",
};
