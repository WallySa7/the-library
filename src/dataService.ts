import { App, TFile } from "obsidian";
import { AlRawiSettings } from "../src/settings";
import { VideoService } from "../src/videoService";
import { VideoData, PlaylistData, BulkOperation } from "../src/types";

/**
 * Main data service that coordinates specialized content services
 * Acts as a facade for simpler interaction with the plugin's data operations
 */
export class DataService {
	private app: App;
	private settings: AlRawiSettings;
	private videoService: VideoService;

	/**
	 * Creates a new data service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		this.app = app;
		this.settings = settings;
		this.videoService = new VideoService(app, settings);
	}

	/**
	 * === VIDEO OPERATIONS ===
	 */

	/**
	 * Loads all videos and playlists
	 * @returns Object containing videos, playlists, and metadata
	 */
	async getVideosAndPlaylists() {
		return this.videoService.getVideosAndPlaylists();
	}

	/**
	 * Gets data for a specific video or playlist
	 * @param filePath - Path to the video file
	 * @returns Video or playlist data or null if not found
	 */
	async getVideoData(filePath: string) {
		return this.videoService.getVideoData(filePath);
	}

	/**
	 * Creates a new video note
	 * @param data - Video data
	 * @returns Whether creation was successful
	 */
	async createVideo(data: VideoData) {
		return this.videoService.createVideo(data);
	}

	/**
	 * Creates a new playlist note
	 * @param data - Playlist data
	 * @returns Whether creation was successful
	 */
	async createPlaylist(data: PlaylistData) {
		return this.videoService.createPlaylist(data);
	}

	/**
	 * Gets existing presenter names
	 * @returns Array of presenter names
	 */
	async getPresenterList() {
		return this.videoService.getPresenterList();
	}

	/**
	 * Gets existing video categories
	 * @returns Array of category names
	 */
	async getVideoCategories() {
		return this.videoService.getCategoryList();
	}

	/**
	 * Updates video categories
	 * @param filePath - Path to the video file
	 * @param categories - Array of categories to set
	 * @returns Whether update was successful
	 */
	async updateVideoCategories(filePath: string, categories: string[]) {
		return this.videoService.updateCategories(filePath, categories);
	}

	/**
	 * Imports videos data from JSON
	 * @param jsonData - JSON data to import
	 * @returns Object with success and failure counts
	 */
	async importVideos(
		jsonData: string
	): Promise<{ success: number; failed: number }> {
		return this.videoService.importFromJson(jsonData);
	}

	/**
	 * Exports videos data to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportVideosToJson(
		selectedFilePaths: string[] = []
	): Promise<string> {
		return this.videoService.exportToJson(selectedFilePaths);
	}

	/**
	 * Exports videos with full content to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data with content
	 */
	async exportVideosWithContent(
		selectedFilePaths: string[] = []
	): Promise<string> {
		return this.videoService.exportWithContent(selectedFilePaths);
	}

	/**
	 * Exports videos data to CSV format
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns CSV string of exported data
	 */
	async exportVideosToCsv(selectedFilePaths: string[] = []): Promise<string> {
		return this.videoService.exportToCsv(selectedFilePaths);
	}

	/**
	 * === COMMON OPERATIONS ===
	 */

	/**
	 * Gets existing tags for content type
	 * @param contentType - Type of content (videos or books)
	 * @returns Array of tag names
	 */
	async getTags(contentType: "videos" = "videos"): Promise<string[]> {
		return this.videoService.getTagList();
	}

	/**
	 * Updates an item's status
	 * @param filePath - Path to the file
	 * @param newStatus - New status value
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, newStatus: string): Promise<boolean> {
		// This may be a book or video; determine type first
		const itemInfo = await this.getContentType(filePath);

		if (itemInfo.type === "video") {
			return this.videoService.updateStatus(filePath, newStatus);
		}

		return false;
	}

	/**
	 * Updates an item's tags
	 * @param filePath - Path to the file
	 * @param tags - Array of tags
	 * @returns Whether update was successful
	 */
	async updateTags(filePath: string, tags: string[]): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Format tags string
			const tagsString = tags.join(", ");

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update tags in frontmatter
			if (content.includes("الوسوم:")) {
				// Update existing tags
				const updatedContent = content.replace(
					/الوسوم:.*$/m,
					`الوسوم: ${tagsString}`
				);
				await this.app.vault.modify(file, updatedContent);
			} else {
				// Add tags line to frontmatter
				const frontmatterEndIndex = content.indexOf("---", 3);
				if (frontmatterEndIndex !== -1) {
					const updatedContent =
						content.substring(0, frontmatterEndIndex) +
						`الوسوم: ${tagsString}\n` +
						content.substring(frontmatterEndIndex);
					await this.app.vault.modify(file, updatedContent);
				}
			}

			return true;
		} catch (error) {
			console.error("Error updating tags:", error);
			return false;
		}
	}

	/**
	 * Performs a bulk operation on multiple items
	 * @param operation - Bulk operation configuration
	 * @returns Object with success and failure counts
	 */
	async performBulkOperation(
		operation: BulkOperation
	): Promise<{ success: number; failed: number }> {
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
							const cache =
								this.app.metadataCache.getFileCache(file);
							const currentTags =
								cache?.frontmatter?.["الوسوم"] || [];
							const tags = Array.isArray(currentTags)
								? currentTags
								: currentTags
										.split(",")
										.map((t: string) => t.trim());

							if (!tags.includes(operation.value)) {
								tags.push(operation.value);
								result = await this.updateTags(filePath, tags);
							} else {
								result = true; // Tag already exists
							}
						}
					}
					break;

				case "category":
					if (operation.value) {
						// Get content type
						const itemInfo = await this.getContentType(filePath);
						if (itemInfo.type === "video") {
							// For videos
							const file =
								this.app.vault.getAbstractFileByPath(filePath);
							if (file instanceof TFile) {
								const cache =
									this.app.metadataCache.getFileCache(file);
								const currentCategories =
									cache?.frontmatter?.["التصنيفات"] || [];
								const categories = Array.isArray(
									currentCategories
								)
									? currentCategories
									: currentCategories
											.split(",")
											.map((c: string) => c.trim());

								if (!categories.includes(operation.value)) {
									categories.push(operation.value);
									result = await this.updateVideoCategories(
										filePath,
										categories
									);
								} else {
									result = true; // Category already exists
								}
							}
						}
					}
					break;

				case "delete":
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (file) {
						try {
							await this.app.vault.delete(file);
							result = true;
						} catch (error) {
							console.error("Error deleting file:", error);
							result = false;
						}
					}
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
	 * Gets the type of a content note
	 * @param filePath - Path to the note file
	 * @returns Object with content type and title
	 */
	async getContentType(
		filePath: string
	): Promise<{ type: "video" | null; title: string }> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!file || !(file instanceof TFile)) {
				return { type: null, title: "" };
			}

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) {
				return { type: null, title: file.basename };
			}

			const fm = cache.frontmatter;

			// Check for video-specific fields
			if (fm["الملقي"] || fm["رابط"] || fm["معرف الفيديو"]) {
				return {
					type: "video",
					title: fm.title || file.basename,
				};
			}

			return { type: null, title: file.basename };
		} catch (error) {
			console.error("Error determining content type:", error);
			return { type: null, title: "" };
		}
	}
}
