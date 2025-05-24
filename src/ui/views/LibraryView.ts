/**
 * Main view for The Library plugin
 * Manages the overall layout and content display
 */
import { ItemView, WorkspaceLeaf, Notice, TFile } from "obsidian";
import {
	VIEW_TYPE_LIBRARY,
	CONTENT_TYPE,
	LOCAL_STORAGE_KEYS,
} from "../../core/constants";
import { FilterState, FilterStateEvents } from "../../core/state/FilterState";
import {
	SelectionState,
	SelectionStateEvents,
} from "../../core/state/SelectionState";
import { Header } from "../components/Header";
import { FilterBar } from "../components/FilterBar";
import { Pagination } from "../components/Pagination";
import { BulkActions } from "../components/BulkActions";
import { ContentRenderer } from "../content/ContentRenderer";
import { ContentType } from "../../core/uiTypes";
import { LibraryItem } from "../../core/contentTypes";
import { BenefitItem } from "../../core";
import { AnalyticsDashboard } from "../content/video/AdvancedAnalyticsDashboard";
import { BookAnalyticsDashboard } from "../content/book/BookAnalyticsDashboard";
import { BenefitsView } from "../content/benefit/BenefitsView";
import { BenefitModal } from "../modals/BenefitModal";

/**
 * Main view for displaying library content
 */
export class LibraryView extends ItemView {
	// Plugin reference
	private plugin: any;

	// Current content type being displayed
	private contentType: ContentType = CONTENT_TYPE.VIDEO;

	// Current view mode (content or benefits)
	private viewMode: "content" | "benefits" = "content";

	// State management
	private filterState: FilterState;
	private selectionState: SelectionState;

	// Content data
	private contentItems: LibraryItem[] = [];
	private benefitItems: BenefitItem[] = [];
	private presenters: string[] = [];
	private authors: string[] = [];
	private categories: string[] = [];
	private tags: string[] = [];

	// UI Containers
	private headerContainer: HTMLElement | null = null;
	private tabsContainer: HTMLElement | null = null;
	private filterContainer: HTMLElement | null = null;
	private bulkActionsContainer: HTMLElement | null = null;
	private contentContainer: HTMLElement | null = null;
	private paginationContainer: HTMLElement | null = null;

	// Component references
	private headerComponent: Header | null = null;
	private statsContainer: HTMLElement | null = null;
	private filterBarComponent: FilterBar | null = null;
	private bulkActionsComponent: BulkActions | null = null;
	private contentRenderer: ContentRenderer | null = null;
	private benefitsView: BenefitsView | null = null;
	private paginationComponent: Pagination | null = null;
	private dashboardComponent: AnalyticsDashboard | null = null;
	private bookDashboardComponent: BookAnalyticsDashboard | null = null;

	// State event unsubscribe functions
	private stateUnsubscribes: (() => void)[] = [];

	/**
	 * Creates a new LibraryView
	 * @param leaf - Workspace leaf to attach to
	 * @param plugin - Plugin instance
	 */
	constructor(leaf: WorkspaceLeaf, plugin: any) {
		super(leaf);
		this.plugin = plugin;

		// Initialize state managers
		this.filterState = new FilterState();
		this.selectionState = new SelectionState();

		// Set up state change listeners
		this.setupStateListeners();

		// Try to load saved content type from localStorage
		this.loadSavedContentType();
	}

	/**
	 * Gets the view type identifier
	 * @returns View type identifier string
	 */
	getViewType(): string {
		return VIEW_TYPE_LIBRARY;
	}

	/**
	 * Gets the display text for the view
	 * @returns Display text
	 */
	getDisplayText(): string {
		return "مكتبتي";
	}

	/**
	 * Gets the icon for the view
	 * @returns Icon name
	 */
	getIcon(): string {
		return "book-open";
	}

	/**
	 * Sets up listeners for state changes
	 */
	private setupStateListeners(): void {
		// Listen for filter state changes
		const unsubscribeFilter = this.filterState.subscribe(
			FilterStateEvents.FILTER_UPDATED,
			() => {
				this.renderContent();
			}
		);
		this.stateUnsubscribes.push(unsubscribeFilter);

		// Listen for selection changes
		const unsubscribeSelection = this.selectionState.subscribe(
			SelectionStateEvents.SELECTION_CHANGED,
			() => {
				this.updateBulkActions();
			}
		);
		this.stateUnsubscribes.push(unsubscribeSelection);
	}

	/**
	 * Loads saved content type from localStorage
	 */
	private loadSavedContentType(): void {
		try {
			const savedContentType = localStorage.getItem(
				LOCAL_STORAGE_KEYS.CONTENT_TYPE
			);
			if (
				savedContentType === CONTENT_TYPE.VIDEO ||
				savedContentType === CONTENT_TYPE.BOOK
			) {
				this.contentType = savedContentType;
			}
		} catch (e) {
			console.warn("Failed to load saved content type:", e);
		}
	}

	/**
	 * Called when view is opened
	 */
	async onOpen(): Promise<void> {
		// Set up the UI structure
		this.setupUIStructure();

		// Load data and render view
		await this.loadData();
		this.renderView();
	}

	/**
	 * Sets up the basic UI structure
	 */
	private setupUIStructure(): void {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("library-container");

		// Header section
		this.headerContainer = container.createEl("div", {
			cls: "library-header-container",
		});

		// Tabs section for switching between content and benefits
		this.tabsContainer = container.createEl("div", {
			cls: "library-tabs-container",
		});

		// Stats section - Add this new container BEFORE the filter section
		this.statsContainer = container.createEl("div", {
			cls: "library-stats-section",
		});

		// Filter section
		this.filterContainer = container.createEl("div", {
			cls: "library-filter-section",
		});

		// Bulk actions container
		this.bulkActionsContainer = container.createEl("div", {
			cls: "library-bulk-actions-section",
		});

		// Main content container
		this.contentContainer = container.createEl("div", {
			cls: "library-content-container",
		});

		// Pagination container
		this.paginationContainer = container.createEl("div", {
			cls: "library-pagination-section",
		});
	}

	/**
	 * Called when view is closed
	 */
	async onClose(): Promise<void> {
		// Clean up resources
		this.cleanupComponents();

		if (this.bookDashboardComponent) {
			this.bookDashboardComponent.destroy?.();
			this.bookDashboardComponent = null;
		}

		// Clean up state listeners
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Reset state
		this.filterState.reset();
		this.selectionState.clearSelection();

		// Clean up DOM references
		this.headerContainer = null;
		this.tabsContainer = null;
		this.filterContainer = null;
		this.bulkActionsContainer = null;
		this.contentContainer = null;
		this.paginationContainer = null;
	}

	/**
	 * Cleans up and destroys all component instances
	 */
	private cleanupComponents(): void {
		// Clean up header component
		if (this.headerComponent) {
			this.headerComponent.destroy?.();
			this.headerComponent = null;
		}

		// Clean up filter bar component
		if (this.filterBarComponent) {
			this.filterBarComponent.destroy?.();
			this.filterBarComponent = null;
		}

		// Clean up bulk actions component
		if (this.bulkActionsComponent) {
			this.bulkActionsComponent.destroy?.();
			this.bulkActionsComponent = null;
		}

		// Clean up content renderer
		if (this.contentRenderer) {
			this.contentRenderer.destroy?.();
			this.contentRenderer = null;
		}

		// Clean up benefits view
		if (this.benefitsView) {
			this.benefitsView.destroy?.();
			this.benefitsView = null;
		}

		// Clean up pagination component
		if (this.paginationComponent) {
			this.paginationComponent.destroy?.();
			this.paginationComponent = null;
		}

		// Clean up dashboard component
		if (this.dashboardComponent) {
			this.dashboardComponent.destroy?.();
			this.dashboardComponent = null;
		}
	}

	/**
	 * Loads data for the current content type
	 * @param forceRefresh - Whether to force a refresh of cached data
	 */
	async loadData(forceRefresh = false): Promise<void> {
		// Load content data
		if (this.contentType === CONTENT_TYPE.VIDEO) {
			try {
				const { items, presenters, categories, tags } =
					await this.plugin.dataService.getVideoContent();

				this.contentItems = items;
				this.presenters = presenters;
				this.categories = categories;
				this.tags = tags;

				// Update available filter options for videos
				this.filterState.setAvailableOptions({
					statuses:
						this.plugin.settings.videoTracking.statusOptions || [],
					presenters: this.presenters || [],
					types: ["مقطع", "سلسلة"],
					categories: this.categories || [],
					tags: this.tags || [],
				});
			} catch (error) {
				console.error("Error loading video content:", error);
				new Notice("خطأ في تحميل محتوى المقطع");
			}
		} else if (this.contentType === CONTENT_TYPE.BOOK) {
			try {
				const { items, authors, categories, tags } =
					await this.plugin.dataService.getBookContent();

				this.contentItems = items;
				this.authors = authors; // Store authors in a dedicated property
				this.categories = categories;
				this.tags = tags;

				// Update available filter options for books with separate authors field
				this.filterState.setAvailableOptions({
					statuses:
						this.plugin.settings.bookTracking.statusOptions || [],
					authors: authors || [], // Set authors in FilterState
					presenters: [], // No presenters for books
					types: ["كتاب"],
					categories: this.categories || [],
					tags: this.tags || [],
				});
			} catch (error) {
				console.error("Error loading book content:", error);
				new Notice("خطأ في تحميل محتوى الكتب");
			}
		}

		// Load benefits data
		if (this.viewMode === "benefits") {
			await this.loadBenefits();
		}
	}

	/**
	 * Loads benefits for the current content type
	 */
	async loadBenefits(): Promise<void> {
		try {
			this.benefitItems = await this.plugin.benefitService.getAllBenefits(
				this.contentType === CONTENT_TYPE.VIDEO ? "video" : "book"
			);
		} catch (error) {
			console.error("Error loading benefits:", error);
			new Notice("خطأ في تحميل الفوائد");
		}
	}

	/**
	 * Renders or refreshes the entire view
	 */
	public renderView(): void {
		if (!this.headerContainer) return;

		// Render the header
		this.renderHeader();

		// Render tabs
		this.renderTabs();

		// Render content based on view mode
		if (this.viewMode === "content") {
			// Show content-specific UI
			if (this.statsContainer)
				this.statsContainer.style.display = "block";
			if (this.filterContainer)
				this.filterContainer.style.display = "block";
			if (this.bulkActionsContainer)
				this.bulkActionsContainer.style.display = "block";

			// Render stats with advanced analytics dashboard
			this.renderAdvancedStats();

			// Render bulk actions bar
			this.renderBulkActions();

			// Render filter bar
			this.renderFilterBar();

			// Render main content
			this.renderContent();
		} else {
			// Hide content-specific UI for benefits view
			if (this.statsContainer) this.statsContainer.style.display = "none";
			if (this.filterContainer)
				this.filterContainer.style.display = "none";
			if (this.bulkActionsContainer)
				this.bulkActionsContainer.style.display = "none";

			// Clear content-specific components
			if (this.filterBarComponent) {
				this.filterBarComponent.destroy?.();
				this.filterBarComponent = null;
			}
			if (this.bulkActionsComponent) {
				this.bulkActionsComponent.destroy?.();
				this.bulkActionsComponent = null;
			}

			// Render benefits
			this.renderBenefits();
		}
	}

	/**
	 * Renders the tabs for switching between content and benefits
	 */
	private renderTabs(): void {
		if (!this.tabsContainer) return;
		this.tabsContainer.empty();

		const tabs = this.tabsContainer.createEl("div", {
			cls: "library-view-tabs",
		});

		// Content tab
		const contentTab = tabs.createEl("button", {
			text: "المحتوى",
			cls: `library-view-tab ${
				this.viewMode === "content" ? "active" : ""
			}`,
		});

		contentTab.addEventListener("click", () => {
			if (this.viewMode !== "content") {
				this.viewMode = "content";
				this.renderView();
			}
		});

		// Benefits tab
		const benefitsTab = tabs.createEl("button", {
			text: "الفوائد",
			cls: `library-view-tab ${
				this.viewMode === "benefits" ? "active" : ""
			}`,
		});

		benefitsTab.addEventListener("click", async () => {
			if (this.viewMode !== "benefits") {
				this.viewMode = "benefits";
				await this.loadBenefits();
				this.renderView();
			}
		});
	}

	/**
	 * Renders the benefits view
	 */
	private renderBenefits(): void {
		if (!this.contentContainer) return;
		this.contentContainer.empty();
		this.paginationContainer?.empty();

		// Clean up previous views
		if (this.contentRenderer) {
			this.contentRenderer.destroy();
			this.contentRenderer = null;
		}

		// Create benefits view
		this.benefitsView = new BenefitsView({
			app: this.app,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			filterState: this.filterState,
			selectionState: this.selectionState,
			benefits: this.benefitItems,
			onRefresh: this.refresh.bind(this),
			onEditBenefit: this.handleEditBenefit.bind(this),
			onDeleteBenefit: this.handleDeleteBenefit.bind(this),
		});

		this.benefitsView.render(this.contentContainer);
	}

	/**
	 * Handles editing a benefit
	 */
	private async handleEditBenefit(benefit: BenefitItem): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(benefit.filePath);
		if (!(file instanceof TFile)) {
			new Notice("لم يتم العثور على الملف");
			return;
		}

		const modal = new BenefitModal(
			this.app,
			this.plugin,
			file,
			async (benefitData) => {
				try {
					await this.plugin.benefitService.updateBenefitInNote(
						file,
						benefit.id,
						benefitData
					);
					new Notice("تم تحديث الفائدة بنجاح");

					// Reload benefits
					await this.loadBenefits();
					this.renderBenefits();
				} catch (error) {
					console.error("Error updating benefit:", error);
					new Notice("حدث خطأ أثناء تحديث الفائدة");
				}
			},
			benefit
		);

		modal.open();
	}

	/**
	 * Handles deleting a benefit
	 */
	private async handleDeleteBenefit(benefit: BenefitItem): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(benefit.filePath);
		if (!(file instanceof TFile)) {
			new Notice("لم يتم العثور على الملف");
			return;
		}

		try {
			await this.plugin.benefitService.deleteBenefitFromNote(
				file,
				benefit.id
			);
			new Notice("تم حذف الفائدة بنجاح");

			// Reload benefits
			await this.loadBenefits();
			this.renderBenefits();
		} catch (error) {
			console.error("Error deleting benefit:", error);
			new Notice("حدث خطأ أثناء حذف الفائدة");
		}
	}

	/**
	 * Public method to refresh view data and UI
	 */
	public async refresh(): Promise<void> {
		await this.loadData(true);
		this.renderView();
	}

	/**
	 * Sets the content type and updates the view
	 * @param contentType - New content type to display
	 */
	public setContentType(contentType: ContentType): void {
		if (this.contentType !== contentType) {
			this.contentType = contentType;

			// Reset state when changing content type
			this.filterState.reset();
			this.selectionState.clearSelection();

			// Save preference
			localStorage.setItem(LOCAL_STORAGE_KEYS.CONTENT_TYPE, contentType);

			// Load data for the new content type
			this.loadData(true).then(() => {
				this.renderView();
			});
		}
	}

	/**
	 * Renders the header component
	 */
	private renderHeader(): void {
		if (!this.headerContainer) return;
		this.headerContainer.empty();

		this.headerComponent = new Header({
			app: this.app,
			leaf: this.leaf,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			onContentTypeChange: this.setContentType.bind(this),
			onViewModeChange: this.setViewMode.bind(this),
			onRefresh: this.refresh.bind(this),
			selectionState: this.selectionState,
		});

		this.headerComponent.render(this.headerContainer);
	}

	/**
	 * Renders the analytics dashboard component
	 */
	private renderAdvancedStats(): void {
		if (!this.statsContainer) return;
		this.statsContainer.empty();

		if (this.contentType === CONTENT_TYPE.VIDEO) {
			this.dashboardComponent = new AnalyticsDashboard({
				app: this.app,
				plugin: this.plugin,
				settings: this.plugin.settings,
				contentType: this.contentType,
				items: this.contentItems,
				filterState: this.filterState,
				selectionState: this.selectionState,
				onRefresh: this.refresh.bind(this),
			});

			this.dashboardComponent.render(this.statsContainer);
		} else if (this.contentType === CONTENT_TYPE.BOOK) {
			this.bookDashboardComponent = new BookAnalyticsDashboard({
				app: this.app,
				plugin: this.plugin,
				settings: this.plugin.settings,
				contentType: this.contentType,
				items: this.contentItems,
				filterState: this.filterState,
				selectionState: this.selectionState,
				onRefresh: this.refresh.bind(this),
			});

			this.bookDashboardComponent.render(this.statsContainer);
		}
	}

	/**
	 * Renders the bulk actions component
	 */
	private renderBulkActions(): void {
		if (!this.bulkActionsContainer) return;
		this.bulkActionsContainer.empty();

		this.bulkActionsComponent = new BulkActions({
			app: this.app,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			selectionState: this.selectionState,
			filterState: this.filterState,
			onOperationComplete: this.handleBulkOperationComplete.bind(this),
			onRefresh: this.refresh.bind(this),
		});

		this.bulkActionsComponent.render(this.bulkActionsContainer);

		// Initially hide bulk actions until items are selected
		this.updateBulkActions();
	}

	/**
	 * Updates bulk actions visibility based on selection state
	 */
	private updateBulkActions(): void {
		if (this.bulkActionsContainer) {
			const hasSelection = this.selectionState.hasSelection();
			this.bulkActionsContainer.style.display = hasSelection
				? "block"
				: "none";
		}
	}

	/**
	 * Renders the filter bar component
	 */
	private renderFilterBar(): void {
		if (!this.filterContainer) return;
		this.filterContainer.empty();

		// Clean up previous instance if it exists
		if (this.filterBarComponent) {
			this.filterBarComponent.destroy?.();
			this.filterBarComponent = null;
		}

		this.filterBarComponent = new FilterBar({
			app: this.app,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			filterState: this.filterState,
			selectionState: this.selectionState,
			onFilterChange: this.handleFilterChange.bind(this),
			onRefresh: this.refresh.bind(this),
			presenters: this.presenters,
			authors: this.authors,
			categories: this.categories,
			tags: this.tags,
			useDynamicFiltering: true,
		});

		this.filterBarComponent.render(this.filterContainer);
	}

	/**
	 * Renders the main content
	 */
	private renderContent(): void {
		if (!this.contentContainer || !this.paginationContainer) return;

		// Clean up previous content
		this.contentContainer.empty();
		this.paginationContainer.empty();

		// Clean up previous renderer
		if (this.contentRenderer) {
			this.contentRenderer.destroy();
			this.contentRenderer = null;
		}

		// Create content renderer based on content type
		this.contentRenderer = new ContentRenderer({
			app: this.app,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			filterState: this.filterState,
			selectionState: this.selectionState,
			items: this.contentItems,
			onRefresh: this.refresh.bind(this),
		});

		// Render content
		this.contentRenderer.render(this.contentContainer);

		// Get filtered items for pagination
		const filteredItems = this.contentRenderer.getFilteredItems();

		// Render pagination if there are items
		if (filteredItems.length > 0) {
			this.renderPagination(filteredItems.length);
		}
	}

	/**
	 * Renders the pagination component
	 * @param totalItems - Total number of items for pagination
	 */
	private renderPagination(totalItems: number): void {
		if (!this.paginationContainer) return;
		this.paginationContainer.empty();

		// Clean up previous component
		if (this.paginationComponent) {
			this.paginationComponent.destroy?.();
			this.paginationComponent = null;
		}

		this.paginationComponent = new Pagination({
			app: this.app,
			plugin: this.plugin,
			settings: this.plugin.settings,
			contentType: this.contentType,
			totalItems: totalItems,
			filterState: this.filterState,
			onPageChange: this.handlePageChange.bind(this),
			onRefresh: this.refresh.bind(this),
		});

		this.paginationComponent.render(this.paginationContainer);
	}

	/**
	 * Sets the view mode and updates the UI
	 * @param viewMode - The view mode to set
	 */
	private setViewMode(viewMode: "table" | "card"): void {
		if (this.plugin.settings.viewMode !== viewMode) {
			this.plugin.settings.viewMode = viewMode;
			this.plugin.saveSettings();

			// Only re-render content, not the entire view
			this.renderContent();

			// Update header if it exists
			if (this.headerComponent) {
				this.headerComponent.updateViewMode(viewMode);
			}
		}
	}

	/**
	 * Handles filter changes
	 */
	private handleFilterChange(): Promise<void> {
		// The filter state change will trigger content re-render
		// via the FilterState subscription, no need to do anything here
		return Promise.resolve();
	}

	/**
	 * Handles page changes
	 */
	private handlePageChange(): Promise<void> {
		// The FilterState change will trigger content re-render
		return Promise.resolve();
	}

	/**
	 * Handles completion of bulk operations
	 */
	private async handleBulkOperationComplete(): Promise<void> {
		// Reload data and re-render the view
		await this.refresh();
	}
}
