/**
 * Advanced Analytics Dashboard for book content
 * With collapsible sections, comprehensive visualizations, and Hijri/Gregorian calendar support
 */
import { setIcon, TFile } from "obsidian";
import { ContentComponentProps } from "../../../core/uiTypes";
import { BookItem, LibraryItem } from "../../../core/contentTypes";
import { formatDate, createDateTooltip } from "../../../utils/dateUtils";
import { BOOK_STATUS } from "../../../core/constants";
import moment from "moment-hijri";

// Storage keys for dashboard state
const BOOK_DASHBOARD_COLLAPSED_KEY = "library-book-dashboard-collapsed";
const BOOK_DASHBOARD_SECTIONS_KEY = "library-book-dashboard-sections";

/**
 * Props for BookAnalyticsDashboard component
 */
interface BookAnalyticsDashboardProps extends ContentComponentProps {
	/** All book items */
	items: LibraryItem[];
}

/**
 * Dashboard section types
 */
type DashboardSectionType =
	| "core"
	| "status"
	| "time"
	| "authors"
	| "categories";

/**
 * Core statistics data structure for books
 */
interface BookCoreStatistics {
	/** Total number of books */
	totalBooks: number;

	/** Number of read books */
	readBooks: number;

	/** Number of reading books */
	readingBooks: number;

	/** Number of unread books */
	unreadBooks: number;

	/** Number of books in reading list */
	inListBooks: number;

	/** Percentage read */
	percentRead: number;

	/** Total pages across all books */
	totalPages: number;

	/** Pages read (based on read books) */
	pagesRead: number;

	/** Average book length in pages */
	averageLength: number;

	/** Average rating (1-5) */
	averageRating: number;

	/** Books added in last 30 days */
	recentlyAdded: number;

	/** Total size in memory (MB) */
	SizeMB: number;
}

/**
 * Status distribution data
 */
interface BookStatusDistribution {
	/** Status name */
	status: string;

	/** Number of books with this status */
	count: number;

	/** Percentage of total */
	percentage: number;

	/** Total pages with this status */
	pageCount: number;
}

/**
 * Time-based analysis data structure
 */
interface TimeAnalysis {
	/** Period label (month/year) */
	period: string;

	/** Number of items added in this period */
	count: number;

	/** Total pages added in this period */
	pageCount: number;

	/** Display period in selected calendar */
	displayPeriod: string;

	/** Raw date for sorting */
	sortDate: Date;
}

/**
 * Author statistics data structure
 */
interface AuthorStats {
	/** Author name */
	name: string;

	/** Count of books by this author */
	count: number;

	/** Percentage of total books */
	percentage: number;

	/** Total pages by this author */
	pageCount: number;

	/** Reading completion percentage */
	completionPercentage: number;
}

/**
 * Advanced dashboard for book analytics
 * with collapsible sections and calendar support
 */
export class BookAnalyticsDashboard {
	private props: BookAnalyticsDashboardProps;
	private container: HTMLElement | null = null;

	// Dashboard sections
	private dashboardContainer: HTMLElement | null = null;
	private coreStatsSection: HTMLElement | null = null;
	private statusSection: HTMLElement | null = null;
	private timeAnalysisSection: HTMLElement | null = null;
	private authorsSection: HTMLElement | null = null;
	private categorySection: HTMLElement | null = null;

	// Statistics data
	private coreStats: BookCoreStatistics | null = null;
	private statusDistribution: BookStatusDistribution[] = [];
	private timeAnalysis: TimeAnalysis[] = [];
	private authorStats: AuthorStats[] = [];
	private categoryData: { category: string; count: number }[] = [];

	// Collapsible state
	private isDashboardCollapsed: boolean = false;
	private collapsedSections: Set<DashboardSectionType> = new Set();

	/**
	 * Creates a new Book Analytics Dashboard
	 * @param props Component props
	 */
	constructor(props: BookAnalyticsDashboardProps) {
		this.props = props;

		// Load collapse state from localStorage
		this.loadCollapseState();

		// Calculate statistics
		this.calculateAllStatistics();
	}

	/**
	 * Renders the dashboard
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Create dashboard container
		this.dashboardContainer = container.createEl("div", {
			cls: "library-dashboard-container",
		});

		if (this.isDashboardCollapsed) {
			this.dashboardContainer.addClass("collapsed");
		}

		// Add dashboard header
		this.renderDashboardHeader(this.dashboardContainer);

		// Container for all sections
		const sectionsContainer = this.dashboardContainer.createEl("div", {
			cls: "library-dashboard-sections-container",
		});

		if (this.isDashboardCollapsed) {
			sectionsContainer.style.display = "none";
		}

		// Add dashboard sections
		this.renderCoreStats(sectionsContainer);
		this.renderStatusDistribution(sectionsContainer);
		this.renderTimeAnalysis(sectionsContainer);
		this.renderAuthorAnalysis(sectionsContainer);
		this.renderCategoryAnalysis(sectionsContainer);
	}

	/**
	 * Renders the dashboard header with title, info and collapse button
	 * @param container Parent container
	 */
	private renderDashboardHeader(container: HTMLElement): void {
		const header = container.createEl("div", {
			cls: "library-dashboard-header",
		});

		const titleRow = header.createEl("div", {
			cls: "library-dashboard-title-row",
		});

		titleRow.createEl("h2", {
			text: "لوحة تحليل الكتب المتقدمة",
			cls: "library-dashboard-title",
		});

		// Add collapse/expand button
		const collapseButton = titleRow.createEl("button", {
			cls: "library-dashboard-collapse-btn",
			attr: {
				"aria-label": this.isDashboardCollapsed ? "توسيع" : "طي",
				title: this.isDashboardCollapsed
					? "توسيع لوحة التحليل"
					: "طي لوحة التحليل",
			},
		});

		const collapseIcon = collapseButton.createEl("span", {
			cls: "library-dashboard-collapse-icon",
		});

		setIcon(
			collapseIcon,
			this.isDashboardCollapsed ? "chevron-down" : "chevron-up"
		);

		collapseButton.addEventListener("click", () => {
			this.toggleDashboardCollapse();
		});

		const subtitle = header.createEl("div", {
			cls: "library-dashboard-subtitle",
		});

		subtitle.createEl("span", {
			text: `إجمالي الكتب: ${this.props.items.length} كتاب`,
		});

		// Use enhanced date formatting for last updated
		const lastUpdatedSpan = subtitle.createEl("span", {
			cls: "library-dashboard-last-updated",
		});

		const now = new Date();
		const formattedDateTime = formatDate(now, {
			settings: this.props.settings.hijriCalendar,
		});

		// Add time to the formatted date
		const timeStr = moment(now).format("LT");
		lastUpdatedSpan.textContent = `تم التحديث: ${formattedDateTime} ${timeStr}`;

		// Add tooltip with both calendar systems if enabled
		if (this.props.settings.hijriCalendar.showBothInTooltips) {
			const tooltip = createDateTooltip(
				now,
				this.props.settings.hijriCalendar
			);
			if (tooltip) {
				const tooltipWithTime = tooltip
					.split("\n")
					.map((line) => line + ` ${timeStr}`)
					.join("\n");
				lastUpdatedSpan.setAttribute("title", tooltipWithTime);
				lastUpdatedSpan.addClass("library-date-with-tooltip");
			}
		}
	}

	/**
	 * Creates a collapsible section
	 * @param container Parent container
	 * @param title Section title
	 * @param sectionType Section type for collapse state
	 * @returns The content container for the section
	 */
	private createCollapsibleSection(
		container: HTMLElement,
		title: string,
		sectionType: DashboardSectionType
	): HTMLElement {
		const section = container.createEl("div", {
			cls: "library-dashboard-section",
		});

		if (this.collapsedSections.has(sectionType)) {
			section.addClass("collapsed");
		}

		// Section header with collapse button
		const sectionHeader = section.createEl("div", {
			cls: "library-dashboard-section-header",
		});

		sectionHeader.createEl("h3", {
			text: title,
			cls: "library-dashboard-section-title",
		});

		// Add collapse/expand button
		const collapseButton = sectionHeader.createEl("button", {
			cls: "library-section-collapse-btn",
			attr: {
				"aria-label": this.collapsedSections.has(sectionType)
					? "توسيع"
					: "طي",
				title: this.collapsedSections.has(sectionType)
					? "توسيع القسم"
					: "طي القسم",
			},
		});

		const collapseIcon = collapseButton.createEl("span", {
			cls: "library-section-collapse-icon",
		});

		setIcon(
			collapseIcon,
			this.collapsedSections.has(sectionType)
				? "chevron-down"
				: "chevron-up"
		);

		// Section content
		const sectionContent = section.createEl("div", {
			cls: "library-dashboard-section-content",
		});

		if (this.collapsedSections.has(sectionType)) {
			sectionContent.style.display = "none";
		}

		// Set up click event for toggling
		sectionHeader.addEventListener("click", (e) => {
			// Don't toggle if clicking on buttons within header
			if (
				e.target === collapseButton ||
				collapseIcon.contains(e.target as Node)
			) {
				this.toggleSectionCollapse(
					sectionType,
					section,
					sectionContent,
					collapseIcon
				);
			} else {
				this.toggleSectionCollapse(
					sectionType,
					section,
					sectionContent,
					collapseIcon
				);
			}
		});

		return sectionContent;
	}

	/**
	 * Renders the core statistics section
	 * @param container Parent container
	 */
	private renderCoreStats(container: HTMLElement): void {
		if (!this.coreStats) return;

		const sectionContent = this.createCollapsibleSection(
			container,
			"الإحصائيات الأساسية",
			"core"
		);

		// Card style stats
		const statsContainer = sectionContent.createEl("div", {
			cls: "library-stats-cards",
		});

		// Create individual stat cards
		this.createStatCard(
			statsContainer,
			"إجمالي الكتب",
			this.coreStats.totalBooks.toString(),
			"كتاب"
		);

		this.createStatCard(
			statsContainer,
			"تمت قراءتها",
			this.coreStats.readBooks.toString(),
			`(${Math.round(this.coreStats.percentRead)}%)`
		);

		this.createStatCard(
			statsContainer,
			"قيد القراءة",
			this.coreStats.readingBooks.toString(),
			"كتاب"
		);

		this.createStatCard(
			statsContainer,
			"لم تُقرأ بعد",
			this.coreStats.unreadBooks.toString(),
			"كتاب"
		);

		this.createStatCard(
			statsContainer,
			"إجمالي الصفحات",
			this.coreStats.totalPages.toString(),
			"صفحة"
		);

		this.createStatCard(
			statsContainer,
			"متوسط الطول",
			this.coreStats.averageLength.toString(),
			"صفحة/كتاب"
		);

		// Progress bar for read percentage
		this.createProgressBar(
			sectionContent,
			"نسبة إكمال القراءة",
			this.coreStats.percentRead
		);

		// Additional stats section
		const additionalStats = sectionContent.createEl("div", {
			cls: "library-additional-stats",
		});

		// Display actual storage size
		additionalStats.createEl("div", {
			cls: "library-storage-size",
			text: `حجم المكتبة: ${this.coreStats.SizeMB.toFixed(2)} ميجابايت`,
		});

		if (this.coreStats.averageRating > 0) {
			additionalStats.createEl("div", {
				cls: "library-average-rating",
				text: `متوسط التقييم: ${this.coreStats.averageRating.toFixed(
					1
				)} ★ `,
			});
		}

		if (this.coreStats.recentlyAdded > 0) {
			additionalStats.createEl("div", {
				cls: "library-recently-added",
				text: `أضيف مؤخراً: ${this.coreStats.recentlyAdded} كتاب (آخر 30 يوم)`,
			});
		}

		this.coreStatsSection = sectionContent;
	}

	/**
	 * Renders the status distribution section
	 * @param container Parent container
	 */
	private renderStatusDistribution(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"توزيع حالة القراءة",
			"status"
		);

		const chartContainer = sectionContent.createEl("div", {
			cls: "library-chart-container library-status-chart-container",
		});

		// Render status distribution bars
		if (this.statusDistribution.length > 0) {
			const chartWrapper = chartContainer.createEl("div", {
				cls: "library-chart-wrapper",
			});

			this.statusDistribution.forEach((status) => {
				const statusBar = chartWrapper.createEl("div", {
					cls: "library-status-bar",
				});

				const bar = statusBar.createEl("div", {
					cls: `library-status-bar-fill status-${status.status
						.toLowerCase()
						.replace(/\s+/g, "-")}`,
				});
				bar.style.width = `${status.percentage}%`;

				const label = statusBar.createEl("div", {
					cls: "library-status-bar-label",
				});

				label.createEl("span", {
					text: status.status,
					cls: "library-status-name",
				});

				label.createEl("span", {
					text: `${status.count} (${Math.round(status.percentage)}%)`,
					cls: "library-status-count",
				});

				label.createEl("span", {
					text: `${status.pageCount} صفحة`,
					cls: "library-status-duration",
				});
			});

			// Add a legend for status colors
			const legend = sectionContent.createEl("div", {
				cls: "library-status-legend",
			});

			this.statusDistribution.forEach((status) => {
				const legendItem = legend.createEl("div", {
					cls: "library-legend-item",
				});

				legendItem.createEl("span", {
					cls: `library-legend-color status-${status.status
						.toLowerCase()
						.replace(/\s+/g, "-")}`,
				});

				legendItem.createEl("span", {
					text: status.status,
					cls: "library-legend-text",
				});
			});
		} else {
			chartContainer.createEl("div", {
				text: "لا توجد بيانات كافية",
				cls: "library-no-data",
			});
		}

		this.statusSection = sectionContent;
	}

	/**
	 * Renders the time analysis section with calendar support
	 * @param container Parent container
	 */
	private renderTimeAnalysis(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"تحليل الوقت",
			"time"
		);

		// Summary statistics
		const summaryContainer = sectionContent.createEl("div", {
			cls: "library-time-summary",
		});

		// Get items added in the last 3, 6, and 12 months
		const now = moment();
		const threeMonthsAgo = moment().subtract(3, "months");
		const sixMonthsAgo = moment().subtract(6, "months");
		const twelveMonthsAgo = moment().subtract(12, "months");

		let last3MonthsCount = 0;
		let last6MonthsCount = 0;
		let last12MonthsCount = 0;

		this.props.items.forEach((item) => {
			if (!item.dateAdded) return;

			const itemDate = moment(item.dateAdded);

			if (itemDate.isAfter(threeMonthsAgo)) {
				last3MonthsCount++;
			}

			if (itemDate.isAfter(sixMonthsAgo)) {
				last6MonthsCount++;
			}

			if (itemDate.isAfter(twelveMonthsAgo)) {
				last12MonthsCount++;
			}
		});

		// Create summary cards
		const summaryCards = summaryContainer.createEl("div", {
			cls: "library-time-summary-cards",
		});

		this.createSummaryCard(summaryCards, "آخر 3 أشهر", last3MonthsCount);
		this.createSummaryCard(summaryCards, "آخر 6 أشهر", last6MonthsCount);
		this.createSummaryCard(summaryCards, "آخر 12 شهر", last12MonthsCount);

		// Monthly chart
		const chartContainer = sectionContent.createEl("div", {
			cls: "library-chart-container library-time-chart-container",
		});

		// Render time analysis chart
		if (this.timeAnalysis.length > 0) {
			const chartWrapper = chartContainer.createEl("div", {
				cls: "library-time-chart-wrapper",
			});

			// Find maximum count for scaling
			const maxCount = Math.max(...this.timeAnalysis.map((t) => t.count));

			// Limit to last 12 months for better visualization
			const lastMonths = this.timeAnalysis
				.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
				.slice(0, 12)
				.reverse();

			lastMonths.forEach((period) => {
				const periodBar = chartWrapper.createEl("div", {
					cls: "library-time-bar",
				});

				const barHeight =
					maxCount > 0 ? (period.count / maxCount) * 100 : 0;

				const bar = periodBar.createEl("div", {
					cls: "library-time-bar-fill",
				});
				bar.style.height = `${barHeight}%`;

				const label = periodBar.createEl("div", {
					cls: "library-time-bar-label",
				});

				// Use the formatted display period in the selected calendar
				label.createEl("span", {
					text: period.displayPeriod,
					cls: "library-time-period",
				});

				// Add tooltip with additional calendar info if enabled
				const tooltipText = `${period.count} كتاب - ${period.pageCount} صفحة`;
				if (this.props.settings.hijriCalendar.showBothInTooltips) {
					const dateTooltip = createDateTooltip(
						period.sortDate,
						this.props.settings.hijriCalendar
					);
					if (dateTooltip) {
						bar.setAttribute(
							"title",
							`${tooltipText}\n${dateTooltip}`
						);
					} else {
						bar.setAttribute("title", tooltipText);
					}
				} else {
					bar.setAttribute("title", tooltipText);
				}
			});

			// Add y-axis labels
			const yAxis = chartWrapper.createEl("div", {
				cls: "library-time-chart-y-axis",
			});

			// Create y-axis labels (0, 25%, 50%, 75%, 100% of max)
			for (let i = 5; i >= 0; i--) {
				const value = Math.round((maxCount * i) / 5);
				yAxis.createEl("div", {
					text: value.toString(),
					cls: "library-time-chart-y-label",
				});
			}
		} else {
			chartContainer.createEl("div", {
				text: "لا توجد بيانات كافية",
				cls: "library-no-data",
			});
		}

		this.timeAnalysisSection = sectionContent;
	}

	/**
	 * Renders the author analysis section
	 * @param container Parent container
	 */
	private renderAuthorAnalysis(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"تحليل المؤلفين",
			"authors"
		);

		// Only show top 5 authors
		const topAuthors = this.authorStats
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		if (topAuthors.length > 0) {
			// Author chart - visualize top authors
			const chartContainer = sectionContent.createEl("div", {
				cls: "library-chart-container library-presenter-chart-container",
			});

			// Create horizontal bars for top 5 authors
			topAuthors.forEach((author) => {
				const authorBar = chartContainer.createEl("div", {
					cls: "library-presenter-bar",
				});

				authorBar.createEl("div", {
					cls: "library-presenter-name",
					text: author.name,
				});

				const barContainer = authorBar.createEl("div", {
					cls: "library-presenter-bar-container",
				});

				const bar = barContainer.createEl("div", {
					cls: "library-presenter-bar-fill",
				});
				bar.style.width = `${author.percentage}%`;

				const countLabel = barContainer.createEl("div", {
					cls: "library-presenter-count-label",
					text: `${author.count} (${Math.round(author.percentage)}%)`,
				});
			});

			// Table with detailed author info
			const authorTable = sectionContent.createEl("table", {
				cls: "library-presenter-table",
			});

			// Table header
			const thead = authorTable.createEl("thead");
			const headerRow = thead.createEl("tr");

			headerRow.createEl("th", { text: "المؤلف" });
			headerRow.createEl("th", { text: "العدد" });
			headerRow.createEl("th", { text: "النسبة" });
			headerRow.createEl("th", { text: "الصفحات" });
			headerRow.createEl("th", { text: "نسبة الإكمال" });

			// Table body
			const tbody = authorTable.createEl("tbody");

			topAuthors.forEach((author) => {
				const row = tbody.createEl("tr");

				row.createEl("td", { text: author.name });
				row.createEl("td", { text: author.count.toString() });
				row.createEl("td", {
					text: `${Math.round(author.percentage)}%`,
				});
				row.createEl("td", { text: author.pageCount.toString() });

				// Completion percentage with visual indicator
				const completionCell = row.createEl("td");
				const completionIndicator = completionCell.createEl("div", {
					cls: "library-completion-indicator",
				});

				const completionBar = completionIndicator.createEl("div", {
					cls: "library-completion-bar",
				});
				completionBar.style.width = `${author.completionPercentage}%`;

				completionIndicator.createEl("span", {
					text: `${Math.round(author.completionPercentage)}%`,
					cls: "library-completion-text",
				});
			});

			// Show total count of authors
			if (this.authorStats.length > 5) {
				sectionContent.createEl("div", {
					text: `إجمالي المؤلفين: ${this.authorStats.length}`,
					cls: "library-presenter-count",
				});
			}
		} else {
			sectionContent.createEl("div", {
				text: "لا توجد بيانات كافية",
				cls: "library-no-data",
			});
		}

		this.authorsSection = sectionContent;
	}

	/**
	 * Renders the category analysis section
	 * @param container Parent container
	 */
	private renderCategoryAnalysis(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"تحليل التصنيفات",
			"categories"
		);

		// Get top 10 categories
		const topCategories = this.categoryData
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		if (topCategories.length > 0) {
			// Create title with counts
			sectionContent.createEl("div", {
				cls: "library-category-title",
				text: `أهم ${topCategories.length} تصنيف من أصل ${this.categoryData.length}`,
			});

			const categoryCloud = sectionContent.createEl("div", {
				cls: "library-category-cloud",
			});

			// Find min and max for sizing
			const minCount = Math.min(...topCategories.map((c) => c.count));
			const maxCount = Math.max(...topCategories.map((c) => c.count));
			const countRange = maxCount - minCount;

			// Generate a different color for each category
			const colorClasses = [
				"category-color-1",
				"category-color-2",
				"category-color-3",
				"category-color-4",
				"category-color-5",
			];

			topCategories.forEach((category, index) => {
				// Scale size between 0.8 and 2em based on count
				const fontSize =
					countRange > 0
						? 0.8 + (1.2 * (category.count - minCount)) / countRange
						: 1.2;

				// Select a color class based on index
				const colorClass = colorClasses[index % colorClasses.length];

				const categoryTag = categoryCloud.createEl("div", {
					text: `${category.category} (${category.count})`,
					cls: `library-category-tag ${colorClass}`,
				});
				categoryTag.style.fontSize = `${fontSize}em`;
			});

			// Show category distribution - pie chart visualization
			const categoryDistributionContainer = sectionContent.createEl(
				"div",
				{
					cls: "library-category-distribution-container",
				}
			);

			categoryDistributionContainer.createEl("h4", {
				text: "توزيع التصنيفات",
				cls: "library-category-distribution-title",
			});

			const categoryPieChart = categoryDistributionContainer.createEl(
				"div",
				{
					cls: "library-category-pie-chart",
				}
			);

			let totalDegrees = 0;
			topCategories.slice(0, 5).forEach((category, index) => {
				const percentage =
					(category.count / this.props.items.length) * 100;
				const degrees = (percentage / 100) * 360;

				const pieSegment = categoryPieChart.createEl("div", {
					cls: `library-pie-segment ${colorClasses[index]}`,
				});

				pieSegment.style.transform = `rotate(${totalDegrees}deg)`;
				pieSegment.style.clip = `rect(0, 150px, 150px, 75px)`;

				if (degrees > 180) {
					pieSegment.addClass("large-segment");

					// For segments larger than 180 degrees, we need two parts
					const secondHalf = categoryPieChart.createEl("div", {
						cls: `library-pie-segment ${colorClasses[index]}`,
					});

					secondHalf.style.transform = `rotate(${
						totalDegrees + 180
					}deg)`;
					secondHalf.style.clip = `rect(0, 150px, 150px, 75px)`;
				}

				totalDegrees += degrees;

				// Label for segment
				const label = categoryDistributionContainer.createEl("div", {
					cls: "library-pie-chart-label",
				});

				const colorIndicator = label.createEl("span", {
					cls: `library-pie-chart-color ${colorClasses[index]}`,
				});

				label.createEl("span", {
					text: `${category.category}: ${Math.round(percentage)}%`,
					cls: "library-pie-chart-text",
				});
			});

			// Handle "Others" segment if there are more than 5 categories
			if (this.categoryData.length > 5) {
				const otherCategories = this.categoryData.slice(5);
				const otherCount = otherCategories.reduce(
					(sum, cat) => sum + cat.count,
					0
				);
				const otherPercentage =
					(otherCount / this.props.items.length) * 100;

				if (otherPercentage > 0) {
					const degrees = (otherPercentage / 100) * 360;

					const pieSegment = categoryPieChart.createEl("div", {
						cls: "library-pie-segment category-color-others",
					});

					pieSegment.style.transform = `rotate(${totalDegrees}deg)`;
					pieSegment.style.clip = `rect(0, 150px, 150px, 75px)`;

					if (degrees > 180) {
						pieSegment.addClass("large-segment");

						const secondHalf = categoryPieChart.createEl("div", {
							cls: "library-pie-segment category-color-others",
						});

						secondHalf.style.transform = `rotate(${
							totalDegrees + 180
						}deg)`;
						secondHalf.style.clip = `rect(0, 150px, 150px, 75px)`;
					}

					// Label for other segment
					const label = categoryDistributionContainer.createEl(
						"div",
						{
							cls: "library-pie-chart-label",
						}
					);

					const colorIndicator = label.createEl("span", {
						cls: "library-pie-chart-color category-color-others",
					});

					label.createEl("span", {
						text: `أخرى: ${Math.round(otherPercentage)}%`,
						cls: "library-pie-chart-text",
					});
				}
			}
		} else {
			sectionContent.createEl("div", {
				text: "لا توجد تصنيفات",
				cls: "library-no-data",
			});
		}

		this.categorySection = sectionContent;
	}

	/**
	 * Creates a summary card for time analysis
	 * @param container Parent container
	 * @param title Card title
	 * @param count Item count
	 * @returns Created card element
	 */
	private createSummaryCard(
		container: HTMLElement,
		title: string,
		count: number
	): HTMLElement {
		const card = container.createEl("div", {
			cls: "library-summary-card",
		});

		card.createEl("div", {
			text: title,
			cls: "library-summary-title",
		});

		card.createEl("div", {
			text: count.toString(),
			cls: "library-summary-value",
		});

		return card;
	}

	/**
	 * Creates a single stat card
	 * @param container Parent container
	 * @param label Card label
	 * @param value Card value
	 * @param subtitle Optional subtitle text
	 * @returns Created card element
	 */
	private createStatCard(
		container: HTMLElement,
		label: string,
		value: string,
		subtitle: string = ""
	): HTMLElement {
		const card = container.createEl("div", {
			cls: "library-stat-card",
		});

		card.createEl("div", {
			text: label,
			cls: "library-stat-label",
		});

		const valueContainer = card.createEl("div", {
			cls: "library-stat-value-container",
		});

		valueContainer.createEl("span", {
			text: value,
			cls: "library-stat-value",
		});

		if (subtitle) {
			valueContainer.createEl("span", {
				text: subtitle,
				cls: "library-stat-subtitle",
			});
		}

		return card;
	}

	/**
	 * Creates a progress bar for percentage statistics
	 * @param container Parent container
	 * @param label Progress bar label
	 * @param percent Percentage value (0-100)
	 * @returns Created progress element
	 */
	private createProgressBar(
		container: HTMLElement,
		label: string,
		percent: number
	): HTMLElement {
		const progressContainer = container.createEl("div", {
			cls: "library-progress-container-wrapper",
		});

		progressContainer.createEl("div", {
			text: label,
			cls: "library-progress-label",
		});

		const progressBarContainer = progressContainer.createEl("div", {
			cls: "library-progress-container",
		});

		const progressBar = progressBarContainer.createEl("div", {
			cls: "library-progress-bar",
		});

		progressBar.style.width = `${percent}%`;

		// Create progress segments for visual reference
		for (let i = 1; i < 4; i++) {
			progressBarContainer.createEl("div", {
				cls: "library-progress-segment",
			}).style.left = `${i * 25}%`;
		}

		const percentText = progressBarContainer.createEl("div", {
			text: `${Math.round(percent)}%`,
			cls: "library-progress-text",
		});

		return progressContainer;
	}

	/**
	 * Toggles the collapse state of the dashboard
	 */
	private toggleDashboardCollapse(): void {
		if (!this.dashboardContainer) return;

		this.isDashboardCollapsed = !this.isDashboardCollapsed;

		// Toggle class on container
		this.dashboardContainer.toggleClass(
			"collapsed",
			this.isDashboardCollapsed
		);

		// Toggle display of sections container
		const sectionsContainer = this.dashboardContainer.querySelector(
			".library-dashboard-sections-container"
		) as HTMLElement;
		if (sectionsContainer) {
			sectionsContainer.style.display = this.isDashboardCollapsed
				? "none"
				: "block";
		}

		// Update collapse button icon
		const collapseIcon = this.dashboardContainer.querySelector(
			".library-dashboard-collapse-icon"
		) as HTMLElement;
		if (collapseIcon) {
			collapseIcon.empty();
			setIcon(
				collapseIcon,
				this.isDashboardCollapsed ? "chevron-down" : "chevron-up"
			);
		}

		// Save state to localStorage
		this.saveCollapseState();
	}

	/**
	 * Toggles the collapse state of a section
	 * @param sectionType Section type identifier
	 * @param section Section element
	 * @param sectionContent Section content element
	 * @param collapseIcon Collapse icon element
	 */
	private toggleSectionCollapse(
		sectionType: DashboardSectionType,
		section: HTMLElement,
		sectionContent: HTMLElement,
		collapseIcon: HTMLElement
	): void {
		const isCollapsed = this.collapsedSections.has(sectionType);

		if (isCollapsed) {
			// Expand section
			this.collapsedSections.delete(sectionType);
			section.removeClass("collapsed");
			sectionContent.style.display = "block";
			collapseIcon.empty();
			setIcon(collapseIcon, "chevron-up");
		} else {
			// Collapse section
			this.collapsedSections.add(sectionType);
			section.addClass("collapsed");
			sectionContent.style.display = "none";
			collapseIcon.empty();
			setIcon(collapseIcon, "chevron-down");
		}

		// Save state to localStorage
		this.saveCollapseState();
	}

	/**
	 * Saves collapse state to localStorage
	 */
	private saveCollapseState(): void {
		try {
			// Save dashboard collapse state
			localStorage.setItem(
				BOOK_DASHBOARD_COLLAPSED_KEY,
				this.isDashboardCollapsed ? "true" : "false"
			);

			// Save section collapse states
			const sectionStates: Record<string, boolean> = {};

			["core", "status", "time", "authors", "categories"].forEach(
				(section) => {
					sectionStates[section] = this.collapsedSections.has(
						section as DashboardSectionType
					);
				}
			);

			localStorage.setItem(
				BOOK_DASHBOARD_SECTIONS_KEY,
				JSON.stringify(sectionStates)
			);
		} catch (error) {
			console.warn("Failed to save dashboard collapse state:", error);
		}
	}

	/**
	 * Loads collapse state from localStorage
	 */
	private loadCollapseState(): void {
		try {
			// Load dashboard collapse state
			const dashboardCollapsed = localStorage.getItem(
				BOOK_DASHBOARD_COLLAPSED_KEY
			);
			if (dashboardCollapsed) {
				this.isDashboardCollapsed = dashboardCollapsed === "true";
			}

			// Load section collapse states
			const sectionStates = localStorage.getItem(
				BOOK_DASHBOARD_SECTIONS_KEY
			);
			if (sectionStates) {
				const states = JSON.parse(sectionStates) as Record<
					string,
					boolean
				>;

				this.collapsedSections.clear();

				Object.entries(states).forEach(([section, isCollapsed]) => {
					if (isCollapsed) {
						this.collapsedSections.add(
							section as DashboardSectionType
						);
					}
				});
			}
		} catch (error) {
			console.warn("Failed to load dashboard collapse state:", error);
		}
	}

	/**
	 * Gets month name in the selected calendar system
	 * @param date Date to get month name for
	 * @returns Month name in the selected calendar
	 */
	private getMonthName(date: Date): string {
		if (this.props.settings.hijriCalendar.useHijriCalendar) {
			// Hijri month names
			const hijriMonths = [
				"محرم",
				"صفر",
				"ربيع الأول",
				"ربيع الثاني",
				"جمادى الأولى",
				"جمادى الثانية",
				"رجب",
				"شعبان",
				"رمضان",
				"شوال",
				"ذو القعدة",
				"ذو الحجة",
			];

			const hijriMoment = moment(date);
			const hijriMonth = parseInt(hijriMoment.format("iM")) - 1;
			return hijriMonths[hijriMonth] || "";
		} else {
			// Gregorian month names
			const gregorianMonths = [
				"يناير",
				"فبراير",
				"مارس",
				"أبريل",
				"مايو",
				"يونيو",
				"يوليو",
				"أغسطس",
				"سبتمبر",
				"أكتوبر",
				"نوفمبر",
				"ديسمبر",
			];

			return gregorianMonths[date.getMonth()] || "";
		}
	}

	/**
	 * Calculates all statistics for the dashboard
	 */
	private calculateAllStatistics(): void {
		this.coreStats = this.calculateCoreStatistics();
		this.statusDistribution = this.calculateStatusDistribution();
		this.timeAnalysis = this.calculateTimeAnalysis();
		this.authorStats = this.calculateAuthorStatistics();
		this.categoryData = this.calculateCategoryData();
	}

	/**
	 * Calculates core statistics
	 * @returns Core statistics object
	 */
	private calculateCoreStatistics(): BookCoreStatistics {
		// Filter to ensure we only process book items
		const bookItems = this.props.items.filter(
			(item) => item.type === "كتاب"
		) as BookItem[];

		if (bookItems.length === 0) {
			return {
				totalBooks: 0,
				readBooks: 0,
				readingBooks: 0,
				unreadBooks: 0,
				inListBooks: 0,
				percentRead: 0,
				totalPages: 0,
				pagesRead: 0,
				averageLength: 0,
				averageRating: 0,
				recentlyAdded: 0,
				SizeMB: 0,
			};
		}

		// Initial values
		let readBooks = 0;
		let readingBooks = 0;
		let unreadBooks = 0;
		let inListBooks = 0;
		let totalPages = 0;
		let pagesRead = 0;
		let totalRating = 0;
		let booksWithRating = 0;
		let recentlyAdded = 0;

		// Get date 30 days ago
		const thirtyDaysAgo = moment().subtract(30, "days");

		// Process each book
		bookItems.forEach((book) => {
			// Count by status
			if (book.status) {
				// Update status-specific counts
				if (book.status === BOOK_STATUS.READ) {
					readBooks++;
					// Add pages to read count
					pagesRead += book.pageCount || 0;
				} else if (book.status === BOOK_STATUS.READING) {
					readingBooks++;
				} else if (book.status === BOOK_STATUS.NOT_READ) {
					unreadBooks++;
				} else if (book.status === BOOK_STATUS.IN_LIST) {
					inListBooks++;
				}
			} else {
				unreadBooks++;
			}

			// Add to total pages
			totalPages += book.pageCount || 0;

			// Track ratings
			if (book.rating && book.rating > 0) {
				totalRating += book.rating;
				booksWithRating++;
			}

			// Check if added in last 30 days
			if (book.dateAdded) {
				const addedDate = moment(book.dateAdded);
				if (addedDate.isAfter(thirtyDaysAgo)) {
					recentlyAdded++;
				}
			}
		});

		// Calculate percentages and averages
		const totalBooks = bookItems.length;
		const percentRead = totalBooks > 0 ? (readBooks / totalBooks) * 100 : 0;
		const averageLength =
			totalBooks > 0 ? Math.round(totalPages / totalBooks) : 0;
		const averageRating =
			booksWithRating > 0 ? totalRating / booksWithRating : 0;

		// Calculate actual storage size
		let totalSizeBytes = 0;
		this.props.items.forEach((item) => {
			const file = this.props.app.vault.getAbstractFileByPath(
				item.filePath
			);
			if (file instanceof TFile) {
				totalSizeBytes += file.stat.size;
			}
		});
		const actualSizeMB = totalSizeBytes / (1024 * 1024); // Convert bytes to MB

		return {
			totalBooks,
			readBooks,
			readingBooks,
			unreadBooks,
			inListBooks,
			percentRead,
			totalPages,
			pagesRead,
			averageLength,
			averageRating,
			recentlyAdded,
			SizeMB: actualSizeMB,
		};
	}

	/**
	 * Calculates status distribution
	 * @returns Array of status distribution data
	 */
	private calculateStatusDistribution(): BookStatusDistribution[] {
		const statusMap = new Map<
			string,
			{
				count: number;
				pageCount: number;
			}
		>();

		// Get total items for percentage calculation
		const totalBooks = this.props.items.length;

		// Count items and pages by status
		this.props.items.forEach((item) => {
			const bookItem = item as BookItem;
			const status = bookItem.status || "غير معروف";
			const pageCount = bookItem.pageCount || 0;

			// Update status map
			if (statusMap.has(status)) {
				const existing = statusMap.get(status)!;
				existing.count++;
				existing.pageCount += pageCount;
			} else {
				statusMap.set(status, {
					count: 1,
					pageCount: pageCount,
				});
			}
		});

		// Convert map to array with percentages
		const result: BookStatusDistribution[] = [];

		statusMap.forEach((data, status) => {
			const percentage =
				totalBooks > 0 ? (data.count / totalBooks) * 100 : 0;

			result.push({
				status,
				count: data.count,
				percentage,
				pageCount: data.pageCount,
			});
		});

		// Sort by count (descending)
		return result.sort((a, b) => b.count - a.count);
	}

	/**
	 * Calculates time-based analysis with calendar support
	 * @returns Array of time analysis data by month
	 */
	private calculateTimeAnalysis(): TimeAnalysis[] {
		const timeMap = new Map<
			string,
			{
				count: number;
				pageCount: number;
				date: Date;
			}
		>();

		// Group items by month
		this.props.items.forEach((item) => {
			if (!item.dateAdded) return;

			try {
				const date = new Date(item.dateAdded);
				const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1)
					.toString()
					.padStart(2, "0")}`;

				const bookItem = item as BookItem;
				const pageCount = bookItem.pageCount || 0;

				// Update time map
				if (timeMap.has(yearMonth)) {
					const existing = timeMap.get(yearMonth)!;
					existing.count++;
					existing.pageCount += pageCount;
				} else {
					timeMap.set(yearMonth, {
						count: 1,
						pageCount: pageCount,
						date: new Date(date.getFullYear(), date.getMonth(), 1),
					});
				}
			} catch (error) {
				console.warn("Error parsing date", item.dateAdded, error);
			}
		});

		// Convert map to array with calendar-aware formatting
		const result: TimeAnalysis[] = [];

		timeMap.forEach((data, period) => {
			// Format the period display name using the selected calendar
			const monthName = this.getMonthName(data.date);
			const year = this.props.settings.hijriCalendar.useHijriCalendar
				? moment(data.date).format("iYYYY")
				: data.date.getFullYear().toString();

			const displayPeriod = `${monthName} ${year}`;

			result.push({
				period,
				count: data.count,
				pageCount: data.pageCount,
				displayPeriod,
				sortDate: data.date,
			});
		});

		// Sort by period (ascending)
		return result.sort(
			(a, b) => a.sortDate.getTime() - b.sortDate.getTime()
		);
	}

	/**
	 * Calculates author statistics
	 * @returns Array of author statistics
	 */
	private calculateAuthorStatistics(): AuthorStats[] {
		const authorMap = new Map<
			string,
			{
				count: number;
				pageCount: number;
				readPageCount: number;
			}
		>();

		// Get total books for percentage calculation
		const totalBooks = this.props.items.length;

		// Process books by author
		this.props.items.forEach((item) => {
			const bookItem = item as BookItem;
			if (!bookItem.author) return;

			const author = bookItem.author;
			const pageCount = bookItem.pageCount || 0;
			let readPages = 0;

			// Calculate read pages based on status
			if (bookItem.status === BOOK_STATUS.READ) {
				readPages = pageCount;
			} else if (bookItem.status === BOOK_STATUS.READING) {
				// Assume 50% read for reading books
				readPages = Math.round(pageCount * 0.5);
			}

			// Update author map
			if (authorMap.has(author)) {
				const existing = authorMap.get(author)!;
				existing.count++;
				existing.pageCount += pageCount;
				existing.readPageCount += readPages;
			} else {
				authorMap.set(author, {
					count: 1,
					pageCount: pageCount,
					readPageCount: readPages,
				});
			}
		});

		// Convert map to array with percentages
		const result: AuthorStats[] = [];

		authorMap.forEach((data, name) => {
			const percentage =
				totalBooks > 0 ? (data.count / totalBooks) * 100 : 0;

			const completionPercentage =
				data.pageCount > 0
					? (data.readPageCount / data.pageCount) * 100
					: 0;

			result.push({
				name,
				count: data.count,
				percentage,
				pageCount: data.pageCount,
				completionPercentage,
			});
		});

		// Sort by count (descending)
		return result.sort((a, b) => b.count - a.count);
	}

	/**
	 * Calculates category data
	 * @returns Array of category count data
	 */
	private calculateCategoryData(): { category: string; count: number }[] {
		const categoryMap = new Map<string, number>();

		// Count books by category
		this.props.items.forEach((item) => {
			if (!item.categories || !Array.isArray(item.categories)) return;

			item.categories.forEach((category) => {
				const count = categoryMap.get(category) || 0;
				categoryMap.set(category, count + 1);
			});
		});

		// Convert map to array
		const result: { category: string; count: number }[] = [];

		categoryMap.forEach((count, category) => {
			result.push({ category, count });
		});

		// Sort by count (descending)
		return result.sort((a, b) => b.count - a.count);
	}

	/**
	 * Cleans up component resources
	 */
	public destroy(): void {
		this.container = null;
		this.dashboardContainer = null;
		this.coreStatsSection = null;
		this.statusSection = null;
		this.timeAnalysisSection = null;
		this.authorsSection = null;
		this.categorySection = null;
	}
}
