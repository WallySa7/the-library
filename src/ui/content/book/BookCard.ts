/**
 * Component for displaying books in a card format
 */
import { Menu, setIcon, moment } from "obsidian";
import { ContentComponentProps } from "../../../core/uiTypes";
import { BookItem, LibraryItem } from "../../../core/contentTypes";
import { ItemUtils } from "../../../utils/itemUtils";

/**
 * Props for BookCard component
 */
interface BookCardProps extends ContentComponentProps {
	/** Items to display as cards */
	items: LibraryItem[];
}

/**
 * Displays books in a card format
 */
export class BookCard {
	private props: BookCardProps;
	private container: HTMLElement | null = null;

	/**
	 * Creates a new BookCard component
	 * @param props Component props
	 */
	constructor(props: BookCardProps) {
		this.props = props;
	}

	/**
	 * Renders the book cards
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Add select all control
		if (this.props.items.length > 0) {
			this.addSelectAllControl(container);
		}

		// Create card container
		const cardContainer = container.createEl("div", {
			cls: "library-card-view",
		});

		if (this.props.items.length === 0) {
			cardContainer.createEl("div", {
				cls: "library-card-empty",
				text: "لا توجد نتائج تطابق معايير البحث",
			});
			return;
		}

		// Get items for current page
		const filterState = this.props.filterState.getState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		// Render cards for visible items
		for (let i = startIndex; i < endIndex; i++) {
			const item = this.props.items[i] as BookItem;
			this.renderCard(cardContainer, item);
		}
	}

	/**
	 * Adds "select all" control for card view
	 * @param container Container element
	 * @returns Created control element
	 */
	private addSelectAllControl(container: HTMLElement): HTMLElement {
		const selectAllContainer = container.createEl("div", {
			cls: "library-card-select-all",
		});

		const selectAllCheckbox = selectAllContainer.createEl("input", {
			type: "checkbox",
			cls: "library-card-select-all-checkbox",
		});

		selectAllContainer.createEl("label", {
			text: "تحديد الكل",
			cls: "library-card-select-all-label",
		});

		selectAllCheckbox.addEventListener("change", (e) => {
			const isChecked = (e.target as HTMLInputElement).checked;
			this.handleSelectAll(isChecked);
		});

		return selectAllContainer;
	}

	/**
	 * Renders a single card for a book
	 * @param container Container element
	 * @param item Book to render card for
	 */
	private renderCard(container: HTMLElement, item: BookItem): void {
		const card = container.createEl("div", {
			cls: "library-card library-book-card",
		});

		// Checkbox for selection
		const checkbox = card.createEl("input", {
			type: "checkbox",
			cls: "library-card-checkbox",
		});

		checkbox.checked = this.props.selectionState.isSelected(item.filePath);

		checkbox.addEventListener("change", (e) => {
			this.props.selectionState.toggleItem(
				item.filePath,
				(e.target as HTMLInputElement).checked
			);
		});

		// Cover image section
		const coverContainer = card.createEl("div", {
			cls: "library-card-cover",
		});

		if (this.props.settings.showBooksThumbnails && item.coverUrl) {
			coverContainer.createEl("img", {
				attr: {
					src: item.coverUrl,
					alt: item.title,
				},
			});
		} else {
			// Placeholder for books without covers
			const placeholderDiv = coverContainer.createEl("div", {
				cls: "library-card-no-cover",
			});

			// Book icon for placeholder
			setIcon(placeholderDiv, "book");
		}

		// Type badge
		coverContainer.createEl("div", {
			cls: "library-card-type",
			text: item.type,
		});

		// Page count badge
		if (item.pageCount) {
			coverContainer.createEl("div", {
				cls: "library-card-page-count",
				text: `${item.pageCount} صفحة`,
			});
		}

		// Content section
		const contentSection = card.createEl("div", {
			cls: "library-card-content",
		});

		// Title
		contentSection.createEl("div", {
			text: item.title,
			cls: "library-card-title",
		});

		// Author info
		const authorInfo = contentSection.createEl("div", {
			cls: "library-card-info",
		});

		setIcon(authorInfo, "user");

		authorInfo.createEl("span", {
			text: item.author,
		});

		// Publisher info (if available)
		if (item.publisher) {
			const publisherInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(publisherInfo, "book-open");

			publisherInfo.createEl("span", {
				text: item.publisher,
			});
		}

		if (item.language) {
			const languageInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(languageInfo, "globe");

			languageInfo.createEl("span", {
				text: `${item.language}`,
			});
		}

		// Date info
		const dateInfo = contentSection.createEl("div", {
			cls: "library-card-info",
		});

		setIcon(dateInfo, "calendar");

		dateInfo.createEl("span", {
			text: item.dateAdded
				? moment(item.dateAdded).format("YYYY-MM-DD")
				: "غير معروف",
		});

		// Rating (if available)
		if (item.rating) {
			const ratingInfo = contentSection.createEl("div", {
				cls: "library-card-info library-card-rating",
			});

			setIcon(ratingInfo, "star");

			ratingInfo.createEl("span", {
				text: "★".repeat(Math.min(item.rating, 5)),
				cls: "library-card-rating-stars",
			});
		}

		// Start date info if available
		if (item.startDate) {
			const startDateInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(startDateInfo, "play-circle");

			startDateInfo.createEl("span", {
				text: `تاريخ البدء: ${item.startDate}`,
			});
		}

		// Completion date info if available
		if (item.completionDate) {
			const completionDateInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(completionDateInfo, "check-circle");

			completionDateInfo.createEl("span", {
				text: `تاريخ الانتهاء: ${item.completionDate}`,
			});
		}

		// Categories if available
		if (item.categories && item.categories.length > 0) {
			const categoriesInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(categoriesInfo, "folder");

			const categoriesContainer = categoriesInfo.createEl("div", {
				cls: "library-tags-container",
			});

			// Only show a few categories to save space
			const displayCount = Math.min(3, item.categories.length);

			for (let i = 0; i < displayCount; i++) {
				const category = item.categories[i];
				const categoryElement = categoriesContainer.createEl("span", {
					cls: "library-card-tag",
				});

				// Use formatter for hierarchical categories
				ItemUtils.formatCategoryForDisplay(category, categoryElement);

				// Add separator except for last category
				if (i < displayCount - 1) {
					categoriesContainer.createEl("span", { text: ", " });
				}
			}

			// Show indication if there are more categories
			if (item.categories.length > displayCount) {
				categoriesContainer.createEl("span", { text: "..." });
			}
		}

		// Tags if available
		if (item.tags && item.tags.length > 0) {
			const tagsInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(tagsInfo, "tag");

			const tagsContainer = tagsInfo.createEl("div", {
				cls: "library-tags-container",
			});

			// Only show a few tags to save space
			const displayCount = Math.min(3, item.tags.length);

			for (let i = 0; i < displayCount; i++) {
				const tag = item.tags[i];
				const tagElement = tagsContainer.createEl("span", {
					cls: "library-card-tag",
				});

				ItemUtils.formatTagForDisplay(tag, tagElement);

				// Add separator except for last tag
				if (i < displayCount - 1) {
					tagsContainer.createEl("span", { text: ", " });
				}
			}

			// Show indication if there are more tags
			if (item.tags.length > displayCount) {
				tagsContainer.createEl("span", { text: "..." });
			}
		}

		// Footer with status and actions
		const footer = card.createEl("div", { cls: "library-card-footer" });

		// Status dropdown
		const statusContainer = footer.createEl("div");
		ItemUtils.createStatusDropdown(
			statusContainer,
			item,
			this.props.settings.bookTracking.statusOptions,
			this.props.plugin.dataService,
			this.props.onRefresh
		);

		// Action buttons
		const actionsContainer = footer.createEl("div", {
			cls: "library-card-actions",
		});

		// Note link
		const noteLink = actionsContainer.createEl("a", {
			cls: "library-card-action-btn",
			attr: {
				title: "فتح الملاحظة",
			},
		});
		setIcon(noteLink, "file-text");
		noteLink.addEventListener("click", (e) => {
			e.preventDefault();
			ItemUtils.openFile(this.props.app, item.filePath);
		});

		// More actions
		const moreActionsBtn = actionsContainer.createEl("a", {
			cls: "library-card-action-btn",
			attr: {
				title: "المزيد من الإجراءات",
			},
		});
		setIcon(moreActionsBtn, "more-vertical");
		moreActionsBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showItemActionsMenu(item, moreActionsBtn);
		});
	}

	/**
	 * Shows actions menu for a book
	 * @param item Book to show actions for
	 * @param element Element to position menu against
	 */
	private showItemActionsMenu(item: BookItem, element: HTMLElement): void {
		const menu = new Menu();

		// Open note
		menu.addItem((i) => {
			i.setTitle("فتح الملاحظة")
				.setIcon("file-text")
				.onClick(() => {
					ItemUtils.openFile(this.props.app, item.filePath);
				});
		});

		// Edit book - New option
		menu.addItem((i) => {
			i.setTitle("تعديل الكتاب")
				.setIcon("edit")
				.onClick(() => {
					this.openEditBookModal(item);
				});
		});

		// Change status submenu
		menu.addItem((i) => {
			i.setTitle("تغيير حالة القراءة")
				.setIcon("check-circle")
				.onClick(() => {
					this.showStatusSubmenu(item, element);
				});
		});

		// Edit tags
		menu.addItem((i) => {
			i.setTitle("تعديل الوسوم")
				.setIcon("tag")
				.onClick(() => {
					ItemUtils.showEditTagsDialog(
						item,
						this.props.plugin.dataService,
						this.props.contentType,
						this.props.onRefresh
					);
				});
		});

		// Edit categories
		menu.addItem((i) => {
			i.setTitle("تعديل التصنيفات")
				.setIcon("folder")
				.onClick(() => {
					ItemUtils.showEditCategoriesDialog(
						item,
						this.props.plugin.dataService,
						this.props.contentType,
						this.props.onRefresh
					);
				});
		});

		// Delete
		menu.addItem((i) => {
			i.setTitle("حذف")
				.setIcon("trash-2")
				.onClick(() => {
					ItemUtils.confirmItemDelete(item, async () => {
						await ItemUtils.performItemDelete(
							this.props.plugin.dataService,
							item,
							this.props.onRefresh
						);
					});
				});
		});

		const rect = element.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Shows status submenu for changing book status
	 * @param item Book to change status for
	 * @param element Element to position menu against
	 */
	private showStatusSubmenu(item: BookItem, element: HTMLElement): void {
		const statusMenu = new Menu();

		this.props.settings.bookTracking.statusOptions.forEach(
			(status: string) => {
				statusMenu.addItem((si) => {
					si.setTitle(status)
						.setChecked(item.status === status)
						.onClick(async () => {
							await this.props.plugin.dataService.updateStatus(
								item.filePath,
								status
							);
							item.status = status;
							this.props.onRefresh();
						});
				});
			}
		);

		const rect = element.getBoundingClientRect();
		statusMenu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	private openEditBookModal(item: BookItem): void {
		// Import dynamically to avoid circular dependencies
		import("../../modals/BookModal").then(({ BookModal }) => {
			const modal = new BookModal(
				this.props.app,
				this.props.plugin,
				item
			);

			// Set up a callback to refresh the view after modal is closed
			const originalOnClose = modal.onClose;
			modal.onClose = () => {
				if (originalOnClose) {
					originalOnClose.call(modal);
				}
				this.props.onRefresh();
			};

			modal.open();
		});
	}

	/**
	 * Updates selection UI without full re-render
	 * Called by ContentRenderer when selection state changes
	 */
	public updateSelectionUI(): void {
		if (!this.container) return;

		const filterState = this.props.filterState.getState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		const visibleItems = this.props.items.slice(startIndex, endIndex);

		// Update card checkboxes
		this.container
			.querySelectorAll(".library-card-checkbox")
			.forEach((checkbox, idx) => {
				if (idx < visibleItems.length) {
					const item = visibleItems[idx];
					(checkbox as HTMLInputElement).checked =
						this.props.selectionState.isSelected(item.filePath);
				}
			});

		// Update "select all" checkbox
		const selectAllCheckbox = this.container.querySelector(
			".library-card-select-all-checkbox"
		) as HTMLInputElement;

		if (selectAllCheckbox && visibleItems.length > 0) {
			const allSelected = visibleItems.every((item) =>
				this.props.selectionState.isSelected(item.filePath)
			);
			selectAllCheckbox.checked = allSelected;
		}
	}

	/**
	 * Handles select all action
	 * @param isSelected Whether to select or deselect all
	 */
	private handleSelectAll(isSelected: boolean): void {
		if (!this.container) return;

		const filterState = this.props.filterState.getState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		const visibleItems = this.props.items.slice(startIndex, endIndex);
		const visiblePaths = visibleItems.map((item) => item.filePath);

		// Update selection state
		if (isSelected) {
			this.props.selectionState.selectAll(visiblePaths);
		} else {
			this.props.selectionState.deselectAll(visiblePaths);
		}

		// Update checkboxes in the UI
		this.container
			.querySelectorAll(".library-card-checkbox")
			.forEach((checkbox, idx) => {
				if (idx < visibleItems.length) {
					(checkbox as HTMLInputElement).checked = isSelected;
				}
			});
	}

	/**
	 * Cleans up component resources
	 */
	public destroy(): void {
		this.container = null;
	}
}
