/**
 * Utility functions for working with content items
 */
import { App, TFile, Menu, Notice } from "obsidian";
import { LibraryItem } from "../core/contentTypes";
import { ContentType } from "../core/uiTypes";

/**
 * Utilities for working with content items
 */
export class ItemUtils {
	/**
	 * Opens a file in Obsidian
	 * @param app Obsidian app instance
	 * @param filePath Path to the file
	 */
	public static openFile(app: App, filePath: string): void {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			const leaf = app.workspace.getLeaf();
			leaf.openFile(file);
		}
	}

	/**
	 * Formats a tag for display, handling hierarchical tags
	 * @param tag Tag string
	 * @param element Element to render tag in
	 */
	public static formatTagForDisplay(tag: string, element: HTMLElement): void {
		if (tag.includes("/")) {
			// Hierarchical tag
			const [parent, ...childParts] = tag.split("/");
			const child = childParts.join("/");

			element.addClass("library-hierarchical-tag");

			element.createEl("span", {
				cls: "library-tag-parent",
				text: parent,
			});
			element.createEl("span", { text: "/" });
			element.createEl("span", {
				cls: "library-tag-child",
				text: child,
			});
		} else {
			// Regular tag
			element.textContent = tag;
		}
	}

	/**
	 * Formats a category for display, handling hierarchical categories
	 * @param category Category string
	 * @param element Element to render category in
	 */
	public static formatCategoryForDisplay(
		category: string,
		element: HTMLElement
	): void {
		if (category.includes("/")) {
			// Hierarchical category
			const [parent, ...childParts] = category.split("/");
			const child = childParts.join("/");

			element.addClass("library-hierarchical-category");

			element.createEl("span", {
				cls: "library-category-parent",
				text: parent,
			});
			element.createEl("span", { text: "/" });
			element.createEl("span", {
				cls: "library-category-child",
				text: child,
			});
		} else {
			// Regular category
			element.textContent = category;
		}
	}

	/**
	 * Creates a status dropdown for an item
	 * @param container Container element
	 * @param item Item to create dropdown for
	 * @param statusOptions Available status options
	 * @param dataService Data service for updating status
	 * @param onRefresh Callback after status change
	 */
	public static createStatusDropdown(
		container: HTMLElement,
		item: LibraryItem,
		statusOptions: string[],
		dataService: any,
		onRefresh: () => Promise<void>
	): void {
		const select = container.createEl("select", {
			cls: "library-status-select",
		});

		statusOptions.forEach((option: string) => {
			const optionEl = select.createEl("option", {
				value: option,
				text: option,
			});
			if (option === item.status) {
				optionEl.selected = true;
			}
		});

		// Add status class for styling
		const statusClass = `status-${(item.status || "")
			.toLowerCase()
			.replace(/\s+/g, "-")}`;
		select.addClass(statusClass);

		select.addEventListener("change", async () => {
			const newStatus = select.value;
			try {
				await dataService.updateStatus(item.filePath, newStatus);

				// Update item status
				item.status = newStatus;

				// Update status class
				select.className = `library-status-select status-${newStatus
					.toLowerCase()
					.replace(/\s+/g, "-")}`;

				// Optional UI refresh
				await onRefresh();
			} catch (error) {
				console.error("Error updating status:", error);
				new Notice("حدث خطأ أثناء تحديث الحالة");
			}
		});
	}

	/**
	 * Shows a confirmation dialog for deleting an item
	 * @param item Item to delete
	 * @param onConfirm Callback when deletion is confirmed
	 */
	public static confirmItemDelete(
		item: LibraryItem,
		onConfirm: () => Promise<void>
	): void {
		const confirmDialog = document.createElement("div");
		confirmDialog.className = "library-confirm-dialog";

		const message = document.createElement("p");
		message.textContent = `هل أنت متأكد من حذف "${item.title}"؟ لا يمكن التراجع عن هذا الإجراء.`;
		message.className = "library-confirm-message";

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "library-confirm-buttons";

		const confirmButton = document.createElement("button");
		confirmButton.textContent = "حذف";
		confirmButton.className = "library-confirm-delete";
		confirmButton.addEventListener("click", async () => {
			document.body.removeChild(confirmDialog);
			await onConfirm();
		});

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "إلغاء";
		cancelButton.className = "library-confirm-cancel";
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(confirmDialog);
		});

		buttonContainer.appendChild(confirmButton);
		buttonContainer.appendChild(cancelButton);

		confirmDialog.appendChild(message);
		confirmDialog.appendChild(buttonContainer);

		document.body.appendChild(confirmDialog);
	}

	/**
	 * Performs item deletion
	 * @param dataService Data service
	 * @param item Item to delete
	 * @param onComplete Callback after deletion
	 */
	public static async performItemDelete(
		dataService: any,
		item: LibraryItem,
		onComplete: () => Promise<void>
	): Promise<void> {
		try {
			new Notice("جاري الحذف...");
			const result = await dataService.deleteItem(item.filePath);

			if (result.success) {
				new Notice("تم الحذف بنجاح");
				await onComplete();
			} else {
				new Notice("فشل الحذف: " + (result.error || "خطأ غير معروف"));
			}
		} catch (error) {
			console.error("Error deleting item:", error);
			new Notice("حدث خطأ أثناء الحذف");
		}
	}

	/**
	 * Shows dialog for editing tags
	 * @param item Item to edit tags for
	 * @param dataService Data service
	 * @param contentType Content type
	 * @param onComplete Callback after edit
	 */
	public static async showEditTagsDialog(
		item: LibraryItem,
		dataService: any,
		contentType: ContentType,
		onComplete: () => Promise<void>
	): Promise<void> {
		// Create modal dialog
		const dialog = document.createElement("div");
		dialog.className = "library-modal-dialog library-edit-tags-dialog";

		// Add header
		const header = dialog.createEl("div", {
			cls: "library-dialog-header",
		});

		header.createEl("h3", {
			text: "تعديل الوسوم",
			cls: "library-dialog-title",
		});

		// Content
		const content = dialog.createEl("div", {
			cls: "library-dialog-content",
		});

		// Item title
		content.createEl("div", {
			text: item.title,
			cls: "library-dialog-item-title",
		});

		// Current tags section
		const currentSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		currentSection.createEl("h4", {
			text: "الوسوم الحالية:",
			cls: "library-dialog-section-title",
		});

		// Selected tags container
		const currentTagsContainer = currentSection.createEl("div", {
			cls: "library-selected-tags",
		});

		// Prepare tags array
		const selectedTags = Array.isArray(item.tags) ? [...item.tags] : [];

		// Function to render selected tags
		const renderSelectedTags = () => {
			currentTagsContainer.empty();

			if (selectedTags.length === 0) {
				currentTagsContainer.createEl("div", {
					text: "لا توجد وسوم",
					cls: "library-no-tags",
				});
				return;
			}

			selectedTags.forEach((tag) => {
				const chip = currentTagsContainer.createEl("div", {
					cls: "library-tag-chip",
				});

				// Use our formatting function
				const tagSpan = chip.createEl("span");
				ItemUtils.formatTagForDisplay(tag, tagSpan);

				// Remove button
				const removeBtn = chip.createEl("span", {
					text: "×",
					cls: "library-tag-remove",
				});

				removeBtn.addEventListener("click", () => {
					const index = selectedTags.indexOf(tag);
					if (index > -1) {
						selectedTags.splice(index, 1);
						renderSelectedTags();
					}
				});
			});
		};

		// Initial render
		renderSelectedTags();

		// Add new tag section
		const newSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		newSection.createEl("h4", {
			text: "إضافة وسم جديد:",
			cls: "library-dialog-section-title",
		});

		// Input for new tag
		const inputGroup = newSection.createEl("div", {
			cls: "library-input-group",
		});

		const input = inputGroup.createEl("input", {
			type: "text",
			placeholder: "أدخل اسم الوسم",
			cls: "library-tag-input",
		});

		const addButton = inputGroup.createEl("button", {
			text: "إضافة",
			cls: "library-add-button",
		});

		// Add tag functionality
		const addTag = () => {
			const tag = input.value.trim();
			if (tag && !selectedTags.includes(tag)) {
				selectedTags.push(tag);
				renderSelectedTags();
				input.value = "";
				input.focus();
			}
		};

		// Add tag when button is clicked
		addButton.addEventListener("click", addTag);

		// Add tag on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				addTag();
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		suggestionsSection.createEl("h4", {
			text: "اقتراحات:",
			cls: "library-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "library-tag-suggestions",
		});

		// Get all available tags
		const allTags = await dataService.getTags(contentType);

		// Show suggestions
		if (allTags.length > 0) {
			allTags.forEach((tag: string) => {
				if (!selectedTags.includes(tag)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "library-suggestion-chip",
					});

					// Use formatting function
					ItemUtils.formatTagForDisplay(tag, chip);

					chip.addEventListener("click", () => {
						if (!selectedTags.includes(tag)) {
							selectedTags.push(tag);
							renderSelectedTags();
						}
					});
				}
			});
		} else {
			suggestionsContainer.createEl("div", {
				text: "لا توجد اقتراحات",
				cls: "library-no-suggestions",
			});
		}

		// Footer with buttons
		const footer = dialog.createEl("div", {
			cls: "library-dialog-footer",
		});

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "library-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "حفظ",
			cls: "library-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Save action
		saveButton.addEventListener("click", async () => {
			try {
				await dataService.updateTags(item.filePath, selectedTags);
				item.tags = selectedTags;
				document.body.removeChild(dialog);
				await onComplete();
			} catch (error) {
				console.error("Error updating tags:", error);
				new Notice("حدث خطأ أثناء تحديث الوسوم");
			}
		});

		// Add dialog to document
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Shows dialog for editing categories
	 * @param item Item to edit categories for
	 * @param dataService Data service
	 * @param contentType Content type
	 * @param onComplete Callback after edit
	 */
	public static async showEditCategoriesDialog(
		item: LibraryItem,
		dataService: any,
		contentType: ContentType,
		onComplete: () => Promise<void>
	): Promise<void> {
		// Create modal dialog
		const dialog = document.createElement("div");
		dialog.className =
			"library-modal-dialog library-edit-categories-dialog";

		// Add header
		const header = dialog.createEl("div", {
			cls: "library-dialog-header",
		});

		header.createEl("h3", {
			text: "تعديل التصنيفات",
			cls: "library-dialog-title",
		});

		// Content
		const content = dialog.createEl("div", {
			cls: "library-dialog-content",
		});

		// Item title
		content.createEl("div", {
			text: item.title,
			cls: "library-dialog-item-title",
		});

		// Current categories section
		const currentSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		currentSection.createEl("h4", {
			text: "التصنيفات الحالية:",
			cls: "library-dialog-section-title",
		});

		// Selected categories container
		const currentCategoriesContainer = currentSection.createEl("div", {
			cls: "library-selected-categories",
		});

		// Prepare categories array
		const selectedCategories = Array.isArray(item.categories)
			? [...item.categories]
			: [];

		// Function to render selected categories
		const renderSelectedCategories = () => {
			currentCategoriesContainer.empty();

			if (selectedCategories.length === 0) {
				currentCategoriesContainer.createEl("div", {
					text: "لا توجد تصنيفات",
					cls: "library-no-categories",
				});
				return;
			}

			selectedCategories.forEach((category) => {
				const chip = currentCategoriesContainer.createEl("div", {
					cls: "library-category-chip",
				});

				// Use our formatting function
				const categorySpan = chip.createEl("span");
				ItemUtils.formatCategoryForDisplay(category, categorySpan);

				// Remove button
				const removeBtn = chip.createEl("span", {
					text: "×",
					cls: "library-category-remove",
				});

				removeBtn.addEventListener("click", () => {
					const index = selectedCategories.indexOf(category);
					if (index > -1) {
						selectedCategories.splice(index, 1);
						renderSelectedCategories();
					}
				});
			});
		};

		// Initial render
		renderSelectedCategories();

		// Add new category section
		const newSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		newSection.createEl("h4", {
			text: "إضافة تصنيف جديد:",
			cls: "library-dialog-section-title",
		});

		// Input for new category
		const inputGroup = newSection.createEl("div", {
			cls: "library-input-group",
		});

		const input = inputGroup.createEl("input", {
			type: "text",
			placeholder: "أدخل اسم التصنيف",
			cls: "library-category-input",
		});

		const addButton = inputGroup.createEl("button", {
			text: "إضافة",
			cls: "library-add-button",
		});

		// Add category functionality
		const addCategory = () => {
			const category = input.value.trim();
			if (category && !selectedCategories.includes(category)) {
				selectedCategories.push(category);
				renderSelectedCategories();
				input.value = "";
				input.focus();
			}
		};

		// Add category when button is clicked
		addButton.addEventListener("click", addCategory);

		// Add category on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				addCategory();
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		suggestionsSection.createEl("h4", {
			text: "اقتراحات:",
			cls: "library-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "library-category-suggestions",
		});

		// Get all available categories
		const allCategories = await dataService.getCategories(contentType);

		// Show suggestions
		if (allCategories.length > 0) {
			allCategories.forEach((category: string) => {
				if (!selectedCategories.includes(category)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "library-suggestion-chip",
					});

					// Use formatting function
					ItemUtils.formatCategoryForDisplay(category, chip);

					chip.addEventListener("click", () => {
						if (!selectedCategories.includes(category)) {
							selectedCategories.push(category);
							renderSelectedCategories();
						}
					});
				}
			});
		} else {
			suggestionsContainer.createEl("div", {
				text: "لا توجد اقتراحات",
				cls: "library-no-suggestions",
			});
		}

		// Footer with buttons
		const footer = dialog.createEl("div", {
			cls: "library-dialog-footer",
		});

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "library-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "حفظ",
			cls: "library-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Save action
		saveButton.addEventListener("click", async () => {
			try {
				await dataService.updateCategories(
					item.filePath,
					selectedCategories
				);
				item.categories = selectedCategories;
				document.body.removeChild(dialog);
				await onComplete();
			} catch (error) {
				console.error("Error updating categories:", error);
				new Notice("حدث خطأ أثناء تحديث التصنيفات");
			}
		});

		// Add dialog to document
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}
}
