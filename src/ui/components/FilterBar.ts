/**
 * Filter bar component for content filtering with Unified Custom Date Picker
 */
import { SearchComponent } from "obsidian";
import { ContentComponentProps } from "../../core/uiTypes";
import { FilterState, FilterStateEvents } from "../../core/state/FilterState";
import { CONTENT_TYPE } from "src/core/constants";
import {
	formatDate,
	parseDate,
	getCurrentDateString,
} from "../../utils/dateUtils";
import { CustomDatePicker, CalendarType } from "./CustomDatePicker";
import moment from "moment-hijri";

/**
 * Props for FilterBar component
 */
interface FilterBarProps extends ContentComponentProps {
	/** Filter state to manage */
	filterState: FilterState;

	/** Callback when filters change */
	onFilterChange: () => Promise<void>;

	/** Available presenters */
	presenters: string[];

	authors: string[];

	/** Available categories */
	categories: string[];

	/** Available tags */
	tags: string[];

	/** Whether to use dynamic filtering */
	useDynamicFiltering?: boolean;
}

/**
 * Filter bar component for content filtering
 */
export class FilterBar {
	private props: FilterBarProps;
	private container: HTMLElement | null = null;
	private searchInput: SearchComponent | null = null;
	private activeDropdown: string | null = null;
	private searchTimeout: number | null = null;

	// References for UI updates
	private dropdowns: Map<string, HTMLElement> = new Map();
	private optionsContainers: Map<string, HTMLElement> = new Map();
	private selectedFiltersContainer: HTMLElement | null = null;

	// Date picker references
	private fromDatePicker: CustomDatePicker | null = null;
	private toDatePicker: CustomDatePicker | null = null;

	// State unsubscribe functions
	private stateUnsubscribes: (() => void)[] = [];

	/**
	 * Creates a new FilterBar component
	 * @param props Component props
	 */
	constructor(props: FilterBarProps) {
		this.props = props;

		// Subscribe to filter state changes to update UI
		const unsubscribeFilter = this.props.filterState.subscribe(
			FilterStateEvents.FILTER_UPDATED,
			() => {
				this.updateFilteredFiltersDisplay();
			}
		);
		this.stateUnsubscribes.push(unsubscribeFilter);

		// Subscribe to available options updates if using dynamic filtering
		if (props.useDynamicFiltering) {
			const unsubscribeOptions = this.props.filterState.subscribe(
				FilterStateEvents.OPTIONS_UPDATED,
				() => {
					this.updateFilterOptions();
				}
			);

			this.stateUnsubscribes.push(unsubscribeOptions);
		}
	}

	/**
	 * Renders the filter bar
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Create filter bar for content type
		this.renderFilterBar(container);

		// Create selected filters display
		this.renderSelectedFilters(container);
	}

	/**
	 * Renders the main filter bar
	 * @param container Container element
	 */
	private renderFilterBar(container: HTMLElement): void {
		const filterBar = container.createEl("div", {
			cls: "library-filter-bar",
		});

		const filterState = this.props.filterState.getState();

		// Status filter
		this.createMultiSelectFilter(
			filterBar,
			"الحالة",
			"status",
			this.props.contentType === CONTENT_TYPE.BOOK
				? this.props.settings.bookTracking.statusOptions || []
				: this.props.settings.videoTracking.statusOptions || [],
			filterState.statuses
		);

		// Handle presenter or author based on content type
		if (this.props.contentType === CONTENT_TYPE.BOOK) {
			// Author filter for books
			this.createMultiSelectFilter(
				filterBar,
				"المؤلف",
				"author", // Use author as the filter type
				this.props.authors || [], // Use authors prop
				filterState.authors // Use authors array in filter state
			);
		} else {
			// Presenter filter for videos
			this.createMultiSelectFilter(
				filterBar,
				"الملقي",
				"presenter",
				this.props.presenters || [],
				filterState.presenters
			);
		}

		// Type filter - only for video content type
		if (this.props.contentType !== CONTENT_TYPE.BOOK) {
			this.createMultiSelectFilter(
				filterBar,
				"النوع",
				"type",
				["مقطع", "سلسلة"],
				filterState.types
			);
		}

		// Categories filter
		this.createMultiSelectFilter(
			filterBar,
			"التصنيفات",
			"category",
			this.props.categories || [],
			filterState.categories
		);

		// Tags filter
		this.createMultiSelectFilter(
			filterBar,
			"الوسوم",
			"tag",
			this.props.tags || [],
			filterState.tags
		);

		// Date range filter
		this.renderDateRangeFilter(filterBar);

		// Search bar
		this.renderSearchBar(filterBar);
	}

	/**
	 * Renders the date range filter with custom date pickers
	 * @param container Filter bar container
	 */
	private renderDateRangeFilter(container: HTMLElement): void {
		const filterState = this.props.filterState.getState();
		const hijriSettings = this.props.settings.hijriCalendar;
		const useHijri = hijriSettings.useHijriCalendar;

		const dateFilter = container.createEl("div", {
			cls: "library-filter-group",
		});

		// Create label with calendar type indicator
		const labelText = useHijri
			? `تاريخ الإضافة ${hijriSettings.showCalendarType ? "(هـ)" : ""}`
			: `تاريخ الإضافة ${hijriSettings.showCalendarType ? "(م)" : ""}`;

		dateFilter.createEl("label", {
			text: labelText,
			cls: "library-filter-label",
		});

		const dateContainer = dateFilter.createEl("div", {
			cls: "library-date-range",
		});

		// Always use custom date pickers
		this.createCustomDatePickers(dateContainer, filterState, useHijri);
	}

	/**
	 * Creates custom date pickers for both calendar types
	 * @param container Date container element
	 * @param filterState Current filter state
	 * @param useHijri Whether to use Hijri calendar
	 */
	private createCustomDatePickers(
		container: HTMLElement,
		filterState: any,
		useHijri: boolean
	): void {
		const hijriSettings = this.props.settings.hijriCalendar;
		const calendarType: CalendarType = useHijri ? "hijri" : "gregorian";
		const format = useHijri
			? hijriSettings.hijriFormat
			: hijriSettings.gregorianFormat;

		// From date picker
		const fromContainer = container.createEl("div", {
			cls: "library-date-container",
		});

		fromContainer.createEl("label", {
			text: "من:",
			cls: "library-date-label",
		});

		const fromPickerContainer = fromContainer.createEl("div", {
			cls: "library-date-picker-wrapper",
		});

		// Convert initial value if needed
		let initialFromValue = "";
		if (filterState.dateRange.from) {
			if (useHijri) {
				initialFromValue = this.convertGregorianToHijri(
					filterState.dateRange.from
				);
			} else {
				initialFromValue = filterState.dateRange.from;
			}
		}

		this.fromDatePicker = new CustomDatePicker(fromPickerContainer, {
			calendarType: calendarType,
			value: initialFromValue,
			format: format,
			placeholder: `اختر تاريخ البداية ${useHijri ? "(هـ)" : "(م)"}`,
			onChange: (date: string) => {
				this.handleDateChange("from", date, useHijri);
			},
			className: "library-filter-date-input",
		});

		// To date picker
		const toContainer = container.createEl("div", {
			cls: "library-date-container",
		});

		toContainer.createEl("label", {
			text: "إلى:",
			cls: "library-date-label",
		});

		const toPickerContainer = toContainer.createEl("div", {
			cls: "library-date-picker-wrapper",
		});

		// Convert initial value if needed
		let initialToValue = "";
		if (filterState.dateRange.to) {
			if (useHijri) {
				initialToValue = this.convertGregorianToHijri(
					filterState.dateRange.to
				);
			} else {
				initialToValue = filterState.dateRange.to;
			}
		}

		this.toDatePicker = new CustomDatePicker(toPickerContainer, {
			calendarType: calendarType,
			value: initialToValue,
			format: format,
			placeholder: `اختر تاريخ النهاية ${useHijri ? "(هـ)" : "(م)"}`,
			onChange: (date: string) => {
				this.handleDateChange("to", date, useHijri);
			},
			className: "library-filter-date-input",
		});

		// Add tooltip with both calendars if enabled
		if (hijriSettings.showBothInTooltips) {
			this.addDateTooltips();
		}
	}

	/**
	 * Handles date changes from custom date pickers
	 * @param type Whether it's "from" or "to" date
	 * @param dateValue Date value from picker
	 * @param isHijri Whether the date is in Hijri calendar
	 */
	private handleDateChange(
		type: "from" | "to",
		dateValue: string,
		isHijri: boolean
	): void {
		const filterState = this.props.filterState.getState();

		// Convert to Gregorian for internal storage if needed
		let gregorianValue = "";
		if (dateValue) {
			if (isHijri) {
				try {
					gregorianValue = this.convertHijriToGregorian(dateValue);
				} catch (error) {
					console.warn("Invalid Hijri date:", dateValue);
					return;
				}
			} else {
				gregorianValue = dateValue;
			}
		}

		// Update filter state
		const newDateRange = { ...filterState.dateRange };
		newDateRange[type] = gregorianValue;

		this.props.filterState.updateState({
			dateRange: newDateRange,
			page: 1,
		});
		this.props.onFilterChange();
	}

	/**
	 * Converts Gregorian date string to Hijri
	 * @param gregorianDate Gregorian date in YYYY-MM-DD format
	 * @returns Hijri date string
	 */
	private convertGregorianToHijri(gregorianDate: string): string {
		if (!gregorianDate) return "";

		try {
			const date = moment(gregorianDate, "YYYY-MM-DD");
			return date.format(this.props.settings.hijriCalendar.hijriFormat);
		} catch (error) {
			console.warn("Error converting Gregorian to Hijri:", error);
			return "";
		}
	}

	/**
	 * Converts Hijri date string to Gregorian
	 * @param hijriDate Hijri date string
	 * @returns Gregorian date in YYYY-MM-DD format
	 */
	private convertHijriToGregorian(hijriDate: string): string {
		if (!hijriDate) return "";

		try {
			const date = moment(
				hijriDate,
				this.props.settings.hijriCalendar.hijriFormat
			);
			if (!date.isValid()) {
				throw new Error("Invalid Hijri date");
			}
			return date.format("YYYY-MM-DD");
		} catch (error) {
			console.warn("Error converting Hijri to Gregorian:", error);
			throw error;
		}
	}

	/**
	 * Adds tooltips showing both calendar systems for date pickers
	 */
	private addDateTooltips(): void {
		if (!this.fromDatePicker || !this.toDatePicker) return;

		// Note: Tooltip implementation would need to be integrated into the CustomDatePicker class
		// This is a placeholder for the tooltip functionality
		// In practice, you would extend the CustomDatePicker to support tooltips internally
	}

	/**
	 * Renders the search bar
	 * @param container Filter bar container
	 */
	private renderSearchBar(container: HTMLElement): void {
		const filterState = this.props.filterState.getState();

		const searchContainer = container.createEl("div", {
			cls: "library-search-container",
		});

		this.searchInput = new SearchComponent(searchContainer);

		this.searchInput.setPlaceholder("بحث...");
		this.searchInput.setValue(filterState.searchQuery);

		// Use debounce to prevent too many renders during typing
		this.searchInput.onChange(
			this.debounce((value: string) => {
				this.props.filterState.updateState({
					searchQuery: value,
					page: 1,
				});
				this.props.onFilterChange();
			}, 300)
		);
	}

	/**
	 * Creates a multi-select filter dropdown
	 * @param container Filter bar container
	 * @param label Filter label
	 * @param type Filter type identifier
	 * @param options Available options
	 * @param selectedValues Currently selected values
	 */
	private createMultiSelectFilter(
		container: HTMLElement,
		label: string,
		type: string,
		options: string[],
		selectedValues: string[]
	): void {
		const filterGroup = container.createEl("div", {
			cls: "library-filter-group",
		});

		filterGroup.createEl("label", {
			text: label,
			cls: "library-filter-label",
		});

		const selectContainer = filterGroup.createEl("div", {
			cls: "library-multi-select-container",
		});

		// Search input (acts as dropdown toggle)
		const searchInput = selectContainer.createEl("input", {
			type: "text",
			cls: "library-multi-select-search",
			placeholder: "اختر...",
		});

		searchInput.addEventListener(
			"input",
			this.debounce(() => {
				const searchTerm = searchInput.value.toLowerCase();
				this.filterOptions(optionsContainer, searchTerm);

				// Keep the dropdown open while typing
				if (this.activeDropdown !== type) {
					this.closeAllDropdowns();
					this.activeDropdown = type;
					optionsContainer.style.display = "block";
				}
			}, 100)
		);

		// Options container (dropdown)
		const optionsContainer = selectContainer.createEl("div", {
			cls: "library-multi-select-options",
		});
		optionsContainer.style.display = "none";

		// Store references for efficient updates
		this.dropdowns.set(type, selectContainer);
		this.optionsContainers.set(type, optionsContainer);

		// Ensure options are unique and valid
		let validOptions: string[] = [];

		// Add mapping from singular to plural form for filter types
		const typeMapping: Record<string, string> = {
			status: "statuses",
			presenter: "presenters",
			author: "authors",
			type: "types",
			category: "categories",
			tag: "tags",
		};

		// Use dynamic options if enabled and available
		if (this.props.useDynamicFiltering) {
			// Use the mapped type for looking up options
			const mappedType = typeMapping[type] || type;
			const dynamicOptions = this.props.filterState.getAvailableOptions(
				mappedType as any
			);

			// Merge with selected values to ensure selected items are always shown
			const mergedOptions = [
				...new Set([...dynamicOptions, ...selectedValues]),
			];

			validOptions = mergedOptions
				.map((opt) => String(opt || ""))
				.filter((opt) => opt.trim() !== "");
		} else {
			// Use the original options if dynamic filtering is not enabled
			validOptions = [
				...new Set(
					options
						.map((opt) => String(opt || ""))
						.filter((opt) => opt.trim() !== "")
				),
			];
		}

		// Render different types of options
		if (type === "tag") {
			this.renderHierarchicalOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		} else if (type === "category") {
			this.renderHierarchicalOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		} else {
			// For other filters, use flat options
			this.renderFlatOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		}

		// Update input placeholder to show selection status
		this.updateSelectionDisplay(searchInput, selectedValues);

		// Toggle dropdown visibility
		searchInput.addEventListener("click", (e) => {
			e.stopPropagation();

			if (this.activeDropdown === type) {
				this.activeDropdown = null;
				optionsContainer.style.display = "none";
			} else {
				this.closeAllDropdowns();
				this.activeDropdown = type;
				optionsContainer.style.display = "block";
			}
		});

		// Add a search field inside dropdown for large option lists
		if (validOptions.length > 10) {
			const filterInput = optionsContainer.createEl("input", {
				type: "text",
				cls: "library-option-filter",
				placeholder: "تصفية...",
			});

			filterInput.addEventListener("click", (e) => {
				e.stopPropagation();
			});

			filterInput.addEventListener(
				"input",
				this.debounce(() => {
					const searchTerm = filterInput.value.toLowerCase();
					this.filterOptions(optionsContainer, searchTerm);
				}, 100)
			);
		}

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!selectContainer.contains(e.target as Node)) {
				optionsContainer.style.display = "none";
				if (this.activeDropdown === type) {
					this.activeDropdown = null;
				}
			}
		});
	}

	/**
	 * Filters options in a dropdown based on search term
	 * @param container Options container
	 * @param searchTerm Search term to filter by
	 */
	private filterOptions(container: HTMLElement, searchTerm: string): void {
		container
			.querySelectorAll(".library-multi-select-option")
			.forEach((option) => {
				const text =
					option
						.querySelector(".library-multi-select-option-text")
						?.textContent?.toLowerCase() || "";
				const value =
					option.getAttribute("data-value")?.toLowerCase() || "";
				const isVisible =
					text.includes(searchTerm) || value.includes(searchTerm);

				(option as HTMLElement).style.display = isVisible
					? "flex"
					: "none";

				// Handle hierarchical options
				if (option.classList.contains("library-parent-option")) {
					const parentValue = option.getAttribute("data-value") || "";
					const children = container.querySelectorAll(
						`.library-child-option[data-value^="${parentValue}/"]`
					);

					if (!isVisible) {
						// Hide all children when parent is hidden
						children.forEach((child) => {
							(child as HTMLElement).style.display = "none";
						});
					} else {
						// Check children separately when parent is visible
						children.forEach((child) => {
							const childText =
								child
									.querySelector(
										".library-multi-select-option-text"
									)
									?.textContent?.toLowerCase() || "";
							const childValue =
								child
									.getAttribute("data-value")
									?.toLowerCase() || "";

							(child as HTMLElement).style.display =
								childText.includes(searchTerm) ||
								childValue.includes(searchTerm)
									? "flex"
									: "none";
						});
					}
				}
			});
	}

	/**
	 * Renders flat (non-hierarchical) options
	 * @param container Options container
	 * @param options Available options
	 * @param selectedValues Currently selected values
	 * @param type Filter type
	 */
	private renderFlatOptions(
		container: HTMLElement,
		options: string[],
		selectedValues: string[],
		type: string
	): void {
		options.sort().forEach((option) => {
			const optionEl = container.createEl("label", {
				cls: "library-multi-select-option",
				attr: { "data-value": option },
			});

			const checkbox = optionEl.createEl("input", {
				type: "checkbox",
				value: option,
			});
			checkbox.checked = selectedValues.includes(option);

			optionEl.createEl("span", {
				text: option,
				cls: "library-multi-select-option-text",
			});

			// Handle checkbox change
			checkbox.addEventListener("change", (e) => {
				e.stopPropagation();
				this.handleCheckboxChange(
					checkbox,
					option,
					selectedValues,
					type
				);
			});
		});
	}

	/**
	 * Renders hierarchical options (for tags and categories)
	 * @param container Options container
	 * @param options Available options
	 * @param selectedValues Currently selected values
	 * @param type Filter type
	 */
	private renderHierarchicalOptions(
		container: HTMLElement,
		options: string[],
		selectedValues: string[],
		type: string
	): void {
		// Create a hierarchical structure
		const hierarchy = this.organizeHierarchicalOptions(options);

		// Render parents first, then children
		Object.keys(hierarchy)
			.sort()
			.forEach((parent) => {
				// Add parent option
				const parentOptionEl = container.createEl("label", {
					cls: "library-multi-select-option library-parent-option",
					attr: { "data-value": parent },
				});

				const parentCheckbox = parentOptionEl.createEl("input", {
					type: "checkbox",
					value: parent,
				});
				parentCheckbox.checked = selectedValues.includes(parent);

				parentOptionEl.createEl("span", {
					text: parent,
					cls: "library-multi-select-option-text",
				});

				// Handle checkbox change for parent
				parentCheckbox.addEventListener("change", (e) => {
					e.stopPropagation();
					this.handleCheckboxChange(
						parentCheckbox,
						parent,
						selectedValues,
						type
					);
				});

				// If this parent has children, add them with indentation
				const children = hierarchy[parent];
				if (children && children.length > 0) {
					children.sort().forEach((child) => {
						const fullChildPath = `${parent}/${child}`;
						const childOptionEl = container.createEl("label", {
							cls: "library-multi-select-option library-child-option",
							attr: { "data-value": fullChildPath },
						});

						const childCheckbox = childOptionEl.createEl("input", {
							type: "checkbox",
							value: fullChildPath,
						});
						childCheckbox.checked =
							selectedValues.includes(fullChildPath);

						childOptionEl.createEl("span", {
							text: `– ${child}`,
							cls: "library-multi-select-option-text",
						});

						// Handle checkbox change for child
						childCheckbox.addEventListener("change", (e) => {
							e.stopPropagation();
							this.handleCheckboxChange(
								childCheckbox,
								fullChildPath,
								selectedValues,
								type
							);
						});
					});
				}
			});
	}

	/**
	 * Organizes hierarchical options (tags/categories)
	 * @param options Flat array of options
	 * @returns Object mapping parent options to arrays of child options
	 */
	private organizeHierarchicalOptions(
		options: string[]
	): Record<string, string[]> {
		const hierarchy: Record<string, string[]> = {};

		options.forEach((option) => {
			const parts = option.split("/");
			if (parts.length > 1) {
				// This is a hierarchical option
				const parent = parts[0];
				const child = parts.slice(1).join("/"); // Handle deeper hierarchies

				if (!hierarchy[parent]) {
					hierarchy[parent] = [];
				}
				hierarchy[parent].push(child);
			} else {
				// Top-level option
				if (!hierarchy[option]) {
					hierarchy[option] = [];
				}
			}
		});

		return hierarchy;
	}

	/**
	 * Handles checkbox change in multi-select filters
	 * @param checkbox Checkbox element
	 * @param option Option value
	 * @param selectedValues Array of selected values to update
	 * @param type Filter type
	 */
	private handleCheckboxChange(
		checkbox: HTMLInputElement,
		option: string,
		selectedValues: string[],
		type: string
	): void {
		if (checkbox.checked) {
			if (!selectedValues.includes(option)) {
				selectedValues.push(option);
			}
		} else {
			const index = selectedValues.indexOf(option);
			if (index > -1) {
				selectedValues.splice(index, 1);
			}
		}

		// Update filter state based on filter type
		let updateObj: any = { page: 1 };

		if (type === "status") updateObj.statuses = selectedValues;
		else if (type === "presenter") updateObj.presenters = selectedValues;
		else if (type === "author")
			updateObj.authors = selectedValues; // Add handler for author filter
		else if (type === "type") updateObj.types = selectedValues;
		else if (type === "category") updateObj.categories = selectedValues;
		else if (type === "tag") updateObj.tags = selectedValues;

		this.props.filterState.updateState(updateObj);

		// Update display in the input field
		const dropdown = this.dropdowns.get(type);
		if (dropdown) {
			const searchInput = dropdown.querySelector(
				".library-multi-select-search"
			) as HTMLInputElement;
			if (searchInput) {
				this.updateSelectionDisplay(searchInput, selectedValues);
			}
		}

		// Notify about filter change
		this.props.onFilterChange();
	}

	/**
	 * Updates the display text in multi-select dropdowns
	 * @param input Input element to update
	 * @param selectedValues Selected values array
	 */
	private updateSelectionDisplay(
		input: HTMLInputElement,
		selectedValues: string[]
	): void {
		if (selectedValues.length === 0) {
			input.placeholder = "اختر...";
			input.value = "";
		} else if (selectedValues.length === 1) {
			input.placeholder = selectedValues[0];
			input.value = "";
		} else {
			input.placeholder = `${selectedValues.length} مختارة`;
			input.value = "";
		}
	}

	/**
	 * Updates the UI when filter state changes
	 * This is called from the filter state subscription
	 */
	private updateFilteredFiltersDisplay(): void {
		if (this.container) {
			// Update the selected filters display
			this.renderSelectedFilters(this.container);

			// Update date inputs/pickers to reflect current state
			const filterState = this.props.filterState.getState();
			this.updateDateInputs(filterState);

			// Update each dropdown display and its checkboxes
			this.dropdowns.forEach((dropdown, type) => {
				const searchInput = dropdown.querySelector(
					".library-multi-select-search"
				) as HTMLInputElement;

				if (searchInput) {
					// Get the correct array of selected values based on filter type
					let selectedValues: string[] = [];
					if (type === "status")
						selectedValues = filterState.statuses;
					else if (type === "presenter")
						selectedValues = filterState.presenters;
					else if (type === "author")
						selectedValues = filterState.authors;
					else if (type === "type")
						selectedValues = filterState.types;
					else if (type === "category")
						selectedValues = filterState.categories;
					else if (type === "tag") selectedValues = filterState.tags;

					// Update the display text
					this.updateSelectionDisplay(searchInput, selectedValues);

					// Update checkbox states
					const options = dropdown.querySelectorAll(
						"input[type=checkbox]"
					);

					options.forEach((option) => {
						const value = (option as HTMLInputElement).value;
						(option as HTMLInputElement).checked =
							selectedValues.includes(value);
					});
				}
			});
		}
	}

	/**
	 * Updates date pickers when filter state changes
	 * @param filterState Current filter state
	 */
	private updateDateInputs(filterState: any): void {
		if (!this.fromDatePicker || !this.toDatePicker) return;

		const hijriSettings = this.props.settings.hijriCalendar;
		const useHijri = hijriSettings.useHijriCalendar;

		// Convert and update values based on current calendar type
		let fromValue = "";
		let toValue = "";

		if (filterState.dateRange.from) {
			fromValue = useHijri
				? this.convertGregorianToHijri(filterState.dateRange.from)
				: filterState.dateRange.from;
		}

		if (filterState.dateRange.to) {
			toValue = useHijri
				? this.convertGregorianToHijri(filterState.dateRange.to)
				: filterState.dateRange.to;
		}

		this.fromDatePicker.setValue(fromValue);
		this.toDatePicker.setValue(toValue);
	}

	/**
	 * Renders the selected filters as chips
	 * @param container Container element
	 */
	public renderSelectedFilters(container: HTMLElement): void {
		// Clean up existing container if any
		if (this.selectedFiltersContainer) {
			this.selectedFiltersContainer.remove();
		}

		// Create container for selected filters
		this.selectedFiltersContainer = container.createEl("div", {
			cls: "library-selected-filters",
		});

		const filterState = this.props.filterState.getState();

		// Check if any filters are applied
		const hasFilters =
			filterState.statuses.length > 0 ||
			filterState.presenters.length > 0 ||
			filterState.authors.length > 0 ||
			filterState.types.length > 0 ||
			filterState.categories.length > 0 ||
			filterState.tags.length > 0 ||
			filterState.dateRange.from ||
			filterState.dateRange.to ||
			filterState.searchQuery;

		if (!hasFilters) {
			this.selectedFiltersContainer.style.display = "none";
			return;
		}

		// Label for applied filters
		const filtersLabel = this.selectedFiltersContainer.createEl("div", {
			cls: "library-selected-filters-label",
			text: "الفلاتر المطبقة:",
		});

		const filtersList = this.selectedFiltersContainer.createEl("div", {
			cls: "library-selected-filters-list",
		});

		// Status filters
		filterState.statuses.forEach((status: string) => {
			this.createFilterBadge(filtersList, "الحالة", status, () => {
				const updatedStatuses = filterState.statuses.filter(
					(s: string) => s !== status
				);
				this.props.filterState.updateState({
					statuses: updatedStatuses,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Presenter filters
		filterState.presenters.forEach((presenter: string) => {
			this.createFilterBadge(filtersList, "الملقي", presenter, () => {
				const updatedPresenters = filterState.presenters.filter(
					(p: string) => p !== presenter
				);
				this.props.filterState.updateState({
					presenters: updatedPresenters,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		filterState.authors.forEach((author: string) => {
			this.createFilterBadge(filtersList, "المؤلف", author, () => {
				const updatedAuthors = filterState.authors.filter(
					(p: string) => p !== author
				);
				this.props.filterState.updateState({
					authors: updatedAuthors,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Type filters
		filterState.types.forEach((type: string) => {
			this.createFilterBadge(filtersList, "النوع", type, () => {
				const updatedTypes = filterState.types.filter(
					(t: string) => t !== type
				);
				this.props.filterState.updateState({
					types: updatedTypes,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Category filters
		filterState.categories.forEach((category: string) => {
			this.createCategoryFilterBadge(filtersList, category, () => {
				const updatedCategories = filterState.categories.filter(
					(c: string) => c !== category
				);
				this.props.filterState.updateState({
					categories: updatedCategories,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Tag filters
		filterState.tags.forEach((tag: string) => {
			this.createTagFilterBadge(filtersList, tag, () => {
				const updatedTags = filterState.tags.filter(
					(t: string) => t !== tag
				);
				this.props.filterState.updateState({
					tags: updatedTags,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Date range filter - Display dates in the user's preferred calendar
		if (filterState.dateRange.from || filterState.dateRange.to) {
			const hijriSettings = this.props.settings.hijriCalendar;
			const useHijri = hijriSettings.useHijriCalendar;

			let fromText = "البداية";
			let toText = "النهاية";

			if (filterState.dateRange.from) {
				fromText = useHijri
					? this.convertGregorianToHijri(filterState.dateRange.from)
					: filterState.dateRange.from;
			}

			if (filterState.dateRange.to) {
				toText = useHijri
					? this.convertGregorianToHijri(filterState.dateRange.to)
					: filterState.dateRange.to;
			}

			const dateText = `${fromText} إلى ${toText}`;
			this.createFilterBadge(filtersList, "التاريخ", dateText, () => {
				this.props.filterState.updateState({
					dateRange: { from: null, to: null },
					page: 1,
				});
				this.props.onFilterChange();
			});
		}

		// Search query
		if (filterState.searchQuery) {
			this.createFilterBadge(
				filtersList,
				"البحث",
				filterState.searchQuery,
				() => {
					this.props.filterState.updateState({
						searchQuery: "",
						page: 1,
					});

					// Update search input if available
					if (this.searchInput) {
						this.searchInput.setValue("");
					}

					this.props.onFilterChange();
				}
			);
		}

		// Clear all button
		if (hasFilters) {
			const clearAllBtn = this.selectedFiltersContainer.createEl(
				"button",
				{
					cls: "library-clear-filters-btn",
					text: "مسح الكل",
				}
			);
			clearAllBtn.addEventListener("click", () => {
				this.props.filterState.reset();

				// Update search input if available
				if (this.searchInput) {
					this.searchInput.setValue("");
				}

				// Clear date pickers
				if (this.fromDatePicker) this.fromDatePicker.setValue("");
				if (this.toDatePicker) this.toDatePicker.setValue("");

				// Update dropdown displays
				this.dropdowns.forEach((dropdown, type) => {
					const searchInput = dropdown.querySelector(
						".library-multi-select-search"
					) as HTMLInputElement;
					if (searchInput) {
						this.updateSelectionDisplay(searchInput, []);
					}

					// Update checkboxes
					const options = dropdown.querySelectorAll(
						"input[type=checkbox]"
					);
					options.forEach((option) => {
						(option as HTMLInputElement).checked = false;
					});
				});

				this.props.onFilterChange();
			});
		}
	}

	/**
	 * Creates a filter badge (chip) for selected filters
	 * @param container Container element
	 * @param label Badge label
	 * @param value Badge value
	 * @param onClick Remove handler
	 * @returns Created badge element
	 */
	private createFilterBadge(
		container: HTMLElement,
		label: string,
		value: string,
		onClick: () => void
	): HTMLElement {
		const badge = container.createEl("div", {
			cls: "library-filter-badge",
		});

		badge.createEl("span", {
			cls: "library-filter-badge-label",
			text: `${label}:`,
		});

		badge.createEl("span", {
			cls: "library-filter-badge-value",
			text: value,
		});

		badge
			.createEl("button", {
				cls: "library-filter-badge-remove",
				text: "×",
			})
			.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick();
			});

		return badge;
	}

	/**
	 * Creates a filter badge for tags, handling hierarchical tags
	 * @param container Container element
	 * @param tag Tag value
	 * @param onClick Remove handler
	 * @returns Created badge element
	 */
	private createTagFilterBadge(
		container: HTMLElement,
		tag: string,
		onClick: () => void
	): HTMLElement {
		if (tag.includes("/")) {
			// Handle hierarchical tag
			const [parent, ...childParts] = tag.split("/");
			const child = childParts.join("/");

			const badge = container.createEl("div", {
				cls: "library-filter-badge library-hierarchical-tag-badge",
			});

			badge.createEl("span", {
				cls: "library-filter-badge-label",
				text: "الوسم:",
			});

			const valueSpan = badge.createEl("span", {
				cls: "library-filter-badge-value",
			});

			valueSpan.createEl("span", {
				cls: "library-filter-badge-parent",
				text: parent,
			});

			valueSpan.createEl("span", { text: "/" });

			valueSpan.createEl("span", {
				cls: "library-filter-badge-child",
				text: child,
			});

			badge
				.createEl("button", {
					cls: "library-filter-badge-remove",
					text: "×",
				})
				.addEventListener("click", (e) => {
					e.stopPropagation();
					onClick();
				});

			return badge;
		} else {
			// Regular tag
			return this.createFilterBadge(container, "الوسم", tag, onClick);
		}
	}

	/**
	 * Creates a filter badge for categories, handling hierarchical categories
	 * @param container Container element
	 * @param category Category value
	 * @param onClick Remove handler
	 * @returns Created badge element
	 */
	private createCategoryFilterBadge(
		container: HTMLElement,
		category: string,
		onClick: () => void
	): HTMLElement {
		if (category.includes("/")) {
			// Handle hierarchical category
			const [parent, ...childParts] = category.split("/");
			const child = childParts.join("/");

			const badge = container.createEl("div", {
				cls: "library-filter-badge library-hierarchical-category-badge",
			});

			badge.createEl("span", {
				cls: "library-filter-badge-label",
				text: "التصنيف:",
			});

			const valueSpan = badge.createEl("span", {
				cls: "library-filter-badge-value",
			});

			valueSpan.createEl("span", {
				cls: "library-filter-badge-parent",
				text: parent,
			});

			valueSpan.createEl("span", { text: "/" });

			valueSpan.createEl("span", {
				cls: "library-filter-badge-child",
				text: child,
			});

			badge
				.createEl("button", {
					cls: "library-filter-badge-remove",
					text: "×",
				})
				.addEventListener("click", (e) => {
					e.stopPropagation();
					onClick();
				});

			return badge;
		} else {
			// Regular category
			return this.createFilterBadge(
				container,
				"التصنيف",
				category,
				onClick
			);
		}
	}

	/**
	 * Updates available filter options based on dynamic filtering
	 */
	private updateFilterOptions(): void {
		for (const [type, container] of this.optionsContainers.entries()) {
			// Get currently selected values
			let selectedValues: string[] = [];
			const filterState = this.props.filterState.getState();

			if (type === "status") selectedValues = filterState.statuses;
			else if (type === "presenter")
				selectedValues = filterState.presenters;
			else if (type === "author") selectedValues = filterState.authors;
			else if (type === "type") selectedValues = filterState.types;
			else if (type === "category")
				selectedValues = filterState.categories;
			else if (type === "tag") selectedValues = filterState.tags;

			// Add mapping from singular to plural form
			const typeMapping: Record<string, string> = {
				status: "statuses",
				presenter: "presenters",
				author: "authors",
				type: "types",
				category: "categories",
				tag: "tags",
			};

			// Use the mapped plural form to get options
			const mappedType = typeMapping[type] || type;
			const availableOptions = this.props.filterState.getAvailableOptions(
				mappedType as any
			);

			// Add selected values to ensure they're always shown
			const mergedOptions = [
				...new Set([...availableOptions, ...selectedValues]),
			].filter((opt) => opt.trim() !== "");

			// Clear existing options
			container.empty();

			// Render new options
			if (type === "tag" || type === "category") {
				this.renderHierarchicalOptions(
					container,
					mergedOptions,
					selectedValues,
					type
				);
			} else {
				this.renderFlatOptions(
					container,
					mergedOptions,
					selectedValues,
					type
				);
			}
		}
	}

	/**
	 * Closes all open dropdowns
	 */
	private closeAllDropdowns(): void {
		this.activeDropdown = null;
		document
			.querySelectorAll(".library-multi-select-options")
			.forEach((el) => {
				(el as HTMLElement).style.display = "none";
			});
	}

	/**
	 * Creates a debounced function
	 * @param func Function to debounce
	 * @param wait Delay in milliseconds
	 * @returns Debounced function
	 */
	private debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: number | null = null;

		return (...args: Parameters<T>): void => {
			if (timeout !== null) {
				window.clearTimeout(timeout);
			}

			timeout = window.setTimeout(() => {
				timeout = null;
				func(...args);
			}, wait);
		};
	}

	/**
	 * Cleans up component resources
	 */
	public destroy(): void {
		// Unsubscribe from state events
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Destroy date pickers
		if (this.fromDatePicker) {
			this.fromDatePicker.destroy();
			this.fromDatePicker = null;
		}
		if (this.toDatePicker) {
			this.toDatePicker.destroy();
			this.toDatePicker = null;
		}

		// Clear collections
		this.dropdowns.clear();
		this.optionsContainers.clear();

		// Clear search timeout if active
		if (this.searchTimeout) {
			window.clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}

		// Clear references
		this.container = null;
		this.searchInput = null;
		this.selectedFiltersContainer = null;
	}
}
