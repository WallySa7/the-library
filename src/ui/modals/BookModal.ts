// src/ui/modals/BookModal.ts
import {
	App,
	TextComponent,
	DropdownComponent,
	ButtonComponent,
	TFile,
} from "obsidian";
import { BaseModal } from "./BaseModal";
import { BookData, BookItem } from "../../core/contentTypes";
import { BOOK_STATUS } from "src/core/constants";
import { formatDate } from "src/utils";

/**
 * Modal for adding or editing a book
 */
export class BookModal extends BaseModal {
	private titleInput: TextComponent;
	private authorInput: TextComponent;
	private typeInput: DropdownComponent;
	private pageCountInput: TextComponent;
	private publisherInput: TextComponent;
	private publishYearInput: TextComponent;
	private descriptionInput: TextComponent;
	private tagsInput: TextComponent;
	private statusInput: DropdownComponent;
	private languageInput: DropdownComponent;
	private coverUrlInput: TextComponent;
	private coverPreview: HTMLElement;
	private previewContainer: HTMLElement;
	private categoriesInput: TextComponent;
	private ratingInput: DropdownComponent;

	private existingBook: BookItem | null = null;
	private isEditMode: boolean = false;

	/**
	 * Creates a new BookModal for adding or editing a book
	 * @param app Obsidian app instance
	 * @param plugin Plugin instance
	 * @param existingBook Optional existing book for editing mode
	 */
	constructor(app: App, plugin: any, existingBook?: BookItem) {
		super(app, plugin);

		if (existingBook) {
			this.existingBook = existingBook;
			this.isEditMode = true;
		}
	}

	/**
	 * Gets the submit button text
	 */
	protected getSubmitButtonText(): string {
		return this.isEditMode ? "تحديث" : "إضافة";
	}

	/**
	 * Renders the modal content
	 */
	protected renderModalContent(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: this.isEditMode ? "تعديل الكتاب" : "إضافة كتاب جديد",
		});

		const form = contentEl.createEl("div", { cls: "library-form" });

		// Basic book info
		this.renderBasicFields(form);
		this.renderDetailsFields(form);
		this.renderCoverSection(form);
		this.renderCategoriesAndTagsFields(form);
		this.renderStatusAndRatingAndLanguageFields(form);

		// Button container
		const buttonContainer = form.createEl("div", {
			cls: "library-buttons",
		});
		this.renderActionButtons(buttonContainer);

		// Pre-populate fields for edit mode
		if (this.isEditMode && this.existingBook) {
			this.populateFieldsFromExistingBook();
		}
	}

	/**
	 * Populates form fields from existing book when in edit mode
	 */
	private populateFieldsFromExistingBook(): void {
		if (!this.existingBook) return;

		// Populate basic fields
		this.titleInput.setValue(this.existingBook.title || "");
		this.authorInput.setValue(this.existingBook.author || "");
		this.pageCountInput.setValue(
			this.existingBook.pageCount?.toString() || ""
		);

		// Populate details fields
		this.publisherInput.setValue(this.existingBook.publisher || "");
		this.publishYearInput.setValue(this.existingBook.publishYear || "");
		this.languageInput.setValue(this.existingBook.language || "");

		// Populate categories and tags - handle both array and string formats
		const categories = Array.isArray(this.existingBook.categories)
			? this.existingBook.categories.join(", ")
			: typeof this.existingBook.categories === "string"
			? this.existingBook.categories
			: "";
		this.categoriesInput.setValue(categories);

		const tags = Array.isArray(this.existingBook.tags)
			? this.existingBook.tags.join(", ")
			: typeof this.existingBook.tags === "string"
			? this.existingBook.tags
			: "";
		this.tagsInput.setValue(tags);

		// Set status
		if (this.existingBook.status) {
			this.statusInput.setValue(this.existingBook.status);
		}

		// Set rating
		if (this.existingBook.rating) {
			this.ratingInput.setValue(this.existingBook.rating.toString());
		}

		// Set cover URL and preview
		if (this.existingBook.coverUrl) {
			this.coverUrlInput.setValue(this.existingBook.coverUrl);
			this.previewCover();
		}

		// Load description from file content
		this.loadDescriptionFromFile(this.existingBook.filePath);
	}

	/**
	 * Loads description from the book file
	 * @param filePath Path to book file
	 */
	private async loadDescriptionFromFile(filePath: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return;

			const content = await this.app.vault.read(file);

			// Extract description from content
			// This is a basic approach - you may need a more sophisticated parser for actual markdown
			const descriptionRegex = /## الملخص\s*\n\n([\s\S]*?)(?=\n\n##|$)/;
			const match = content.match(descriptionRegex);

			if (match && match[1]) {
				this.descriptionInput.setValue(match[1].trim());
			}
		} catch (error) {
			console.error("Error loading description from file:", error);
		}
	}

	/**
	 * Renders basic book fields (title, author)
	 * @param form Form container
	 */
	private renderBasicFields(form: HTMLElement): void {
		// Title input
		this.createFormField(form, "عنوان الكتاب", () => {
			this.titleInput = new TextComponent(form);
			this.titleInput.setPlaceholder("أدخل عنوان الكتاب");
			this.titleInput.inputEl.addClass("library-input");
			return this.titleInput.inputEl;
		});

		// Author input with autocomplete
		this.createFormField(form, "المؤلف", () => {
			const container = form.createEl("div");
			this.authorInput = new TextComponent(container);
			this.authorInput.setPlaceholder("اسم المؤلف");
			this.authorInput.inputEl.addClass("library-input");

			const datalist = container.createEl("datalist");
			datalist.id = "author-suggestions";
			this.authorInput.inputEl.setAttr("list", "author-suggestions");

			// Get authors if available
			this.plugin.dataService
				.getBookContent()
				.then((content: any) => {
					if (content && content.authors) {
						content.authors.forEach((author: string) => {
							const option = datalist.createEl("option");
							option.value = author;
						});
					}
				})
				.catch(() => {
					// Ignore errors
				});

			// Set default author if empty
			if (!this.authorInput.getValue() && !this.isEditMode) {
				this.authorInput.setValue(this.plugin.settings.defaultAuthor);
			}

			return container;
		});
	}

	/**
	 * Renders book details fields
	 * @param form Form container
	 */
	private renderDetailsFields(form: HTMLElement): void {
		// Page count input
		this.createFormField(form, "عدد الصفحات", () => {
			this.pageCountInput = new TextComponent(form);
			this.pageCountInput.setPlaceholder("عدد الصفحات");
			this.pageCountInput.inputEl.type = "number";
			this.pageCountInput.inputEl.min = "1";
			this.pageCountInput.inputEl.addClass("library-input");
			return this.pageCountInput.inputEl;
		});

		// Publisher input
		this.createFormField(form, "الناشر (اختياري)", () => {
			this.publisherInput = new TextComponent(form);
			this.publisherInput.setPlaceholder("اسم دار النشر");
			this.publisherInput.inputEl.addClass("library-input");
			return this.publisherInput.inputEl;
		});

		// Publish date input
		this.createFormField(form, "سنة النشر (اختياري)", () => {
			this.publishYearInput = new TextComponent(form);
			this.publishYearInput.setPlaceholder("YYYY");
			this.publishYearInput.inputEl.addClass("library-input");

			this.publishYearInput.inputEl.maxLength = 4;
			this.publishYearInput.inputEl.pattern = "\\d{4}";
			this.publishYearInput.inputEl.inputMode = "numeric";
			return this.publishYearInput.inputEl;
		});

		// Description input
		this.createFormField(form, "الوصف (اختياري)", () => {
			const container = form.createEl("div");
			// Use textarea for longer text
			const textarea = container.createEl("textarea", {
				cls: "library-textarea",
				attr: { rows: "4", placeholder: "وصف الكتاب أو ملخصه" },
			});

			this.descriptionInput = new TextComponent(container);
			this.descriptionInput.inputEl.replaceWith(textarea);
			(this.descriptionInput as any).inputEl = textarea;

			return container;
		});
	}

	/**
	 * Renders cover URL and preview sections
	 * @param form Form container
	 */
	private renderCoverSection(form: HTMLElement): void {
		// Cover URL input
		this.createFormField(form, "رابط صورة الغلاف (اختياري)", () => {
			const container = form.createEl("div", {
				cls: "library-cover-url-container",
			});

			this.coverUrlInput = new TextComponent(container);
			this.coverUrlInput.setPlaceholder("أدخل رابط صورة غلاف الكتاب");
			this.coverUrlInput.inputEl.addClass("library-input");

			// Add preview button
			const previewButton = new ButtonComponent(container)
				.setButtonText("معاينة")
				.setClass("library-preview-button")
				.onClick(() => {
					this.previewCover();
				});

			return container;
		});

		// Preview container (initially hidden)
		this.previewContainer = form.createEl("div", {
			cls: "library-preview-container",
		});
		this.previewContainer.style.display = "none";

		this.coverPreview = this.previewContainer.createEl("div", {
			cls: "library-cover-container",
		});
	}

	/**
	 * Renders categories and tags fields
	 * @param form Form container
	 */
	private renderCategoriesAndTagsFields(form: HTMLElement): void {
		// Categories field
		this.createFormField(form, "التصنيفات (اختياري)", () => {
			const container = form.createEl("div");
			this.categoriesInput = new TextComponent(container);
			this.categoriesInput.setPlaceholder("تصنيفات مفصولة بفواصل");
			this.categoriesInput.inputEl.addClass("library-input");

			// Add category suggestions
			this.plugin.dataService
				.getBookContent()
				.then((content: any) => {
					if (
						content &&
						content.categories &&
						content.categories.length > 0
					) {
						const categorySuggestions = container.createEl("div", {
							cls: "library-tag-suggestions",
						});

						content.categories
							.slice(0, 10)
							.forEach((category: string) => {
								const categoryChip =
									categorySuggestions.createEl("span", {
										text: category,
										cls: "library-tag-chip",
									});

								categoryChip.addEventListener("click", () => {
									const currentCategories =
										this.categoriesInput
											.getValue()
											.split(",")
											.map((t) => t.trim())
											.filter((t) => t);

									if (!currentCategories.includes(category)) {
										const newCategoriesValue =
											currentCategories.length > 0
												? `${this.categoriesInput.getValue()}, ${category}`
												: category;
										this.categoriesInput.setValue(
											newCategoriesValue
										);
									}
								});
							});
					}
				})
				.catch(() => {
					// Ignore errors
				});

			return container;
		});

		// Tags input
		this.createFormField(form, "وسوم (اختياري)", () => {
			const container = form.createEl("div");
			this.tagsInput = new TextComponent(container);
			this.tagsInput.setPlaceholder("وسوم مفصولة بفواصل");
			this.tagsInput.inputEl.addClass("library-input");

			// Add tag suggestions
			this.plugin.dataService
				.getBookContent()
				.then((content: any) => {
					if (content && content.tags && content.tags.length > 0) {
						const tagSuggestions = container.createEl("div", {
							cls: "library-tag-suggestions",
						});

						content.tags.slice(0, 10).forEach((tag: string) => {
							const tagChip = tagSuggestions.createEl("span", {
								text: tag,
								cls: "library-tag-chip",
							});

							tagChip.addEventListener("click", () => {
								const currentTags = this.tagsInput
									.getValue()
									.split(",")
									.map((t) => t.trim())
									.filter((t) => t);

								if (!currentTags.includes(tag)) {
									const newTagsValue =
										currentTags.length > 0
											? `${this.tagsInput.getValue()}, ${tag}`
											: tag;
									this.tagsInput.setValue(newTagsValue);
								}
							});
						});
					}
				})
				.catch(() => {
					// Ignore errors
				});

			return container;
		});
	}

	/**
	 * Renders status and rating fields
	 * @param form Form container
	 */
	private renderStatusAndRatingAndLanguageFields(form: HTMLElement): void {
		this.createFormField(form, "لغة الكتاب", () => {
			const container = form.createEl("div");
			this.languageInput = new DropdownComponent(container);

			// Add common languages in Arabic
			this.languageInput.addOption("", "اختر اللغة");
			this.languageInput.addOption("العربية", "العربية");
			this.languageInput.addOption("الإنجليزية", "الإنجليزية");
			this.languageInput.addOption("الفرنسية", "الفرنسية");
			this.languageInput.addOption("الإسبانية", "الإسبانية");
			this.languageInput.addOption("الألمانية", "الألمانية");
			this.languageInput.addOption("أخرى", "أخرى");

			return container;
		});

		// Status dropdown
		this.createFormField(form, "حالة القراءة", () => {
			const container = form.createEl("div");
			this.statusInput = new DropdownComponent(container);

			this.plugin.settings.bookTracking.statusOptions.forEach(
				(option: string) => {
					this.statusInput.addOption(option, option);
				}
			);

			// Only set default status in creation mode, not edit mode
			if (!this.isEditMode) {
				this.statusInput.setValue(
					this.plugin.settings.bookTracking.defaultStatus
				);
			}

			return container;
		});

		// Rating input (1-5)
		this.createFormField(form, "التقييم (اختياري)", () => {
			const container = form.createEl("div");
			this.ratingInput = new DropdownComponent(container);

			// Add rating options
			this.ratingInput.addOption("", "بدون تقييم");
			for (let i = 1; i <= 5; i++) {
				this.ratingInput.addOption(i.toString(), "★".repeat(i));
			}

			return container;
		});
	}

	/**
	 * Previews the book cover from URL
	 */
	private previewCover(): void {
		const url = this.coverUrlInput.getValue().trim();
		if (!url) {
			this.showWarning("الرجاء إدخال رابط صورة الغلاف");
			return;
		}

		try {
			// Show thumbnail
			this.coverPreview.empty();
			const img = this.coverPreview.createEl("img", {
				cls: "library-cover-image",
				attr: { src: url, alt: "صورة غلاف الكتاب" },
			});

			// Add size constraints
			img.style.maxWidth = "100%";
			img.style.maxHeight = "250px";
			img.style.objectFit = "contain";

			// Handle errors
			img.onerror = () => {
				this.showError("فشل في تحميل صورة الغلاف من الرابط المحدد");
				this.previewContainer.style.display = "none";
			};

			// Show the preview container
			this.previewContainer.style.display = "block";
		} catch (error) {
			console.error("Error previewing cover:", error);
			this.showError("حدث خطأ أثناء معاينة صورة الغلاف");
		}
	}

	/**
	 * Handles form submission
	 */
	protected async onSubmit(): Promise<void> {
		if (this.isLoading) return;

		const title = this.titleInput.getValue().trim();
		if (!title) {
			this.showWarning("الرجاء إدخال عنوان الكتاب");
			return;
		}

		const author = this.authorInput.getValue().trim();
		if (!author) {
			this.showWarning("الرجاء إدخال اسم المؤلف");
			return;
		}

		const pageCount = this.pageCountInput.getValue();
		if (!pageCount) {
			this.showWarning("الرجاء إدخال عدد صفحات صحيح");
			return;
		}

		this.isLoading = true;
		this.loadingMessage = "جاري معالجة الطلب...";
		this.updateLoadingUI();

		try {
			const publisher = this.publisherInput.getValue().trim();
			const publishYear = this.publishYearInput.getValue().trim();
			const description = this.descriptionInput.getValue().trim();
			const coverUrl = this.coverUrlInput.getValue().trim();
			const status = this.statusInput.getValue();
			const ratingStr = this.ratingInput.getValue();
			const rating = ratingStr ? parseInt(ratingStr) : undefined;

			// Get language
			const language = this.languageInput?.getValue() || "";

			// Process tags - convert to array
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			// Process categories - convert to array
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Set initial start and completion dates based on status
			const today = formatDate(
				new Date(),
				this.plugin.settings.dateFormat
			);
			let startDate = "";
			let completionDate = "";

			if (!this.isEditMode) {
				// Only auto-set dates when creating a new book
				if (status === BOOK_STATUS.READ) {
					completionDate = today;
					startDate = today; // For "read" books, set both dates if not previously reading
				} else if (status === BOOK_STATUS.READING) {
					startDate = today; // For "reading", set start date only
				}
			}

			let success = false;

			if (this.isEditMode && this.existingBook) {
				// Update existing book - pass arrays directly
				const bookData: Partial<BookData> = {
					title,
					author,
					type: "كتاب",
					pageCount: parseInt(pageCount),
					publisher,
					publishYear,
					description,
					coverUrl,
					status,
					tags, // Pass as array
					categories, // Pass as array
					rating,
					language,
				};

				success = await this.plugin.dataService.updateBook(
					this.existingBook.filePath,
					bookData
				);

				if (success) {
					this.showSuccess(`تم تحديث الكتاب "${title}" بنجاح`);
				} else {
					this.showError("حدث خطأ أثناء تحديث الكتاب");
				}
			} else {
				// Create new book - pass arrays directly
				success = await this.plugin.dataService.createBook({
					title,
					author,
					type: "كتاب",
					pageCount: parseInt(pageCount),
					publisher,
					publishYear,
					description,
					coverUrl,
					status,
					startDate,
					completionDate,
					tags, // Pass as array
					categories, // Pass as array
					rating,
					language,
				});

				if (success) {
					this.showSuccess(`تمت إضافة الكتاب "${title}" بنجاح`);
				} else {
					this.showError("حدث خطأ أثناء إنشاء ملاحظة الكتاب");
				}
			}

			if (success) {
				this.close();
			}
		} catch (error) {
			console.error(
				this.isEditMode ? "Error updating book:" : "Error adding book:",
				error
			);
			this.showError(
				this.isEditMode
					? "حدث خطأ أثناء تحديث الكتاب"
					: "حدث خطأ أثناء إضافة الكتاب"
			);
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}
}
