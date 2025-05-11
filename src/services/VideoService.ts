/**
 * Service for managing video content
 */
import { App, TFile, Notice, TFolder } from "obsidian";
import { BaseDataService } from "./BaseDataService";
import { LibrarySettings } from "../core/settings";
import {
	VideoItem,
	PlaylistItem,
	VideoData,
	PlaylistData,
	FolderData,
} from "../core/contentTypes";
import { ImportResult } from "../core/serviceTypes";
import { formatDate } from "../utils/dateUtils";
import { sanitizeFileName } from "../utils/fileUtils";
import { renderTemplate } from "../utils/templateUtils";

/**
 * Service for video and playlist content operations
 */
export class VideoService extends BaseDataService {
	/**
	 * Creates a new VideoService
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: LibrarySettings) {
		super(app, settings);
	}

	/**
	 * Gets all video content (videos, playlists, and metadata)
	 * @returns Object containing videos, playlists and related metadata
	 */
	async getVideoContent(): Promise<{
		items: (VideoItem | PlaylistItem)[];
		presenters: string[];
		categories: string[];
		tags: string[];
	}> {
		const rootFolder = this.settings.defaultFolder;
		const folder = this.app.vault.getAbstractFileByPath(rootFolder);

		if (!folder || !(folder instanceof TFolder)) {
			return {
				items: [],
				presenters: [],
				categories: [],
				tags: [],
			};
		}

		// Find all markdown files in the library folder
		const files = this.findMarkdownFiles(folder);
		const videos: VideoItem[] = [];
		const playlists: PlaylistItem[] = [];
		const presenterSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		// Process each file
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const fm = this.parseFrontmatter(content);
				if (!fm) continue;

				const contentType = fm["النوع"];
				const presenter =
					fm["المقدم"] || this.settings.defaultPresenter;
				const title = fm["title"] || file.basename;
				const status =
					fm["الحالة"] ||
					this.settings.progressTracking.defaultStatus;
				const dateAdded =
					fm["تاريخ الإضافة"] ||
					formatDate(
						new Date(file.stat.ctime),
						this.settings.dateFormat
					);

				// Process categories and tags
				const categories = this.normalizeTags(fm["التصنيفات"]);
				const tags = this.normalizeTags(fm["الوسوم"]);

				// Track unique values
				presenterSet.add(presenter);
				categories.forEach((cat) => categorySet.add(cat));
				tags.forEach((tag) => tagSet.add(tag));

				// Add to appropriate collection
				if (contentType === "سلسلة") {
					// Process playlist
					const itemCount = parseInt(fm["عدد المقاطع"] || "0");
					const duration = fm["المدة الإجمالية"] || "00:00:00";
					const url = fm["رابط السلسلة"] || fm["رابط"] || "";
					const playlistId = fm["معرف السلسلة"] || "";
					const thumbnailUrl = fm["الصورة المصغرة"] || "";

					playlists.push({
						title,
						presenter,
						itemCount,
						duration,
						url,
						playlistId,
						filePath: file.path,
						type: contentType,
						status,
						dateAdded,
						categories,
						tags,
						thumbnailUrl,
					});
				} else {
					// Process video
					const duration = fm["المدة"] || "00:00:00";
					const url = fm["رابط"] || "";
					const videoId = fm["معرف الفيديو"] || "";
					const thumbnailUrl = fm["الصورة المصغرة"] || "";

					// Parse duration to seconds
					const [h = 0, m = 0, s = 0] = duration
						.split(":")
						.map(Number);
					const durationSeconds = h * 3600 + m * 60 + s;

					videos.push({
						title,
						presenter,
						duration,
						durationSeconds,
						url,
						videoId,
						thumbnailUrl,
						filePath: file.path,
						type: contentType || "فيديو", // Default to "فيديو"
						status,
						dateAdded,
						categories,
						tags,
					});
				}
			} catch (error) {
				console.error(`Error processing file ${file.path}:`, error);
			}
		}

		// Combine videos and playlists
		const items = [...videos, ...playlists];

		return {
			items,
			presenters: Array.from(presenterSet).sort(),
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
		};
	}

	/**
	 * Gets presenters list
	 * @returns Array of presenter names
	 */
	async getPresenters(): Promise<string[]> {
		const { presenters } = await this.getVideoContent();
		return presenters;
	}

	/**
	 * Gets categories list
	 * @returns Array of category names
	 */
	async getCategories(): Promise<string[]> {
		const { categories } = await this.getVideoContent();
		return categories;
	}

	/**
	 * Gets tags list
	 * @returns Array of tag names
	 */
	async getTags(): Promise<string[]> {
		const { tags } = await this.getVideoContent();
		return tags;
	}

	/**
	 * Creates a new video note
	 * @param data - Video data to create
	 * @returns Whether creation was successful
	 */
	async createVideo(data: VideoData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);

			// Determine status
			const status =
				data.status || this.settings.progressTracking.defaultStatus;

			// Resolve folder path based on settings
			const folderPath = await this.resolveFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
			});

			// Sanitize title for filename
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);

			const fileName = `${sanitizedTitle}.md`;
			const fullPath = `${folderPath}/${fileName}`;

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(fullPath)) {
				console.warn(`Video already exists: ${fullPath}`);
				return false;
			}

			// Render content using template
			const content = renderTemplate(this.settings.templates.video, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
				status,
			});

			// Create folder if needed
			if (!(await this.createFolderIfNeeded(folderPath))) {
				return false;
			}

			// Create file
			await this.app.vault.create(fullPath, content);
			return true;
		} catch (error) {
			console.error("Error creating video note:", error);
			return false;
		}
	}

	/**
	 * Creates a new playlist note
	 * @param data - Playlist data to create
	 * @returns Whether creation was successful
	 */
	async createPlaylist(data: PlaylistData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);
			const status =
				data.status || this.settings.progressTracking.defaultStatus;

			// Resolve folder path
			const folderPath = await this.resolveFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
			});

			// Sanitize title for filename
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);

			const fileName = `${sanitizedTitle}.md`;
			const fullPath = `${folderPath}/${fileName}`;

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(fullPath)) {
				console.warn(`Playlist already exists: ${fullPath}`);
				return false;
			}

			// Render content using template
			const content = renderTemplate(this.settings.templates.playlist, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
				status,
			});

			// Create folder if needed
			if (!(await this.createFolderIfNeeded(folderPath))) {
				return false;
			}

			// Create file
			await this.app.vault.create(fullPath, content);
			return true;
		} catch (error) {
			console.error("Error creating playlist note:", error);
			return false;
		}
	}

	/**
	 * Resolves folder path based on settings and content data
	 * @param data - Folder data for path resolution
	 * @returns Resolved folder path
	 */
	private async resolveFolderPath(data: FolderData): Promise<string> {
		// If folder organization is disabled, return default folder
		if (!this.settings.folderRules.enabled) {
			return this.settings.defaultFolder;
		}

		// Get folder structure template
		const structure =
			this.settings.folderRules.structure ||
			this.settings.folderRules.defaultStructure;

		// Create date object for replacements
		const dateObj = data.date ? new Date(data.date) : new Date();

		// Prepare replacements
		const replacements: Record<string, string> = {
			"{{type}}": data.type,
			"{{presenter}}": data.presenter || this.settings.defaultPresenter,
			"{{date}}": formatDate(dateObj, "YYYY-MM-DD"),
			"{{year}}": dateObj.getFullYear().toString(),
			"{{month}}": (dateObj.getMonth() + 1).toString().padStart(2, "0"),
			"{{day}}": dateObj.getDate().toString().padStart(2, "0"),
		};

		// Apply replacements to structure
		let folderPath = structure;
		for (const [key, value] of Object.entries(replacements)) {
			folderPath = folderPath.replace(new RegExp(key, "g"), value);
		}

		// Sanitize folder path parts
		folderPath = folderPath
			.split("/")
			.map((part) => sanitizeFileName(part))
			.join("/");

		// Prepend default folder
		return `${this.settings.defaultFolder}/${folderPath}`;
	}

	/**
	 * Updates item status
	 * @param filePath - Path to the item file
	 * @param newStatus - New status value
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, newStatus: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read file content
			const content = await this.app.vault.read(file);

			// Update status in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"الحالة",
				newStatus
			);

			// Write back to file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating status:", error);
			return false;
		}
	}

	/**
	 * Updates item tags
	 * @param filePath - Path to the item file
	 * @param tags - New tags array
	 * @returns Whether update was successful
	 */
	async updateTags(filePath: string, tags: string[]): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read file content
			const content = await this.app.vault.read(file);

			// Update tags in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"الوسوم",
				tags
			);

			// Write back to file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating tags:", error);
			return false;
		}
	}

	/**
	 * Updates item categories
	 * @param filePath - Path to the item file
	 * @param categories - New categories array
	 * @returns Whether update was successful
	 */
	async updateCategories(
		filePath: string,
		categories: string[]
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read file content
			const content = await this.app.vault.read(file);

			// Update categories in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"التصنيفات",
				categories
			);

			// Write back to file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating categories:", error);
			return false;
		}
	}

	/**
	 * Deletes an item
	 * @param filePath - Path to the item file
	 * @returns Result object with success status
	 */
	async deleteItem(
		filePath: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!file) {
				return { success: false, error: "الملف غير موجود" };
			}

			await this.app.vault.delete(file);
			return { success: true };
		} catch (error) {
			console.error("Error deleting item:", error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: "حدث خطأ أثناء الحذف",
			};
		}
	}

	/**
	 * Imports video data from JSON
	 * @param jsonData - JSON string to import
	 * @returns Import result with success and failure counts
	 */
	async importVideoData(jsonData: string): Promise<ImportResult> {
		try {
			const data = JSON.parse(jsonData);
			let success = 0;
			let failed = 0;
			const messages: string[] = [];

			// Get current content to detect duplicates
			const { items } = await this.getVideoContent();
			const existingTitles = new Set(
				items.map((item) => item.title.toLowerCase().trim())
			);

			// Process items based on format
			const itemsToProcess = Array.isArray(data.items)
				? data.items
				: [...(data.videos || []), ...(data.playlists || [])];

			if (itemsToProcess.length === 0) {
				return {
					success: 0,
					failed: 0,
					messages: ["لم يتم العثور على عناصر للاستيراد"],
				};
			}

			// Process each item
			for (const item of itemsToProcess) {
				try {
					// Skip duplicates by title
					if (existingTitles.has(item.title.toLowerCase().trim())) {
						messages.push(`تم تخطي التكرار: ${item.title}`);
						failed++;
						continue;
					}

					let result = false;

					// If item has content, create file directly
					if (item.content) {
						const folderPath = await this.resolveFolderPath({
							type: item.type,
							presenter: item.presenter,
							date: item.dateAdded,
						});

						await this.createFolderIfNeeded(folderPath);

						const sanitizedTitle = sanitizeFileName(
							item.title,
							this.settings.maxTitleLength
						);

						const fileName = `${sanitizedTitle}.md`;
						const filePath = `${folderPath}/${fileName}`;

						if (!this.app.vault.getAbstractFileByPath(filePath)) {
							await this.app.vault.create(filePath, item.content);
							result = true;
						}
					}
					// Create note based on item type
					else if (item.type === "سلسلة") {
						result = await this.createPlaylist({
							url: item.url,
							playlistId: item.playlistId || "",
							title: item.title,
							presenter: item.presenter,
							type: item.type,
							itemCount: item.itemCount || 0,
							duration: item.duration || "00:00:00",
							status: item.status,
							thumbnailUrl: item.thumbnailUrl,
							tags: item.tags || [],
							categories: item.categories || [],
						});
					} else {
						result = await this.createVideo({
							url: item.url,
							videoId: item.videoId || "",
							title: item.title,
							duration: item.duration || "00:00:00",
							presenter: item.presenter,
							type: item.type || "فيديو",
							description: item.description || "",
							tags: item.tags || [],
							thumbnailUrl: item.thumbnailUrl || "",
							status: item.status,
							categories: item.categories || [],
						});
					}

					if (result) {
						success++;
					} else {
						failed++;
					}
				} catch (error) {
					console.error(`Error importing item: ${item.title}`, error);
					messages.push(`فشل استيراد: ${item.title}`);
					failed++;
				}
			}

			return { success, failed, messages };
		} catch (error) {
			console.error("Error parsing import data:", error);
			return {
				success: 0,
				failed: 1,
				messages: ["صيغة ملف الاستيراد غير صالحة"],
			};
		}
	}

	/**
	 * Exports videos to JSON format
	 * @param selectedPaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportToJson(selectedPaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedPaths.length > 0
				? items.filter((item) => selectedPaths.includes(item.filePath))
				: items;

		// Prepare export data
		const exportData = {
			items: filteredItems,
			exportDate: new Date().toISOString(),
			version: "1.0",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos with full content to JSON
	 * @param selectedPaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data with content
	 */
	async exportWithContent(selectedPaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedPaths.length > 0
				? items.filter((item) => selectedPaths.includes(item.filePath))
				: items;

		// Add content to each item
		const itemsWithContent = await Promise.all(
			filteredItems.map(async (item) => {
				try {
					const file = this.app.vault.getAbstractFileByPath(
						item.filePath
					);
					if (file instanceof TFile) {
						const content = await this.app.vault.read(file);
						return { ...item, content };
					}
					return item;
				} catch (error) {
					console.error(
						`Error reading content for ${item.filePath}:`,
						error
					);
					return item;
				}
			})
		);

		// Prepare export data
		const exportData = {
			items: itemsWithContent,
			exportDate: new Date().toISOString(),
			version: "1.1",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos to CSV format
	 * @param selectedPaths - Optional paths to export (all if empty)
	 * @returns CSV string
	 */
	async exportToCsv(selectedPaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedPaths.length > 0
				? items.filter((item) => selectedPaths.includes(item.filePath))
				: items;

		// Create CSV header
		const header =
			"العنوان,المقدم,النوع,الحالة,المدة,رابط,تاريخ الإضافة,الوسوم,التصنيفات\n";

		// Helper function to prepare CSV fields
		const escapeField = (value: any): string => {
			if (value === null || value === undefined) return "";
			const str = String(value);
			// Escape quotes and wrap in quotes if needed
			if (str.includes('"') || str.includes(",")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		// Convert all items to CSV rows
		const rows = filteredItems
			.map((item) => {
				return [
					escapeField(item.title),
					escapeField("presenter" in item ? item.presenter : ""),
					escapeField(item.type),
					escapeField(item.status),
					escapeField("duration" in item ? item.duration : ""),
					escapeField("url" in item ? item.url : ""),
					escapeField(item.dateAdded),
					escapeField(
						Array.isArray(item.tags) ? item.tags.join("; ") : ""
					),
					escapeField(
						Array.isArray(item.categories)
							? item.categories.join("; ")
							: ""
					),
				].join(",");
			})
			.join("\n");

		return header + rows;
	}
}
