/**
 * Component for displaying books in a table format
 */
import { Menu, setIcon, moment } from "obsidian";
import { ContentComponentProps } from "../../../core/";
import { BookItem, LibraryItem } from "../../../core/contentTypes";
import { TableColumnConfig } from "../../../core/uiTypes";
import { ColumnConfigModal } from "../../modals/ColumnConfigModal";
import { createDateTooltip, formatDate, ItemUtils } from "../../../utils";

/**
 * Props for BookTable component
 */
interface BookTableProps extends ContentComponentProps {
	/** Items to display in the table */
	items: LibraryItem[];
}

/**
 * Displays books in a table format
 */
export class BookTable {
	private props: BookTableProps;
	private container: HTMLElement | null = null;

	/**
	 * Creates a new BookTable component
	 * @param props Component props
	 */
	constructor(props: BookTableProps) {
		this.props = props;
	}

	/**
	 * Renders the book table
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		const tableContainer = container.createEl("div", {
			cls: "library-table-container",
		});

		// Add config button
		this.renderTableConfig(tableContainer);

		// Create table
		const table = tableContainer.createEl("table", {
			cls: "library-books-table",
		});

		// Table header
		this.renderTableHeader(table);

		// Table body
		this.renderTableBody(table);
	}

	/**
	 * Renders the table configuration button
	 * @param container Container element
	 */
	private renderTableConfig(container: HTMLElement): void {
		const configContainer = container.createEl("div", {
			cls: "library-table-config-container",
		});

		const configButton = configContainer.createEl("button", {
			cls: "library-table-config-button",
			text: "تخصيص الأعمدة",
		});

		setIcon(configButton, "settings");

		configButton.addEventListener("click", () => {
			this.showColumnConfigModal();
		});
	}

	/**
	 * Shows the column configuration modal
	 */
	private showColumnConfigModal(): void {
		const modal = new ColumnConfigModal(
			this.props.app,
			this.props.plugin,
			"book",
			async () => {
				// Refresh view after settings change
				await this.props.onRefresh();
			}
		);

		modal.open();
	}

	/**
	 * Renders the table header
	 * @param table Table element
	 */
	private renderTableHeader(table: HTMLElement): void {
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");

		// Get column config sorted by order
		const columns = this.getEnabledColumns();

		// Create headers based on column config
		columns.forEach((column) => {
			if (column.id === "checkbox") {
				// Add bulk select checkbox in header
				const selectAllCell = headerRow.createEl("th", {
					cls: "library-checkbox-cell",
				});

				const selectAllCheckbox = selectAllCell.createEl("input", {
					type: "checkbox",
					cls: "library-select-all",
				});

				selectAllCheckbox.addEventListener("change", (e) => {
					const isChecked = (e.target as HTMLInputElement).checked;
					this.handleSelectAll(isChecked);
				});
			} else if (column.id === "actions") {
				headerRow.createEl("th", { text: column.label });
			} else if (column.sortKey) {
				// Create sortable header for columns with sortKey
				this.createSortableHeader(
					headerRow,
					column.label,
					column.sortKey
				);
			} else {
				// Regular header
				headerRow.createEl("th", { text: column.label });
			}
		});
	}

	/**
	 * Creates a sortable table header
	 * @param headerRow Header row element
	 * @param text Header text
	 * @param sortKey Key to sort by
	 * @returns Created header element
	 */
	private createSortableHeader(
		headerRow: HTMLElement,
		text: string,
		sortKey: string
	): HTMLElement {
		const filterState = this.props.filterState.getState();
		const th = headerRow.createEl("th", { text });
		th.addClass("library-sortable-header");

		if (filterState.sortBy === sortKey) {
			th.addClass(`sorted-${filterState.sortOrder}`);
		}

		th.addEventListener("click", () => {
			if (filterState.sortBy === sortKey) {
				// Toggle sort order if already sorting by this column
				this.props.filterState.updateState({
					sortOrder: filterState.sortOrder === "asc" ? "desc" : "asc",
				});
			} else {
				// Set new sort column with ascending order by default
				this.props.filterState.updateState({
					sortBy: sortKey,
					sortOrder: "asc",
				});
			}
		});

		return th;
	}

	/**
	 * Renders the table body
	 * @param table Table element
	 */
	private renderTableBody(table: HTMLElement): void {
		const tbody = table.createEl("tbody");

		if (this.props.items.length === 0) {
			// Calculate colspan based on visible columns
			const visibleColumnsCount = this.getEnabledColumns().length;
			this.renderNoResults(tbody, visibleColumnsCount);
		} else {
			this.renderTableRows(tbody);
		}
	}

	/**
	 * Renders "No Results" message
	 * @param container Container element
	 * @param colSpan Number of columns to span
	 */
	private renderNoResults(container: HTMLElement, colSpan: number): void {
		const row = container.createEl("tr");
		const cell = row.createEl("td", {
			attr: { colspan: colSpan.toString() },
			cls: "library-no-results",
		});
		cell.textContent = "لا توجد نتائج تطابق معايير البحث";
	}

	/**
	 * Renders table rows for the current page of items
	 * @param tbody Table body element
	 */
	private renderTableRows(tbody: HTMLElement): void {
		const filterState = this.props.filterState.getState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		// Get enabled columns
		const columns = this.getEnabledColumns();

		// Render rows for current page
		for (let i = startIndex; i < endIndex; i++) {
			const item = this.props.items[i] as BookItem;
			const row = tbody.createEl("tr");

			// Render cells based on column config
			columns.forEach((column) => {
				switch (column.id) {
					case "checkbox":
						// Add checkbox cell
						const checkboxCell = row.createEl("td", {
							cls: "library-checkbox-cell",
						});

						const checkbox = checkboxCell.createEl("input", {
							type: "checkbox",
							cls: "library-item-checkbox",
						});

						checkbox.checked = this.props.selectionState.isSelected(
							item.filePath
						);

						checkbox.addEventListener("change", (e) => {
							this.props.selectionState.toggleItem(
								item.filePath,
								(e.target as HTMLInputElement).checked
							);
						});
						break;

					case "title":
						// Title with cover image
						const titleCell = row.createEl("td", {
							cls: "library-title-cell",
						});

						if (
							this.props.settings.showBooksThumbnails &&
							item.coverUrl
						) {
							const thumbnailContainer = titleCell.createEl(
								"div",
								{
									cls: "library-mini-thumbnail",
								}
							);

							thumbnailContainer.createEl("img", {
								attr: {
									src: item.coverUrl,
									alt: item.title,
								},
							});
						}

						titleCell.createEl("span", { text: item.title });
						break;

					case "author":
						row.createEl("td").textContent = item.author || "";
						break;

					case "type":
						row.createEl("td").textContent = item.type;
						break;

					case "status":
						// Status with dropdown
						const statusCell = row.createEl("td");
						ItemUtils.createStatusDropdown(
							statusCell,
							item,
							this.props.settings.bookTracking.statusOptions,
							this.props.plugin.dataService,
							this.props.onRefresh
						);
						break;

					case "language":
						row.createEl("td").textContent = item.language || "-";
						break;

					case "pageCount":
						row.createEl("td").textContent = item.pageCount
							? item.pageCount.toString()
							: "0";
						break;

					case "publisher":
						row.createEl("td").textContent = item.publisher || "-";
						break;

					case "publishYear":
						row.createEl("td").textContent =
							item.publishYear || "-";
						break;

					case "dateAdded":
						const dateAddedCell = row.createEl("td", {
							cls: "library-date-cell",
						});
						this.renderDateCell(dateAddedCell, item.dateAdded);
						break;

					case "startDate":
						// Enhanced date rendering with Hijri support
						const startDateCell = row.createEl("td", {
							cls: "library-date-cell",
						});
						this.renderDateCell(startDateCell, item.startDate);
						break;

					case "completionDate":
						// Enhanced date rendering with Hijri support
						const completionDateCell = row.createEl("td", {
							cls: "library-date-cell",
						});
						this.renderDateCell(
							completionDateCell,
							item.completionDate
						);
						break;

					case "rating":
						// Display stars for rating
						const ratingCell = row.createEl("td", {
							cls: "library-rating-cell",
						});

						if (item.rating && item.rating > 0) {
							ratingCell.textContent = "★".repeat(
								Math.min(item.rating, 5)
							);
						} else {
							ratingCell.textContent = "-";
						}
						break;

					case "tags":
						// Tags cell with chips
						const tagsCell = row.createEl("td", {
							cls: "library-tags-cell",
						});

						if (item.tags && item.tags.length > 0) {
							const tagsContainer = tagsCell.createEl("div", {
								cls: "library-table-tags-container",
							});

							// Display up to 3 tags to save space
							const displayCount = Math.min(3, item.tags.length);

							item.tags
								.slice(0, displayCount)
								.forEach((tag, index) => {
									const tagElement = tagsContainer.createEl(
										"span",
										{
											cls: "library-table-tag-chip",
										}
									);

									ItemUtils.formatTagForDisplay(
										tag,
										tagElement
									);

									// Add separator except for last tag
									if (index < displayCount - 1) {
										tagsContainer.createEl("span", {
											text: ", ",
										});
									}
								});

							// Show indicator if there are more tags
							if (item.tags.length > displayCount) {
								tagsContainer.createEl("span", {
									text: ` +${
										item.tags.length - displayCount
									}`,
									cls: "library-table-tag-more",
								});
							}
						} else {
							tagsCell.textContent = "-";
						}
						break;

					case "categories":
						// Categories cell with chips
						const categoriesCell = row.createEl("td", {
							cls: "library-tags-cell",
						});

						if (item.categories && item.categories.length > 0) {
							const categoriesContainer = categoriesCell.createEl(
								"div",
								{
									cls: "library-table-tags-container",
								}
							);

							// Display up to 3 categories to save space
							const displayCount = Math.min(
								3,
								item.categories.length
							);

							item.categories
								.slice(0, displayCount)
								.forEach((category, index) => {
									const categoryElement =
										categoriesContainer.createEl("span", {
											cls: "library-table-tag-chip",
										});

									ItemUtils.formatCategoryForDisplay(
										category,
										categoryElement
									);

									// Add separator except for last category
									if (index < displayCount - 1) {
										categoriesContainer.createEl("span", {
											text: ", ",
										});
									}
								});

							// Show indicator if there are more categories
							if (item.categories.length > displayCount) {
								categoriesContainer.createEl("span", {
									text: ` +${
										item.categories.length - displayCount
									}`,
									cls: "library-table-tag-more",
								});
							}
						} else {
							categoriesCell.textContent = "-";
						}
						break;

					case "actions":
						// Action buttons
						const actionsCell = row.createEl("td", {
							cls: "library-actions-cell",
						});

						this.renderItemActions(actionsCell, item);
						break;
				}
			});
		}
	}

	/**
	 * Renders action buttons for a book
	 * @param container Container element
	 * @param item Book item to render actions for
	 */
	private renderItemActions(container: HTMLElement, item: BookItem): void {
		// Open note
		const noteLink = container.createEl("a", {
			cls: "library-action-icon-link",
			attr: {
				title: "فتح الملاحظة",
			},
		});
		setIcon(noteLink, "file-text");
		noteLink.addEventListener("click", (e) => {
			e.preventDefault();
			ItemUtils.openFile(this.props.app, item.filePath);
		});

		// More actions menu
		const moreActionsBtn = container.createEl("a", {
			cls: "library-action-icon-link",
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

	/**
	 * Opens the edit book modal
	 * @param item Book item to edit
	 */
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
	 * Gets enabled columns from settings
	 * @returns Array of enabled columns sorted by order
	 */
	private getEnabledColumns(): TableColumnConfig[] {
		return this.props.settings.tableColumns.book
			.filter((col: { enabled: any }) => col.enabled)
			.sort(
				(a: { order: number }, b: { order: number }) =>
					a.order - b.order
			);
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

		// Update row checkboxes
		this.container
			.querySelectorAll(".library-item-checkbox")
			.forEach((checkbox, idx) => {
				if (idx < visibleItems.length) {
					const item = visibleItems[idx];
					(checkbox as HTMLInputElement).checked =
						this.props.selectionState.isSelected(item.filePath);
				}
			});

		// Update "select all" checkbox
		const selectAllCheckbox = this.container.querySelector(
			".library-select-all"
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
			.querySelectorAll(".library-item-checkbox")
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
