/**
 * Template placeholder documentation
 */
import { PlaceholderDoc } from "../uiTypes";

/**
 * Placeholder documentation for video templates
 */
export const VIDEO_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (مقطع/سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم الملقي" },
	{ placeholder: "{{duration}}", description: "مدة المقطع (HH:MM:SS)" },
	{ placeholder: "{{date}}", description: "تاريخ الإضافة" },
	{ placeholder: "{{startDate}}", description: "تاريخ بدء المشاهدة" },
	{ placeholder: "{{completionDate}}", description: "تاريخ انتهاء المشاهدة" },
	{ placeholder: "{{url}}", description: "رابط يوتيوب" },
	{ placeholder: "{{videoId}}", description: "معرف المقطع" },
	{ placeholder: "{{tags}}", description: "قائمة الوسوم" },
	{ placeholder: "{{thumbnailUrl}}", description: "رابط الصورة المصغرة" },
	{ placeholder: "{{title}}", description: "عنوان المقطع" },
	{ placeholder: "{{description}}", description: "وصف المقطع" },
	{ placeholder: "{{categories}}", description: "تصنيفات المقطع" },
	{ placeholder: "{{status}}", description: "حالة المشاهدة" },
];

/**
 * Placeholder documentation for playlist templates
 */
export const PLAYLIST_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم الملقي" },
	{ placeholder: "{{itemCount}}", description: "عدد المقاطع في السلسلة" },
	{ placeholder: "{{duration}}", description: "المدة الإجمالية (HH:MM:SS)" },
	{ placeholder: "{{startDate}}", description: "تاريخ بدء المشاهدة" },
	{ placeholder: "{{completionDate}}", description: "تاريخ انتهاء المشاهدة" },
	{ placeholder: "{{url}}", description: "رابط السلسلة" },
	{ placeholder: "{{playlistId}}", description: "معرف السلسلة" },
	{ placeholder: "{{date}}", description: "تاريخ الإضافة" },
	{ placeholder: "{{title}}", description: "عنوان السلسلة" },
	{ placeholder: "{{thumbnailUrl}}", description: "رابط الصورة المصغرة" },
	{ placeholder: "{{categories}}", description: "تصنيفات السلسلة" },
	{ placeholder: "{{tags}}", description: "وسوم السلسلة" },
	{ placeholder: "{{status}}", description: "حالة المشاهدة" },
];

/**
 * Placeholder documentation for folder structure
 */
export const FOLDER_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (مقطع/سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم الملقي" },
	{ placeholder: "{{date}}", description: "تاريخ الإضافة (YYYY-MM-DD)" },
	{ placeholder: "{{year}}", description: "السنة فقط" },
	{ placeholder: "{{month}}", description: "الشهر فقط" },
	{ placeholder: "{{day}}", description: "اليوم فقط" },
];

/**
 * Mapping of template types to their placeholder documentation
 */
export const PLACEHOLDER_DOCS: Record<string, PlaceholderDoc[]> = {
	video: VIDEO_PLACEHOLDERS,
	playlist: PLAYLIST_PLACEHOLDERS,
	folder: FOLDER_PLACEHOLDERS,
};

/**
 * Gets a folder structure example based on the pattern
 * @param structure Folder structure pattern
 * @returns Example based on the pattern
 */
export function getFolderExample(structure: string): string {
	const examples: Record<string, string> = {
		"{{type}}/{{presenter}}": "مقطع/أحمد الشقيري",
		"{{presenter}}/{{type}}": "أحمد الشقيري/سلسلة",
		"{{type}}/{{year}}": "سلسلة/2023",
		"{{presenter}}/{{year}}-{{month}}": "أحمد الشقيري/2023-07",
		"{{type}}/{{presenter}}/{{date}}": "مقطع/أحمد الشقيري/2023-07-15",
	};

	return examples[structure] || examples["{{type}}/{{presenter}}"];
}
