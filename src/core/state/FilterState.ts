/**
 * State manager for content filtering
 * Handles filter criteria and notifies subscribers when changes occur
 */
import { FilterState as FilterStateType, FilterOptions } from "../filterTypes";
import { EventEmitter } from "./EventEmitter";

/**
 * Events emitted by the FilterState
 */
export enum FilterStateEvents {
	/** Emitted when filter criteria are updated */
	FILTER_UPDATED = "filterUpdated",

	/** Emitted when available filter options are updated */
	OPTIONS_UPDATED = "optionsUpdated",
}

/**
 * Manages filter state with event-based notifications
 */
export class FilterState {
	// Event emitter for state changes
	private events: EventEmitter = new EventEmitter();

	// Current filter state
	private state: FilterStateType;

	// Available options for filters
	private availableOptions: FilterOptions = {
		statuses: new Set<string>(),
		presenters: new Set<string>(),
		authors: new Set<string>(),
		types: new Set<string>(),
		categories: new Set<string>(),
		tags: new Set<string>(),
	};

	/**
	 * Creates a new filter state manager
	 */
	constructor() {
		this.state = this.getDefaultState();
	}

	/**
	 * Subscribe to filter state events
	 * @param event - Event to subscribe to
	 * @param callback - Function to call when event is emitted
	 * @returns Unsubscribe function
	 */
	public subscribe(event: FilterStateEvents, callback: Function): () => void {
		return this.events.on(event, callback);
	}

	/**
	 * Creates a fresh default filter state
	 * @returns Default filter state
	 */
	private getDefaultState(): FilterStateType {
		return {
			statuses: [],
			presenters: [],
			authors: [],
			types: [],
			categories: [],
			tags: [],
			dateRange: {
				from: null,
				to: null,
			},
			searchQuery: "",
			page: 1,
			itemsPerPage: 10,
			sortBy: "dateAdded",
			sortOrder: "desc",
		};
	}

	/**
	 * Resets the filter state to defaults
	 * Preserves pagination and sorting settings if desired
	 * @param preservePageSettings - Whether to preserve pagination and sorting
	 */
	public reset(preservePageSettings = false): void {
		// Save settings we might want to preserve
		const itemsPerPage = this.state.itemsPerPage;
		const sortBy = this.state.sortBy;
		const sortOrder = this.state.sortOrder;

		// Create fresh state
		this.state = this.getDefaultState();

		// Restore preserved settings if requested
		if (preservePageSettings) {
			this.state.itemsPerPage = itemsPerPage;
			this.state.sortBy = sortBy;
			this.state.sortOrder = sortOrder;
		}

		// Notify subscribers
		this.notifyChange();
	}

	/**
	 * Gets a copy of the current filter state
	 * @returns Current filter state
	 */
	public getState(): FilterStateType {
		return { ...this.state };
	}

	/**
	 * Updates the filter state
	 * @param updates - Partial state to update
	 * @param silent - Whether to suppress change notifications
	 */
	public updateState(
		updates: Partial<FilterStateType>,
		silent = false
	): void {
		this.state = { ...this.state, ...updates };

		if (!silent) {
			this.notifyChange();
		}
	}

	/**
	 * Sets available options for filters
	 * @param options - Available options to set
	 */
	public setAvailableOptions(
		options: Partial<{
			statuses: string[];
			presenters: string[];
			authors: string[];
			types: string[];
			categories: string[];
			tags: string[];
		}>
	): void {
		let updated = false;

		if (options.statuses) {
			this.availableOptions.statuses = new Set(options.statuses);
			updated = true;
		}

		if (options.presenters) {
			this.availableOptions.presenters = new Set(options.presenters);
			updated = true;
		}

		if (options.authors) {
			this.availableOptions.authors = new Set(options.authors);
			updated = true;
		}

		if (options.types) {
			this.availableOptions.types = new Set(options.types);
			updated = true;
		}

		if (options.categories) {
			this.availableOptions.categories = new Set(options.categories);
			updated = true;
		}

		if (options.tags) {
			this.availableOptions.tags = new Set(options.tags);
			updated = true;
		}

		if (updated) {
			this.notifyOptionsChange();
		}
	}

	/**
	 * Gets available options for a specific filter
	 * @param filterType - Type of filter to get options for
	 * @returns Array of available options
	 */
	public getAvailableOptions(filterType: keyof FilterOptions): string[] {
		return Array.from(this.availableOptions[filterType] || []);
	}

	/**
	 * Notifies subscribers that filter state has changed
	 */
	private notifyChange(): void {
		this.events.emit(FilterStateEvents.FILTER_UPDATED, this.state);
	}

	/**
	 * Notifies subscribers that available options have changed
	 */
	private notifyOptionsChange(): void {
		this.events.emit(
			FilterStateEvents.OPTIONS_UPDATED,
			this.availableOptions
		);
	}
}
