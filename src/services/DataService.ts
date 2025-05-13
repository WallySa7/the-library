/**
 * Core data service for managing library content
 * Provides methods for CRUD operations on videos, playlists, and more
 */
import { App, TFile, TFolder, Notice } from "obsidian";
import { BaseDataService } from "./BaseDataService";
import { LibrarySettings } from "../core/settings";
import {
	LibraryItem,
	VideoItem,
	PlaylistItem,
	VideoData,
	PlaylistData,
	FolderData,
} from "../core/contentTypes";
import {
	ContentType,
	BulkOperation,
	BulkOperationResult,
	ImportResult,
} from "../core";
import { CONTENT_TYPE } from "../core/constants";
import { sanitizeFileName, formatDate, renderTemplate } from "../utils";

/**
 * Core data service for all library content operations
 * Manages data for videos, playlists, books, and benefits
 */
export class DataService extends BaseDataService {
	/**
	 * Creates a new DataService
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: LibrarySettings) {
		super(app, settings);
	}

	/**
	 * Gets all video content including videos, playlists, and related metadata
	 * @returns Object containing content items and metadata
	 */
	async getVideoContent(): Promise<{
		items: LibraryItem[];
		presenters: string[];
		categories: string[];
		tags: string[];
	}> {
		const rootFolder = this.settings.defaultFolder;
		const folder = this.app.vault.getAbstractFileByPath(rootFolder);

		// Handle case where content folder doesn't exist
		if (!folder || !(folder instanceof TFolder)) {
			return {
				items: [],
				presenters: [],
				categories: [],
				tags: [],
			};
		}

		// Find all markdown files in the folder and subfolders
		const files = this.findMarkdownFiles(folder);
		const items: LibraryItem[] = [];
		const presenterSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		// Process each file to extract content data
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const frontmatter = this.parseFrontmatter(content);
				if (!frontmatter) continue;

				// Common properties
				const fileType = frontmatter["النوع"]; // Type property in Arabic
				const presenter =
					frontmatter["المقدم"] || this.settings.defaultPresenter;
				const title = frontmatter["title"] || file.basename;
				const url =
					frontmatter["رابط"] || frontmatter["رابط السلسلة"] || "";
				const status =
					frontmatter["الحالة"] ||
					this.settings.progressTracking.defaultStatus;
				const dateAdded =
					frontmatter["تاريخ الإضافة"] ||
					formatDate(
						new Date(file.stat.ctime),
						this.settings.dateFormat
					);

				// Process categories and tags
				const categories = this.normalizeTags(frontmatter["التصنيفات"]);
				const tags = this.normalizeTags(frontmatter["الوسوم"]);

				// Track unique values for collections
				presenterSet.add(presenter);
				categories.forEach((cat) => categorySet.add(cat));
				tags.forEach((tag) => tagSet.add(tag));

				// Process as playlist/series
				if (fileType === "سلسلة") {
					const playlistId = frontmatter["معرف السلسلة"] || "";
					const itemCount = parseInt(frontmatter["عدد المقاطع"]) || 0;
					const duration =
						frontmatter["المدة الإجمالية"] || "00:00:00";
					const thumbnailUrl = frontmatter["الصورة المصغرة"] || "";

					items.push({
						title,
						presenter,
						itemCount,
						duration,
						url,
						playlistId,
						filePath: file.path,
						type: fileType,
						status,
						dateAdded,
						categories,
						tags,
						thumbnailUrl,
					});
				}
				// Process as regular video
				else {
					const videoId = frontmatter["معرف المقطع"] || "";
					const duration = frontmatter["المدة"] || "00:00:00";
					const thumbnailUrl = frontmatter["الصورة المصغرة"] || "";

					// Parse duration to seconds
					const [h = 0, m = 0, s = 0] = duration
						.split(":")
						.map(Number);
					const durationSeconds = h * 3600 + m * 60 + s;

					items.push({
						title,
						presenter,
						duration,
						durationSeconds,
						url,
						videoId,
						thumbnailUrl,
						filePath: file.path,
						type: fileType || "مقطع", // Default to "video" in Arabic
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

		return {
			items,
			presenters: Array.from(presenterSet).sort(),
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
		};
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
			const status =
				data.status || this.settings.progressTracking.defaultStatus;

			// Resolve folder path based on folder rules
			const folderPath = await this.resolveFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
			});

			// Create sanitized filename
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);
			const fileName = `${sanitizedTitle}.md`;
			const fullPath = `${folderPath}/${fileName}`;

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(fullPath)) {
				console.log(`Video already exists: ${fullPath}`);
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

			// Resolve folder path based on folder rules
			const folderPath = await this.resolveFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
			});

			// Create sanitized filename
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);
			const fileName = `${sanitizedTitle}.md`;
			const fullPath = `${folderPath}/${fileName}`;

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(fullPath)) {
				console.log(`Playlist already exists: ${fullPath}`);
				return false;
			}

			// Render content using playlist template
			const content = renderTemplate(this.settings.templates.playlist, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				status,
				thumbnailUrl: data.thumbnailUrl || "",
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
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
	 * Resolves folder path based on settings and data
	 * @param data - Folder data for path resolution
	 * @returns Resolved folder path
	 */
	async resolveFolderPath(data: FolderData): Promise<string> {
		// If folder organization is disabled, return the default folder
		if (!this.settings.folderRules.enabled) {
			return this.settings.defaultFolder;
		}

		const dateObj = data.date ? new Date(data.date) : new Date();
		const replacements: Record<string, string> = {
			"{{type}}": data.type,
			"{{presenter}}": data.presenter || this.settings.defaultPresenter,
			"{{date}}": formatDate(dateObj, "YYYY-MM-DD"),
			"{{year}}": dateObj.getFullYear().toString(),
			"{{month}}": (dateObj.getMonth() + 1).toString().padStart(2, "0"),
			"{{day}}": dateObj.getDate().toString().padStart(2, "0"),
		};

		// Apply all replacements to folder structure
		let folderPath = this.settings.folderRules.structure;
		for (const [key, value] of Object.entries(replacements)) {
			folderPath = folderPath.replace(new RegExp(key, "g"), value);
		}

		// Sanitize folder names
		folderPath = folderPath
			.split("/")
			.map((part: string) => sanitizeFileName(part))
			.join("/");

		return `${this.settings.defaultFolder}/${folderPath}`;
	}

	/**
	 * Gets list of existing presenters
	 * @returns Array of presenter names
	 */
	async getPresenters(): Promise<string[]> {
		const { presenters } = await this.getVideoContent();
		return presenters;
	}

	/**
	 * Gets list of existing categories for content type
	 * @param contentType - Content type
	 * @returns Array of category names
	 */
	async getCategories(contentType: ContentType): Promise<string[]> {
		if (contentType === CONTENT_TYPE.VIDEO) {
			const { categories } = await this.getVideoContent();
			return categories;
		}
		return [];
	}

	/**
	 * Gets list of existing tags for content type
	 * @param contentType - Content type
	 * @returns Array of tag names
	 */
	async getTags(contentType: ContentType): Promise<string[]> {
		if (contentType === CONTENT_TYPE.VIDEO) {
			const { tags } = await this.getVideoContent();
			return tags;
		}
		return [];
	}

	/**
	 * Updates item status
	 * @param filePath - Path to the file
	 * @param newStatus - New status value
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, newStatus: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the status in frontmatter using our helper
			const updatedContent = this.updateFrontmatter(
				content,
				"الحالة",
				newStatus
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating status:", error);
			return false;
		}
	}

	/**
	 * Updates item tags
	 * @param filePath - Path to the file
	 * @param tags - Array of tags
	 * @returns Whether update was successful
	 */
	async updateTags(filePath: string, tags: string[]): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Format tags for YAML
			const tagsValue = tags.join(", ");

			// Update tags in frontmatter using our helper
			const updatedContent = this.updateFrontmatter(
				content,
				"الوسوم",
				tagsValue
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating tags:", error);
			return false;
		}
	}

	/**
	 * Updates item categories
	 * @param filePath - Path to the file
	 * @param categories - Array of categories
	 * @returns Whether update was successful
	 */
	async updateCategories(
		filePath: string,
		categories: string[]
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Format categories for YAML
			const categoriesValue = categories.join(", ");

			// Update categories in frontmatter using our helper
			const updatedContent = this.updateFrontmatter(
				content,
				"التصنيفات",
				categoriesValue
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating categories:", error);
			return false;
		}
	}

	/**
	 * Deletes a content item
	 * @param filePath - Path to the file to delete
	 * @returns Result object with success status
	 */
	async deleteItem(
		filePath: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!file) {
				return { success: false, error: "File not found" };
			}

			await this.app.vault.delete(file);
			return { success: true };
		} catch (error) {
			console.error("Error deleting item:", error);
			return {
				success: false,
				error: error.message || "Error deleting item",
			};
		}
	}

	/**
	 * Performs bulk operations on multiple items
	 * @param operation - Bulk operation configuration
	 * @returns Result with success and failure counts
	 */
	async performBulkOperation(
		operation: BulkOperation
	): Promise<BulkOperationResult> {
		let success = 0;
		let failed = 0;

		for (const filePath of operation.itemPaths) {
			let result = false;

			switch (operation.type) {
				case "status":
					if (operation.value) {
						result = await this.updateStatus(
							filePath,
							operation.value
						);
					}
					break;

				case "tag":
					if (operation.value) {
						const file =
							this.app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							const content = await this.app.vault.read(file);
							const frontmatter = this.parseFrontmatter(content);
							const currentTags = this.normalizeTags(
								frontmatter?.["الوسوم"]
							);

							if (!currentTags.includes(operation.value)) {
								currentTags.push(operation.value);
								result = await this.updateTags(
									filePath,
									currentTags
								);
							} else {
								result = true; // Tag already exists
							}
						}
					}
					break;

				case "category":
					if (operation.value) {
						const file =
							this.app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							const content = await this.app.vault.read(file);
							const frontmatter = this.parseFrontmatter(content);
							const currentCategories = this.normalizeTags(
								frontmatter?.["التصنيفات"]
							);

							if (!currentCategories.includes(operation.value)) {
								currentCategories.push(operation.value);
								result = await this.updateCategories(
									filePath,
									currentCategories
								);
							} else {
								result = true; // Category already exists
							}
						}
					}
					break;

				case "delete":
					const deleteResult = await this.deleteItem(filePath);
					result = deleteResult.success;
					break;
			}

			if (result) {
				success++;
			} else {
				failed++;
			}
		}

		return { success, failed };
	}

	/**
	 * Gets list of presenters from existing content
	 * @returns Array of presenter names
	 */
	async getPresenterList(): Promise<string[]> {
		return this.getPresenters();
	}

	/**
	 * Performs bulk status update on multiple items
	 * @param itemPaths - Paths to the items to update
	 * @param status - New status value
	 * @returns Result with success and failure counts
	 */
	async bulkUpdateStatus(
		itemPaths: string[],
		status: string
	): Promise<BulkOperationResult> {
		return this.performBulkOperation({
			type: "status",
			value: status,
			itemPaths,
		});
	}

	/**
	 * Adds a tag to multiple items
	 * @param itemPaths - Paths to the items to update
	 * @param tag - Tag to add
	 * @returns Result with success and failure counts
	 */
	async bulkAddTag(
		itemPaths: string[],
		tag: string
	): Promise<BulkOperationResult> {
		return this.performBulkOperation({
			type: "tag",
			value: tag,
			itemPaths,
		});
	}

	/**
	 * Updates categories for multiple items
	 * @param itemPaths - Paths to the items to update
	 * @param categories - Categories to set or add
	 * @param mode - Whether to replace or append categories
	 * @returns Result with success and failure counts
	 */
	async bulkUpdateCategories(
		itemPaths: string[],
		categories: string[],
		mode: "replace" | "append" = "replace"
	): Promise<BulkOperationResult> {
		let success = 0;
		let failed = 0;

		for (const filePath of itemPaths) {
			try {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (!(file instanceof TFile)) {
					failed++;
					continue;
				}

				const content = await this.app.vault.read(file);
				const frontmatter = this.parseFrontmatter(content);

				let updatedCategories: string[];
				if (mode === "append" && frontmatter?.["التصنيفات"]) {
					// Get current categories and add new ones without duplicates
					const currentCategories = this.normalizeTags(
						frontmatter["التصنيفات"]
					);
					updatedCategories = [
						...new Set([...currentCategories, ...categories]),
					];
				} else {
					// Replace mode - just use the new categories
					updatedCategories = [...categories];
				}

				const result = await this.updateCategories(
					filePath,
					updatedCategories
				);

				if (result) {
					success++;
				} else {
					failed++;
				}
			} catch (error) {
				console.error(
					`Error updating categories for ${filePath}:`,
					error
				);
				failed++;
			}
		}

		return { success, failed };
	}

	/**
	 * Performs bulk deletion of multiple items
	 * @param itemPaths - Paths to the items to delete
	 * @returns Result with success and failure counts
	 */
	async bulkDelete(itemPaths: string[]): Promise<BulkOperationResult> {
		return this.performBulkOperation({
			type: "delete",
			itemPaths,
		});
	}

	/**
	 * Delegates to VideoService.importVideoData if available
	 * @param jsonData - JSON data to import
	 * @returns Import result
	 */
	async importVideoData(jsonData: string): Promise<ImportResult> {
		// Otherwise use existing importVideos function
		return this.importVideos(jsonData);
	}
	/**
	 * Imports videos data from JSON
	 * @param jsonData - JSON string with video data
	 * @returns Import result with success and failure counts
	 */
	async importVideos(jsonData: string): Promise<ImportResult> {
		try {
			const data = JSON.parse(jsonData);
			let success = 0;
			let failed = 0;
			const messages: string[] = [];

			// Get current items to detect duplicates
			const { items } = await this.getVideoContent();
			const existingTitles = new Set(
				items.map((item) => item.title.toLowerCase().trim())
			);

			// Handle format with 'items' array (full content export)
			if (Array.isArray(data.items)) {
				for (const item of data.items) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(item.title.toLowerCase().trim())
						) {
							messages.push(
								`تم تخطي العنصر "${item.title}" (موجود مسبقاً)`
							);
							failed++;
							continue;
						}

						let result = false;

						// If item has complete content, create file directly
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

							await this.app.vault.create(filePath, item.content);
							result = true;
						}
						// Otherwise create from item data
						else if (item.type === "سلسلة") {
							result = await this.createPlaylist({
								url: item.url,
								playlistId: item.playlistId || "",
								title: item.title,
								presenter: item.presenter,
								type: item.type,
								itemCount: item.itemCount || 0,
								duration: item.duration,
								status: item.status,
								thumbnailUrl: item.thumbnailUrl,
								tags: item.tags,
								categories: item.categories,
							});
						} else {
							result = await this.createVideo({
								url: item.url,
								videoId: item.videoId || "",
								title: item.title,
								duration: item.duration,
								presenter: item.presenter,
								type: item.type || "مقطع",
								description: item.description || "",
								tags: item.tags || [],
								thumbnailUrl: item.thumbnailUrl || "",
								status: item.status,
								categories: item.categories,
							});
						}

						if (result) success++;
						else {
							failed++;
							messages.push(`فشل استيراد "${item.title}"`);
						}
					} catch (e) {
						console.error("Error importing item:", e);
						failed++;
						messages.push(`خطأ في استيراد العنصر: ${e.message}`);
					}
				}
			}
			// Handle separate videos and playlists arrays (older format)
			else {
				if (Array.isArray(data.videos)) {
					for (const video of data.videos) {
						try {
							// Skip duplicates
							if (
								existingTitles.has(
									video.title.toLowerCase().trim()
								)
							) {
								messages.push(
									`تم تخطي "${video.title}" (موجود مسبقاً)`
								);
								failed++;
								continue;
							}

							const result = await this.createVideo({
								url: video.url,
								videoId: video.videoId || "",
								title: video.title,
								duration: video.duration,
								presenter: video.presenter,
								type: video.type || "مقطع",
								description: video.description || "",
								tags: video.tags || [],
								thumbnailUrl: video.thumbnailUrl || "",
								status: video.status,
								categories: video.categories,
							});

							if (result) success++;
							else {
								failed++;
								messages.push(`فشل استيراد "${video.title}"`);
							}
						} catch (e) {
							console.error("Error importing video:", e);
							failed++;
							messages.push(
								`خطأ في استيراد المقطع: ${e.message}`
							);
						}
					}
				}

				if (Array.isArray(data.playlists)) {
					for (const playlist of data.playlists) {
						try {
							// Skip duplicates
							if (
								existingTitles.has(
									playlist.title.toLowerCase().trim()
								)
							) {
								messages.push(
									`تم تخطي "${playlist.title}" (موجود مسبقاً)`
								);
								failed++;
								continue;
							}

							const result = await this.createPlaylist({
								url: playlist.url,
								playlistId: playlist.playlistId || "",
								title: playlist.title,
								presenter: playlist.presenter,
								type: playlist.type,
								itemCount: playlist.itemCount || 0,
								duration: playlist.duration,
								status: playlist.status,
								thumbnailUrl: playlist.thumbnailUrl,
								tags: playlist.tags,
								categories: playlist.categories,
							});

							if (result) success++;
							else {
								failed++;
								messages.push(
									`فشل استيراد "${playlist.title}"`
								);
							}
						} catch (e) {
							console.error("Error importing playlist:", e);
							failed++;
							messages.push(
								`خطأ في استيراد السلسلة: ${e.message}`
							);
						}
					}
				}
			}

			return { success, failed, messages };
		} catch (error) {
			console.error("Error parsing import data:", error);
			return {
				success: 0,
				failed: 1,
				messages: ["خطأ في تنسيق البيانات المستوردة"],
			};
		}
	}

	/**
	 * Exports videos and playlists to JSON
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns JSON string of exported data
	 */
	async exportToJson(selectedFilePaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedFilePaths.length > 0
				? items.filter((item) =>
						selectedFilePaths.includes(item.filePath)
				  )
				: items;

		// Divide into videos and playlists for compatibility
		const videos = filteredItems.filter((item) => !("itemCount" in item));
		const playlists = filteredItems.filter((item) => "itemCount" in item);

		const exportData = {
			videos,
			playlists,
			exportDate: new Date().toISOString(),
			exportFormat: "library-1.0",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos and playlists with content to JSON
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns JSON string of exported data with content
	 */
	async exportWithContent(selectedFilePaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedFilePaths.length > 0
				? items.filter((item) =>
						selectedFilePaths.includes(item.filePath)
				  )
				: items;

		// Process each file to include its content
		const exportItems = [];
		for (const item of filteredItems) {
			try {
				const file = this.app.vault.getAbstractFileByPath(
					item.filePath
				);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					exportItems.push({
						...item,
						content,
					});
				}
			} catch (error) {
				console.error(
					`Error reading content for ${item.filePath}:`,
					error
				);
				// Include item without content if there's an error
				exportItems.push(item);
			}
		}

		const exportData = {
			items: exportItems,
			exportDate: new Date().toISOString(),
			exportFormat: "library-1.1",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos and playlists to CSV
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns CSV string of exported data
	 */
	async exportToCsv(selectedFilePaths: string[] = []): Promise<string> {
		const { items } = await this.getVideoContent();

		// Filter items if paths provided
		const filteredItems =
			selectedFilePaths.length > 0
				? items.filter((item) =>
						selectedFilePaths.includes(item.filePath)
				  )
				: items;

		// Create CSV header
		const header =
			"العنوان,المقدم,النوع,الحالة,المدة,رابط,تاريخ الإضافة,الوسوم,التصنيفات\n";

		// Helper function to prepare CSV fields
		const escapeField = (value: any): string => {
			if (value === null || value === undefined) return "";
			const str = String(value);
			// Escape quotes and wrap in quotes if contains comma or quote
			if (str.includes('"') || str.includes(",")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		// Convert all items to CSV rows
		const rows = filteredItems
			.map((item) => {
				const durationValue =
					"duration" in item ? `'${item.duration}` : "";

				return [
					escapeField(item.title),
					escapeField("presenter" in item ? item.presenter : ""),
					escapeField(item.type),
					escapeField(item.status),
					escapeField(durationValue),
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
