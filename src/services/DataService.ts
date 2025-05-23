/**
 * Core data service for managing library content
 * Provides methods for CRUD operations on videos, playlists, and more
 */
import { App, TFile } from "obsidian";
import { BaseDataService } from "./BaseDataService";
import { VideoService } from "./VideoService";
import { BookService } from "./BookService";
import { LibrarySettings } from "../core/settings";
import {
	LibraryItem,
	VideoData,
	PlaylistData,
	BookItem,
	BookData,
} from "../core/contentTypes";
import {
	ContentType,
	BulkOperation,
	BulkOperationResult,
	ImportResult,
	ExportOptions,
} from "../core";
import {
	BOOK_FRONTMATTER,
	CONTENT_TYPE,
	VIDEO_FRONTMATTER,
} from "../core/constants";

/**
 * Core data service for all library content operations
 * Delegates to specialized services for specific content types
 */
export class DataService extends BaseDataService {
	private videoService: VideoService;
	private bookService: BookService;

	/**
	 * Creates a new DataService
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: LibrarySettings) {
		super(app, settings);
		this.videoService = new VideoService(app, settings);
		this.bookService = new BookService(app, settings);
	}

	/**
	 * Gets all video content including videos, playlists, and related metadata
	 * @param forceRefresh - Whether to bypass the cache and force a refresh
	 * @returns Object containing content items and metadata
	 */
	async getVideoContent(forceRefresh = false): Promise<{
		items: LibraryItem[];
		presenters: string[];
		categories: string[];
		tags: string[];
	}> {
		return this.videoService.getVideoContent(forceRefresh);
	}

	/**
	 * Gets all book content and related metadata
	 * @param forceRefresh - Whether to bypass the cache and force a refresh
	 * @returns Object containing book items and metadata
	 */
	async getBookContent(forceRefresh = false): Promise<{
		items: BookItem[];
		authors: string[];
		categories: string[];
		tags: string[];
	}> {
		return this.bookService.getBookContent(forceRefresh);
	}

	/**
	 * Creates a new video note
	 * @param data - Video data to create
	 * @returns Whether creation was successful
	 */
	async createVideo(data: VideoData): Promise<boolean> {
		return this.videoService.createVideo(data);
	}

	/**
	 * Creates a new playlist note
	 * @param data - Playlist data to create
	 * @returns Whether creation was successful
	 */
	async createPlaylist(data: PlaylistData): Promise<boolean> {
		return this.videoService.createPlaylist(data);
	}

	/**
	 * Creates a new book note
	 * @param data - Book data to create
	 * @returns Whether creation was successful
	 */
	async createBook(data: BookData): Promise<boolean> {
		return this.bookService.createBook(data);
	}

	/**
	 * Updates an existing video note
	 * @param filePath - Path to the video file to update
	 * @param data - Video data to update
	 * @returns Whether update was successful
	 */
	async updateVideo(
		filePath: string,
		data: Partial<VideoData>
	): Promise<boolean> {
		return this.videoService.updateVideo(filePath, data);
	}

	/**
	 * Updates an existing playlist note
	 * @param filePath - Path to the playlist file to update
	 * @param data - Playlist data to update
	 * @returns Whether update was successful
	 */
	async updatePlaylist(
		filePath: string,
		data: Partial<PlaylistData>
	): Promise<boolean> {
		return this.videoService.updatePlaylist(filePath, data);
	}

	/**
	 * Updates an existing book note
	 * @param filePath - Path to the book file to update
	 * @param data - Book data to update
	 * @returns Whether update was successful
	 */
	async updateBook(
		filePath: string,
		data: Partial<BookData>
	): Promise<boolean> {
		return this.bookService.updateBook(filePath, data);
	}

	/**
	 * Gets list of existing presenters
	 * @returns Array of presenter names
	 */
	async getPresenters(): Promise<string[]> {
		return this.videoService.getPresenters();
	}

	/**
	 * Gets list of existing authors
	 * @returns Array of author names
	 */
	async getAuthors(): Promise<string[]> {
		return this.bookService.getAuthors();
	}

	/**
	 * Gets list of existing categories for content type
	 * @param contentType - Content type
	 * @returns Array of category names
	 */
	async getCategories(contentType: ContentType): Promise<string[]> {
		if (contentType === CONTENT_TYPE.VIDEO) {
			return this.videoService.getCategories();
		} else if (contentType === CONTENT_TYPE.BOOK) {
			return this.bookService.getCategories();
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
			return this.videoService.getTags();
		} else if (contentType === CONTENT_TYPE.BOOK) {
			return this.bookService.getTags();
		}
		return [];
	}

	/**
	 * Updates item status
	 * @param filePath - Path to the file
	 * @param newStatus - New status value
	 * @param contentType - Content type (video or book)
	 * @returns Whether update was successful
	 */
	async updateStatus(
		filePath: string,
		newStatus: string,
		contentType: ContentType = CONTENT_TYPE.VIDEO
	): Promise<boolean> {
		// Determine if it's a book or video path and delegate accordingly
		if (
			contentType === CONTENT_TYPE.BOOK ||
			filePath.startsWith(this.settings.booksFolder)
		) {
			return this.bookService.updateStatus(filePath, newStatus);
		} else {
			return this.videoService.updateStatus(filePath, newStatus);
		}
	}

	/**
	 * Updates item tags
	 * @param filePath - Path to the file
	 * @param tags - Array of tags
	 * @param contentType - Content type (video or book)
	 * @returns Whether update was successful
	 */
	async updateTags(
		filePath: string,
		tags: string[],
		contentType: ContentType = CONTENT_TYPE.VIDEO
	): Promise<boolean> {
		// Determine if it's a book or video path and delegate accordingly
		if (
			contentType === CONTENT_TYPE.BOOK ||
			filePath.startsWith(this.settings.booksFolder)
		) {
			return this.bookService.updateTags(filePath, tags);
		} else {
			return this.videoService.updateTags(filePath, tags);
		}
	}

	/**
	 * Updates item categories
	 * @param filePath - Path to the file
	 * @param categories - Array of categories
	 * @param contentType - Content type (video or book)
	 * @returns Whether update was successful
	 */
	async updateCategories(
		filePath: string,
		categories: string[],
		contentType: ContentType = CONTENT_TYPE.VIDEO
	): Promise<boolean> {
		// Determine if it's a book or video path and delegate accordingly
		if (
			contentType === CONTENT_TYPE.BOOK ||
			filePath.startsWith(this.settings.booksFolder)
		) {
			return this.bookService.updateCategories(filePath, categories);
		} else {
			return this.videoService.updateCategories(filePath, categories);
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
			const isBookPath = filePath.startsWith(this.settings.booksFolder);
			const contentType = isBookPath
				? CONTENT_TYPE.BOOK
				: CONTENT_TYPE.VIDEO;

			switch (operation.type) {
				case "status":
					if (operation.value) {
						result = await this.updateStatus(
							filePath,
							operation.value,
							contentType
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
							const tagField = isBookPath
								? BOOK_FRONTMATTER.TAGS
								: VIDEO_FRONTMATTER.TAGS;
							const currentTags = this.normalizeTags(
								frontmatter?.[tagField]
							);

							if (!currentTags.includes(operation.value)) {
								currentTags.push(operation.value);
								result = await this.updateTags(
									filePath,
									currentTags,
									contentType
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
							const categoryField = isBookPath
								? BOOK_FRONTMATTER.CATEGORIES
								: VIDEO_FRONTMATTER.CATEGORIES;
							const currentCategories = this.normalizeTags(
								frontmatter?.[categoryField]
							);

							if (!currentCategories.includes(operation.value)) {
								currentCategories.push(operation.value);
								result = await this.updateCategories(
									filePath,
									currentCategories,
									contentType
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
	 * Performs bulk status update on multiple items
	 * @param itemPaths - Paths to the items to update
	 * @param status - New status value
	 * @param contentType - Content type (video or book)
	 * @returns Result with success and failure counts
	 */
	async bulkUpdateStatus(
		itemPaths: string[],
		status: string,
		contentType: ContentType = CONTENT_TYPE.VIDEO
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
	 * @param contentType - Content type (video or book)
	 * @returns Result with success and failure counts
	 */
	async bulkAddTag(
		itemPaths: string[],
		tag: string,
		contentType: ContentType = CONTENT_TYPE.VIDEO
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
	 * @param contentType - Content type (video or book)
	 * @returns Result with success and failure counts
	 */
	async bulkUpdateCategories(
		itemPaths: string[],
		categories: string[],
		mode: "replace" | "append" = "replace",
		contentType: ContentType = CONTENT_TYPE.VIDEO
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

				const isBookPath = filePath.startsWith(
					this.settings.booksFolder
				);
				const itemContentType = isBookPath
					? CONTENT_TYPE.BOOK
					: contentType;
				const categoryField = isBookPath
					? BOOK_FRONTMATTER.CATEGORIES
					: VIDEO_FRONTMATTER.CATEGORIES;

				const content = await this.app.vault.read(file);
				const frontmatter = this.parseFrontmatter(content);

				let updatedCategories: string[];
				if (mode === "append" && frontmatter?.[categoryField]) {
					// Get current categories and add new ones without duplicates
					const currentCategories = this.normalizeTags(
						frontmatter[categoryField]
					);
					updatedCategories = [
						...new Set([...currentCategories, ...categories]),
					];
				} else {
					// Replace mode - just use the new categories
					updatedCategories = [...categories];
				}

				// Update categories might trigger file movement
				const result = await this.updateCategories(
					filePath,
					updatedCategories,
					itemContentType
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
	 * Imports videos data from JSON
	 * @param jsonData - JSON string with video data
	 * @returns Import result with success and failure counts
	 */
	async importVideos(jsonData: string): Promise<ImportResult> {
		return this.videoService.importVideos(jsonData);
	}

	/**
	 * Imports books data from JSON
	 * @param jsonData - JSON string with book data
	 * @returns Import result with success and failure counts
	 */
	async importBooks(jsonData: string): Promise<ImportResult> {
		return this.bookService.importBooks(jsonData);
	}

	/**
	 * Exports library content to various formats
	 * @param options - Export options
	 * @returns Exported content as string in the requested format
	 */
	async exportContent(options: ExportOptions): Promise<string> {
		const { format, selectedItems = [], contentType } = options;

		if (contentType === CONTENT_TYPE.BOOK) {
			switch (format) {
				case "json":
					return this.bookService.exportBooksToJson(selectedItems);
				case "jsonWithContent":
					return this.bookService.exportBooksWithContent(
						selectedItems
					);
				case "csv":
					return this.bookService.exportBooksToCsv(selectedItems);
				default:
					throw new Error(`Unsupported export format: ${format}`);
			}
		} else {
			// Default to video content
			switch (format) {
				case "json":
					return this.videoService.exportVideosToJson(selectedItems);
				case "jsonWithContent":
					return this.videoService.exportVideosWithContent(
						selectedItems
					);
				case "csv":
					return this.videoService.exportVideosToCsv(selectedItems);
				default:
					throw new Error(`Unsupported export format: ${format}`);
			}
		}
	}
}
