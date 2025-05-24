// src/ui/content/benefits/BenefitsView.ts

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
 * Component for displaying benefits
 */
export class BenefitsView {
	private props: BenefitsViewProps;
	private container: HTMLElement | null = null;
	private searchInput: HTMLInputElement | null = null;
	private filteredBenefits: BenefitItem[] = [];
	private currentPage = 1;
	private itemsPerPage = 20;

	// Filter states
	private searchQuery = "";
	private selectedCategories: Set<string> = new Set();
	private selectedTags: Set<string> = new Set();
	private selectedAuthors: Set<string> = new Set();

	constructor(props: BenefitsViewProps) {
		this.props = props;
		this.filteredBenefits = [...props.benefits];
		this.applyFilters();
	}

	/**
	 * Renders the benefits view
	 */
	render(container: HTMLElement): void {
		this.container = container;
		container.empty();
		container.addClass("library-benefits-view");

		// Render filters
		this.renderFilters(container);

		// Render benefits
		this.renderBenefits(container);

		// Render pagination
		this.renderPagination(container);
	}

	/**
	 * Renders the filter section
	 */
	private renderFilters(container: HTMLElement): void {
		const filterSection = container.createEl("div", {
			cls: "library-benefits-filters",
		});

		// Search bar
		const searchContainer = filterSection.createEl("div", {
			cls: "library-benefits-search",
		});

		this.searchInput = searchContainer.createEl("input", {
			type: "text",
			placeholder: "بحث في الفوائد...",
			cls: "library-benefits-search-input",
		});

		this.searchInput.addEventListener("input", () => {
			this.searchQuery = this.searchInput!.value;
			this.applyFilters();
			this.renderBenefits(this.container!);
			this.renderPagination(this.container!);
		});

		// Filter chips container
		const filterChips = filterSection.createEl("div", {
			cls: "library-benefits-filter-chips",
		});

		// Get unique values for filters
		const categories = new Set<string>();
		const tags = new Set<string>();
		const authors = new Set<string>();

		this.props.benefits.forEach((benefit) => {
			benefit.categories.forEach((cat) => categories.add(cat));
			benefit.tags.forEach((tag) => tags.add(tag));
			if (benefit.author) authors.add(benefit.author);
		});

		// Category filter
		if (categories.size > 0) {
			this.renderFilterDropdown(
				filterChips,
				"التصنيفات",
				Array.from(categories),
				this.selectedCategories,
				() => {
					this.applyFilters();
					this.renderBenefits(this.container!);
					this.renderPagination(this.container!);
				}
			);
		}

		// Tags filter
		if (tags.size > 0) {
			this.renderFilterDropdown(
				filterChips,
				"الوسوم",
				Array.from(tags),
				this.selectedTags,
				() => {
					this.applyFilters();
					this.renderBenefits(this.container!);
					this.renderPagination(this.container!);
				}
			);
		}

		// Author/Presenter filter
		if (authors.size > 0) {
			const label =
				this.props.contentType === "book" ? "المؤلفون" : "الملقون";
			this.renderFilterDropdown(
				filterChips,
				label,
				Array.from(authors),
				this.selectedAuthors,
				() => {
					this.applyFilters();
					this.renderBenefits(this.container!);
					this.renderPagination(this.container!);
				}
			);
		}

		// Clear filters button
		if (this.hasActiveFilters()) {
			const clearBtn = filterChips.createEl("button", {
				text: "مسح الفلاتر",
				cls: "library-benefits-clear-filters",
			});

			clearBtn.addEventListener("click", () => {
				this.clearFilters();
				this.applyFilters();
				this.render(this.container!);
			});
		}
	}

	/**
	 * Renders a filter dropdown
	 */
	private renderFilterDropdown(
		container: HTMLElement,
		label: string,
		options: string[],
		selected: Set<string>,
		onChange: () => void
	): void {
		const dropdown = container.createEl("div", {
			cls: "library-benefits-filter-dropdown",
		});

		const button = dropdown.createEl("button", {
			cls: "library-benefits-filter-button",
		});

		const updateButtonText = () => {
			const count = selected.size;
			button.textContent = count > 0 ? `${label} (${count})` : label;
			button.classList.toggle("active", count > 0);
		};

		updateButtonText();

		button.addEventListener("click", (e) => {
			e.stopPropagation();

			const menu = new Menu();

			options.forEach((option) => {
				menu.addItem((item) => {
					item.setTitle(option);
					item.setChecked(selected.has(option));
					item.onClick(() => {
						if (selected.has(option)) {
							selected.delete(option);
						} else {
							selected.add(option);
						}
						updateButtonText();
						onChange();
					});
				});
			});

			menu.showAtMouseEvent(e);
		});
	}

	/**
	 * Applies filters to benefits
	 */
	private applyFilters(): void {
		this.filteredBenefits = this.props.benefits.filter((benefit) => {
			// Search filter
			if (this.searchQuery) {
				const query = this.searchQuery.toLowerCase();
				const matchesSearch =
					benefit.title.toLowerCase().includes(query) ||
					benefit.text.toLowerCase().includes(query) ||
					benefit.parentTitle?.toLowerCase().includes(query) ||
					benefit.author?.toLowerCase().includes(query);

				if (!matchesSearch) return false;
			}

			// Category filter
			if (this.selectedCategories.size > 0) {
				const hasCategory = benefit.categories.some((cat) =>
					this.selectedCategories.has(cat)
				);
				if (!hasCategory) return false;
			}

			// Tag filter
			if (this.selectedTags.size > 0) {
				const hasTag = benefit.tags.some((tag) =>
					this.selectedTags.has(tag)
				);
				if (!hasTag) return false;
			}

			// Author filter
			if (this.selectedAuthors.size > 0 && benefit.author) {
				if (!this.selectedAuthors.has(benefit.author)) return false;
			}

			return true;
		});

		// Reset to first page when filters change
		this.currentPage = 1;
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
			benefitsContainer.createEl("div", {
				text: "لا توجد فوائد تطابق معايير البحث",
				cls: "library-benefits-empty",
			});
			return;
		}

		// Render each benefit
		paginatedBenefits.forEach((benefit) => {
			this.renderBenefitCard(benefitsContainer, benefit);
		});
	}

	/**
	 * Renders a single benefit card
	 */
	private renderBenefitCard(
		container: HTMLElement,
		benefit: BenefitItem
	): void {
		const card = container.createEl("div", {
			cls: "library-benefit-card",
		});

		// Header with title and actions
		const header = card.createEl("div", {
			cls: "library-benefit-header",
		});

		const title = header.createEl("h3", {
			text: benefit.title,
			cls: "library-benefit-title",
		});

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
			text: benefit.parentTitle || "غير معروف",
			cls: "library-benefit-source-link",
		});

		sourceLink.addEventListener("click", (e) => {
			e.preventDefault();
			this.props.app.workspace.openLinkText(benefit.filePath, "", false);
		});

		if (benefit.author) {
			source.createEl("span", {
				text: ` - ${benefit.author}`,
				cls: "library-benefit-author",
			});
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

		// Render markdown content
		const textEl = textContainer.createEl("div", {
			cls: "library-benefit-content",
		});

		// Simple markdown rendering (you might want to use MarkdownRenderer here)
		const renderedText = this.renderSimpleMarkdown(benefit.text);
		textEl.innerHTML = renderedText;

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
		// Remove existing pagination
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

		// Page info
		pagination.createEl("span", {
			text: `صفحة ${this.currentPage} من ${totalPages}`,
			cls: "library-pagination-info",
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
	 * Simple markdown renderer (basic implementation)
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
			this.searchQuery !== "" ||
			this.selectedCategories.size > 0 ||
			this.selectedTags.size > 0 ||
			this.selectedAuthors.size > 0
		);
	}

	/**
	 * Clears all filters
	 */
	private clearFilters(): void {
		this.searchQuery = "";
		this.selectedCategories.clear();
		this.selectedTags.clear();
		this.selectedAuthors.clear();
		if (this.searchInput) {
			this.searchInput.value = "";
		}
	}

	/**
	 * Updates the view with new benefits
	 */
	public updateBenefits(benefits: BenefitItem[]): void {
		this.props.benefits = benefits;
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
		this.container = null;
		this.searchInput = null;
	}
}
