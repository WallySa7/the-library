/**
 * Modal for configuring table columns
 */
import { App, Modal, Setting } from "obsidian";
import { TableColumnConfig } from "../../core/uiTypes";

/**
 * Modal for configuring table columns in content views
 */
export class ColumnConfigModal extends Modal {
	private plugin: any;
	private contentType: string;
	private columns: TableColumnConfig[];
	private onSave: () => Promise<void>;

	/**
	 * Creates a new column configuration modal
	 * @param app - Obsidian app instance
	 * @param plugin - Plugin instance
	 * @param contentType - Content type to configure columns for
	 * @param onSave - Callback after saving
	 */
	constructor(
		app: App,
		plugin: any,
		contentType: string,
		onSave: () => Promise<void>
	) {
		super(app);
		this.plugin = plugin;
		this.contentType = contentType;

		// Deep copy columns to avoid modifying original until save
		this.columns = JSON.parse(
			JSON.stringify(plugin.settings.tableColumns[contentType])
		);
		this.onSave = onSave;
	}

	/**
	 * Renders the modal content
	 */
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("library-modal");
		contentEl.addClass("library-column-config-modal");

		this.renderModalHeader();
		this.renderColumnsList();
		this.renderButtons();
	}

	/**
	 * Renders the modal header
	 */
	private renderModalHeader(): void {
		const { contentEl } = this;

		// Title based on content type
		const title =
			this.contentType === "video"
				? "تخصيص أعمدة جدول الفيديوهات"
				: "تخصيص الأعمدة";

		contentEl.createEl("h2", { text: title });

		// Description
		contentEl.createEl("p", {
			text: "يمكنك اختيار الأعمدة التي تريد عرضها وترتيبها في الجدول.",
			cls: "library-config-description",
		});
	}

	/**
	 * Renders the columns list with drag-and-drop functionality
	 */
	private renderColumnsList(): void {
		const { contentEl } = this;

		// Sort columns by current order
		this.columns.sort((a, b) => a.order - b.order);

		// Create columns container
		const columnsContainer = contentEl.createEl("div", {
			cls: "library-columns-container",
		});

		// Render each column row except special columns
		this.columns.forEach((column, index) => {
			// Skip special columns that are always needed
			if (column.id === "checkbox" || column.id === "actions") return;

			this.renderColumnRow(columnsContainer, column, index);
		});
	}

	/**
	 * Renders a single column row
	 * @param container - Container element
	 * @param column - Column configuration
	 * @param index - Column index
	 */
	private renderColumnRow(
		container: HTMLElement,
		column: TableColumnConfig,
		index: number
	): void {
		const columnRow = container.createEl("div", {
			cls: "library-column-row" + (column.enabled ? " enabled" : ""),
		});

		// Drag handle
		const dragHandle = columnRow.createEl("div", {
			cls: "library-column-drag-handle",
		});
		dragHandle.innerHTML = "⋮⋮";
		dragHandle.setAttribute("draggable", "true");

		// Toggle setting
		const setting = new Setting(columnRow)
			.setName(column.label)
			.addToggle((toggle) => {
				toggle.setValue(column.enabled).onChange((value) => {
					column.enabled = value;
					columnRow.classList.toggle("enabled", value);
				});
			});

		// Add move buttons
		this.addMoveButtons(columnRow, index);

		// Set up drag and drop
		this.setupDragAndDrop(dragHandle, columnRow, index);
	}

	/**
	 * Adds move up/down buttons for reordering
	 * @param columnRow - Column row element
	 * @param index - Column index
	 */
	private addMoveButtons(columnRow: HTMLElement, index: number): void {
		// Move up button (if not first editable column)
		if (index > 0 && this.columns[index - 1].id !== "checkbox") {
			const moveUpBtn = columnRow.createEl("button", {
				cls: "library-column-move-btn library-column-up-btn",
				text: "↑",
			});
			moveUpBtn.addEventListener("click", () => {
				this.moveColumn(index, index - 1);
				this.redraw();
			});
		}

		// Move down button (if not last column)
		if (
			index < this.columns.length - 1 &&
			this.columns[index + 1].id !== "actions"
		) {
			const moveDownBtn = columnRow.createEl("button", {
				cls: "library-column-move-btn library-column-down-btn",
				text: "↓",
			});
			moveDownBtn.addEventListener("click", () => {
				this.moveColumn(index, index + 1);
				this.redraw();
			});
		}
	}

	/**
	 * Sets up drag and drop functionality
	 * @param dragHandle - Drag handle element
	 * @param columnRow - Column row element
	 * @param index - Column index
	 */
	private setupDragAndDrop(
		dragHandle: HTMLElement,
		columnRow: HTMLElement,
		index: number
	): void {
		// Drag start
		dragHandle.addEventListener("dragstart", (e) => {
			e.dataTransfer?.setData("text/plain", index.toString());
			columnRow.addClass("dragging");
		});

		// Drag end
		dragHandle.addEventListener("dragend", () => {
			columnRow.removeClass("dragging");
		});

		// Drag over - needed for drop to work
		columnRow.addEventListener("dragover", (e) => {
			e.preventDefault();
			columnRow.addClass("drag-over");
		});

		// Drag leave
		columnRow.addEventListener("dragleave", () => {
			columnRow.removeClass("drag-over");
		});

		// Drop
		columnRow.addEventListener("drop", (e) => {
			e.preventDefault();
			const sourceIndex = parseInt(
				e.dataTransfer?.getData("text/plain") || "-1"
			);
			if (sourceIndex >= 0 && sourceIndex !== index) {
				this.moveColumn(sourceIndex, index);
				this.redraw();
			}
			columnRow.removeClass("drag-over");
		});
	}

	/**
	 * Renders action buttons
	 */
	private renderButtons(): void {
		const { contentEl } = this;

		const buttonContainer = contentEl.createEl("div", {
			cls: "library-config-buttons",
		});

		// Reset button
		const resetButton = buttonContainer.createEl("button", {
			cls: "library-button",
			text: "إعادة الضبط",
		});
		resetButton.addEventListener("click", () => {
			this.resetToDefault();
			this.redraw();
		});

		// Save button
		const saveButton = buttonContainer.createEl("button", {
			cls: "library-button library-button-primary",
			text: "حفظ",
		});
		saveButton.addEventListener("click", () => {
			this.saveChanges();
		});

		// Cancel button
		const cancelButton = buttonContainer.createEl("button", {
			cls: "library-button",
			text: "إلغاء",
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	/**
	 * Moves a column from one position to another
	 * @param fromIndex - Source index
	 * @param toIndex - Target index
	 */
	moveColumn(fromIndex: number, toIndex: number): void {
		// Ensure indexes are valid
		if (
			fromIndex < 0 ||
			fromIndex >= this.columns.length ||
			toIndex < 0 ||
			toIndex >= this.columns.length
		) {
			return;
		}

		// Don't move special columns
		if (
			this.columns[fromIndex].id === "checkbox" ||
			this.columns[fromIndex].id === "actions" ||
			this.columns[toIndex].id === "checkbox" ||
			this.columns[toIndex].id === "actions"
		) {
			return;
		}

		// Move the column
		const column = this.columns.splice(fromIndex, 1)[0];
		this.columns.splice(toIndex, 0, column);

		// Update order values
		this.updateOrderValues();
	}

	/**
	 * Updates the order values of all columns
	 */
	updateOrderValues(): void {
		this.columns.forEach((column, index) => {
			column.order = index;
		});
	}

	/**
	 * Resets columns to default settings
	 */
	resetToDefault(): void {
		const {
			DEFAULT_VIDEO_COLUMNS,
		} = require("../../core/settings/defaults");

		// Use the correct default based on content type
		if (this.contentType === "video") {
			// Deep copy default columns
			this.columns = JSON.parse(JSON.stringify(DEFAULT_VIDEO_COLUMNS));
		} else {
			// For other content types if needed in the future
			// Add similar logic here

			// For now, just use current settings as fallback
			const defaultColumns =
				this.plugin.settings.tableColumns[this.contentType];
			this.columns = JSON.parse(JSON.stringify(defaultColumns));
		}

		// Update the UI to reflect the changes
		this.redraw();
	}

	/**
	 * Saves changes and closes the modal
	 */
	async saveChanges(): Promise<void> {
		// Update order values once more
		this.updateOrderValues();

		// Update plugin settings
		this.plugin.settings.tableColumns[this.contentType] = this.columns;
		await this.plugin.saveSettings();

		// Call the save callback
		await this.onSave();

		// Close the modal
		this.close();
	}

	/**
	 * Redraws the modal content
	 */
	redraw(): void {
		this.onOpen();
	}

	/**
	 * Cleans up when the modal is closed
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
