/**
 * Component for displaying videos in a card format
 */
import { Menu, setIcon, moment } from "obsidian";
import { ContentComponentProps } from "../../../core/uiTypes";
import {
	LibraryItem,
	VideoItem,
	PlaylistItem,
} from "../../../core/contentTypes";
import { ItemUtils } from "../../../utils/itemUtils";
import { createDateTooltip, formatDate } from "src/utils";

/**
 * Props for VideoCard component
 */
interface VideoCardProps extends ContentComponentProps {
	/** Items to display as cards */
	items: LibraryItem[];
}

/**
 * Displays videos and playlists in a card format
 */
export class VideoCard {
	private props: VideoCardProps;
	private container: HTMLElement | null = null;

	/**
	 * Creates a new VideoCard component
	 * @param props Component props
	 */
	constructor(props: VideoCardProps) {
		this.props = props;
	}

	/**
	 * Renders the video cards
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
			const item = this.props.items[i];
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
	 * Renders a single card for an item
	 * @param container Container element
	 * @param item Item to render card for
	 */
	private renderCard(container: HTMLElement, item: LibraryItem): void {
		const card = container.createEl("div", { cls: "library-card" });

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

		// Thumbnail section
		const thumbnailContainer = card.createEl("div", {
			cls: "library-card-thumbnail",
		});

		if (
			this.props.settings.showVideosThumbnails &&
			"thumbnailUrl" in item &&
			item.thumbnailUrl
		) {
			thumbnailContainer.createEl("img", {
				attr: {
					src: item.thumbnailUrl,
					alt: item.title,
				},
			});
		} else {
			// Placeholder for items without thumbnails
			const placeholderDiv = thumbnailContainer.createEl("div", {
				cls: "library-card-no-thumbnail",
			});

			// Use either a play icon or list icon based on item type
			const iconName = "itemCount" in item ? "list" : "play";
			setIcon(placeholderDiv, iconName);
		}

		// Type badge
		thumbnailContainer.createEl("div", {
			cls: "library-card-type",
			text: item.type,
		});

		// Duration badge for videos
		if ("duration" in item) {
			thumbnailContainer.createEl("div", {
				cls: "library-card-duration",
				text: item.duration,
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

		// Presenter info
		if ("presenter" in item) {
			const presenterInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(presenterInfo, "user");

			presenterInfo.createEl("span", {
				text: item.presenter,
			});
		}

		// Date info
		const dateInfo = contentSection.createEl("div", {
			cls: "library-card-info",
		});

		setIcon(dateInfo, "calendar");

		this.renderDateCell(dateInfo.createEl("span", {}), item.dateAdded);

		if (item.language) {
			const languageInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(languageInfo, "globe");

			languageInfo.createEl("span", {
				text: `${item.language}`,
			});
		}

		// Start date info if available
		if (item.startDate) {
			const startDateInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(startDateInfo, "play-circle");

			this.renderDateCell(
				startDateInfo.createEl("span", {}),
				item.startDate
			);
		}

		// Completion date info if available
		if (item.completionDate) {
			const completionDateInfo = contentSection.createEl("div", {
				cls: "library-card-info",
			});

			setIcon(completionDateInfo, "check-circle");

			this.renderDateCell(
				completionDateInfo.createEl("span", {}),
				item.completionDate
			);
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
			this.props.settings.videoTracking.statusOptions,
			this.props.plugin.dataService,
			this.props.onRefresh
		);

		// Action buttons
		const actionsContainer = footer.createEl("div", {
			cls: "library-card-actions",
		});

		// YouTube link
		if ("url" in item) {
			const youtubeLink = actionsContainer.createEl("a", {
				href: item.url,
				cls: "library-card-action-btn",
				attr: {
					title: "مشاهدة على يوتيوب",
					target: "_blank",
				},
			});
			setIcon(youtubeLink, "youtube");
		}

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
	 * Shows actions menu for an item
	 * @param item Item to show actions for
	 * @param element Element to position menu against
	 */
	private showItemActionsMenu(item: LibraryItem, element: HTMLElement): void {
		const menu = new Menu();

		// View on YouTube
		if ("url" in item) {
			menu.addItem((i) => {
				i.setTitle("مشاهدة على يوتيوب")
					.setIcon("youtube")
					.onClick(() => {
						window.open(item.url, "_blank");
					});
			});
		}

		// Open note
		menu.addItem((i) => {
			i.setTitle("فتح الملاحظة")
				.setIcon("file-text")
				.onClick(() => {
					ItemUtils.openFile(this.props.app, item.filePath);
				});
		});

		menu.addItem((i) => {
			i.setTitle("تعديل المحتوى")
				.setIcon("edit")
				.onClick(() => {
					this.openEditVideoModal(item);
				});
		});

		// Change status submenu
		menu.addItem((i) => {
			i.setTitle("تغيير الحالة")
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
	 * Shows status submenu for changing item status
	 * @param item Item to change status for
	 * @param element Element to position menu against
	 */
	private showStatusSubmenu(item: LibraryItem, element: HTMLElement): void {
		const statusMenu = new Menu();

		this.props.settings.videoTracking.statusOptions.forEach(
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

	/**
	 * Opens the edit video modal
	 * @param item Video or playlist item to edit
	 */
	private openEditVideoModal(item: LibraryItem): void {
		// Check if item is video or playlist
		if (!("url" in item)) return;

		// Import dynamically to avoid circular dependencies
		import("../../modals/VideoModal").then(({ VideoModal }) => {
			const modal = new VideoModal(
				this.props.app,
				this.props.plugin,
				item as VideoItem | PlaylistItem
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
	 * Renders a date cell with Hijri calendar support and tooltips
	 * @param cell The table cell element
	 * @param dateString The date string to render
	 */
	private renderDateCell(cell: HTMLElement, dateString?: string): void {
		if (!dateString) {
			cell.textContent = "-";
			return;
		}

		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) {
				cell.textContent = "تاريخ غير صحيح";
				return;
			}

			// Format the date using the current calendar system
			const formattedDate = formatDate(date, {
				settings: this.props.settings.hijriCalendar,
			});

			cell.textContent = formattedDate;

			// Add tooltip with both calendar systems if enabled
			if (this.props.settings.hijriCalendar.showBothInTooltips) {
				const tooltip = createDateTooltip(
					date,
					this.props.settings.hijriCalendar
				);
				if (tooltip) {
					cell.setAttribute("title", tooltip);
					cell.addClass("library-date-with-tooltip");
				}
			}

			// Add calendar type class for styling
			const calendarType = this.props.settings.hijriCalendar
				.useHijriCalendar
				? "hijri"
				: "gregorian";
			cell.addClass(`library-date-${calendarType}`);
		} catch (error) {
			console.warn("Error formatting date:", dateString, error);
			cell.textContent = "تاريخ غير صحيح";
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
