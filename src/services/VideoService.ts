/**
 * Service for managing video content
 */
import { App, TFile, TFolder } from "obsidian";
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
import { ImportResult } from "../core";
import { VIDEO_FRONTMATTER, VIDEO_STATUS } from "../core/constants";
import { sanitizeFileName, formatDate, renderTemplate } from "../utils";

/**
 * Service for managing video and playlist content
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
		const rootFolder = this.settings.videosFolder;
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
				const fileType = frontmatter[VIDEO_FRONTMATTER.TYPE]; // Type property in Arabic
				const presenter =
					frontmatter[VIDEO_FRONTMATTER.PRESENTER] ||
					this.settings.defaultPresenter;
				const title =
					frontmatter[VIDEO_FRONTMATTER.TITLE] || file.basename;
				const url =
					frontmatter[VIDEO_FRONTMATTER.URL] ||
					frontmatter[VIDEO_FRONTMATTER.PLAYLIST_URL] ||
					"";
				const status =
					frontmatter[VIDEO_FRONTMATTER.STATUS] ||
					this.settings.videoTracking.defaultStatus;
				const dateAdded =
					frontmatter[VIDEO_FRONTMATTER.DATE_ADDED] ||
					formatDate(
						new Date(file.stat.ctime),
						this.settings.dateFormat
					);

				// Extract language if available
				const language = frontmatter[VIDEO_FRONTMATTER.LANGUAGE] || "";

				// Get start and completion dates
				const startDate =
					frontmatter[VIDEO_FRONTMATTER.START_DATE] || "";
				const completionDate =
					frontmatter[VIDEO_FRONTMATTER.COMPLETION_DATE] || "";

				// Process categories and tags - now handles both array and string formats
				const categories = this.normalizeTags(
					frontmatter[VIDEO_FRONTMATTER.CATEGORIES]
				);
				const tags = this.normalizeTags(
					frontmatter[VIDEO_FRONTMATTER.TAGS]
				);

				// Track unique values for collections
				presenterSet.add(presenter);
				categories.forEach((cat) => categorySet.add(cat));
				tags.forEach((tag) => tagSet.add(tag));

				// Process as playlist/series
				if (fileType === "سلسلة") {
					const playlistId =
						frontmatter[VIDEO_FRONTMATTER.PLAYLIST_ID] || "";
					const itemCount =
						parseInt(frontmatter[VIDEO_FRONTMATTER.ITEM_COUNT]) ||
						0;
					const duration =
						frontmatter[VIDEO_FRONTMATTER.TOTAL_DURATION] ||
						"00:00:00";
					const thumbnailUrl =
						frontmatter[VIDEO_FRONTMATTER.THUMBNAIL] || "";

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
						startDate,
						completionDate,
						categories,
						tags,
						thumbnailUrl,
						language,
					} as PlaylistItem);
				}
				// Process as regular video
				else {
					const videoId =
						frontmatter[VIDEO_FRONTMATTER.VIDEO_ID] || "";
					const duration =
						frontmatter[VIDEO_FRONTMATTER.DURATION] || "00:00:00";
					const thumbnailUrl =
						frontmatter[VIDEO_FRONTMATTER.THUMBNAIL] || "";

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
						startDate,
						completionDate,
						categories,
						tags,
						language,
					} as VideoItem);
				}
			} catch (error) {
				console.error(`Error processing file ${file.path}:`, error);
			}
		}

		const result = {
			items,
			presenters: Array.from(presenterSet).sort(),
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
		};

		return result;
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
				data.status || this.settings.videoTracking.defaultStatus;

			// Initialize start and completion dates
			let startDate = data.startDate || "";
			let completionDate = data.completionDate || "";

			// Set dates based on status if not already provided
			if (status === VIDEO_STATUS.WATCHED) {
				// For "watched" status, set both dates to today if not provided
				completionDate = formattedDate;
				if (!startDate) {
					startDate = formattedDate;
				}
			} else if (status === VIDEO_STATUS.IN_PROGRESS) {
				// For "in progress", set start date to today
				startDate = formattedDate;
			}

			// Process categories
			const categories = Array.isArray(data.categories)
				? data.categories
				: data.categories
				? [data.categories]
				: [];

			// Process tags
			const tags = Array.isArray(data.tags)
				? data.tags
				: data.tags
				? [data.tags]
				: [];

			// Get the first category for folder path, if available
			const firstCategory =
				categories.length > 0 ? categories[0] : undefined;

			// Resolve folder path based on folder rules
			const folderPath = await this.resolveVideoFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
				category: firstCategory,
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

			// Render content using template with properly formatted tags and categories
			const content = renderTemplate(this.settings.templates.video, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				tags: this.formatTagsForTemplate(tags),
				categories: this.formatTagsForTemplate(categories),
				status,
				startDate,
				completionDate,
				language: data.language || "",
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
				data.status || this.settings.videoTracking.defaultStatus;

			// Initialize start and completion dates
			let startDate = data.startDate || "";
			let completionDate = data.completionDate || "";

			// Set dates based on status if not already provided
			if (status === VIDEO_STATUS.WATCHED) {
				// For "watched" status, set both dates to today if not provided
				completionDate = formattedDate;
				if (!startDate) {
					startDate = formattedDate;
				}
			} else if (status === VIDEO_STATUS.IN_PROGRESS) {
				// For "in progress", set start date to today
				startDate = formattedDate;
			}

			// Process categories
			const categories = Array.isArray(data.categories)
				? data.categories
				: data.categories
				? [data.categories]
				: [];

			// Process tags
			const tags = Array.isArray(data.tags)
				? data.tags
				: data.tags
				? [data.tags]
				: [];

			// Get the first category for folder path, if available
			const firstCategory =
				categories.length > 0 ? categories[0] : undefined;

			// Resolve folder path based on folder rules
			const folderPath = await this.resolveVideoFolderPath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
				category: firstCategory,
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

			// Render content using playlist template with properly formatted tags and categories
			let content = renderTemplate(this.settings.templates.playlist, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				status,
				startDate,
				completionDate,
				thumbnailUrl: data.thumbnailUrl || "",
				tags: this.formatTagsForTemplate(tags),
				categories: this.formatTagsForTemplate(categories),
				language: data.language || "",
			});

			// Add video titles content if provided
			if (data.videoTitlesContent) {
				// Insert video titles content before the "## الفوائد" section
				const benefitsSection = "## الفوائد";
				const benefitsIndex = content.indexOf(benefitsSection);

				if (benefitsIndex !== -1) {
					// Insert video titles before the benefits section
					content =
						content.slice(0, benefitsIndex) +
						data.videoTitlesContent +
						"\n\n" +
						content.slice(benefitsIndex);
				} else {
					// If no benefits section found, just append to the end
					content += data.videoTitlesContent;
				}
			}

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
	 * Prepares video-specific data for folder path resolution
	 * @param frontmatter Current frontmatter data
	 * @param updatedData Updated data that may affect folder structure
	 * @returns Video folder data
	 */
	protected prepareFolderData(
		frontmatter: Record<string, any>,
		updatedData: Record<string, any>
	): FolderData {
		// Extract type
		const type =
			updatedData.type || frontmatter[VIDEO_FRONTMATTER.TYPE] || "مقطع";

		// Extract presenter
		const presenter =
			updatedData.presenter ||
			frontmatter[VIDEO_FRONTMATTER.PRESENTER] ||
			this.settings.defaultPresenter;

		// Extract date
		const date =
			frontmatter[VIDEO_FRONTMATTER.DATE_ADDED] ||
			formatDate(new Date(), this.settings.dateFormat);

		// Extract first category
		let category: string | undefined;

		// If categories are being updated, use the first one
		if (updatedData.categories) {
			const categories = Array.isArray(updatedData.categories)
				? updatedData.categories
				: typeof updatedData.categories === "string"
				? updatedData.categories
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			category = categories.length > 0 ? categories[0] : undefined;
		}
		// Otherwise, use existing categories
		else if (frontmatter[VIDEO_FRONTMATTER.CATEGORIES]) {
			const existingCategories = this.normalizeTags(
				frontmatter[VIDEO_FRONTMATTER.CATEGORIES]
			);
			category =
				existingCategories.length > 0
					? existingCategories[0]
					: undefined;
		}

		return { type, presenter, date, category };
	}

	/**
	 * Resolves folder path based on settings and data
	 * @param data - Folder data for path resolution
	 * @returns Resolved folder path
	 */
	async resolveVideoFolderPath(data: FolderData): Promise<string> {
		// If folder organization is disabled, return the default folder
		if (!this.settings.videoFolderRules.enabled) {
			return this.settings.videosFolder;
		}

		const dateObj = data.date ? new Date(data.date) : new Date();

		// Prepare replacements with all possible placeholders
		const replacements: Record<string, string> = {
			"{{type}}": data.type || "مقطع", // Default to video
			"{{presenter}}": data.presenter || this.settings.defaultPresenter,
			"{{date}}": formatDate(dateObj, "YYYY-MM-DD"),
			"{{year}}": dateObj.getFullYear().toString(),
			"{{month}}": (dateObj.getMonth() + 1).toString().padStart(2, "0"),
			"{{day}}": dateObj.getDate().toString().padStart(2, "0"),
			"{{category}}": data.category || "عام", // Default to general category
		};

		// Apply all replacements to folder structure
		let folderPath = this.settings.videoFolderRules.structure;
		for (const [key, value] of Object.entries(replacements)) {
			folderPath = folderPath.replace(new RegExp(key, "g"), value);
		}

		// Sanitize folder names
		folderPath = folderPath
			.split("/")
			.map((part: string) => sanitizeFileName(part))
			.join("/");

		return `${this.settings.videosFolder}/${folderPath}`;
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
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				console.error("Video file not found:", filePath);
				return false;
			}

			// Read the current content
			const content = await this.app.vault.read(file);

			// Parse frontmatter
			const frontmatter = this.parseFrontmatter(content);
			if (!frontmatter) {
				console.error("Failed to parse frontmatter:", filePath);
				return false;
			}

			// Create updated content
			let updatedContent = content;

			// Update each field if provided
			if (data.title) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.TITLE,
					data.title
				);
			}

			if (data.presenter) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.PRESENTER,
					data.presenter
				);
			}

			if (data.url) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.URL,
					data.url
				);
			}

			if (data.videoId) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.VIDEO_ID,
					data.videoId
				);
			}

			if (data.duration) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.DURATION,
					data.duration
				);
			}

			if (data.thumbnailUrl !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.THUMBNAIL,
					data.thumbnailUrl
				);
			}

			if (data.tags) {
				// Pass array directly - formatting handled in updateFrontmatter
				const tagsArray = Array.isArray(data.tags)
					? data.tags
					: typeof data.tags === "string"
					? String(data.tags)
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t)
					: [];

				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.TAGS,
					tagsArray
				);
			}

			if (data.categories) {
				// Pass array directly - formatting handled in updateFrontmatter
				const categoriesArray = Array.isArray(data.categories)
					? data.categories
					: typeof data.categories === "string"
					? String(data.categories)
							.split(",")
							.map((c) => c.trim())
							.filter((c) => c)
					: [];

				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.CATEGORIES,
					categoriesArray
				);
			}

			if (data.status) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.STATUS,
					data.status
				);
			}

			if (data.language !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.LANGUAGE,
					data.language
				);
			}

			// Update start and completion dates based on status
			if (data.status) {
				const today = formatDate(new Date(), this.settings.dateFormat);
				const currentStatus = frontmatter[VIDEO_FRONTMATTER.STATUS];

				// Set dates based on status changes
				if (
					data.status === VIDEO_STATUS.WATCHED &&
					currentStatus !== VIDEO_STATUS.WATCHED
				) {
					// Mark as watched - set completion date if not already set
					if (!frontmatter[VIDEO_FRONTMATTER.COMPLETION_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.COMPLETION_DATE,
							today
						);
					}

					// If there's no start date, set it too
					if (!frontmatter[VIDEO_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.START_DATE,
							today
						);
					}
				} else if (
					data.status === VIDEO_STATUS.IN_PROGRESS &&
					currentStatus !== VIDEO_STATUS.IN_PROGRESS
				) {
					// Mark as in progress - set start date if not already set
					if (!frontmatter[VIDEO_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.START_DATE,
							today
						);
					}

					// Clear completion date
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.COMPLETION_DATE,
						""
					);
				} else if (
					(data.status === VIDEO_STATUS.NOT_WATCHED ||
						data.status === VIDEO_STATUS.IN_QUEUE) &&
					(currentStatus === VIDEO_STATUS.WATCHED ||
						currentStatus === VIDEO_STATUS.IN_PROGRESS)
				) {
					// Reset dates if marking as not watched or in queue
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.START_DATE,
						""
					);
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.COMPLETION_DATE,
						""
					);
				}
			}

			// Handle explicit date updates if provided
			if (data.startDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.START_DATE,
					data.startDate
				);
			}

			if (data.completionDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.COMPLETION_DATE,
					data.completionDate
				);
			}

			// Update the description if provided
			if (data.description !== undefined) {
				// For the description in the content section, we need more complex handling
				// This is a simplistic approach - a more robust one would parse the markdown properly
				const contentParts = this.splitContent(updatedContent);
				if (contentParts.frontmatter && contentParts.content) {
					// Find the description section and update it
					// This is a simplistic approach that assumes the description is in a specific format
					// A more robust approach would be to use a markdown parser

					// Update or add the description section
					let newContent = contentParts.content;

					// Try to update the description in the "الوصف" section
					const descriptionHeaderRegex = /^## الوصف\s*$/m;
					const descriptionMatch =
						descriptionHeaderRegex.exec(newContent);

					if (descriptionMatch) {
						// There's already a description section
						const descriptionIndex = descriptionMatch.index;

						// Find the next section or the end of the content
						const nextSectionRegex = /^##\s/gm;
						nextSectionRegex.lastIndex =
							descriptionIndex + descriptionMatch[0].length;
						const nextSectionMatch =
							nextSectionRegex.exec(newContent);

						const endIndex = nextSectionMatch
							? nextSectionMatch.index
							: newContent.length;

						// Replace the content between the description header and the next section
						const before = newContent.substring(
							0,
							descriptionIndex + descriptionMatch[0].length
						);
						const after = newContent.substring(endIndex);

						newContent =
							before + "\n\n" + data.description + "\n\n" + after;
					} else {
						// No description section yet, try to add one before "الملاحظات"
						const notesHeaderRegex = /^## الملاحظات\s*$/m;
						const notesMatch = notesHeaderRegex.exec(newContent);

						if (notesMatch) {
							// Insert before notes section
							const before = newContent.substring(
								0,
								notesMatch.index
							);
							const after = newContent.substring(
								notesMatch.index
							);

							newContent =
								before +
								"## الوصف\n\n" +
								data.description +
								"\n\n" +
								after;
						} else {
							// Just append to the end
							newContent += "\n\n## الوصف\n\n" + data.description;
						}
					}

					// Combine the updated parts
					updatedContent =
						"---\n" +
						contentParts.frontmatter +
						"\n---\n\n" +
						newContent;
				}
			}

			// Save the updated content
			await this.app.vault.modify(file, updatedContent);
			// Check if folder-affecting fields have changed
			const folderAffectingFieldsChanged =
				data.presenter !== undefined ||
				data.type !== undefined ||
				data.categories !== undefined;

			if (
				folderAffectingFieldsChanged &&
				this.settings.videoFolderRules.enabled
			) {
				// Move the file if needed
				filePath = await this.moveFileIfNeeded(
					filePath,
					frontmatter,
					data,
					this.settings.videoFolderRules.enabled,
					async (folderData) =>
						await this.resolveVideoFolderPath(folderData),
					this.settings.videosFolder
				);
			}

			return true;
		} catch (error) {
			console.error("Error updating video:", error);
			return false;
		}
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
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				console.error("Playlist file not found:", filePath);
				return false;
			}

			// Read the current content
			const content = await this.app.vault.read(file);

			// Parse frontmatter
			const frontmatter = this.parseFrontmatter(content);
			if (!frontmatter) {
				console.error("Failed to parse frontmatter:", filePath);
				return false;
			}

			// Create updated content
			let updatedContent = content;

			// Update each field if provided
			if (data.title) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.TITLE,
					data.title
				);
			}

			if (data.presenter) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.PRESENTER,
					data.presenter
				);
			}

			if (data.url) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.PLAYLIST_URL,
					data.url
				);
			}

			if (data.playlistId) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.PLAYLIST_ID,
					data.playlistId
				);
			}

			if (data.itemCount !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.ITEM_COUNT,
					data.itemCount
				);
			}

			if (data.duration) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.TOTAL_DURATION,
					data.duration
				);
			}

			if (data.thumbnailUrl !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.THUMBNAIL,
					data.thumbnailUrl
				);
			}

			if (data.tags) {
				// Pass array directly - formatting handled in updateFrontmatter
				const tagsArray = Array.isArray(data.tags)
					? data.tags
					: typeof data.tags === "string"
					? String(data.tags)
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t)
					: [];

				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.TAGS,
					tagsArray
				);
			}

			if (data.categories) {
				// Pass array directly - formatting handled in updateFrontmatter
				const categoriesArray = Array.isArray(data.categories)
					? data.categories
					: typeof data.categories === "string"
					? String(data.categories)
							.split(",")
							.map((c) => c.trim())
							.filter((c) => c)
					: [];

				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.CATEGORIES,
					categoriesArray
				);
			}

			if (data.status) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.STATUS,
					data.status
				);
			}

			if (data.language !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.LANGUAGE,
					data.language
				);
			}

			// Update start and completion dates based on status
			if (data.status) {
				const today = formatDate(new Date(), this.settings.dateFormat);
				const currentStatus = frontmatter[VIDEO_FRONTMATTER.STATUS];

				// Set dates based on status changes
				if (
					data.status === VIDEO_STATUS.WATCHED &&
					currentStatus !== VIDEO_STATUS.WATCHED
				) {
					// Mark as watched - set completion date if not already set
					if (!frontmatter[VIDEO_FRONTMATTER.COMPLETION_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.COMPLETION_DATE,
							today
						);
					}

					// If there's no start date, set it too
					if (!frontmatter[VIDEO_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.START_DATE,
							today
						);
					}
				} else if (
					data.status === VIDEO_STATUS.IN_PROGRESS &&
					currentStatus !== VIDEO_STATUS.IN_PROGRESS
				) {
					// Mark as in progress - set start date if not already set
					if (!frontmatter[VIDEO_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							VIDEO_FRONTMATTER.START_DATE,
							today
						);
					}

					// Clear completion date
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.COMPLETION_DATE,
						""
					);
				} else if (
					(data.status === VIDEO_STATUS.NOT_WATCHED ||
						data.status === VIDEO_STATUS.IN_QUEUE) &&
					(currentStatus === VIDEO_STATUS.WATCHED ||
						currentStatus === VIDEO_STATUS.IN_PROGRESS)
				) {
					// Reset dates if marking as not watched or in queue
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.START_DATE,
						""
					);
					updatedContent = this.updateFrontmatter(
						updatedContent,
						VIDEO_FRONTMATTER.COMPLETION_DATE,
						""
					);
				}
			}

			// Handle explicit date updates if provided
			if (data.startDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.START_DATE,
					data.startDate
				);
			}

			if (data.completionDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					VIDEO_FRONTMATTER.COMPLETION_DATE,
					data.completionDate
				);
			}

			// Save the updated content
			await this.app.vault.modify(file, updatedContent);
			// Check if folder-affecting fields have changed
			const folderAffectingFieldsChanged =
				data.presenter !== undefined ||
				data.type !== undefined ||
				data.categories !== undefined;

			if (
				folderAffectingFieldsChanged &&
				this.settings.videoFolderRules.enabled
			) {
				// Move the file if needed
				filePath = await this.moveFileIfNeeded(
					filePath,
					frontmatter,
					data,
					this.settings.videoFolderRules.enabled,
					async (folderData) =>
						await this.resolveVideoFolderPath(folderData),
					this.settings.videosFolder
				);
			}

			return true;
		} catch (error) {
			console.error("Error updating playlist:", error);
			return false;
		}
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
	 * Updates status for a video or playlist item
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

			// Get current frontmatter to check current values
			const frontmatter = this.parseFrontmatter(content);
			const currentStartDate = frontmatter
				? frontmatter[VIDEO_FRONTMATTER.START_DATE]
				: "";

			// Update the status in frontmatter
			content = this.updateFrontmatter(
				content,
				VIDEO_FRONTMATTER.STATUS,
				newStatus
			);

			// Update start and completion dates based on status
			const today = formatDate(new Date(), this.settings.dateFormat);

			if (newStatus === VIDEO_STATUS.WATCHED) {
				// Set completion date to today when status is "watched"
				content = this.updateFrontmatter(
					content,
					VIDEO_FRONTMATTER.COMPLETION_DATE,
					today
				);

				// Also set start date to today if it's currently empty
				if (!currentStartDate) {
					content = this.updateFrontmatter(
						content,
						VIDEO_FRONTMATTER.START_DATE,
						today
					);
				}
			} else if (newStatus === VIDEO_STATUS.IN_PROGRESS) {
				// Set start date to today when status is "in progress"
				content = this.updateFrontmatter(
					content,
					VIDEO_FRONTMATTER.START_DATE,
					today
				);

				// Clear completion date when status is "in progress"
				content = this.updateFrontmatter(
					content,
					VIDEO_FRONTMATTER.COMPLETION_DATE,
					""
				);
			} else if (
				newStatus === VIDEO_STATUS.NOT_WATCHED ||
				newStatus === VIDEO_STATUS.IN_QUEUE
			) {
				// Clear dates when status is "not watched" or "in queue"
				content = this.updateFrontmatter(
					content,
					VIDEO_FRONTMATTER.START_DATE,
					""
				);
				content = this.updateFrontmatter(
					content,
					VIDEO_FRONTMATTER.COMPLETION_DATE,
					""
				);
			}

			// Write the updated content back to the file
			await this.app.vault.modify(file, content);

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

			// Update tags in frontmatter - pass array directly
			const updatedContent = this.updateFrontmatter(
				content,
				VIDEO_FRONTMATTER.TAGS,
				tags
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

			// Get the original frontmatter
			const frontmatter = this.parseFrontmatter(content);
			if (!frontmatter) return false;

			// Update categories in frontmatter - pass array directly
			const updatedContent = this.updateFrontmatter(
				content,
				VIDEO_FRONTMATTER.CATEGORIES,
				categories
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);

			// If folder organization is enabled, check if we need to move the file
			// since the first category might be used in the folder structure
			if (this.settings.videoFolderRules.enabled) {
				// Check if the first category has changed
				const oldCategories = this.normalizeTags(
					frontmatter[VIDEO_FRONTMATTER.CATEGORIES]
				);
				const oldFirstCategory =
					oldCategories.length > 0 ? oldCategories[0] : undefined;
				const newFirstCategory =
					categories.length > 0 ? categories[0] : undefined;

				if (oldFirstCategory !== newFirstCategory) {
					// Move the file if the first category has changed
					await this.moveFileIfNeeded(
						filePath,
						frontmatter,
						{ categories },
						this.settings.videoFolderRules.enabled,
						async (folderData) =>
							await this.resolveVideoFolderPath(folderData),
						this.settings.videosFolder
					);
				}
			}

			return true;
		} catch (error) {
			console.error("Error updating categories:", error);
			return false;
		}
	}

	/**
	 * Gets categories for videos
	 * @returns Array of categories
	 */
	async getCategories(): Promise<string[]> {
		const { categories } = await this.getVideoContent();
		return categories;
	}

	/**
	 * Gets tags for videos
	 * @returns Array of tags
	 */
	async getTags(): Promise<string[]> {
		const { tags } = await this.getVideoContent();
		return tags;
	}

	/**
	 * Exports videos and playlists to JSON
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns JSON string of exported data
	 */
	async exportVideosToJson(
		selectedFilePaths: string[] = []
	): Promise<string> {
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
	async exportVideosWithContent(
		selectedFilePaths: string[] = []
	): Promise<string> {
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
	async exportVideosToCsv(selectedFilePaths: string[] = []): Promise<string> {
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
			"العنوان,الملقي,النوع,الحالة,اللغة,المدة,رابط,تاريخ الإضافة,الوسوم,التصنيفات\n";

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
					escapeField(item.language || ""),
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
							const folderPath =
								await this.resolveVideoFolderPath({
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
	 * Splits content into frontmatter and body content
	 * @param content Full file content
	 * @returns Object containing frontmatter and content parts
	 */
	private splitContent(content: string): {
		frontmatter: string;
		content: string;
	} {
		const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

		if (match && match.length >= 3) {
			return {
				frontmatter: match[1],
				content: match[2],
			};
		}

		// Default return if no match
		return {
			frontmatter: "",
			content: content,
		};
	}
}
