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
	VIDEO_FRONTMATTER,
	BOOK_FRONTMATTER,
	DEFAULT_VIDEO_STATUS,
	DEFAULT_VIDEO_STATUS_OPTIONS,
	DEFAULT_BOOK_STATUS,
	DEFAULT_BOOK_STATUS_OPTIONS,
} from "../constants";
import { BenefitShareOptions } from "../contentTypes";

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
		id: "language",
		enabled: true,
		order: 5,
		label: "اللغة",
		sortKey: "language",
	},
	{
		id: "duration",
		enabled: true,
		order: 6,
		label: "المدة",
		sortKey: "duration",
	},
	{
		id: "startDate",
		enabled: false,
		order: 7,
		label: "تاريخ البدء",
		sortKey: "startDate",
	},
	{
		id: "completionDate",
		enabled: false,
		order: 8,
		label: "تاريخ الانتهاء",
		sortKey: "completionDate",
	},
	{ id: "tags", enabled: false, order: 9, label: "الوسوم" },
	{ id: "categories", enabled: false, order: 10, label: "التصنيفات" },
	{
		id: "dateAdded",
		enabled: true,
		order: 11,
		label: "تاريخ الإضافة",
		sortKey: "dateAdded",
	},
	{ id: "actions", enabled: true, order: 12, label: "إجراءات" },
];

/**
 * Default table columns for books
 */
export const DEFAULT_BOOK_COLUMNS: TableColumnConfig[] = [
	{ id: "checkbox", enabled: true, order: 0, label: "" },
	{
		id: "title",
		enabled: true,
		order: 1,
		label: "العنوان",
		sortKey: "title",
	},
	{
		id: "author",
		enabled: true,
		order: 2,
		label: "المؤلف",
		sortKey: "author",
	},
	{ id: "type", enabled: false, order: 3, label: "النوع", sortKey: "type" },
	{
		id: "status",
		enabled: true,
		order: 4,
		label: "الحالة",
		sortKey: "status",
	},
	{
		id: "language",
		enabled: true,
		order: 5,
		label: "اللغة",
		sortKey: "language",
	},
	{
		id: "pageCount",
		enabled: true,
		order: 6,
		label: "عدد الصفحات",
		sortKey: "pageCount",
	},
	{
		id: "publisher",
		enabled: false,
		order: 7,
		label: "الناشر",
		sortKey: "publisher",
	},
	{
		id: "publishYear",
		enabled: false,
		order: 8,
		label: "سنة النشر",
		sortKey: "publishYear",
	},
	{
		id: "startDate",
		enabled: false,
		order: 9,
		label: "تاريخ البدء",
		sortKey: "startDate",
	},
	{
		id: "completionDate",
		enabled: false,
		order: 10,
		label: "تاريخ الانتهاء",
		sortKey: "completionDate",
	},
	{
		id: "rating",
		enabled: true,
		order: 11,
		label: "التقييم",
		sortKey: "rating",
	},
	{ id: "tags", enabled: false, order: 12, label: "الوسوم" },
	{ id: "categories", enabled: false, order: 13, label: "التصنيفات" },
	{
		id: "dateAdded",
		enabled: true,
		order: 14,
		label: "تاريخ الإضافة",
		sortKey: "dateAdded",
	},
	{ id: "actions", enabled: true, order: 15, label: "إجراءات" },
];

/**
 * Default progress tracking settings
 */
export const DEFAULT_VIDEO_TRACKING: ProgressTrackingSettings = {
	defaultStatus: DEFAULT_VIDEO_STATUS,
	statusOptions: DEFAULT_VIDEO_STATUS_OPTIONS,
};

/**
 * Default book tracking settings
 */
export const DEFAULT_BOOK_TRACKING: ProgressTrackingSettings = {
	defaultStatus: DEFAULT_BOOK_STATUS,
	statusOptions: DEFAULT_BOOK_STATUS_OPTIONS,
};

/**
 * Default folder rules settings
 */
export const DEFAULT_VIDEO_FOLDER_RULES: FolderRulesSettings = {
	enabled: true,
	structure: "{{type}}/{{presenter}}",
	defaultStructure: "{{type}}/{{presenter}}",
};

/**
 * Default folder rules for books
 */
export const DEFAULT_BOOK_FOLDER_RULES: FolderRulesSettings = {
	enabled: true,
	structure: "{{type}}/{{author}}",
	defaultStructure: "{{type}}/{{author}}",
};

/**
 * Default video template
 */
export const DEFAULT_VIDEO_TEMPLATE = `---
${VIDEO_FRONTMATTER.TYPE}: {{type}}
${VIDEO_FRONTMATTER.TITLE}: "{{title}}"
${VIDEO_FRONTMATTER.PRESENTER}: {{presenter}}
${VIDEO_FRONTMATTER.DURATION}: {{duration}}
${VIDEO_FRONTMATTER.URL}: {{url}}
${VIDEO_FRONTMATTER.TAGS}:
{{tags}}
${VIDEO_FRONTMATTER.CATEGORIES}:
{{categories}}
${VIDEO_FRONTMATTER.STATUS}: {{status}}
${VIDEO_FRONTMATTER.LANGUAGE}: {{language}}
${VIDEO_FRONTMATTER.THUMBNAIL}: {{thumbnailUrl}}
${VIDEO_FRONTMATTER.VIDEO_ID}: {{videoId}}
${VIDEO_FRONTMATTER.DATE_ADDED}: {{date}}
${VIDEO_FRONTMATTER.START_DATE}: {{startDate}}
${VIDEO_FRONTMATTER.COMPLETION_DATE}: {{completionDate}}
---

# {{title}}

{{description}}

## تفاصيل المقطع
- **المدة:** {{duration}}
- **النوع:** {{type}}
- **الملقي:** {{presenter}}
- **الحالة:** {{status}}
- **اللغة:** {{language}}
{{#if startDate}}- **تاريخ البدء:** {{startDate}}{{/if}}
{{#if completionDate}}- **تاريخ الانتهاء:** {{completionDate}}{{/if}}

[مشاهدة على يوتيوب]({{url}})


## الفوائد`;

/**
 * Default playlist template
 */
export const DEFAULT_PLAYLIST_TEMPLATE = `---
${VIDEO_FRONTMATTER.TYPE}: "{{type}}"
${VIDEO_FRONTMATTER.TITLE}: "{{title}}"
${VIDEO_FRONTMATTER.PRESENTER}: "{{presenter}}"
${VIDEO_FRONTMATTER.TOTAL_DURATION}: "{{duration}}"
${VIDEO_FRONTMATTER.ITEM_COUNT}: {{itemCount}}
${VIDEO_FRONTMATTER.PLAYLIST_URL}: "{{url}}"
${VIDEO_FRONTMATTER.TAGS}:
{{tags}}
${VIDEO_FRONTMATTER.CATEGORIES}:
{{categories}}
${VIDEO_FRONTMATTER.STATUS}: "{{status}}"
${VIDEO_FRONTMATTER.LANGUAGE}: "{{language}}"
${VIDEO_FRONTMATTER.THUMBNAIL}: "{{thumbnailUrl}}"
${VIDEO_FRONTMATTER.PLAYLIST_ID}: "{{playlistId}}"
${VIDEO_FRONTMATTER.DATE_ADDED}: "{{dateAdded}}"
${VIDEO_FRONTMATTER.START_DATE}: "{{startDate}}"
${VIDEO_FRONTMATTER.COMPLETION_DATE}: "{{completionDate}}"
---

# {{title}}

## تفاصيل السلسلة
- **الملقي**: {{presenter}}
- **عدد المقاطع**: {{itemCount}}
- **المدة الإجمالية**: {{duration}}
- **الحالة**: {{status}}
- **اللغة**: {{language}}
- **تاريخ الإضافة**: {{date}}
{{#if startDate}}- **تاريخ البدء**: {{startDate}}{{/if}}
{{#if completionDate}}- **تاريخ الانتهاء**: {{completionDate}}{{/if}}

## الرابط
[مشاهدة السلسلة على يوتيوب]({{url}})

## الفوائد`;

/**
 * Default book template
 */
export const DEFAULT_BOOK_TEMPLATE = `---
${BOOK_FRONTMATTER.TYPE}: {{type}}
${BOOK_FRONTMATTER.TITLE}: "{{title}}"
${BOOK_FRONTMATTER.AUTHOR}: {{author}}
${BOOK_FRONTMATTER.PAGE_COUNT}: {{pageCount}}
${BOOK_FRONTMATTER.PUBLISHER}: {{publisher}}
${BOOK_FRONTMATTER.PUBLISH_YEAR}: {{publishYear}}
${BOOK_FRONTMATTER.RATING}: {{rating}}
${BOOK_FRONTMATTER.TAGS}:
{{tags}}
${BOOK_FRONTMATTER.CATEGORIES}:
{{categories}}
${BOOK_FRONTMATTER.STATUS}: {{status}}
${BOOK_FRONTMATTER.LANGUAGE}: {{language}}
${BOOK_FRONTMATTER.COVER}: {{coverUrl}}
${BOOK_FRONTMATTER.DATE_ADDED}: {{date}}
${BOOK_FRONTMATTER.START_DATE}: {{startDate}}
${BOOK_FRONTMATTER.COMPLETION_DATE}: {{completionDate}}
---

# {{title}}

{{description}}

## معلومات الكتاب
- **المؤلف:** {{author}}
- **عدد الصفحات:** {{pageCount}}
- **الناشر:** {{publisher}}
- **سنة النشر:** {{publishYear}}
- **اللغة:** {{language}}
- **الحالة:** {{status}}
{{#if startDate}}- **تاريخ البدء:** {{startDate}}{{/if}}
{{#if completionDate}}- **تاريخ الانتهاء:** {{completionDate}}{{/if}}
{{#if rating}}- **التقييم:** {{rating}}/5{{/if}}

## الملخص

{{description}}

## ملاحظات القراءة

`;

/**
 * Default template settings
 */
export const DEFAULT_TEMPLATES: TemplateSettings = {
	video: DEFAULT_VIDEO_TEMPLATE,
	playlist: DEFAULT_PLAYLIST_TEMPLATE,
	book: DEFAULT_BOOK_TEMPLATE,
};

/**
 * Default share options
 */
export const DEFAULT_SHARE_OPTIONS: BenefitShareOptions = {
	backgroundColor: "#1e1e1e",
	textColor: "#ffffff",
	fontFamily: "Arial, sans-serif",
	fontSize: 18,
	includeMetadata: true,
	includeTags: true,
	includeAuthor: true,
	includeParentTitle: true,
	width: 800,
	padding: 40,
};

/**
 * Default settings for The Library plugin
 */
export const DEFAULT_SETTINGS: LibrarySettings = {
	youtubeApiKey: "",
	videosFolder: "الفيديوهات",
	booksFolder: "الكتب",
	defaultPresenter: "غير معروف",
	defaultAuthor: "غير معروف",
	dateFormat: "YYYY-MM-DD",
	showVideosThumbnails: true,
	showBooksThumbnails: true,
	maxTitleLength: 100,
	tableColumns: {
		video: DEFAULT_VIDEO_COLUMNS,
		book: DEFAULT_BOOK_COLUMNS,
	},
	videoTracking: DEFAULT_VIDEO_TRACKING,
	bookTracking: DEFAULT_BOOK_TRACKING,
	templates: DEFAULT_TEMPLATES,
	videoFolderRules: DEFAULT_VIDEO_FOLDER_RULES,
	bookFolderRules: DEFAULT_BOOK_FOLDER_RULES,
	viewMode: "table",
};
