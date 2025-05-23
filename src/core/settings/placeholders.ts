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
	{ placeholder: "{{language}}", description: "لغة المحتوى" },
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
	{ placeholder: "{{language}}", description: "لغة المحتوى" },
];

/**
 * Placeholder documentation for book templates
 */
export const BOOK_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (كتاب)" },
	{ placeholder: "{{author}}", description: "اسم المؤلف" },
	{ placeholder: "{{pageCount}}", description: "عدد صفحات الكتاب" },
	{ placeholder: "{{date}}", description: "تاريخ الإضافة" },
	{ placeholder: "{{startDate}}", description: "تاريخ بدء القراءة" },
	{ placeholder: "{{completionDate}}", description: "تاريخ انتهاء القراءة" },
	{ placeholder: "{{publisher}}", description: "اسم الناشر" },
	{ placeholder: "{{publishYear}}", description: "سنة النشر" },
	{ placeholder: "{{tags}}", description: "قائمة الوسوم" },
	{ placeholder: "{{coverUrl}}", description: "رابط صورة الغلاف" },
	{ placeholder: "{{title}}", description: "عنوان الكتاب" },
	{ placeholder: "{{description}}", description: "وصف أو ملخص الكتاب" },
	{ placeholder: "{{categories}}", description: "تصنيفات الكتاب" },
	{ placeholder: "{{status}}", description: "حالة القراءة" },
	{ placeholder: "{{rating}}", description: "تقييم المستخدم للكتاب" },
	{ placeholder: "{{language}}", description: "لغة الكتاب" },
];

/**
 * Placeholder documentation for folder structure
 */
export const FOLDER_PLACEHOLDERS: PlaceholderDoc[] = [
	{ placeholder: "{{type}}", description: "نوع المحتوى (مقطع/سلسلة)" },
	{ placeholder: "{{presenter}}", description: "اسم الملقي" },
	{ placeholder: "{{author}}", description: "اسم المؤلف" },
	{ placeholder: "{{category}}", description: "التصنيف الأول للمحتوى" },
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
	book: BOOK_PLACEHOLDERS,
};

/**
 * Gets a folder structure example based on the pattern
 * @param structure Folder structure pattern
 * @returns Example based on the pattern
 */
export function getFolderExample(structure: string): string {
	// Common examples to demonstrate various patterns
	const examples: Record<string, string> = {
		"{{type}}/{{presenter}}": "مقطع/أحمد الشقيري",
		"{{presenter}}/{{type}}": "أحمد الشقيري/مقطع",
		"{{type}}/{{year}}": "مقطع/2023",
		"{{presenter}}/{{year}}-{{month}}": "أحمد الشقيري/2023-07",
		"{{type}}/{{presenter}}/{{date}}": "مقطع/أحمد الشقيري/2023-07-15",
		"{{type}}/{{category}}": "مقطع/دروس",
		"{{category}}/{{presenter}}": "دروس/أحمد الشقيري",
		"{{category}}/{{type}}/{{presenter}}": "دروس/مقطع/أحمد الشقيري",
		"{{type}}/{{category}}/{{presenter}}": "مقطع/دروس/أحمد الشقيري",
		"{{year}}/{{category}}": "2023/دروس",
	};

	// Check if the structure is in our common examples
	if (examples[structure]) {
		return examples[structure];
	}

	// If not found, generate a custom example
	// This helps with any custom combination of placeholders
	let customExample = structure;

	// Make replacements with sample values
	const replacements: Record<string, string> = {
		"{{type}}": "مقطع",
		"{{presenter}}": "ابن عثيمين",
		"{{author}}": "سعيد القحطاني",
		"{{date}}": "2023-07-15",
		"{{year}}": "2023",
		"{{month}}": "07",
		"{{day}}": "15",
		"{{category}}": "دروس",
	};

	// Replace all placeholders
	for (const [placeholder, value] of Object.entries(replacements)) {
		customExample = customExample.replace(
			new RegExp(placeholder, "g"),
			value
		);
	}

	return customExample;
}
