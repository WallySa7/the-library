/**
 * State manager for selected items
 * Tracks which items are selected and notifies subscribers of changes
 */
import { EventEmitter } from "./EventEmitter";

/**
 * Events emitted by the SelectionState
 */
export enum SelectionStateEvents {
	/** Emitted when selection changes */
	SELECTION_CHANGED = "selectionChanged",

	/** Emitted when selection is cleared */
	SELECTION_CLEARED = "selectionCleared",
}

/**
 * Manages selection state with event-based notifications
 */
export class SelectionState {
	// Set of selected item paths
	private selectedItems: Set<string> = new Set();

	// Event emitter for state changes
	private events: EventEmitter = new EventEmitter();

	/**
	 * Subscribe to selection state events
	 * @param event - Event to subscribe to
	 * @param callback - Function to call when event occurs
	 * @returns Unsubscribe function
	 */
	public subscribe(
		event: SelectionStateEvents,
		callback: Function
	): () => void {
		return this.events.on(event, callback);
	}

	/**
	 * Gets the currently selected items
	 * @returns Array of selected item paths
	 */
	public getSelectedItems(): string[] {
		return Array.from(this.selectedItems);
	}

	/**
	 * Checks if an item is selected
	 * @param filePath - The file path to check
	 * @returns True if the item is selected
	 */
	public isSelected(filePath: string): boolean {
		return this.selectedItems.has(filePath);
	}

	/**
	 * Checks if any items are selected
	 * @returns True if at least one item is selected
	 */
	public hasSelection(): boolean {
		return this.selectedItems.size > 0;
	}

	/**
	 * Gets the count of selected items
	 * @returns Number of selected items
	 */
	public getSelectionCount(): number {
		return this.selectedItems.size;
	}

	/**
	 * Toggles selection for a single item
	 * @param filePath - The file path to toggle selection for
	 * @param isSelected - Whether the item should be selected
	 */
	public toggleItem(filePath: string, isSelected: boolean): void {
		if (isSelected) {
			this.selectedItems.add(filePath);
		} else {
			this.selectedItems.delete(filePath);
		}

		this.notifySelectionChange();
	}

	/**
	 * Selects all items in the provided list
	 * @param filePaths - The file paths to select
	 */
	public selectAll(filePaths: string[]): void {
		const initialSize = this.selectedItems.size;

		filePaths.forEach((path) => {
			this.selectedItems.add(path);
		});

		if (initialSize !== this.selectedItems.size) {
			this.notifySelectionChange();
		}
	}

	/**
	 * Deselects all items in the provided list
	 * @param filePaths - The file paths to deselect
	 */
	public deselectAll(filePaths: string[]): void {
		const initialSize = this.selectedItems.size;

		filePaths.forEach((path) => {
			this.selectedItems.delete(path);
		});

		if (initialSize !== this.selectedItems.size) {
			this.notifySelectionChange();
		}
	}

	/**
	 * Toggles selection for multiple items
	 * @param filePaths - The file paths to toggle
	 * @param isSelected - Whether the items should be selected
	 */
	public toggleItems(filePaths: string[], isSelected: boolean): void {
		let changed = false;

		filePaths.forEach((path) => {
			const currentlySelected = this.selectedItems.has(path);

			if (isSelected && !currentlySelected) {
				this.selectedItems.add(path);
				changed = true;
			} else if (!isSelected && currentlySelected) {
				this.selectedItems.delete(path);
				changed = true;
			}
		});

		if (changed) {
			this.notifySelectionChange();
		}
	}

	/**
	 * Clears all selections
	 */
	public clearSelection(): void {
		if (this.selectedItems.size > 0) {
			this.selectedItems.clear();
			this.events.emit(SelectionStateEvents.SELECTION_CLEARED);
			this.notifySelectionChange();
		}
	}

	/**
	 * Notifies subscribers about selection changes
	 */
	private notifySelectionChange(): void {
		this.events.emit(
			SelectionStateEvents.SELECTION_CHANGED,
			Array.from(this.selectedItems)
		);
	}
}
