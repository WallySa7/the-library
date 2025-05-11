/**
 * Template placeholder documentation
 */
import { PlaceholderDoc } from "../types/uiTypes";

/**
 * Placeholder documentation for video templates
 */
export const VIDEO_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (فيديو/سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم المقدم" },
	{ placeholder: "{{duration}}", description: "مدة الفيديو (HH:MM:SS)" },
	{ placeholder: "{{date}}", description: "تاريخ الإضافة" },
	{ placeholder: "{{url}}", description: "رابط يوتيوب" },
	{ placeholder: "{{videoId}}", description: "معرف الفيديو" },
	{ placeholder: "{{tags}}", description: "قائمة الوسوم" },
	{ placeholder: "{{thumbnailUrl}}", description: "رابط الصورة المصغرة" },
	{ placeholder: "{{title}}", description: "عنوان الفيديو" },
	{ placeholder: "{{description}}", description: "وصف الفيديو" },
	{ placeholder: "{{categories}}", description: "تصنيفات الفيديو" },
	{ placeholder: "{{status}}", description: "حالة المشاهدة" },
];

/**
 * Placeholder documentation for playlist templates
 */
export const PLAYLIST_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم المقدم" },
	{ placeholder: "{{itemCount}}", description: "عدد المقاطع في السلسلة" },
	{ placeholder: "{{duration}}", description: "المدة الإجمالية (HH:MM:SS)" },
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
	{ placeholder: "{{type}}", description: "نوع المحتوى (فيديو/سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم المقدم" },
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
		"{{type}}/{{presenter}}": "فيديو/أحمد الشقيري",
		"{{presenter}}/{{type}}": "أحمد الشقيري/سلسلة",
		"{{type}}/{{year}}": "سلسلة/2023",
		"{{presenter}}/{{year}}-{{month}}": "أحمد الشقيري/2023-07",
		"{{type}}/{{presenter}}/{{date}}": "فيديو/أحمد الشقيري/2023-07-15",
	};

	return examples[structure] || examples["{{type}}/{{presenter}}"];
}
