// src/core/settings/defaults.ts
import { AlRawiSettings, TableColumnConfig } from "./types";

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
 * Default video template
 */
export const DEFAULT_VIDEO_TEMPLATE = `---
النوع: {{type}}
الملقي: {{presenter}}
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
- **الملقي:** {{presenter}}
- **الحالة:** {{status}}

[مشاهدة على اليوتيوب]({{url}})`;

/**
 * Default playlist template
 */
export const DEFAULT_PLAYLIST_TEMPLATE = `---
title: "{{title}}"
رابط السلسلة: "{{url}}"
معرف السلسلة: "{{playlistId}}"
الملقي: "{{presenter}}"
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

- **الملقي**: {{presenter}}
- **عدد المقاطع**: {{itemCount}}
- **المدة الإجمالية**: {{duration}}
- **الحالة**: {{status}}
- **تاريخ الإضافة**: {{date}}


## الرابط
[مشاهدة السلسلة على اليوتيوب]({{url}})

## الفوائد`;

/**
 * Default settings for Al-Rawi plugin
 */
export const DEFAULT_SETTINGS: AlRawiSettings = {
	youtubeApiKey: "",
	defaultFolder: "Al-Rawi Videos",
	defaultPresenter: "غير معروف",
	dateFormat: "YYYY-MM-DD",
	showThumbnailsInStats: true,
	maxTitleLength: 100,
	tableColumns: {
		videos: DEFAULT_VIDEO_COLUMNS,
	},
	videosProgressTracking: {
		defaultStatus: "لم يشاهد",
		statusOptions: [
			"في قائمة الانتظار",
			"تمت المشاهدة",
			"قيد المشاهدة",
			"لم يشاهد",
		],
	},
	templates: {
		video: DEFAULT_VIDEO_TEMPLATE,
		playlist: DEFAULT_PLAYLIST_TEMPLATE,
	},
	folderRules: {
		enabled: true,
		structure: "{{type}}/{{presenter}}",
		defaultStructure: "{{type}}/{{presenter}}",
		showExamples: true,
	},
	viewMode: "table",
};
