/**
 * Service for managing book content
 */
import { App, TFile, TFolder } from "obsidian";
import { BaseDataService } from "./BaseDataService";
import { LibrarySettings } from "../core/settings";
import { BookItem, BookData, FolderData } from "../core/contentTypes";
import { ImportResult } from "../core";
import { BOOK_FRONTMATTER, BOOK_STATUS } from "../core/constants";
import { sanitizeFileName, formatDate, renderTemplate } from "../utils";

/**
 * Service for managing book content
 */
export class BookService extends BaseDataService {
	/**
	 * Creates a new BookService
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: LibrarySettings) {
		super(app, settings);
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
		const rootFolder = this.settings.booksFolder;
		const folder = this.app.vault.getAbstractFileByPath(rootFolder);

		// Handle case where book folder doesn't exist
		if (!folder || !(folder instanceof TFolder)) {
			return {
				items: [],
				authors: [],
				categories: [],
				tags: [],
			};
		}

		// Find all markdown files in the book folder and subfolders
		const files = this.findMarkdownFiles(folder);
		const items: BookItem[] = [];
		const authorSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		// Process each file to extract book data
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const frontmatter = this.parseFrontmatter(content);
				if (!frontmatter) continue;

				// Only process files with book type
				const fileType = frontmatter[BOOK_FRONTMATTER.TYPE];
				if (fileType !== "كتاب") continue;

				// Extract book properties
				const author =
					frontmatter[BOOK_FRONTMATTER.AUTHOR] ||
					this.settings.defaultAuthor;
				const title =
					frontmatter[BOOK_FRONTMATTER.TITLE] || file.basename;
				const status =
					frontmatter[BOOK_FRONTMATTER.STATUS] ||
					this.settings.bookTracking.defaultStatus;
				const pageCount =
					parseInt(frontmatter[BOOK_FRONTMATTER.PAGE_COUNT]) || 0;
				const publisher = frontmatter[BOOK_FRONTMATTER.PUBLISHER] || "";
				const publishYear =
					frontmatter[BOOK_FRONTMATTER.PUBLISH_YEAR] || "";
				const coverUrl = frontmatter[BOOK_FRONTMATTER.COVER] || "";
				const rating =
					parseInt(frontmatter[BOOK_FRONTMATTER.RATING]) || 0;

				// Extract language if available
				const language = frontmatter[BOOK_FRONTMATTER.LANGUAGE] || "";

				const dateAdded =
					frontmatter[BOOK_FRONTMATTER.DATE_ADDED] ||
					formatDate(
						new Date(file.stat.ctime),
						this.settings.dateFormat
					);

				// Get start and completion dates
				const startDate =
					frontmatter[BOOK_FRONTMATTER.START_DATE] || "";
				const completionDate =
					frontmatter[BOOK_FRONTMATTER.COMPLETION_DATE] || "";

				// Process categories and tags - now handles both array and string formats
				const categories = this.normalizeTags(
					frontmatter[BOOK_FRONTMATTER.CATEGORIES]
				);
				const tags = this.normalizeTags(
					frontmatter[BOOK_FRONTMATTER.TAGS]
				);

				// Track unique values for collections
				authorSet.add(author);
				categories.forEach((cat) => categorySet.add(cat));
				tags.forEach((tag) => tagSet.add(tag));

				// Create book item
				items.push({
					title,
					author,
					pageCount,
					publisher,
					publishYear,
					coverUrl,
					rating,
					filePath: file.path,
					type: fileType,
					status,
					dateAdded,
					startDate,
					completionDate,
					categories,
					tags,
					language,
				} as BookItem);
			} catch (error) {
				console.error(
					`Error processing book file ${file.path}:`,
					error
				);
			}
		}

		return {
			items,
			authors: Array.from(authorSet).sort(),
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
		};
	}

	/**
	 * Creates a new book note
	 * @param data - Book data to create
	 * @returns Whether creation was successful
	 */
	async createBook(data: BookData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);
			const status =
				data.status || this.settings.bookTracking.defaultStatus;

			// Initialize start and completion dates
			let startDate = data.startDate || "";
			let completionDate = data.completionDate || "";

			// Set dates based on status if not already provided
			if (status === BOOK_STATUS.READ) {
				// For "read" status, set both dates to today if not provided
				completionDate = formattedDate;
				if (!startDate) {
					startDate = formattedDate;
				}
			} else if (status === BOOK_STATUS.READING) {
				// For "reading", set start date to today
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

			// Resolve folder path based on book folder rules
			const folderPath = await this.resolveBookFolderPath({
				type: data.type,
				author: data.author,
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
				console.log(`Book already exists: ${fullPath}`);
				return false;
			}

			// Render content using template with properly formatted tags and categories
			const content = renderTemplate(this.settings.templates.book, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				tags: this.formatTagsForTemplate(tags),
				categories: this.formatTagsForTemplate(categories),
				status,
				startDate,
				completionDate,
				rating: data.rating || "",
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
			console.error("Error creating book note:", error);
			return false;
		}
	}

	/**
	 * Prepares book-specific data for folder path resolution
	 * @param frontmatter Current frontmatter data
	 * @param updatedData Updated data that may affect folder structure
	 * @returns Book folder data
	 */
	protected prepareFolderData(
		frontmatter: Record<string, any>,
		updatedData: Record<string, any>
	): FolderData {
		// Extract type
		const type =
			updatedData.type || frontmatter[BOOK_FRONTMATTER.TYPE] || "كتاب";

		// Extract author
		const author =
			updatedData.author ||
			frontmatter[BOOK_FRONTMATTER.AUTHOR] ||
			this.settings.defaultAuthor;

		// Extract date
		const date =
			frontmatter[BOOK_FRONTMATTER.DATE_ADDED] ||
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
		else if (frontmatter[BOOK_FRONTMATTER.CATEGORIES]) {
			const existingCategories = this.normalizeTags(
				frontmatter[BOOK_FRONTMATTER.CATEGORIES]
			);
			category =
				existingCategories.length > 0
					? existingCategories[0]
					: undefined;
		}

		return { type, author, date, category };
	}

	/**
	 * Resolves book folder path based on settings and data
	 * @param data - Book data for path resolution
	 * @returns Resolved folder path
	 */
	async resolveBookFolderPath(data: FolderData): Promise<string> {
		// If folder organization is disabled, return the default books folder
		if (!this.settings.bookFolderRules.enabled) {
			return this.settings.booksFolder;
		}

		const dateObj = data.date ? new Date(data.date) : new Date();

		// Prepare replacements with all possible placeholders
		const replacements: Record<string, string> = {
			"{{type}}": data.type || "كتاب", // Default to book
			"{{author}}": data.author || this.settings.defaultAuthor,
			"{{date}}": formatDate(dateObj, "YYYY-MM-DD"),
			"{{year}}": dateObj.getFullYear().toString(),
			"{{month}}": (dateObj.getMonth() + 1).toString().padStart(2, "0"),
			"{{day}}": dateObj.getDate().toString().padStart(2, "0"),
			"{{category}}": data.category || "عام", // Default to general category
		};

		// Apply all replacements to folder structure
		let folderPath = this.settings.bookFolderRules.structure;
		for (const [key, value] of Object.entries(replacements)) {
			folderPath = folderPath.replace(new RegExp(key, "g"), value);
		}

		// Sanitize folder names
		folderPath = folderPath
			.split("/")
			.map((part: string) => sanitizeFileName(part))
			.join("/");

		return `${this.settings.booksFolder}/${folderPath}`;
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
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				console.error("Book file not found:", filePath);
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
					BOOK_FRONTMATTER.TITLE,
					data.title
				);
			}

			if (data.author) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.AUTHOR,
					data.author
				);
			}

			if (data.pageCount) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.PAGE_COUNT,
					data.pageCount
				);
			}

			if (data.publisher !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.PUBLISHER,
					data.publisher
				);
			}

			if (data.publishYear !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.PUBLISH_YEAR,
					data.publishYear
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
					BOOK_FRONTMATTER.TAGS,
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
					BOOK_FRONTMATTER.CATEGORIES,
					categoriesArray
				);
			}

			if (data.status) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.STATUS,
					data.status
				);
			}

			if (data.coverUrl !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.COVER,
					data.coverUrl
				);
			}

			if (data.language !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.LANGUAGE,
					data.language
				);
			}

			if (data.rating !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.RATING,
					data.rating
				);
			}

			// Update start and completion dates based on status
			if (data.status) {
				const today = formatDate(new Date(), this.settings.dateFormat);
				const currentStatus = frontmatter[BOOK_FRONTMATTER.STATUS];

				// Set dates based on status changes
				if (
					data.status === BOOK_STATUS.READ &&
					currentStatus !== BOOK_STATUS.READ
				) {
					// Mark as read - set completion date if not already set
					if (!frontmatter[BOOK_FRONTMATTER.COMPLETION_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							BOOK_FRONTMATTER.COMPLETION_DATE,
							today
						);
					}

					// If there's no start date, set it too
					if (!frontmatter[BOOK_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							BOOK_FRONTMATTER.START_DATE,
							today
						);
					}
				} else if (
					data.status === BOOK_STATUS.READING &&
					currentStatus !== BOOK_STATUS.READING
				) {
					// Mark as reading - set start date if not already set
					if (!frontmatter[BOOK_FRONTMATTER.START_DATE]) {
						updatedContent = this.updateFrontmatter(
							updatedContent,
							BOOK_FRONTMATTER.START_DATE,
							today
						);
					}

					// Clear completion date
					updatedContent = this.updateFrontmatter(
						updatedContent,
						BOOK_FRONTMATTER.COMPLETION_DATE,
						""
					);
				} else if (
					(data.status === BOOK_STATUS.NOT_READ ||
						data.status === BOOK_STATUS.IN_LIST) &&
					(currentStatus === BOOK_STATUS.READ ||
						currentStatus === BOOK_STATUS.READING)
				) {
					// Reset dates if marking as not read or in list
					updatedContent = this.updateFrontmatter(
						updatedContent,
						BOOK_FRONTMATTER.START_DATE,
						""
					);
					updatedContent = this.updateFrontmatter(
						updatedContent,
						BOOK_FRONTMATTER.COMPLETION_DATE,
						""
					);
				}
			}

			// Handle explicit date updates if provided
			if (data.startDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.START_DATE,
					data.startDate
				);
			}

			if (data.completionDate !== undefined) {
				updatedContent = this.updateFrontmatter(
					updatedContent,
					BOOK_FRONTMATTER.COMPLETION_DATE,
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

					// Try to update the description in the "معلومات الكتاب" section
					const summaryHeaderRegex = /^## الملخص\s*$/m;
					const summaryMatch = summaryHeaderRegex.exec(newContent);

					if (summaryMatch) {
						// There's already a summary section
						const summaryIndex = summaryMatch.index;

						// Find the next section or the end of the content
						const nextSectionRegex = /^##\s/gm;
						nextSectionRegex.lastIndex =
							summaryIndex + summaryMatch[0].length;
						const nextSectionMatch =
							nextSectionRegex.exec(newContent);

						const endIndex = nextSectionMatch
							? nextSectionMatch.index
							: newContent.length;

						// Replace the content between the summary header and the next section
						const before = newContent.substring(
							0,
							summaryIndex + summaryMatch[0].length
						);
						const after = newContent.substring(endIndex);

						newContent =
							before + "\n\n" + data.description + "\n\n" + after;
					} else {
						// No summary section yet, try to add one before "ملاحظات القراءة"
						const notesHeaderRegex = /^## ملاحظات القراءة\s*$/m;
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
								"## الملخص\n\n" +
								data.description +
								"\n\n" +
								after;
						} else {
							// Just append to the end
							newContent +=
								"\n\n## الملخص\n\n" + data.description;
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
				data.author !== undefined ||
				data.type !== undefined ||
				data.categories !== undefined;

			if (
				folderAffectingFieldsChanged &&
				this.settings.bookFolderRules.enabled
			) {
				// Move the file if needed
				filePath = await this.moveFileIfNeeded(
					filePath,
					frontmatter,
					data,
					this.settings.bookFolderRules.enabled,
					async (folderData) =>
						await this.resolveBookFolderPath(folderData),
					this.settings.booksFolder
				);
			}

			return true;
		} catch (error) {
			console.error("Error updating book:", error);
			return false;
		}
	}

	/**
	 * Updates status for a book item
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
				? frontmatter[BOOK_FRONTMATTER.START_DATE]
				: "";

			// Update the status in frontmatter
			content = this.updateFrontmatter(
				content,
				BOOK_FRONTMATTER.STATUS,
				newStatus
			);

			// Update start and completion dates based on status
			const today = formatDate(new Date(), this.settings.dateFormat);

			if (newStatus === BOOK_STATUS.READ) {
				// Set completion date to today when status is "read"
				content = this.updateFrontmatter(
					content,
					BOOK_FRONTMATTER.COMPLETION_DATE,
					today
				);

				// Also set start date to today if it's currently empty
				if (!currentStartDate) {
					content = this.updateFrontmatter(
						content,
						BOOK_FRONTMATTER.START_DATE,
						today
					);
				}
			} else if (newStatus === BOOK_STATUS.READING) {
				// Set start date to today when status is "reading"
				content = this.updateFrontmatter(
					content,
					BOOK_FRONTMATTER.START_DATE,
					today
				);

				// Clear completion date when status is "reading"
				content = this.updateFrontmatter(
					content,
					BOOK_FRONTMATTER.COMPLETION_DATE,
					""
				);
			} else if (
				newStatus === BOOK_STATUS.NOT_READ ||
				newStatus === BOOK_STATUS.IN_LIST
			) {
				// Clear dates when status is "not read" or "in list"
				content = this.updateFrontmatter(
					content,
					BOOK_FRONTMATTER.START_DATE,
					""
				);
				content = this.updateFrontmatter(
					content,
					BOOK_FRONTMATTER.COMPLETION_DATE,
					""
				);
			}

			// Write the updated content back to the file
			await this.app.vault.modify(file, content);

			return true;
		} catch (error) {
			console.error("Error updating book status:", error);
			return false;
		}
	}

	/**
	 * Updates item tags for a book
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
				BOOK_FRONTMATTER.TAGS,
				tags
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);

			return true;
		} catch (error) {
			console.error("Error updating book tags:", error);
			return false;
		}
	}

	/**
	 * Updates book categories
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
				BOOK_FRONTMATTER.CATEGORIES,
				categories
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);

			// If folder organization is enabled, check if we need to move the file
			// since the first category might be used in the folder structure
			if (this.settings.bookFolderRules.enabled) {
				// Check if the first category has changed
				const oldCategories = this.normalizeTags(
					frontmatter[BOOK_FRONTMATTER.CATEGORIES]
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
						this.settings.bookFolderRules.enabled,
						async (folderData) =>
							await this.resolveBookFolderPath(folderData),
						this.settings.booksFolder
					);
				}
			}

			return true;
		} catch (error) {
			console.error("Error updating book categories:", error);
			return false;
		}
	}

	/**
	 * Gets categories for books
	 * @returns Array of categories
	 */
	async getCategories(): Promise<string[]> {
		const { categories } = await this.getBookContent();
		return categories;
	}

	/**
	 * Gets tags for books
	 * @returns Array of tags
	 */
	async getTags(): Promise<string[]> {
		const { tags } = await this.getBookContent();
		return tags;
	}

	/**
	 * Gets list of existing authors
	 * @returns Array of author names
	 */
	async getAuthors(): Promise<string[]> {
		const { authors } = await this.getBookContent();
		return authors;
	}

	/**
	 * Exports books to JSON
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns JSON string of exported data
	 */
	async exportBooksToJson(selectedFilePaths: string[] = []): Promise<string> {
		const { items } = await this.getBookContent();

		// Filter items if paths provided
		const filteredItems =
			selectedFilePaths.length > 0
				? items.filter((item) =>
						selectedFilePaths.includes(item.filePath)
				  )
				: items;

		const exportData = {
			books: filteredItems,
			exportDate: new Date().toISOString(),
			exportFormat: "library-books-1.0",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports books with content to JSON
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns JSON string of exported data with content
	 */
	async exportBooksWithContent(
		selectedFilePaths: string[] = []
	): Promise<string> {
		const { items } = await this.getBookContent();

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
			books: exportItems,
			exportDate: new Date().toISOString(),
			exportFormat: "library-books-1.1",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports books to CSV
	 * @param selectedFilePaths - Optional specific files to export
	 * @returns CSV string of exported data
	 */
	async exportBooksToCsv(selectedFilePaths: string[] = []): Promise<string> {
		const { items } = await this.getBookContent();

		// Filter items if paths provided
		const filteredItems =
			selectedFilePaths.length > 0
				? items.filter((item) =>
						selectedFilePaths.includes(item.filePath)
				  )
				: items;

		// Create CSV header
		const header =
			"العنوان,المؤلف,النوع,الحالة,اللغة,عدد الصفحات,الناشر,سنة النشر,التقييم,تاريخ الإضافة,الوسوم,التصنيفات\n";

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
				return [
					escapeField(item.title),
					escapeField(item.author),
					escapeField(item.type),
					escapeField(item.status),
					escapeField(item.language || ""),
					escapeField(item.pageCount),
					escapeField(item.publisher || ""),
					escapeField(item.publishYear || ""),
					escapeField(item.rating || ""),
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
	 * Imports books data from JSON
	 * @param jsonData - JSON string with book data
	 * @returns Import result with success and failure counts
	 */
	async importBooks(jsonData: string): Promise<ImportResult> {
		try {
			const data = JSON.parse(jsonData);
			let success = 0;
			let failed = 0;
			const messages: string[] = [];

			// Get current items to detect duplicates
			const { items } = await this.getBookContent();
			const existingTitles = new Set(
				items.map((item) => item.title.toLowerCase().trim())
			);

			// Handle format with 'books' array
			if (Array.isArray(data.books)) {
				for (const book of data.books) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(book.title.toLowerCase().trim())
						) {
							messages.push(
								`تم تخطي الكتاب "${book.title}" (موجود مسبقاً)`
							);
							failed++;
							continue;
						}

						let result = false;

						// If book has complete content, create file directly
						if (book.content) {
							const folderPath = await this.resolveBookFolderPath(
								{
									type: book.type,
									author: book.author,
									date: book.dateAdded,
								}
							);

							await this.createFolderIfNeeded(folderPath);

							const sanitizedTitle = sanitizeFileName(
								book.title,
								this.settings.maxTitleLength
							);
							const fileName = `${sanitizedTitle}.md`;
							const filePath = `${folderPath}/${fileName}`;

							await this.app.vault.create(filePath, book.content);
							result = true;
						}
						// Otherwise create from book data
						else {
							result = await this.createBook({
								title: book.title,
								author: book.author,
								type: book.type || "كتاب",
								pageCount: book.pageCount || 0,
								publisher: book.publisher || "",
								publishYear: book.publishYear || "",
								description: book.description || "",
								coverUrl: book.coverUrl || "",
								status: book.status,
								startDate: book.startDate,
								completionDate: book.completionDate,
								tags: book.tags || [],
								categories: book.categories || [],
								rating: book.rating,
							});
						}

						if (result) success++;
						else {
							failed++;
							messages.push(`فشل استيراد "${book.title}"`);
						}
					} catch (e) {
						console.error("Error importing book:", e);
						failed++;
						messages.push(`خطأ في استيراد الكتاب: ${e.message}`);
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
