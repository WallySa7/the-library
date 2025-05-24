/**
 * Content renderer for library items
 * Renders content based on type and view mode
 */
import { ContentComponentProps } from "../../core/uiTypes";
import { LibraryItem } from "../../core/contentTypes";
import { CONTENT_TYPE, VIEW_MODE } from "../../core/constants";
import { FilterStateEvents } from "../../core/state/FilterState";
import { SelectionStateEvents } from "../../core/state/SelectionState";
import { VideoTable } from "./video/VideoTable";
import { VideoCard } from "./video/VideoCard";
import { AnalyticsDashboard } from "./video/AdvancedAnalyticsDashboard";
import { BookTable } from "./book/BookTable";
import { BookCard } from "./book/BookCard";

/**
 * Props for ContentRenderer
 */
interface ContentRendererProps extends ContentComponentProps {
	items: LibraryItem[];
}

/**
 * Renders content based on content type and view mode
 */
export class ContentRenderer {
	// Component props
	private props: ContentRendererProps;

	// Container element
	private container: HTMLElement | null = null;

	// Filtered items
	private filteredItems: LibraryItem[] = [];

	// State unsubscribe functions
	private stateUnsubscribes: (() => void)[] = [];

	// Component references
	private statsComponent: AnalyticsDashboard | null = null;
	private contentComponent:
		| VideoTable
		| VideoCard
		| BookTable
		| BookCard
		| null = null;

	/**
	 * Creates a new ContentRenderer
	 * @param props Component props
	 */
	constructor(props: ContentRendererProps) {
		this.props = props;

		// Set up filter state change listener
		const unsubscribeFilter = props.filterState.subscribe(
			FilterStateEvents.FILTER_UPDATED,
			() => {
				this.updateFilteredItems();
			}
		);
		this.stateUnsubscribes.push(unsubscribeFilter);

		// Set up selection change listener
		const unsubscribeSelection = props.selectionState.subscribe(
			SelectionStateEvents.SELECTION_CHANGED,
			() => {
				this.updateSelectionUI();
			}
		);
		this.stateUnsubscribes.push(unsubscribeSelection);

		// Initialize filtered items
		this.filteredItems = this.getFilteredItemsInternal();

		// Update filter options based on current filtered items
		this.updateFilterOptions();
	}

	/**
	 * Renders the content
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Render the main content
		this.renderContent(container);
	}

	/**
	 * Renders statistics for the content
	 * @param container Container to render into
	 */
	private renderStats(container: HTMLElement): void {
		if (this.props.contentType === CONTENT_TYPE.VIDEO) {
			const statsContainer = container.createEl("div", {
				cls: "library-stats-section",
			});

			this.statsComponent = new AnalyticsDashboard({
				...this.props,
				items: this.props.items,
			});

			this.statsComponent.render(statsContainer);
		}
	}

	/**
	 * Renders the main content based on content type and view mode
	 * @param container Container to render into
	 */
	private renderContent(container: HTMLElement): void {
		const contentContainer = container.createEl("div", {
			cls: "library-main-content",
		});

		// No results message if needed
		if (this.filteredItems.length === 0) {
			contentContainer.createEl("div", {
				cls: "library-no-results",
				text: "لا توجد نتائج تطابق معايير البحث",
			});
			return;
		}

		// Render based on content type and view mode
		if (this.props.contentType === CONTENT_TYPE.VIDEO) {
			if (this.props.settings.viewMode === VIEW_MODE.TABLE) {
				this.renderVideoTable(contentContainer);
			} else {
				this.renderVideoCards(contentContainer);
			}
		}

		if (this.props.contentType === CONTENT_TYPE.BOOK) {
			if (this.props.settings.viewMode === VIEW_MODE.TABLE) {
				this.renderBookTable(contentContainer);
			} else {
				this.renderBookCards(contentContainer);
			}
		}
	}

	/**
	 * Renders books in table view
	 * @param container Container to render into
	 */
	private renderBookTable(container: HTMLElement): void {
		// Clean up previous component if needed
		if (this.contentComponent instanceof BookCard) {
			this.contentComponent.destroy?.();
			this.contentComponent = null;
		}

		this.contentComponent = new BookTable({
			...this.props,
			items: this.filteredItems,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Renders videos in table view
	 * @param container Container to render into
	 */
	private renderVideoTable(container: HTMLElement): void {
		// Clean up previous component if needed
		if (this.contentComponent instanceof VideoCard) {
			this.contentComponent.destroy?.();
			this.contentComponent = null;
		}

		this.contentComponent = new VideoTable({
			...this.props,
			items: this.filteredItems,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Renders books in card view
	 * @param container Container to render into
	 */
	private renderBookCards(container: HTMLElement): void {
		// Clean up previous component if needed
		if (this.contentComponent instanceof BookTable) {
			this.contentComponent.destroy?.();
			this.contentComponent = null;
		}

		this.contentComponent = new BookCard({
			...this.props,
			items: this.filteredItems,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Renders videos in card view
	 * @param container Container to render into
	 */
	private renderVideoCards(container: HTMLElement): void {
		// Clean up previous component if needed
		if (this.contentComponent instanceof VideoTable) {
			this.contentComponent.destroy?.();
			this.contentComponent = null;
		}

		this.contentComponent = new VideoCard({
			...this.props,
			items: this.filteredItems,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Updates the filtered items and re-renders content when filters change
	 */
	private updateFilteredItems(): void {
		this.filteredItems = this.getFilteredItemsInternal();

		// Update content if container exists
		if (this.container) {
			// Find content container or create it
			let mainContent = this.container.querySelector(
				".library-main-content"
			);
			if (mainContent) {
				// Clear and re-render just the content, not stats
				mainContent.empty();
				this.renderContent(this.container);
			} else {
				// If main content doesn't exist, render everything
				this.container.empty();
				this.renderStats(this.container);
				this.renderContent(this.container);
			}
		}

		this.updateFilterOptions();
	}

	/**
	 * Updates available filter options based on filtered items
	 */
	private updateFilterOptions(): void {
		// Get unique values from current filtered items
		const statusSet = new Set<string>();
		const presenterSet = new Set<string>();
		const authorSet = new Set<string>();
		const typeSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		// Collect options from filtered items
		this.filteredItems.forEach((item) => {
			if (item.status) statusSet.add(item.status);
			if ("presenter" in item && item.presenter)
				presenterSet.add(item.presenter);
			if ("author" in item && item.author) authorSet.add(item.author);

			typeSet.add(item.type);

			// Collect categories
			if (item.categories && Array.isArray(item.categories)) {
				item.categories.forEach((category) =>
					categorySet.add(category)
				);
			}

			// Collect tags
			if (item.tags && Array.isArray(item.tags)) {
				item.tags.forEach((tag) => tagSet.add(tag));
			}
		});

		// Update filter state with available options
		this.props.filterState.setAvailableOptions({
			statuses: Array.from(statusSet),
			presenters: Array.from(presenterSet),
			authors: Array.from(authorSet),
			types: Array.from(typeSet),
			categories: Array.from(categorySet),
			tags: Array.from(tagSet),
		});
	}

	/**
	 * Updates selection UI without full re-render
	 */
	private updateSelectionUI(): void {
		// Delegate to the content component if it supports selection updates
		if (
			this.contentComponent &&
			"updateSelectionUI" in this.contentComponent
		) {
			(this.contentComponent as any).updateSelectionUI();
		}
	}

	/**
	 * Gets filtered items based on current filter state
	 * @returns Filtered and sorted array of items
	 */
	private getFilteredItemsInternal(): LibraryItem[] {
		const filterState = this.props.filterState.getState();
		let filteredItems = [...this.props.items];

		// Apply filters

		// Status filter
		if (filterState.statuses.length > 0) {
			filteredItems = filteredItems.filter((item) =>
				filterState.statuses.includes(item.status || "")
			);
		}

		// Handle presenter/author filter based on content type
		if (this.props.contentType === CONTENT_TYPE.VIDEO) {
			// Presenter filter for videos
			if (filterState.presenters.length > 0) {
				filteredItems = filteredItems.filter((item) => {
					if ("presenter" in item && item.presenter) {
						return filterState.presenters.includes(item.presenter);
					}
					return false;
				});
			}
		} else if (this.props.contentType === CONTENT_TYPE.BOOK) {
			// Author filter for books
			if (filterState.authors && filterState.authors.length > 0) {
				filteredItems = filteredItems.filter((item) => {
					if ("author" in item && item.author) {
						return filterState.authors.includes(item.author);
					}
					return false;
				});
			}
		}

		// Type filter
		if (filterState.types.length > 0) {
			filteredItems = filteredItems.filter((item) =>
				filterState.types.includes(item.type)
			);
		}

		// Category filter - with hierarchical support
		if (filterState.categories && filterState.categories.length > 0) {
			filteredItems = filteredItems.filter(
				(item) =>
					item.categories &&
					item.categories.some(
						(category) =>
							// Direct match
							filterState.categories.includes(category) ||
							// Parent category match
							filterState.categories.some((filter) =>
								category.startsWith(filter + "/")
							) ||
							// Child category match
							filterState.categories.some((filter) =>
								filter.startsWith(category + "/")
							)
					)
			);
		}

		// Tag filter - with hierarchical support
		if (filterState.tags && filterState.tags.length > 0) {
			filteredItems = filteredItems.filter(
				(item) =>
					item.tags &&
					item.tags.some(
						(tag) =>
							// Direct match
							filterState.tags.includes(tag) ||
							// Parent tag match
							filterState.tags.some((filter) =>
								tag.startsWith(filter + "/")
							) ||
							// Child tag match
							filterState.tags.some((filter) =>
								filter.startsWith(tag + "/")
							)
					)
			);
		}

		// Date range filter
		if (filterState.dateRange.from || filterState.dateRange.to) {
			filteredItems = filteredItems.filter((item) => {
				if (!item.dateAdded) return false;

				const itemDate = new Date(item.dateAdded);
				const fromDate = filterState.dateRange.from
					? new Date(filterState.dateRange.from)
					: null;
				const toDate = filterState.dateRange.to
					? new Date(filterState.dateRange.to)
					: null;

				if (fromDate && itemDate < fromDate) return false;
				if (toDate) {
					// Set toDate to end of day
					toDate.setHours(23, 59, 59, 999);
					if (itemDate > toDate) return false;
				}

				return true;
			});
		}

		// Search query filter
		if (filterState.searchQuery) {
			const query = filterState.searchQuery.toLowerCase();
			filteredItems = filteredItems.filter(
				(item) =>
					// Title match
					item.title.toLowerCase().includes(query) ||
					// Author/Presenter match
					("presenter" in item &&
						typeof item.presenter === "string" &&
						item.presenter.toLowerCase().includes(query)) ||
					("author" in item &&
						typeof item.author === "string" &&
						item.author.toLowerCase().includes(query)) ||
					// Type match
					item.type.toLowerCase().includes(query) ||
					// Tags match
					(item.tags &&
						item.tags.some(
							(tag) =>
								typeof tag === "string" &&
								tag.toLowerCase().includes(query)
						)) ||
					// Categories match
					(item.categories &&
						item.categories.some(
							(category) =>
								typeof category === "string" &&
								category.toLowerCase().includes(query)
						))
			);
		}

		// Apply sorting
		return this.applySorting(filteredItems);
	}

	/**
	 * Applies sorting to items
	 * @param items Items to sort
	 * @returns Sorted array of items
	 */
	private applySorting(items: LibraryItem[]): LibraryItem[] {
		const filterState = this.props.filterState.getState();

		if (!filterState.sortBy) return items;

		return [...items].sort((a, b) => {
			let aValue: any, bValue: any;

			// Determine sort values based on sort field
			switch (filterState.sortBy) {
				case "title":
					aValue = a.title;
					bValue = b.title;
					break;
				case "presenter":
					aValue = "presenter" in a ? a.presenter : "";
					bValue = "presenter" in b ? b.presenter : "";
					break;
				case "author":
					aValue = "author" in a ? a.author : "";
					bValue = "author" in b ? b.author : "";
					break;
				case "type":
					aValue = a.type;
					bValue = b.type;
					break;
				case "status":
					aValue = a.status || "";
					bValue = b.status || "";
					break;
				case "duration":
					// Use durationSeconds for videos
					if ("durationSeconds" in a) {
						aValue = a.durationSeconds;
					} else if ("duration" in a) {
						aValue = this.parseDuration(a.duration);
					} else {
						aValue = 0;
					}

					if ("durationSeconds" in b) {
						bValue = b.durationSeconds;
					} else if ("duration" in b) {
						bValue = this.parseDuration(b.duration);
					} else {
						bValue = 0;
					}
					break;
				case "dateAdded":
					aValue = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
					bValue = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
					break;
				case "startDate":
					aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
					bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
					break;
				case "completionDate":
					aValue = a.completionDate
						? new Date(a.completionDate).getTime()
						: 0;
					bValue = b.completionDate
						? new Date(b.completionDate).getTime()
						: 0;
					break;
				// Add book-specific field sorting
				case "pageCount":
					aValue = "pageCount" in a ? a.pageCount : 0;
					bValue = "pageCount" in b ? b.pageCount : 0;
					break;
				case "publisher":
					aValue = "publisher" in a ? a.publisher : "";
					bValue = "publisher" in b ? b.publisher : "";
					break;
				case "language":
					aValue = a.language || "";
					bValue = b.language || "";
					break;
				case "publishYear":
					aValue = "publishYear" in a ? a.publishYear : 0;
					bValue = "publishYear" in b ? b.publishYear : 0;
					break;
				case "rating":
					aValue = "rating" in a ? a.rating : 0;
					bValue = "rating" in b ? b.rating : 0;
					break;
				default:
					return 0;
			}

			// Handle null/undefined values
			aValue = aValue ?? "";
			bValue = bValue ?? "";

			// Compare values
			const direction = filterState.sortOrder === "asc" ? 1 : -1;

			if (aValue < bValue) return -1 * direction;
			if (aValue > bValue) return 1 * direction;
			return 0;
		});
	}

	/**
	 * Parses duration string to seconds for sorting
	 * @param duration Duration in HH:MM:SS format
	 * @returns Duration in seconds
	 */
	private parseDuration(duration: string): number {
		if (!duration) return 0;

		const parts = duration.split(":");
		if (parts.length === 3) {
			return (
				parseInt(parts[0]) * 3600 +
				parseInt(parts[1]) * 60 +
				parseInt(parts[2])
			);
		}
		return 0;
	}

	/**
	 * Gets filtered items for external use
	 * @returns Array of filtered items
	 */
	public getFilteredItems(): LibraryItem[] {
		return [...this.filteredItems];
	}

	/**
	 * Cleans up resources when component is destroyed
	 */
	public destroy(): void {
		// Unsubscribe from state events
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clean up stats component
		if (this.statsComponent) {
			this.statsComponent.destroy?.();
			this.statsComponent = null;
		}

		// Clean up content component
		if (this.contentComponent) {
			this.contentComponent.destroy?.();
			this.contentComponent = null;
		}

		// Clear references
		this.container = null;
		this.filteredItems = [];
	}
}
