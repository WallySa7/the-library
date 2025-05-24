// src/ui/content/benefit/BenefitsView.ts

import { setIcon, Notice, Menu } from "obsidian";
import { BenefitItem } from "../../../core";
import { ContentComponentProps } from "../../../core/uiTypes";
import { BenefitModal } from "../../modals/BenefitModal";
import { BenefitShareModal } from "../../modals/BenefitShareModal";
import { formatDate } from "../../../utils";

/**
 * Props for BenefitsView
 */
interface BenefitsViewProps extends ContentComponentProps {
	benefits: BenefitItem[];
	onEditBenefit: (benefit: BenefitItem) => void;
	onDeleteBenefit: (benefit: BenefitItem) => void;
}

/**
 * Filter state for benefits
 */
interface BenefitFilterState {
	searchQuery: string;
	selectedCategories: Set<string>;
	selectedTags: Set<string>;
	selectedAuthors: Set<string>;
	selectedSources: Set<string>;
	dateRange: {
		from: string | null;
		to: string | null;
	};
	sortBy: "dateCreated" | "dateModified" | "title" | "author" | "parentTitle";
	sortOrder: "asc" | "desc";
}

/**
 * Search match information
 */
interface SearchMatch {
	field: "title" | "text" | "parentTitle" | "author" | "categories" | "tags";
	original: string;
	highlighted: string;
}

/**
 * Benefit with search match information
 */
interface BenefitWithMatches extends BenefitItem {
	matches?: {
		[field: string]: string;
	};
}

/**
 * Enhanced component for displaying benefits with advanced filtering
 */
export class BenefitsView {
	private props: BenefitsViewProps;
	private container: HTMLElement | null = null;
	private searchInput: HTMLInputElement | null = null;
	private filteredBenefits: BenefitWithMatches[] = [];
	private currentPage = 1;
	private itemsPerPage = 20;
	private searchTimeout: NodeJS.Timeout | null = null;

	// Enhanced filter state
	private filterState: BenefitFilterState = {
		searchQuery: "",
		selectedCategories: new Set(),
		selectedTags: new Set(),
		selectedAuthors: new Set(),
		selectedSources: new Set(),
		dateRange: { from: null, to: null },
		sortBy: "dateCreated",
		sortOrder: "desc",
	};

	// Available filter options (dynamic)
	private availableOptions = {
		categories: [] as string[],
		tags: [] as string[],
		authors: [] as string[],
		sources: [] as string[],
	};

	constructor(props: BenefitsViewProps) {
		this.props = props;
		this.initializeAvailableOptions();
		this.filteredBenefits = [...props.benefits];
		this.applyFilters();
	}

	/**
	 * Builds hierarchy from flat options list
	 */
	private buildHierarchy(options: string[]): any {
		const hierarchy: any = {};

		options.forEach((option) => {
			const parts = option.split("/");
			let current = hierarchy;

			parts.forEach((part, index) => {
				const fullPath = parts.slice(0, index + 1).join("/");
				if (!current[part]) {
					current[part] = {
						fullPath,
						children: {},
						hasChildren: false,
					};
				}
				if (index < parts.length - 1) {
					current[part].hasChildren = true;
				}
				current = current[part].children;
			});
		});

		return hierarchy;
	}

	/**
	 * Updates filter UI elements without full re-render
	 */
	private updateFilterUI(): void {
		// Update search input
		if (this.searchInput) {
			this.searchInput.value = this.filterState.searchQuery;
		}

		// Update filter buttons - they will update on next interaction
		// This is a lightweight approach that doesn't require full DOM manipulation
	}

	/**
	 * Updates just the results summary without full re-render
	 */
	private updateResultsSummary(): void {
		const summaryEl = this.container?.querySelector(
			".library-benefits-results-summary"
		);
		if (summaryEl) {
			const total = this.props.benefits.length;
			const filtered = this.filteredBenefits.length;

			if (this.hasActiveFilters()) {
				summaryEl.textContent = `عرض ${filtered} من أصل ${total} فائدة`;
			} else {
				summaryEl.textContent = `إجمالي ${total} فائدة`;
			}
		}
	}

	/**
	 * Initialize available filter options from all benefits
	 */
	private initializeAvailableOptions(): void {
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();
		const authorSet = new Set<string>();
		const sourceSet = new Set<string>();

		this.props.benefits.forEach((benefit) => {
			// Collect hierarchical categories
			benefit.categories.forEach((category) => {
				categorySet.add(category);
				// Add parent categories for hierarchical filtering
				const parts = category.split("/");
				for (let i = 1; i < parts.length; i++) {
					categorySet.add(parts.slice(0, i).join("/"));
				}
			});

			// Collect hierarchical tags
			benefit.tags.forEach((tag) => {
				tagSet.add(tag);
				// Add parent tags for hierarchical filtering
				const parts = tag.split("/");
				for (let i = 1; i < parts.length; i++) {
					tagSet.add(parts.slice(0, i).join("/"));
				}
			});

			if (benefit.author) authorSet.add(benefit.author);
			if (benefit.parentTitle) sourceSet.add(benefit.parentTitle);
		});

		this.availableOptions = {
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
			authors: Array.from(authorSet).sort(),
			sources: Array.from(sourceSet).sort(),
		};
	}

	/**
	 * Renders the benefits view
	 */
	render(container: HTMLElement): void {
		this.container = container;
		container.empty();
		container.addClass("library-benefits-view");

		// Render advanced filters
		this.renderAdvancedFilters(container);

		// Render sorting controls
		this.renderSortingControls(container);

		// Render benefits
		this.renderBenefits(container);

		// Render pagination
		this.renderPagination(container);
	}

	/**
	 * Renders the advanced filter section
	 */
	private renderAdvancedFilters(container: HTMLElement): void {
		const filterSection = container.createEl("div", {
			cls: "library-benefits-filters library-benefits-filters-advanced",
		});

		// Search bar with advanced options
		this.renderSearchSection(filterSection);

		// Filter chips container
		const filterChips = filterSection.createEl("div", {
			cls: "library-benefits-filter-chips",
		});

		// Category filter with hierarchical support
		if (this.availableOptions.categories.length > 0) {
			this.renderEnhancedFilterDropdown(
				filterChips,
				"التصنيفات",
				this.availableOptions.categories,
				this.filterState.selectedCategories,
				this.updateFilters.bind(this),
				true, // hierarchical
				"categories" // filter type for dynamic options
			);
		}

		// Tags filter with hierarchical support
		if (this.availableOptions.tags.length > 0) {
			this.renderEnhancedFilterDropdown(
				filterChips,
				"الوسوم",
				this.availableOptions.tags,
				this.filterState.selectedTags,
				this.updateFilters.bind(this),
				true, // hierarchical
				"tags" // filter type for dynamic options
			);
		}

		// Author/Presenter filter
		if (this.availableOptions.authors.length > 0) {
			const label =
				this.props.contentType === "book" ? "المؤلفون" : "الملقون";
			this.renderEnhancedFilterDropdown(
				filterChips,
				label,
				this.availableOptions.authors,
				this.filterState.selectedAuthors,
				this.updateFilters.bind(this),
				false, // not hierarchical
				"authors" // filter type for dynamic options
			);
		}

		// Source filter
		if (this.availableOptions.sources.length > 0) {
			this.renderEnhancedFilterDropdown(
				filterChips,
				"المصادر",
				this.availableOptions.sources,
				this.filterState.selectedSources,
				this.updateFilters.bind(this),
				false, // not hierarchical
				"sources" // filter type for dynamic options
			);
		}

		// Clear filters button
		if (this.hasActiveFilters()) {
			const clearBtn = filterChips.createEl("button", {
				text: "مسح جميع الفلاتر",
				cls: "library-benefits-clear-filters",
			});

			clearBtn.addEventListener("click", () => {
				this.clearAllFilters();
				this.updateFilters();
				// Update filter UI elements
				this.updateFilterUI();
			});
		}

		// Results summary
		this.renderResultsSummary(filterSection);
	}

	/**
	 * Renders enhanced search section
	 */
	private renderSearchSection(container: HTMLElement): void {
		const searchContainer = container.createEl("div", {
			cls: "library-benefits-search-container",
		});

		const searchWrapper = searchContainer.createEl("div", {
			cls: "library-benefits-search-wrapper",
		});

		this.searchInput = searchWrapper.createEl("input", {
			type: "text",
			placeholder: "بحث في نص الفوائد...", // Updated placeholder to reflect text-only search
			cls: "library-benefits-search-input",
		});

		if (this.filterState.searchQuery) {
			this.searchInput.value = this.filterState.searchQuery;
		}

		// Search button
		const searchBtn = searchWrapper.createEl("button", {
			cls: "library-benefits-search-btn",
			attr: { title: "بحث" },
		});
		setIcon(searchBtn, "search");

		// Clear search button
		const clearSearchBtn = searchWrapper.createEl("button", {
			cls: "library-benefits-search-clear",
			attr: { title: "مسح البحث" },
		});
		setIcon(clearSearchBtn, "x");

		// Event listeners
		this.searchInput.addEventListener("input", () => {
			this.filterState.searchQuery = this.searchInput!.value;

			// Debounce search to avoid excessive re-renders
			if (this.searchTimeout) {
				clearTimeout(this.searchTimeout);
			}
			this.searchTimeout = setTimeout(() => {
				this.updateFilters();
			}, 300); // 300ms debounce
		});

		this.searchInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.updateFilters();
			}
		});

		searchBtn.addEventListener("click", () => {
			this.updateFilters();
		});

		clearSearchBtn.addEventListener("click", () => {
			this.filterState.searchQuery = "";
			this.searchInput!.value = "";
			this.updateFilters();
		});

		// Show/hide clear button based on search input
		const updateClearButton = () => {
			clearSearchBtn.style.display = this.filterState.searchQuery
				? "block"
				: "none";
		};
		updateClearButton();

		this.searchInput.addEventListener("input", updateClearButton);
	}

	/**
	 * Renders sorting controls
	 */
	private renderSortingControls(container: HTMLElement): void {
		const sortContainer = container.createEl("div", {
			cls: "library-benefits-sort-container",
		});

		// Sort by dropdown
		const sortByContainer = sortContainer.createEl("div", {
			cls: "library-benefits-sort-group",
		});

		sortByContainer.createEl("label", {
			text: "ترتيب حسب:",
			cls: "library-benefits-sort-label",
		});

		const sortBySelect = sortByContainer.createEl("select", {
			cls: "library-benefits-sort-select",
		});

		const sortOptions = [
			{ value: "dateCreated", label: "تاريخ الإنشاء" },
			{ value: "dateModified", label: "تاريخ التعديل" },
			{ value: "title", label: "العنوان" },
			{ value: "author", label: "المؤلف/الملقي" },
			{ value: "parentTitle", label: "المصدر" },
		];

		sortOptions.forEach((option) => {
			const optionEl = sortBySelect.createEl("option", {
				value: option.value,
				text: option.label,
			});
			if (this.filterState.sortBy === option.value) {
				optionEl.selected = true;
			}
		});

		sortBySelect.addEventListener("change", () => {
			this.filterState.sortBy = sortBySelect.value as any;
			this.updateFilters();
		});

		// Sort order toggle
		const sortOrderBtn = sortContainer.createEl("button", {
			cls: `library-benefits-sort-order ${this.filterState.sortOrder}`,
			attr: {
				title:
					this.filterState.sortOrder === "asc" ? "تصاعدي" : "تنازلي",
			},
		});

		const updateSortOrderIcon = () => {
			setIcon(
				sortOrderBtn,
				this.filterState.sortOrder === "asc" ? "arrow-up" : "arrow-down"
			);
			sortOrderBtn.setAttribute(
				"title",
				this.filterState.sortOrder === "asc" ? "تصاعدي" : "تنازلي"
			);
		};
		updateSortOrderIcon();

		sortOrderBtn.addEventListener("click", () => {
			this.filterState.sortOrder =
				this.filterState.sortOrder === "asc" ? "desc" : "asc";
			updateSortOrderIcon();
			this.updateFilters();
		});
	}

	/**
	 * Renders results summary
	 */
	private renderResultsSummary(container: HTMLElement): void {
		const summary = container.createEl("div", {
			cls: "library-benefits-results-summary",
		});

		const total = this.props.benefits.length;
		const filtered = this.filteredBenefits.length;

		if (this.hasActiveFilters()) {
			summary.textContent = `عرض ${filtered} من أصل ${total} فائدة`;
		} else {
			summary.textContent = `إجمالي ${total} فائدة`;
		}
	}

	/**
	 * Renders enhanced searchable filter dropdown with multiple selection
	 */
	private renderEnhancedFilterDropdown(
		container: HTMLElement,
		label: string,
		initialOptions: string[], // This is now just for initial setup
		selected: Set<string>,
		onChange: () => void,
		isHierarchical: boolean = false,
		filterType?: "categories" | "tags" | "authors" | "sources"
	): void {
		const dropdown = container.createEl("div", {
			cls: "library-benefits-enhanced-dropdown",
		});

		const button = dropdown.createEl("button", {
			cls: "library-benefits-filter-button enhanced",
		});

		const updateButtonText = () => {
			const count = selected.size;
			button.innerHTML = `
				<span class="filter-label">${label}</span>
				${count > 0 ? `<span class="filter-count">${count}</span>` : ""}
				<span class="filter-arrow">▼</span>
			`;
			button.classList.toggle("active", count > 0);
		};

		updateButtonText();

		// Create dropdown content
		const dropdownContent = dropdown.createEl("div", {
			cls: "library-benefits-dropdown-content",
		});

		let isOpen = false;

		button.addEventListener("click", (e) => {
			if (isOpen) {
				dropdownContent.style.display = "none";
				button.classList.remove("open");
				isOpen = false;
				return;
			}

			// Close other dropdowns
			document
				.querySelectorAll(".library-benefits-dropdown-content")
				.forEach((el) => {
					(el as HTMLElement).style.display = "none";
				});
			document
				.querySelectorAll(".library-benefits-filter-button")
				.forEach((el) => {
					el.classList.remove("open");
				});

			// Get current available options dynamically
			const currentOptions = filterType
				? this.getCurrentAvailableOptions(filterType)
				: initialOptions;

			// Open this dropdown
			dropdownContent.style.display = "block";
			button.classList.add("open");
			isOpen = true;

			// Render dropdown content with current options
			this.renderDropdownContent(
				dropdownContent,
				currentOptions,
				selected,
				updateButtonText,
				onChange,
				isHierarchical
			);
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!dropdown.contains(e.target as Node)) {
				dropdownContent.style.display = "none";
				button.classList.remove("open");
				isOpen = false;
			}
		});
	}

	/**
	 * Renders the content inside a dropdown
	 */
	private renderDropdownContent(
		container: HTMLElement,
		allOptions: string[],
		selected: Set<string>,
		updateButtonCallback: () => void,
		onChange: () => void,
		isHierarchical: boolean
	): void {
		container.empty();
		container.addClass("enhanced-dropdown-content");

		// Search input
		const searchContainer = container.createEl("div", {
			cls: "dropdown-search-container",
		});

		const searchInput = searchContainer.createEl("input", {
			type: "text",
			placeholder: "بحث...",
			cls: "dropdown-search-input",
		});

		let filteredOptions = [...allOptions];

		const renderOptions = () => {
			// Remove existing options
			const existingOptions =
				container.querySelector(".dropdown-options");
			if (existingOptions) {
				existingOptions.remove();
			}

			const optionsContainer = container.createEl("div", {
				cls: "dropdown-options",
			});

			if (filteredOptions.length === 0) {
				optionsContainer.createEl("div", {
					text: "لا توجد خيارات",
					cls: "dropdown-no-options",
				});
				return;
			}

			// Control buttons
			const controlsContainer = optionsContainer.createEl("div", {
				cls: "dropdown-controls",
			});

			const selectAllBtn = controlsContainer.createEl("button", {
				text: "تحديد الكل",
				cls: "dropdown-control-btn",
			});

			const deselectAllBtn = controlsContainer.createEl("button", {
				text: "إلغاء تحديد الكل",
				cls: "dropdown-control-btn",
			});

			selectAllBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				filteredOptions.forEach((option) => selected.add(option));
				updateButtonCallback();
				onChange();
				renderOptions(); // Re-render to update checkboxes
			});

			deselectAllBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				filteredOptions.forEach((option) => selected.delete(option));
				updateButtonCallback();
				onChange();
				renderOptions(); // Re-render to update checkboxes
			});

			// Options list
			if (isHierarchical) {
				const hierarchy = this.buildHierarchy(filteredOptions);
				this.renderHierarchicalOptions(
					optionsContainer,
					hierarchy,
					selected,
					updateButtonCallback,
					onChange
				);
			} else {
				this.renderFlatOptions(
					optionsContainer,
					filteredOptions,
					selected,
					updateButtonCallback,
					onChange
				);
			}
		};

		// Search functionality
		searchInput.addEventListener("input", () => {
			const query = searchInput.value.toLowerCase();
			filteredOptions = allOptions.filter((option) =>
				option.toLowerCase().includes(query)
			);
			renderOptions();
		});

		// Initial render
		renderOptions();

		// Focus search input
		setTimeout(() => searchInput.focus(), 50);
	}

	/**
	 * Renders flat options list with checkboxes - FIXED EVENT HANDLING
	 */
	private renderFlatOptions(
		container: HTMLElement,
		options: string[],
		selected: Set<string>,
		updateButtonCallback: () => void,
		onChange: () => void
	): void {
		const listContainer = container.createEl("div", {
			cls: "dropdown-options-list",
		});

		if (options.length === 0) {
			listContainer.createEl("div", {
				text: "لا توجد خيارات متاحة مع الفلاتر الحالية",
				cls: "dropdown-no-options",
			});
			return;
		}

		options.sort().forEach((option) => {
			const optionItem = listContainer.createEl("div", {
				cls: "dropdown-option-item",
			});

			const checkbox = optionItem.createEl("input", {
				type: "checkbox",
				cls: "dropdown-checkbox",
			});

			checkbox.checked = selected.has(option);

			const label = optionItem.createEl("label", {
				text: option,
				cls: "dropdown-option-label",
			});

			// Add result count for this option (optional feature)
			const resultCount = this.getResultCountForOption(option);
			if (resultCount !== null) {
				const countSpan = label.createEl("span", {
					text: ` (${resultCount})`,
					cls: "dropdown-option-count",
				});
			}

			const toggleOption = () => {
				if (selected.has(option)) {
					selected.delete(option);
				} else {
					selected.add(option);
				}
				checkbox.checked = selected.has(option);
				updateButtonCallback();
				onChange();
			};

			// FIXED: Separate handling for checkbox and option item clicks
			checkbox.addEventListener("change", (e) => {
				e.stopPropagation(); // Prevent bubbling to option item
				toggleOption();
			});

			// Only add click handler to the label, not the entire option item
			label.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				toggleOption();
			});

			// Make the option item clickable but exclude checkbox area
			optionItem.addEventListener("click", (e) => {
				// Only toggle if the click wasn't on the checkbox itself
				if (e.target !== checkbox) {
					toggleOption();
				}
			});
		});
	}

	/**
	 * Gets the result count for a specific option (used for showing counts in dropdowns)
	 */
	private getResultCountForOption(option: string): number | null {
		// This is optional - you can implement it to show result counts
		// For now, returning null to keep it simple
		return null;
	}

	/**
	 * Renders hierarchical options with indentation - FIXED EVENT HANDLING
	 */
	private renderHierarchicalOptions(
		container: HTMLElement,
		hierarchy: any,
		selected: Set<string>,
		updateButtonCallback: () => void,
		onChange: () => void,
		level: number = 0
	): void {
		const listContainer =
			container.querySelector(".dropdown-options-list") ||
			container.createEl("div", {
				cls: "dropdown-options-list hierarchical",
			});

		Object.keys(hierarchy)
			.sort()
			.forEach((key) => {
				const item = hierarchy[key];

				const optionItem = listContainer.createEl("div", {
					cls: `dropdown-option-item hierarchical level-${level}`,
				});

				const checkbox = optionItem.createEl("input", {
					type: "checkbox",
					cls: "dropdown-checkbox",
				});

				checkbox.checked = selected.has(item.fullPath);

				const label = optionItem.createEl("label", {
					cls: "dropdown-option-label hierarchical",
				});

				// Add indentation
				if (level > 0) {
					label.style.paddingLeft = `${level * 20}px`;
				}

				label.textContent = key;

				const toggleOption = () => {
					if (selected.has(item.fullPath)) {
						selected.delete(item.fullPath);
					} else {
						selected.add(item.fullPath);
					}
					checkbox.checked = selected.has(item.fullPath);
					updateButtonCallback();
					onChange();
				};

				// FIXED: Separate handling for checkbox and option item clicks
				checkbox.addEventListener("change", (e) => {
					e.stopPropagation(); // Prevent bubbling to option item
					toggleOption();
				});

				// Only add click handler to the label, not the entire option item
				label.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					toggleOption();
				});

				// Make the option item clickable but exclude checkbox area
				optionItem.addEventListener("click", (e) => {
					// Only toggle if the click wasn't on the checkbox itself
					if (e.target !== checkbox) {
						toggleOption();
					}
				});

				// Render children recursively
				if (item.hasChildren) {
					this.renderHierarchicalOptions(
						container,
						item.children,
						selected,
						updateButtonCallback,
						onChange,
						level + 1
					);
				}
			});
	}

	/**
	 * Updates filters and refreshes only content (preserves search focus)
	 */
	private updateFilters(): void {
		this.applyFilters();
		this.updateDynamicFilterOptions(); // Update available options based on filtered results
		this.currentPage = 1;
		if (this.container) {
			// Only re-render content sections, not the entire view
			this.renderBenefits(this.container);
			this.renderPagination(this.container);
			this.updateResultsSummary();
			this.updateDropdownButtonStates(); // Update dropdown button states
		}
	}

	/**
	 * Updates available filter options based on current filtered results (simplified)
	 */
	private updateDynamicFilterOptions(): void {
		// This is now mainly for updating button states and initial availability
		// The actual dynamic options are calculated when dropdowns are opened

		// We can update the basic availability here to show/hide filter buttons
		const currentlyFiltered = this.applyFiltersWithState(this.filterState);

		// Check if each filter type has any options available
		const hasCategories = currentlyFiltered.some(
			(b) => b.categories.length > 0
		);
		const hasTags = currentlyFiltered.some((b) => b.tags.length > 0);
		const hasAuthors = currentlyFiltered.some((b) => b.author);
		const hasSources = currentlyFiltered.some((b) => b.parentTitle);

		// You could hide/show filter buttons based on availability
		// For now, we'll keep them visible but the dropdowns will show current options
	}

	/**
	 * Updates dropdown button states to reflect current filter counts
	 */
	private updateDropdownButtonStates(): void {
		// Update button text for all dropdowns
		const dropdowns = this.container?.querySelectorAll(
			".library-benefits-enhanced-dropdown"
		);
		dropdowns?.forEach((dropdown) => {
			const button = dropdown.querySelector(
				".library-benefits-filter-button.enhanced"
			) as HTMLElement;
			if (button) {
				// The button will be updated when the dropdown is next opened
				// This is more efficient than updating all dropdowns immediately
			}
		});
	}

	/**
	 * Gets current available options for a specific filter type
	 */
	private getCurrentAvailableOptions(
		filterType: "categories" | "tags" | "authors" | "sources"
	): string[] {
		// Get benefits that match all filters EXCEPT the current filter type
		const tempFilterState = { ...this.filterState };

		// Temporarily clear the current filter type
		switch (filterType) {
			case "categories":
				tempFilterState.selectedCategories = new Set();
				break;
			case "tags":
				tempFilterState.selectedTags = new Set();
				break;
			case "authors":
				tempFilterState.selectedAuthors = new Set();
				break;
			case "sources":
				tempFilterState.selectedSources = new Set();
				break;
		}

		// Apply filters with the temp state
		const availableBenefits = this.applyFiltersWithState(tempFilterState);

		// Extract options from available benefits
		const optionSet = new Set<string>();

		availableBenefits.forEach((benefit) => {
			switch (filterType) {
				case "categories":
					benefit.categories.forEach((category) => {
						optionSet.add(category);
						// Add parent categories for hierarchical filtering
						const parts = category.split("/");
						for (let i = 1; i < parts.length; i++) {
							optionSet.add(parts.slice(0, i).join("/"));
						}
					});
					break;
				case "tags":
					benefit.tags.forEach((tag) => {
						optionSet.add(tag);
						// Add parent tags for hierarchical filtering
						const parts = tag.split("/");
						for (let i = 1; i < parts.length; i++) {
							optionSet.add(parts.slice(0, i).join("/"));
						}
					});
					break;
				case "authors":
					if (benefit.author) optionSet.add(benefit.author);
					break;
				case "sources":
					if (benefit.parentTitle) optionSet.add(benefit.parentTitle);
					break;
			}
		});

		return Array.from(optionSet).sort();
	}

	/**
	 * Applies filters with a given state (used for dynamic option calculation)
	 */
	private applyFiltersWithState(
		filterState: BenefitFilterState
	): BenefitItem[] {
		const query = filterState.searchQuery.toLowerCase().trim();

		return this.props.benefits.filter((benefit) => {
			// FIXED: Search query filtering - ONLY search in benefit text
			if (query) {
				const searchTerms = query
					.split(/\s+/)
					.filter((term) => term.length > 0);

				const matchesSearch = searchTerms.every((term) =>
					benefit.text.toLowerCase().includes(term)
				);

				if (!matchesSearch) return false;
			}

			// Category filtering with hierarchical support
			if (filterState.selectedCategories.size > 0) {
				const hasCategory = benefit.categories.some(
					(category) =>
						filterState.selectedCategories.has(category) ||
						// Parent category match
						Array.from(filterState.selectedCategories).some(
							(filter) =>
								category.startsWith(filter + "/") ||
								filter.startsWith(category + "/")
						)
				);
				if (!hasCategory) return false;
			}

			// Tag filtering with hierarchical support
			if (filterState.selectedTags.size > 0) {
				const hasTag = benefit.tags.some(
					(tag) =>
						filterState.selectedTags.has(tag) ||
						// Parent tag match
						Array.from(filterState.selectedTags).some(
							(filter) =>
								tag.startsWith(filter + "/") ||
								filter.startsWith(tag + "/")
						)
				);
				if (!hasTag) return false;
			}

			// Author filtering
			if (filterState.selectedAuthors.size > 0 && benefit.author) {
				if (!filterState.selectedAuthors.has(benefit.author))
					return false;
			}

			// Source filtering
			if (filterState.selectedSources.size > 0 && benefit.parentTitle) {
				if (!filterState.selectedSources.has(benefit.parentTitle))
					return false;
			}

			return true;
		});
	}

	/**
	 * Enhanced filter application with hierarchical support - FIXED SEARCH
	 */
	private applyFilters(): void {
		const query = this.filterState.searchQuery.toLowerCase().trim();

		this.filteredBenefits = this.props.benefits
			.map((benefit) => {
				const benefitWithMatches = { ...benefit } as BenefitWithMatches;

				// FIXED: Search query filtering with highlighting - ONLY in benefit text
				if (query) {
					const matches: { [field: string]: string } = {};
					let hasMatch = false;

					// Enhanced search with multiple terms support
					const searchTerms = query
						.split(/\s+/)
						.filter((term) => term.length > 0);

					// ONLY check benefit text
					const lowerText = benefit.text.toLowerCase();
					if (searchTerms.every((term) => lowerText.includes(term))) {
						matches["text"] = this.highlightMultipleTerms(
							benefit.text,
							searchTerms
						);
						hasMatch = true;
					}

					if (!hasMatch) return null;
					benefitWithMatches.matches = matches;
				}

				// Category filtering with hierarchical support
				if (this.filterState.selectedCategories.size > 0) {
					const hasCategory = benefit.categories.some(
						(category) =>
							this.filterState.selectedCategories.has(category) ||
							// Parent category match
							Array.from(
								this.filterState.selectedCategories
							).some(
								(filter) =>
									category.startsWith(filter + "/") ||
									filter.startsWith(category + "/")
							)
					);
					if (!hasCategory) return null;
				}

				// Tag filtering with hierarchical support
				if (this.filterState.selectedTags.size > 0) {
					const hasTag = benefit.tags.some(
						(tag) =>
							this.filterState.selectedTags.has(tag) ||
							// Parent tag match
							Array.from(this.filterState.selectedTags).some(
								(filter) =>
									tag.startsWith(filter + "/") ||
									filter.startsWith(tag + "/")
							)
					);
					if (!hasTag) return null;
				}

				// Author filtering
				if (
					this.filterState.selectedAuthors.size > 0 &&
					benefit.author
				) {
					if (!this.filterState.selectedAuthors.has(benefit.author))
						return null;
				}

				// Source filtering
				if (
					this.filterState.selectedSources.size > 0 &&
					benefit.parentTitle
				) {
					if (
						!this.filterState.selectedSources.has(
							benefit.parentTitle
						)
					)
						return null;
				}

				return benefitWithMatches;
			})
			.filter(
				(benefit): benefit is BenefitWithMatches => benefit !== null
			);

		// Apply sorting
		this.applySorting();
	}

	/**
	 * Applies sorting to filtered benefits
	 */
	private applySorting(): void {
		this.filteredBenefits.sort((a, b) => {
			let aValue: any, bValue: any;

			switch (this.filterState.sortBy) {
				case "title":
					aValue = a.title;
					bValue = b.title;
					break;
				case "author":
					aValue = a.author || "";
					bValue = b.author || "";
					break;
				case "parentTitle":
					aValue = a.parentTitle || "";
					bValue = b.parentTitle || "";
					break;
				case "dateCreated":
					aValue = new Date(a.dateCreated).getTime();
					bValue = new Date(b.dateCreated).getTime();
					break;
				case "dateModified":
					aValue = a.dateModified
						? new Date(a.dateModified).getTime()
						: 0;
					bValue = b.dateModified
						? new Date(b.dateModified).getTime()
						: 0;
					break;
				default:
					return 0;
			}

			const direction = this.filterState.sortOrder === "asc" ? 1 : -1;

			if (aValue < bValue) return -1 * direction;
			if (aValue > bValue) return 1 * direction;
			return 0;
		});
	}

	/**
	 * Highlights multiple search terms in text
	 */
	private highlightMultipleTerms(text: string, terms: string[]): string {
		let result = text;

		terms.forEach((term) => {
			const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`(${escapedTerm})`, "gi");
			result = result.replace(
				regex,
				'<span class="library-benefit-highlight">$1</span>'
			);
		});

		return result;
	}

	/**
	 * Enhanced highlighting for single term (backwards compatibility)
	 */
	private highlightText(text: string, query: string): string {
		if (!query) return text;

		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(${escapedQuery})`, "gi");
		return text.replace(
			regex,
			'<span class="library-benefit-highlight">$1</span>'
		);
	}

	/**
	 * Renders the benefits list
	 */
	private renderBenefits(container: HTMLElement): void {
		// Remove existing benefits container
		const existingContainer = container.querySelector(
			".library-benefits-list"
		);
		if (existingContainer) {
			existingContainer.remove();
		}

		const benefitsContainer = container.createEl("div", {
			cls: "library-benefits-list",
		});

		// Calculate pagination
		const startIndex = (this.currentPage - 1) * this.itemsPerPage;
		const endIndex = startIndex + this.itemsPerPage;
		const paginatedBenefits = this.filteredBenefits.slice(
			startIndex,
			endIndex
		);

		if (paginatedBenefits.length === 0) {
			const emptyMessage = this.hasActiveFilters()
				? "لا توجد فوائد تطابق معايير البحث والفلترة المحددة"
				: "لا توجد فوائد";

			benefitsContainer.createEl("div", {
				text: emptyMessage,
				cls: "library-benefits-empty",
			});
			return;
		}

		// Render each benefit
		paginatedBenefits.forEach((benefit) => {
			this.renderBenefitCard(benefitsContainer, benefit);
		});

		// Add search highlight styles if not already present
		this.ensureHighlightStyles();
	}

	/**
	 * Ensures highlight styles are added to the document
	 */
	private ensureHighlightStyles(): void {
		const styleId = "library-benefit-highlight-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.library-benefit-highlight {
					background-color: rgba(255, 255, 0, 0.3);
					border-radius: 2px;
					padding: 0 2px;
					font-weight: bold;
				}
				.theme-dark .library-benefit-highlight {
					background-color: rgba(255, 255, 0, 0.25);
					color: #fff;
				}
				
				/* Enhanced filter styles */
				.library-benefits-filters-advanced {
					padding: 16px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 8px;
					margin-bottom: 16px;
				}
				
				.library-benefits-search-container {
					margin-bottom: 12px;
				}
				
				.library-benefits-search-wrapper {
					position: relative;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				
				.library-benefits-search-input {
					flex: 1;
					padding: 8px 12px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-normal);
				}
				
				.library-benefits-search-btn,
				.library-benefits-search-clear {
					padding: 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-muted);
					cursor: pointer;
				}
				
				.library-benefits-search-btn:hover,
				.library-benefits-search-clear:hover {
					background: var(--background-modifier-hover);
				}
				
				.library-benefits-sort-container {
					display: flex;
					align-items: center;
					gap: 16px;
					margin-bottom: 16px;
					padding: 8px 0;
					border-bottom: 1px solid var(--background-modifier-border);
				}
				
				.library-benefits-sort-group {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				
				.library-benefits-sort-label {
					font-size: 14px;
					color: var(--text-muted);
				}
				
				.library-benefits-sort-select {
					padding: 4px 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-normal);
				}
				
				.library-benefits-sort-order {
					padding: 6px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					cursor: pointer;
				}
				
				.library-benefits-sort-order:hover {
					background: var(--background-modifier-hover);
				}

				
				.library-benefits-results-summary {
					font-size: 12px;
					color: var(--text-muted);
					text-align: center;
					padding: 8px 0;
					border-top: 1px solid var(--background-modifier-border);
					margin-top: 12px;
				}

				/* Enhanced Dropdown Styles */
				.library-benefits-enhanced-dropdown {
					position: relative;
					display: inline-block;
					margin: 4px;
				}

				.library-benefits-filter-button.enhanced {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 8px 12px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 6px;
					background: var(--background-primary);
					color: var(--text-normal);
					cursor: pointer;
					font-size: 14px;
					transition: all 0.2s ease;
					min-width: 120px;
					justify-content: space-between;
				}

				.library-benefits-filter-button.enhanced:hover {
					background: var(--background-modifier-hover);
					border-color: var(--text-accent);
				}

				.library-benefits-filter-button.enhanced.active {
					background: var(--color-accent);
					color: var(--text-on-accent);
					border-color: var(--color-accent);
				}

				.library-benefits-filter-button.enhanced.open {
					border-bottom-left-radius: 0;
					border-bottom-right-radius: 0;
					border-bottom-color: transparent;
				}

				.filter-label {
					flex: 1;
					text-align: left;
				}

				.filter-count {
					background: var(--background-modifier-border);
					color: var(--text-normal);
					border-radius: 12px;
					padding: 2px 8px;
					font-size: 12px;
					font-weight: bold;
				}

				.library-benefits-filter-button.enhanced.active .filter-count {
					background: rgba(255, 255, 255, 0.3);
					color: var(--text-on-accent);
				}

				.filter-arrow {
					font-size: 10px;
					transition: transform 0.2s ease;
				}

				.library-benefits-filter-button.enhanced.open .filter-arrow {
					transform: rotate(180deg);
				}

				.library-benefits-dropdown-content {
					display: none;
					position: absolute;
					top: 100%;
					left: 0;
					right: 0;
					z-index: 1000;
					background: var(--background-primary);
					border: 1px solid var(--background-modifier-border);
					border-top: none;
					border-radius: 0 0 6px 6px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
					max-height: 300px;
					overflow: hidden;
				}

				.enhanced-dropdown-content {
					display: flex;
					flex-direction: column;
					width: fit-content;
				}

				.dropdown-search-container {
					padding: 8px;
					border-bottom: 1px solid var(--background-modifier-border);
					background: var(--background-secondary);
				}

				.dropdown-search-input {
					width: 100%;
					padding: 6px 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-normal);
					font-size: 14px;
				}

				.dropdown-search-input:focus {
					outline: none;
					border-color: var(--text-accent);
				}

				.dropdown-options {
					flex: 1;
					overflow-y: auto;
				}

				.dropdown-controls {
					display: flex;
					gap: 4px;
					padding: 8px;
					border-bottom: 1px solid var(--background-modifier-border);
					background: var(--background-secondary-alt);
				}

				.dropdown-control-btn {
					flex: 1;
					padding: 4px 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-muted);
					cursor: pointer;
					font-size: 12px;
					transition: all 0.2s ease;
				}

				.dropdown-control-btn:hover {
					background: var(--background-modifier-hover);
					color: var(--text-normal);
				}

				.dropdown-options-list {
					max-height: 200px;
					overflow-y: auto;
				}

				.dropdown-options-list.hierarchical {
					/* Additional styles for hierarchical lists */
				}

				.dropdown-option-item {
					display: flex;
					align-items: center;
					padding: 6px 12px;
					cursor: pointer;
					transition: background-color 0.2s ease;
					border-bottom: 1px solid var(--background-modifier-border-hover);
				}

				.dropdown-option-item:hover {
					background: var(--background-modifier-hover);
				}

				.dropdown-option-item.hierarchical.level-1 {
					padding-left: 24px;
				}

				.dropdown-option-item.hierarchical.level-2 {
					padding-left: 36px;
				}

				.dropdown-option-item.hierarchical.level-3 {
					padding-left: 48px;
				}

				.dropdown-checkbox {
					margin-right: 8px;
					cursor: pointer;
				}

				.dropdown-option-label {
					flex: 1;
					cursor: pointer;
					font-size: 14px;
					color: var(--text-normal);
				}

				.dropdown-option-label.hierarchical {
					/* Additional styles for hierarchical labels */
				}

				.dropdown-no-options {
					padding: 16px;
					text-align: center;
					color: var(--text-muted);
					font-style: italic;
				}

				/* Result count styling */
				.dropdown-option-count {
					color: var(--text-muted);
					font-size: 12px;
					font-weight: normal;
				}

				/* Dynamic filter indicators */
				.filter-button-disabled {
					opacity: 0.6;
					cursor: not-allowed;
				}

				.filter-button-no-results {
					border-color: var(--text-error);
					color: var(--text-error);
				}

				/* Scrollbar styling for dropdown */
				.dropdown-options-list::-webkit-scrollbar {
					width: 6px;
				}

				.dropdown-options-list::-webkit-scrollbar-track {
					background: var(--background-secondary);
				}

				.dropdown-options-list::-webkit-scrollbar-thumb {
					background: var(--background-modifier-border);
					border-radius: 3px;
				}

				.dropdown-options-list::-webkit-scrollbar-thumb:hover {
					background: var(--text-muted);
				}
			`;
			document.head.appendChild(style);
		}
	}

	/**
	 * Renders a single benefit card (keeping existing implementation)
	 */
	private renderBenefitCard(
		container: HTMLElement,
		benefit: BenefitWithMatches
	): void {
		const card = container.createEl("div", {
			cls: "library-benefit-card",
		});

		// Header with title and actions
		const header = card.createEl("div", {
			cls: "library-benefit-header",
		});

		// Render title with highlighting if matched
		const title = header.createEl("h3", {
			cls: "library-benefit-title",
		});

		if (benefit.matches?.title) {
			title.innerHTML = benefit.matches.title;
		} else {
			title.textContent = benefit.title;
		}

		const actions = header.createEl("div", {
			cls: "library-benefit-actions",
		});

		// Share button
		const shareBtn = actions.createEl("button", {
			cls: "library-benefit-action",
			attr: { title: "مشاركة" },
		});
		setIcon(shareBtn, "share-2");
		shareBtn.addEventListener("click", () => {
			new BenefitShareModal(
				this.props.app,
				this.props.plugin,
				benefit
			).open();
		});

		// Edit button
		const editBtn = actions.createEl("button", {
			cls: "library-benefit-action",
			attr: { title: "تعديل" },
		});
		setIcon(editBtn, "pencil");
		editBtn.addEventListener("click", () => {
			this.props.onEditBenefit(benefit);
		});

		// Delete button
		const deleteBtn = actions.createEl("button", {
			cls: "library-benefit-action library-benefit-action-danger",
			attr: { title: "حذف" },
		});
		setIcon(deleteBtn, "trash-2");
		deleteBtn.addEventListener("click", () => {
			if (confirm("هل أنت متأكد من حذف هذه الفائدة؟")) {
				this.props.onDeleteBenefit(benefit);
			}
		});

		// Metadata
		const metadata = card.createEl("div", {
			cls: "library-benefit-metadata",
		});

		// Source info
		const source = metadata.createEl("div", {
			cls: "library-benefit-source",
		});

		const sourceLink = source.createEl("a", {
			cls: "library-benefit-source-link",
		});

		if (benefit.matches?.parentTitle) {
			sourceLink.innerHTML = benefit.matches.parentTitle;
		} else {
			sourceLink.textContent = benefit.parentTitle || "غير معروف";
		}

		sourceLink.addEventListener("click", (e) => {
			e.preventDefault();
			this.props.app.workspace.openLinkText(benefit.filePath, "", false);
		});

		if (benefit.author) {
			const authorSpan = source.createEl("span", {
				cls: "library-benefit-author",
			});

			if (benefit.matches?.author) {
				authorSpan.innerHTML = ` - ${benefit.matches.author}`;
			} else {
				authorSpan.textContent = ` - ${benefit.author}`;
			}
		}

		// Location info (page/timestamp)
		const location = metadata.createEl("div", {
			cls: "library-benefit-location",
		});

		if (benefit.contentType === "book" && benefit.pageNumber) {
			let locationText = `الصفحة: ${benefit.pageNumber}`;
			if (benefit.volumeNumber) {
				locationText = `المجلد: ${benefit.volumeNumber} - ${locationText}`;
			}
			location.createEl("span", { text: locationText });
		} else if (benefit.contentType === "video" && benefit.timestamp) {
			const formatted = this.formatTimestamp(benefit.timestamp);
			location.createEl("span", { text: `الوقت: ${formatted}` });
		}

		// Categories and tags
		if (benefit.categories.length > 0 || benefit.tags.length > 0) {
			const chips = metadata.createEl("div", {
				cls: "library-benefit-chips",
			});

			benefit.categories.forEach((category) => {
				chips.createEl("span", {
					text: category,
					cls: "library-benefit-chip library-benefit-category",
				});
			});

			benefit.tags.forEach((tag) => {
				chips.createEl("span", {
					text: tag,
					cls: "library-benefit-chip library-benefit-tag",
				});
			});
		}

		// Benefit text
		const textContainer = card.createEl("div", {
			cls: "library-benefit-text",
		});

		const textEl = textContainer.createEl("div", {
			cls: "library-benefit-content",
		});

		if (benefit.matches?.text) {
			textEl.innerHTML = this.renderSimpleMarkdown(benefit.matches.text);
		} else {
			textEl.innerHTML = this.renderSimpleMarkdown(benefit.text);
		}

		// Date info
		const dateInfo = card.createEl("div", {
			cls: "library-benefit-date",
		});

		dateInfo.createEl("span", {
			text: `أضيفت: ${formatDate(
				new Date(benefit.dateCreated),
				"YYYY-MM-DD"
			)}`,
			cls: "library-benefit-date-created",
		});

		if (benefit.dateModified) {
			dateInfo.createEl("span", {
				text: ` • عُدلت: ${formatDate(
					new Date(benefit.dateModified),
					"YYYY-MM-DD"
				)}`,
				cls: "library-benefit-date-modified",
			});
		}
	}

	/**
	 * Renders pagination controls
	 */
	private renderPagination(container: HTMLElement): void {
		const existingPagination = container.querySelector(
			".library-benefits-pagination"
		);
		if (existingPagination) {
			existingPagination.remove();
		}

		if (this.filteredBenefits.length <= this.itemsPerPage) {
			return;
		}

		const totalPages = Math.ceil(
			this.filteredBenefits.length / this.itemsPerPage
		);

		const pagination = container.createEl("div", {
			cls: "library-benefits-pagination",
		});

		// Previous button
		const prevBtn = pagination.createEl("button", {
			text: "السابق",
			cls: "library-pagination-btn",
			attr: { disabled: this.currentPage === 1 ? "true" : null },
		});

		prevBtn.addEventListener("click", () => {
			if (this.currentPage > 1) {
				this.currentPage--;
				this.renderBenefits(this.container!);
				this.renderPagination(this.container!);
			}
		});

		// Page info with jump controls
		const pageInfo = pagination.createEl("div", {
			cls: "library-pagination-info-extended",
		});

		// Page jump input
		const pageInput = pageInfo.createEl("input", {
			type: "number",
			value: this.currentPage.toString(),
			attr: { min: "1", max: totalPages.toString() },
			cls: "library-pagination-jump",
		});

		pageInfo.createEl("span", {
			text: ` من ${totalPages} | عرض ${this.filteredBenefits.length} فائدة`,
		});

		pageInput.addEventListener("change", () => {
			const newPage = parseInt(pageInput.value);
			if (newPage >= 1 && newPage <= totalPages) {
				this.currentPage = newPage;
				this.renderBenefits(this.container!);
				this.renderPagination(this.container!);
			}
		});

		// Next button
		const nextBtn = pagination.createEl("button", {
			text: "التالي",
			cls: "library-pagination-btn",
			attr: { disabled: this.currentPage === totalPages ? "true" : null },
		});

		nextBtn.addEventListener("click", () => {
			if (this.currentPage < totalPages) {
				this.currentPage++;
				this.renderBenefits(this.container!);
				this.renderPagination(this.container!);
			}
		});
	}

	/**
	 * Simple markdown renderer with preservation of HTML for highlighting
	 */
	private renderSimpleMarkdown(text: string): string {
		return text
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
			.replace(/\n/g, "<br>");
	}

	/**
	 * Formats timestamp
	 */
	private formatTimestamp(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, "0")}`;
		}
	}

	/**
	 * Checks if any filters are active
	 */
	private hasActiveFilters(): boolean {
		return (
			this.filterState.searchQuery !== "" ||
			this.filterState.selectedCategories.size > 0 ||
			this.filterState.selectedTags.size > 0 ||
			this.filterState.selectedAuthors.size > 0 ||
			this.filterState.selectedSources.size > 0 ||
			this.filterState.dateRange.from !== null ||
			this.filterState.dateRange.to !== null
		);
	}

	/**
	 * Clears all filters
	 */
	private clearAllFilters(): void {
		this.filterState = {
			searchQuery: "",
			selectedCategories: new Set(),
			selectedTags: new Set(),
			selectedAuthors: new Set(),
			selectedSources: new Set(),
			dateRange: { from: null, to: null },
			sortBy: "dateCreated",
			sortOrder: "desc",
		};

		if (this.searchInput) {
			this.searchInput.value = "";
		}
	}

	/**
	 * Updates the view with new benefits
	 */
	public updateBenefits(benefits: BenefitItem[]): void {
		this.props.benefits = benefits;
		this.initializeAvailableOptions();
		this.filteredBenefits = [...benefits];
		this.applyFilters();
		if (this.container) {
			this.render(this.container);
		}
	}

	/**
	 * Cleans up the component
	 */
	public destroy(): void {
		// Clear search timeout
		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}

		// Close any open dropdowns
		document
			.querySelectorAll(".library-benefits-dropdown-content")
			.forEach((el) => {
				(el as HTMLElement).style.display = "none";
			});

		this.container = null;
		this.searchInput = null;
	}
}
