/**
 * Pagination component for navigation through content pages
 */
import { LOCAL_STORAGE_KEYS, PAGE_SIZE_OPTIONS } from "../../core/constants";
import { ComponentProps } from "../../core/uiTypes";
import { FilterState } from "../../core/state/FilterState";

/**
 * Props for Pagination component
 */
interface PaginationProps extends ComponentProps {
	/** Total items for pagination */
	totalItems: number;

	/** Filter state to manage */
	filterState: FilterState;

	/** Callback when page changes */
	onPageChange: () => Promise<void>;
}

/**
 * Pagination component for navigating through content pages
 */
export class Pagination {
	private props: PaginationProps;
	private container: HTMLElement | null = null;
	private pageInfoEl: HTMLElement | null = null;
	private prevBtn: HTMLButtonElement | null = null;
	private nextBtn: HTMLButtonElement | null = null;
	private pageInputEl: HTMLInputElement | null = null;
	private totalPagesEl: HTMLElement | null = null;
	private itemsPerPageSelect: HTMLSelectElement | null = null;

	/**
	 * Creates a new Pagination component
	 * @param props Component props
	 */
	constructor(props: PaginationProps) {
		this.props = props;
	}

	/**
	 * Renders the pagination controls
	 * @param container Container to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		const pagination = container.createEl("div", {
			cls: "library-pagination",
		});

		// Items per page selector
		this.renderItemsPerPageSelector(pagination);

		// Page info (showing X-Y of Z)
		this.pageInfoEl = pagination.createEl("div", {
			cls: "library-page-info",
		});

		// Navigation controls
		const pageNav = pagination.createEl("div", { cls: "library-page-nav" });

		// Previous page button
		this.prevBtn = pageNav.createEl("button", {
			cls: "library-page-btn",
			text: "السابق",
		});

		// Page input and total pages
		const pageInputContainer = pageNav.createEl("div", {
			cls: "library-page-input-container",
		});

		this.pageInputEl = pageInputContainer.createEl("input", {
			cls: "library-page-input",
			type: "number",
			attr: {
				min: "1",
			},
		});

		pageInputContainer.createEl("span", { text: " من " });

		this.totalPagesEl = pageInputContainer.createEl("span", {
			cls: "library-total-pages",
		});

		// Next page button
		this.nextBtn = pageNav.createEl("button", {
			cls: "library-page-btn",
			text: "التالي",
		});

		// Set up event handlers
		this.setupEventHandlers();

		// Initial update
		this.updatePagination();
	}

	/**
	 * Sets up event handlers for the pagination controls
	 */
	private setupEventHandlers(): void {
		if (
			!this.prevBtn ||
			!this.nextBtn ||
			!this.pageInputEl ||
			!this.itemsPerPageSelect
		)
			return;

		// Previous page button
		this.prevBtn.addEventListener("click", () => {
			this.goToPreviousPage();
		});

		// Next page button
		this.nextBtn.addEventListener("click", () => {
			this.goToNextPage();
		});

		// Page input
		this.pageInputEl.addEventListener("change", () => {
			this.handlePageInputChange();
		});

		// Items per page selector
		this.itemsPerPageSelect.addEventListener("change", () => {
			this.handleItemsPerPageChange();
		});

		// Handle keyboard navigation
		document.addEventListener("keydown", this.handleKeyboardNavigation);
	}

	/**
	 * Updates the pagination display
	 */
	private updatePagination(): void {
		if (
			!this.pageInfoEl ||
			!this.prevBtn ||
			!this.nextBtn ||
			!this.pageInputEl ||
			!this.totalPagesEl
		) {
			return;
		}

		const filterState = this.props.filterState.getState();
		const totalPages = Math.ceil(
			this.props.totalItems / filterState.itemsPerPage
		);
		const currentPage = Math.min(
			Math.max(1, filterState.page),
			Math.max(1, totalPages)
		);

		// Calculate start and end items
		const startItem = (currentPage - 1) * filterState.itemsPerPage + 1;
		const endItem = Math.min(
			currentPage * filterState.itemsPerPage,
			this.props.totalItems
		);

		// Update page info
		this.pageInfoEl.textContent = `عرض ${startItem}-${endItem} من ${this.props.totalItems}`;

		// Update page input and total pages
		this.pageInputEl.value = currentPage.toString();
		this.pageInputEl.max = totalPages.toString();
		this.totalPagesEl.textContent = totalPages.toString();

		// Update navigation buttons state
		this.prevBtn.disabled = currentPage === 1;
		this.nextBtn.disabled = currentPage >= totalPages;

		// Update items per page select
		if (this.itemsPerPageSelect) {
			const selectedOption = this.itemsPerPageSelect.querySelector(
				`option[value="${filterState.itemsPerPage}"]`
			);
			if (selectedOption) {
				(selectedOption as HTMLOptionElement).selected = true;
			}
		}
	}

	/**
	 * Renders the items per page selector
	 * @param container Container to render into
	 */
	private renderItemsPerPageSelector(container: HTMLElement): void {
		const itemsPerPageContainer = container.createEl("div", {
			cls: "library-items-per-page",
		});
		itemsPerPageContainer.createEl("span", { text: "العناصر لكل صفحة:" });

		const filterState = this.props.filterState.getState();

		this.itemsPerPageSelect = itemsPerPageContainer.createEl("select", {
			cls: "library-items-select",
		});

		PAGE_SIZE_OPTIONS.forEach((num) => {
			const option = this.itemsPerPageSelect!.createEl("option", {
				value: num.toString(),
				text: num.toString(),
			});
			if (num === filterState.itemsPerPage) {
				option.selected = true;
			}
		});
	}

	/**
	 * Goes to the previous page
	 */
	private goToPreviousPage(): void {
		const filterState = this.props.filterState.getState();

		if (filterState.page > 1) {
			this.props.filterState.updateState({ page: filterState.page - 1 });
			this.props.onPageChange();
		}
	}

	/**
	 * Goes to the next page
	 */
	private goToNextPage(): void {
		const filterState = this.props.filterState.getState();
		const totalPages = Math.ceil(
			this.props.totalItems / filterState.itemsPerPage
		);

		if (filterState.page < totalPages) {
			this.props.filterState.updateState({ page: filterState.page + 1 });
			this.props.onPageChange();
		}
	}

	/**
	 * Handles page input change
	 */
	private handlePageInputChange(): void {
		if (!this.pageInputEl) return;

		const filterState = this.props.filterState.getState();
		const totalPages = Math.ceil(
			this.props.totalItems / filterState.itemsPerPage
		);

		// Parse the input value
		let newPage = parseInt(this.pageInputEl.value);

		// Validate the new page
		if (isNaN(newPage) || newPage < 1) {
			newPage = 1;
		} else if (newPage > totalPages) {
			newPage = totalPages;
		}

		// Update if changed
		if (newPage !== filterState.page) {
			this.props.filterState.updateState({ page: newPage });
			this.props.onPageChange();
		}

		// Update the input value
		this.pageInputEl.value = newPage.toString();
	}

	/**
	 * Handles items per page change
	 */
	private handleItemsPerPageChange(): void {
		if (!this.itemsPerPageSelect) return;

		const filterState = this.props.filterState.getState();
		const newItemsPerPage = parseInt(this.itemsPerPageSelect.value);

		if (newItemsPerPage !== filterState.itemsPerPage) {
			// Save to localStorage
			try {
				localStorage.setItem(
					LOCAL_STORAGE_KEYS.ITEMS_PER_PAGE,
					newItemsPerPage.toString()
				);
			} catch (e) {
				console.warn(
					"Failed to save items per page to localStorage:",
					e
				);
			}

			// When changing items per page, reset to first page
			this.props.filterState.updateState({
				itemsPerPage: newItemsPerPage,
				page: 1,
			});

			this.props.onPageChange();
		}
	}

	/**
	 * Handles keyboard navigation
	 * @param e Keyboard event
	 */
	private handleKeyboardNavigation = (e: KeyboardEvent): void => {
		// Only handle if not in an input field
		if (
			document.activeElement?.tagName === "INPUT" ||
			document.activeElement?.tagName === "TEXTAREA" ||
			document.activeElement?.tagName === "SELECT"
		) {
			return;
		}

		const filterState = this.props.filterState.getState();

		// If ArrowRight key was pressed, go to previous page (RTL pagination)
		if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey) {
			if (filterState.page > 1) {
				this.goToPreviousPage();
				e.preventDefault();
			}
		}

		// If ArrowLeft key was pressed, go to next page (RTL pagination)
		else if (
			e.key === "ArrowLeft" &&
			!e.ctrlKey &&
			!e.metaKey &&
			!e.altKey
		) {
			const totalPages = Math.ceil(
				this.props.totalItems / filterState.itemsPerPage
			);
			if (filterState.page < totalPages) {
				this.goToNextPage();
				e.preventDefault();
			}
		}
	};

	/**
	 * Destroys the component and cleans up resources
	 */
	public destroy(): void {
		// Remove keyboard event listener
		document.removeEventListener("keydown", this.handleKeyboardNavigation);

		// Clean up references
		this.container = null;
		this.pageInfoEl = null;
		this.prevBtn = null;
		this.nextBtn = null;
		this.pageInputEl = null;
		this.totalPagesEl = null;
		this.itemsPerPageSelect = null;
	}
}
