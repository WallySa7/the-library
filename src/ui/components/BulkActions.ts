/**
 * Updated BulkActions.ts to support books
 */
import { Menu, Notice, setIcon, TFile } from "obsidian";
import { ContentComponentProps } from "../../core/uiTypes";
import { SelectionState } from "../../core/state/SelectionState";
import {
	CONTENT_TYPE,
	VIDEO_FRONTMATTER,
	BOOK_FRONTMATTER,
} from "../../core/constants";

/**
 * Props for BulkActions component
 */
interface BulkActionsProps extends ContentComponentProps {
	/** Selection state to operate on */
	selectionState: SelectionState;

	/** Callback when operations complete */
	onOperationComplete: () => Promise<void>;
}

/**
 * Provides UI for performing operations on multiple selected items
 */
export class BulkActions {
	private props: BulkActionsProps;
	private container: HTMLElement | null = null;

	/**
	 * Creates a new BulkActions component
	 * @param props Component props
	 */
	constructor(props: BulkActionsProps) {
		this.props = props;
	}

	/**
	 * Renders the bulk actions bar
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Create bulk actions bar
		const bulkActionsBar = container.createEl("div", {
			cls: "library-bulk-actions-bar",
		});

		// Selection count label
		const bulkActionsLabel = bulkActionsBar.createEl("span", {
			cls: "library-bulk-actions-label",
			text: "إجراءات متعددة: ",
		});

		const selectionCount = this.props.selectionState.getSelectionCount();
		bulkActionsLabel.createEl("span", {
			cls: "library-bulk-selection-count",
			text: `(${selectionCount})`,
		});

		// Add action buttons based on content type
		if (this.props.contentType === CONTENT_TYPE.VIDEO) {
			this.addVideoActionButtons(bulkActionsBar);
		} else if (this.props.contentType === CONTENT_TYPE.BOOK) {
			this.addBookActionButtons(bulkActionsBar);
		}

		// Cancel button (always present)
		const bulkCancelButton = bulkActionsBar.createEl("button", {
			cls: "library-bulk-action-btn library-cancel-btn",
			text: "إلغاء",
		});

		bulkCancelButton.addEventListener("click", () => {
			this.props.selectionState.clearSelection();
		});
	}

	/**
	 * Adds video-specific bulk action buttons
	 * @param container Actions bar container
	 */
	private addVideoActionButtons(container: HTMLElement): void {
		// Status button
		const bulkStatusButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل الحالة",
		});

		bulkStatusButton.addEventListener("click", () => {
			this.showBulkStatusMenu(bulkStatusButton, "video");
		});

		// Tags button
		const bulkTagButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل الوسوم",
		});

		bulkTagButton.addEventListener("click", () => {
			this.showBulkTagDialog();
		});

		// Categories button
		const bulkCategoryButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل التصنيفات",
		});

		bulkCategoryButton.addEventListener("click", () => {
			this.showBulkCategoryDialog();
		});

		// Delete button
		const bulkDeleteButton = container.createEl("button", {
			cls: "library-bulk-action-btn library-delete-btn",
			text: "حذف",
		});

		bulkDeleteButton.addEventListener("click", () => {
			this.confirmBulkDelete();
		});
	}

	/**
	 * Adds book-specific bulk action buttons
	 * @param container Actions bar container
	 */
	private addBookActionButtons(container: HTMLElement): void {
		// Status button for books
		const bulkStatusButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل حالة القراءة",
		});

		bulkStatusButton.addEventListener("click", () => {
			this.showBulkStatusMenu(bulkStatusButton, "book");
		});

		// Tags button
		const bulkTagButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل الوسوم",
		});

		bulkTagButton.addEventListener("click", () => {
			this.showBulkTagDialog();
		});

		// Categories button
		const bulkCategoryButton = container.createEl("button", {
			cls: "library-bulk-action-btn",
			text: "تعديل التصنيفات",
		});

		bulkCategoryButton.addEventListener("click", () => {
			this.showBulkCategoryDialog();
		});

		// Delete button
		const bulkDeleteButton = container.createEl("button", {
			cls: "library-bulk-action-btn library-delete-btn",
			text: "حذف",
		});

		bulkDeleteButton.addEventListener("click", () => {
			this.confirmBulkDelete();
		});
	}

	/**
	 * Shows the bulk status dropdown menu
	 * @param buttonEl Button element to position menu against
	 * @param contentType Type of content ('video' or 'book')
	 */
	private showBulkStatusMenu(
		buttonEl: HTMLElement,
		contentType: "video" | "book"
	): void {
		const menu = new Menu();

		// Add status options based on content type
		if (contentType === "book") {
			// Book status options
			this.props.settings.bookTracking.statusOptions.forEach(
				(status: string) => {
					menu.addItem((item) => {
						item.setTitle(status).onClick(() => {
							this.performBulkStatusUpdate(status);
						});
					});
				}
			);
		} else {
			// Video status options
			this.props.settings.videoTracking.statusOptions.forEach(
				(status: string) => {
					menu.addItem((item) => {
						item.setTitle(status).onClick(() => {
							this.performBulkStatusUpdate(status);
						});
					});
				}
			);
		}

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Performs a bulk status update
	 * @param status New status to apply
	 */
	private async performBulkStatusUpdate(status: string): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		const itemType =
			this.props.contentType === CONTENT_TYPE.BOOK ? "كتاب" : "عنصر";
		new Notice(`⏳ جاري تحديث ${selectedItems.length} ${itemType}...`);

		try {
			const result = await this.props.plugin.dataService.bulkUpdateStatus(
				selectedItems,
				status
			);

			if (result.success > 0) {
				new Notice(
					`✅ تم تحديث ${result.success} ${itemType} إلى "${status}"`
				);
			}

			if (result.failed > 0) {
				new Notice(`⚠️ فشل تحديث ${result.failed} ${itemType}`);
			}

			// Clean up and refresh
			this.props.selectionState.clearSelection();
			await this.props.onOperationComplete();
		} catch (error) {
			console.error("Error in bulk status update:", error);
			new Notice("❌ حدث خطأ أثناء تحديث الحالة");
		}
	}

	/**
	 * Shows dialog for adding/editing tags in bulk
	 */
	private async showBulkTagDialog(): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Create dialog
		const dialog = document.createElement("div");
		dialog.className = "library-modal-dialog library-edit-tags-dialog";

		// Add header
		const header = dialog.createEl("div", { cls: "library-dialog-header" });
		header.createEl("h3", {
			text: "تعديل الوسوم بشكل جماعي",
			cls: "library-dialog-title",
		});

		// Add close button
		const closeBtn = header.createEl("button", {
			cls: "library-dialog-close",
			text: "×",
		});

		closeBtn.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "library-dialog-content",
		});

		// Display count of selected items
		const itemType =
			this.props.contentType === CONTENT_TYPE.BOOK ? "كتاب" : "عنصر";
		content.createEl("div", {
			text: `${itemType} المحدد: ${selectedItems.length}`,
			cls: "library-dialog-item-count",
		});

		// Array to track selected tags
		const selectedTags: string[] = [];

		// Selected tags section
		const currentSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		currentSection.createEl("h4", {
			text: "الوسوم المحددة:",
			cls: "library-dialog-section-title",
		});

		// Container for selected tags
		const selectedTagsContainer = currentSection.createEl("div", {
			cls: "library-selected-tags",
		});

		// Function to render selected tags
		const renderSelectedTags = () => {
			selectedTagsContainer.empty();

			if (selectedTags.length === 0) {
				selectedTagsContainer.createEl("div", {
					text: "لا توجد وسوم محددة",
					cls: "library-no-tags",
				});
				return;
			}

			selectedTags.forEach((tag) => {
				const chip = selectedTagsContainer.createEl("div", {
					cls: "library-tag-chip",
				});

				chip.createEl("span", { text: tag });

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

		// Add tag when button is clicked
		addButton.addEventListener("click", () => {
			const tag = input.value.trim();
			if (tag && !selectedTags.includes(tag)) {
				selectedTags.push(tag);
				renderSelectedTags();
				input.value = "";
				input.focus();
			}
		});

		// Add tag on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const tag = input.value.trim();
				if (tag && !selectedTags.includes(tag)) {
					selectedTags.push(tag);
					renderSelectedTags();
					input.value = "";
				}
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		suggestionsSection.createEl("h4", {
			text: "اقتراحات الوسوم:",
			cls: "library-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "library-tag-suggestions",
		});

		// Get tag suggestions
		let allTags: string[] = [];
		allTags = await this.props.plugin.dataService.getTags(
			this.props.contentType
		);

		// Show suggestions
		if (allTags.length > 0) {
			allTags.forEach((tag) => {
				if (!selectedTags.includes(tag)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "library-suggestion-chip",
						text: tag,
					});

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

		// Operation mode section
		const operationModeSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		operationModeSection.createEl("h4", {
			text: "طريقة التطبيق:",
			cls: "library-dialog-section-title",
		});

		const operationModeContainer = operationModeSection.createEl("div", {
			cls: "library-operation-mode-container",
		});

		// Radio buttons for operation mode
		const replaceRadio = operationModeContainer.createEl("label", {
			cls: "library-radio-label",
		});

		const replaceInput = replaceRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "replace",
		});

		replaceInput.checked = true;
		replaceRadio.createEl("span", { text: "استبدال الوسوم الحالية" });

		const appendRadio = operationModeContainer.createEl("label", {
			cls: "library-radio-label",
		});

		const appendInput = appendRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "append",
		});

		appendRadio.createEl("span", { text: "إضافة إلى الوسوم الحالية" });

		// Footer with buttons
		const footer = dialog.createEl("div", { cls: "library-dialog-footer" });

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "library-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "تطبيق",
			cls: "library-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Apply action
		saveButton.addEventListener("click", async () => {
			if (selectedTags.length === 0) {
				new Notice("الرجاء اختيار وسم واحد على الأقل");
				return;
			}

			// Determine operation mode
			const mode = replaceInput.checked ? "replace" : "append";

			// Perform the bulk operation
			await this.performBulkTagUpdate(selectedTags, mode);

			document.body.removeChild(dialog);
		});

		// Add dialog to document body
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Performs bulk tag update
	 * @param tags Tags to update
	 * @param mode Update mode ('replace' or 'append')
	 */
	private async performBulkTagUpdate(
		tags: string[],
		mode: "replace" | "append"
	): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		const itemType =
			this.props.contentType === CONTENT_TYPE.BOOK ? "كتاب" : "عنصر";
		new Notice(
			`⏳ جاري تعديل الوسوم لـ ${selectedItems.length} ${itemType}...`
		);

		try {
			let success = 0;
			let failed = 0;

			for (const filePath of selectedItems) {
				try {
					const file =
						this.props.app.vault.getAbstractFileByPath(filePath);
					if (!(file instanceof TFile)) {
						failed++;
						continue;
					}

					const content = await this.props.app.vault.read(file);
					const frontmatter =
						this.props.plugin.dataService.parseFrontmatter(content);

					// Use the appropriate frontmatter field based on content type
					const tagsField =
						this.props.contentType === CONTENT_TYPE.BOOK
							? BOOK_FRONTMATTER.TAGS
							: VIDEO_FRONTMATTER.TAGS;

					let updatedTags: string[];
					if (mode === "append" && frontmatter?.[tagsField]) {
						// Get current tags and add new ones without duplicates
						const currentTags =
							this.props.plugin.dataService.normalizeTags(
								frontmatter[tagsField]
							);
						updatedTags = [...new Set([...currentTags, ...tags])];
					} else {
						// Replace mode - just use the new tags
						updatedTags = [...tags];
					}

					const result =
						await this.props.plugin.dataService.updateTags(
							filePath,
							updatedTags
						);

					if (result) {
						success++;
					} else {
						failed++;
					}
				} catch (error) {
					console.error(
						`Error updating tags for ${filePath}:`,
						error
					);
					failed++;
				}
			}

			if (success > 0) {
				new Notice(`✅ تم تحديث الوسوم لـ ${success} ${itemType}`);
			}

			if (failed > 0) {
				new Notice(`⚠️ فشل تحديث الوسوم لـ ${failed} ${itemType}`);
			}

			// Clean up and refresh
			this.props.selectionState.clearSelection();
			await this.props.onOperationComplete();
		} catch (error) {
			console.error("Error updating tags:", error);
			new Notice("❌ حدث خطأ أثناء تحديث الوسوم");
		}
	}

	/**
	 * Shows dialog for adding/replacing categories on multiple items
	 */
	private async showBulkCategoryDialog(): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Create dialog
		const dialog = document.createElement("div");
		dialog.className =
			"library-modal-dialog library-edit-categories-dialog";

		// Add header
		const header = dialog.createEl("div", { cls: "library-dialog-header" });
		header.createEl("h3", {
			text: "تعديل التصنيفات بشكل جماعي",
			cls: "library-dialog-title",
		});

		// Add close button
		const closeBtn = header.createEl("button", {
			cls: "library-dialog-close",
			text: "×",
		});

		closeBtn.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "library-dialog-content",
		});

		// Display count of selected items
		const itemType =
			this.props.contentType === CONTENT_TYPE.BOOK ? "كتاب" : "عنصر";
		content.createEl("div", {
			text: `${itemType} المحدد: ${selectedItems.length}`,
			cls: "library-dialog-item-count",
		});

		// Array to track selected categories
		const selectedCategories: string[] = [];

		// Selected categories section
		const currentSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		currentSection.createEl("h4", {
			text: "التصنيفات المحددة:",
			cls: "library-dialog-section-title",
		});

		// Container for selected categories
		const selectedCategoriesContainer = currentSection.createEl("div", {
			cls: "library-selected-categories",
		});

		// Function to render selected categories
		const renderSelectedCategories = () => {
			selectedCategoriesContainer.empty();

			if (selectedCategories.length === 0) {
				selectedCategoriesContainer.createEl("div", {
					text: "لا توجد تصنيفات محددة",
					cls: "library-no-categories",
				});
				return;
			}

			selectedCategories.forEach((category) => {
				const chip = selectedCategoriesContainer.createEl("div", {
					cls: "library-category-chip",
				});

				chip.createEl("span", { text: category });

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

		// Add category when button is clicked
		addButton.addEventListener("click", () => {
			const category = input.value.trim();
			if (category && !selectedCategories.includes(category)) {
				selectedCategories.push(category);
				renderSelectedCategories();
				input.value = "";
				input.focus();
			}
		});

		// Add category on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const category = input.value.trim();
				if (category && !selectedCategories.includes(category)) {
					selectedCategories.push(category);
					renderSelectedCategories();
					input.value = "";
				}
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		suggestionsSection.createEl("h4", {
			text: "اقتراحات التصنيفات:",
			cls: "library-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "library-category-suggestions",
		});

		// Get category suggestions
		let allCategories: string[] = [];
		allCategories = await this.props.plugin.dataService.getCategories(
			this.props.contentType
		);

		// Show suggestions
		if (allCategories.length > 0) {
			allCategories.forEach((category) => {
				if (!selectedCategories.includes(category)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "library-suggestion-chip",
						text: category,
					});

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

		// Operation mode section
		const operationModeSection = content.createEl("div", {
			cls: "library-dialog-section",
		});

		operationModeSection.createEl("h4", {
			text: "طريقة التطبيق:",
			cls: "library-dialog-section-title",
		});

		const operationModeContainer = operationModeSection.createEl("div", {
			cls: "library-operation-mode-container",
		});

		// Radio buttons for operation mode
		const replaceRadio = operationModeContainer.createEl("label", {
			cls: "library-radio-label",
		});

		const replaceInput = replaceRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "replace",
		});

		replaceInput.checked = true;
		replaceRadio.createEl("span", { text: "استبدال التصنيفات الحالية" });

		const appendRadio = operationModeContainer.createEl("label", {
			cls: "library-radio-label",
		});

		const appendInput = appendRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "append",
		});

		appendRadio.createEl("span", { text: "إضافة إلى التصنيفات الحالية" });

		// Footer with buttons
		const footer = dialog.createEl("div", { cls: "library-dialog-footer" });

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "library-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "تطبيق",
			cls: "library-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Apply action
		saveButton.addEventListener("click", async () => {
			if (selectedCategories.length === 0) {
				new Notice("الرجاء اختيار تصنيف واحد على الأقل");
				return;
			}

			// Determine operation mode
			const mode = replaceInput.checked ? "replace" : "append";

			// Perform the bulk operation
			await this.performBulkCategoryUpdate(selectedCategories, mode);

			document.body.removeChild(dialog);
		});

		// Add dialog to document body
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Performs bulk category update
	 * @param categories Categories to update
	 * @param mode Update mode ('replace' or 'append')
	 */
	private async performBulkCategoryUpdate(
		categories: string[],
		mode: "replace" | "append"
	): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		const itemType =
			this.props.contentType === CONTENT_TYPE.BOOK ? "كتاب" : "عنصر";
		new Notice(
			`⏳ جاري تعديل التصنيفات لـ ${selectedItems.length} ${itemType}...`
		);

		try {
			const result =
				await this.props.plugin.dataService.bulkUpdateCategories(
					selectedItems,
					categories,
					mode
				);

			if (result.success > 0) {
				new Notice(
					`✅ تم تحديث التصنيفات لـ ${result.success} ${itemType}`
				);
			}

			if (result.failed > 0) {
				new Notice(
					`⚠️ فشل تحديث التصنيفات لـ ${result.failed} ${itemType}`
				);
			}

			// Clean up and refresh
			this.props.selectionState.clearSelection();
			await this.props.onOperationComplete();
		} catch (error) {
			console.error("Error updating categories:", error);
			new Notice("❌ حدث خطأ أثناء تحديث التصنيفات");
		}
	}

	/**
	 * Shows confirmation dialog for bulk delete
	 */
	private confirmBulkDelete(): void {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		const count = selectedItems.length;
		const itemType =
			this.props.contentType === CONTENT_TYPE.VIDEO
				? "مقطع/سلسلة"
				: this.props.contentType === CONTENT_TYPE.BOOK
				? "كتاب"
				: "عنصر";

		// Create a styled confirm dialog
		const confirmDialog = document.createElement("div");
		confirmDialog.className = "library-confirm-dialog";

		const message = confirmDialog.createEl("p", {
			cls: "library-confirm-message",
			text: `هل أنت متأكد من حذف ${count} ${itemType}؟ لا يمكن التراجع عن هذا الإجراء.`,
		});

		const warningIcon = message.createEl("span", {
			cls: "library-warning-icon",
		});
		setIcon(warningIcon, "alert-triangle");

		const buttonContainer = confirmDialog.createEl("div", {
			cls: "library-confirm-buttons",
		});

		const confirmButton = buttonContainer.createEl("button", {
			text: "حذف",
			cls: "library-confirm-delete",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "إلغاء",
			cls: "library-confirm-cancel",
		});

		// Button actions
		confirmButton.addEventListener("click", async () => {
			document.body.removeChild(confirmDialog);
			await this.performBulkDelete();
		});

		cancelButton.addEventListener("click", () => {
			document.body.removeChild(confirmDialog);
		});

		// Add dialog to document body
		document.body.appendChild(confirmDialog);
	}

	/**
	 * Performs bulk delete operation
	 */
	private async performBulkDelete(): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		const itemType =
			this.props.contentType === CONTENT_TYPE.VIDEO
				? "مقطع/سلسلة"
				: this.props.contentType === CONTENT_TYPE.BOOK
				? "كتاب"
				: "عنصر";

		// Show progress notification
		new Notice(`⏳ جاري حذف ${selectedItems.length} ${itemType}...`);

		try {
			const result = await this.props.plugin.dataService.bulkDelete(
				selectedItems
			);

			if (result.success > 0) {
				new Notice(`✅ تم حذف ${result.success} ${itemType} بنجاح`);
			}

			if (result.failed > 0) {
				new Notice(`⚠️ فشل حذف ${result.failed} ${itemType}`);
			}

			// Clean up and refresh
			this.props.selectionState.clearSelection();
			await this.props.onOperationComplete();
		} catch (error) {
			console.error("Error performing bulk delete:", error);
			new Notice("❌ حدث خطأ أثناء حذف العناصر");
		}
	}

	/**
	 * Cleans up component resources
	 */
	public destroy(): void {
		this.container = null;
	}
}
