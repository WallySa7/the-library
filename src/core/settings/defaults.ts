/**
 * Default settings for The Library plugin
 */
import {
	LibrarySettings,
	ProgressTrackingSettings,
	FolderRulesSettings,
	TemplateSettings,
} from "./types";
import { TableColumnConfig } from "../types/uiTypes";

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
		label: "المقدم",
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
	defaultStatus: "لم يشاهد",
	statusOptions: [
		"في قائمة الانتظار",
		"تمت المشاهدة",
		"قيد المشاهدة",
		"لم يشاهد",
	],
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
النوع: {{type}}
المقدم: {{presenter}}
المدة: {{duration}}
تاريخ الإضافة: {{date}}
رابط: {{url}}
معرف الفيديو: {{videoId}}
الوسوم: {{tags}}
الصورة المصغرة: {{thumbnailUrl}}
التصنيفات: {{categories}}
الحالة: {{status}}
---

# {{title}}

{{description}}

## تفاصيل الفيديو
- **المدة:** {{duration}}
- **النوع:** {{type}}
- **المقدم:** {{presenter}}
- **الحالة:** {{status}}

[مشاهدة على يوتيوب]({{url}})`;

/**
 * Default playlist template
 */
export const DEFAULT_PLAYLIST_TEMPLATE = `---
title: "{{title}}"
رابط السلسلة: "{{url}}"
معرف السلسلة: "{{playlistId}}"
المقدم: "{{presenter}}"
النوع: "{{type}}"
عدد المقاطع: {{itemCount}}
المدة الإجمالية: "{{duration}}"
الحالة: "{{status}}"
تاريخ الإضافة: "{{dateAdded}}"
التصنيفات: {{categories}}
الصورة المصغرة: "{{thumbnailUrl}}"
الوسوم: {{tags}}
---

# {{title}}

- **المقدم**: {{presenter}}
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
