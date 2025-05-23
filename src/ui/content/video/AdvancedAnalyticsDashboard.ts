/**
 * Analytics Dashboard component
 * Provides detailed statistics and visualizations for library content
 * with collapsible sections
 */
import { moment, setIcon, TFile } from "obsidian";
import { ContentComponentProps } from "../../../core/uiTypes";
import { LibraryItem } from "../../../core/contentTypes";
import { formatDuration } from "../../../utils/durationUtils";
import { VIDEO_STATUS } from "src/core/constants";

// Storage key for dashboard state
const DASHBOARD_COLLAPSED_KEY = "library-dashboard-collapsed";
const DASHBOARD_SECTIONS_KEY = "library-dashboard-sections";

/**
 * Props for AnalyticsDashboard component
 */
interface AnalyticsDashboardProps extends ContentComponentProps {
	/** All available items */
	items: LibraryItem[];
}

/**
 * Dashboard section types
 */
type DashboardSectionType =
	| "core"
	| "status"
	| "time"
	| "presenters"
	| "categories";

/**
 * Core statistics data structure
 */
interface CoreStatistics {
	/** Number of videos */
	videoCount: number;
	/** Number of playlists */
	playlistCount: number;
	/** Total duration in seconds */
	totalDurationSeconds: number;
	/** Total formatted duration */
	totalDuration: string;
	/** Watched duration in seconds */
	watchedDurationSeconds: number;
	/** Watched formatted duration */
	watchedDuration: string;
	/** Percentage of content watched */
	percentWatched: number;
	/** Average video duration in seconds */
	averageVideoDurationSeconds: number;
	/** Average video duration formatted */
	averageVideoDuration: string;
	/** Content added in last 30 days */
	recentlyAddedCount: number;
	/** Total size in memory (MB) */
	SizeMB: number;
}

/**
 * Status distribution data structure
 */
interface StatusDistribution {
	/** Status name */
	status: string;
	/** Count of items with this status */
	count: number;
	/** Percentage of total items */
	percentage: number;
	/** Total duration of items with this status */
	durationSeconds: number;
	/** Formatted duration */
	duration: string;
}

/**
 * Time-based analysis data structure
 */
interface TimeAnalysis {
	/** Period label (month/year) */
	period: string;
	/** Number of items added in this period */
	count: number;
	/** Total duration added in this period (seconds) */
	durationSeconds: number;
	/** Formatted duration */
	duration: string;
}

/**
 * Presenter statistics data structure
 */
interface PresenterStats {
	/** Presenter name */
	name: string;
	/** Count of items by this presenter */
	count: number;
	/** Percentage of total items */
	percentage: number;
	/** Total duration of items by this presenter */
	durationSeconds: number;
	/** Formatted duration */
	duration: string;
	/** Watch completion percentage */
	completionPercentage: number;
}

/**
 * dashboard for analytics and statistics
 * with collapsible sections
 */
export class AnalyticsDashboard {
	private props: AnalyticsDashboardProps;
	private container: HTMLElement | null = null;

	// Dashboard sections
	private dashboardContainer: HTMLElement | null = null;
	private coreStatsSection: HTMLElement | null = null;
	private statusSection: HTMLElement | null = null;
	private timeAnalysisSection: HTMLElement | null = null;
	private presentersSection: HTMLElement | null = null;
	private categorySection: HTMLElement | null = null;

	// Statistics data
	private coreStats: CoreStatistics | null = null;
	private statusDistribution: StatusDistribution[] = [];
	private timeAnalysis: TimeAnalysis[] = [];
	private presenterStats: PresenterStats[] = [];
	private categoryData: { category: string; count: number }[] = [];

	// Collapsible state
	private isDashboardCollapsed: boolean = false;
	private collapsedSections: Set<DashboardSectionType> = new Set();

	/**
	 * Creates a new Analytics Dashboard
	 * @param props Component props
	 */
	constructor(props: AnalyticsDashboardProps) {
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
		this.renderPresenterAnalysis(sectionsContainer);
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
			text: "لوحة التحليل المتقدمة",
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
			text: `إجمالي المحتوى: ${this.props.items.length} عنصر`,
		});

		subtitle.createEl("span", {
			text: `تم التحديث: ${moment().format("YYYY-MM-DD HH:mm")}`,
		});
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
			"المقاطع",
			this.coreStats.videoCount.toString(),
			"مقطع"
		);

		this.createStatCard(
			statsContainer,
			"السلاسل",
			this.coreStats.playlistCount.toString(),
			"سلسلة"
		);

		this.createStatCard(
			statsContainer,
			"المدة الإجمالية",
			this.coreStats.totalDuration,
			""
		);

		this.createStatCard(
			statsContainer,
			"تمت المشاهدة",
			this.coreStats.watchedDuration,
			`(${Math.round(this.coreStats.percentWatched)}%)`
		);

		this.createStatCard(
			statsContainer,
			"متوسط المدة",
			this.coreStats.averageVideoDuration,
			"لكل مقطع"
		);

		this.createStatCard(
			statsContainer,
			"أضيف مؤخراً",
			this.coreStats.recentlyAddedCount.toString(),
			"آخر 30 يوم"
		);

		// Progress bar for watched percentage
		this.createProgressBar(
			sectionContent,
			"نسبة المشاهدة",
			this.coreStats.percentWatched
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

		this.coreStatsSection = sectionContent;
	}

	/**
	 * Renders the status distribution section
	 * @param container Parent container
	 */
	private renderStatusDistribution(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"توزيع حالة المشاهدة",
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
					text: status.duration,
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
	 * Renders the time analysis section
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
				.sort((a, b) => b.period.localeCompare(a.period))
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

				// Format the month label in Arabic
				const [year, month] = period.period.split("-");
				const monthName = this.getArabicMonthName(parseInt(month));

				label.createEl("span", {
					text: `${monthName} ${year}`,
					cls: "library-time-period",
				});

				bar.setAttribute(
					"title",
					`${period.count} عنصر - ${period.duration}`
				);
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
	 * Renders the presenter analysis section
	 * @param container Parent container
	 */
	private renderPresenterAnalysis(container: HTMLElement): void {
		const sectionContent = this.createCollapsibleSection(
			container,
			"تحليل الملقين",
			"presenters"
		);

		// Only show top 5 presenters
		const topPresenters = this.presenterStats
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		if (topPresenters.length > 0) {
			// Presenter chart - visualize top presenters
			const chartContainer = sectionContent.createEl("div", {
				cls: "library-chart-container library-presenter-chart-container",
			});

			// Create horizontal bars for top 5 presenters
			topPresenters.forEach((presenter) => {
				const presenterBar = chartContainer.createEl("div", {
					cls: "library-presenter-bar",
				});

				presenterBar.createEl("div", {
					cls: "library-presenter-name",
					text: presenter.name,
				});

				const barContainer = presenterBar.createEl("div", {
					cls: "library-presenter-bar-container",
				});

				const bar = barContainer.createEl("div", {
					cls: "library-presenter-bar-fill",
				});
				bar.style.width = `${presenter.percentage}%`;

				const countLabel = barContainer.createEl("div", {
					cls: "library-presenter-count-label",
					text: `${presenter.count} (${Math.round(
						presenter.percentage
					)}%)`,
				});
			});

			// Table with detailed presenter info
			const presenterTable = sectionContent.createEl("table", {
				cls: "library-presenter-table",
			});

			// Table header
			const thead = presenterTable.createEl("thead");
			const headerRow = thead.createEl("tr");

			headerRow.createEl("th", { text: "الملقي" });
			headerRow.createEl("th", { text: "العدد" });
			headerRow.createEl("th", { text: "النسبة" });
			headerRow.createEl("th", { text: "المدة" });
			headerRow.createEl("th", { text: "نسبة الإكمال" });

			// Table body
			const tbody = presenterTable.createEl("tbody");

			topPresenters.forEach((presenter) => {
				const row = tbody.createEl("tr");

				row.createEl("td", { text: presenter.name });
				row.createEl("td", { text: presenter.count.toString() });
				row.createEl("td", {
					text: `${Math.round(presenter.percentage)}%`,
				});
				row.createEl("td", { text: presenter.duration });

				// Completion percentage with visual indicator
				const completionCell = row.createEl("td");
				const completionIndicator = completionCell.createEl("div", {
					cls: "library-completion-indicator",
				});

				const completionBar = completionIndicator.createEl("div", {
					cls: "library-completion-bar",
				});
				completionBar.style.width = `${presenter.completionPercentage}%`;

				completionIndicator.createEl("span", {
					text: `${Math.round(presenter.completionPercentage)}%`,
					cls: "library-completion-text",
				});
			});

			// Show total count of presenters
			if (this.presenterStats.length > 5) {
				sectionContent.createEl("div", {
					text: `إجمالي الملقين: ${this.presenterStats.length}`,
					cls: "library-presenter-count",
				});
			}
		} else {
			sectionContent.createEl("div", {
				text: "لا توجد بيانات كافية",
				cls: "library-no-data",
			});
		}

		this.presentersSection = sectionContent;
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
				DASHBOARD_COLLAPSED_KEY,
				this.isDashboardCollapsed ? "true" : "false"
			);

			// Save section collapse states
			const sectionStates: Record<string, boolean> = {};

			["core", "status", "time", "presenters", "categories"].forEach(
				(section) => {
					sectionStates[section] = this.collapsedSections.has(
						section as DashboardSectionType
					);
				}
			);

			localStorage.setItem(
				DASHBOARD_SECTIONS_KEY,
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
				DASHBOARD_COLLAPSED_KEY
			);
			if (dashboardCollapsed) {
				this.isDashboardCollapsed = dashboardCollapsed === "true";
			}

			// Load section collapse states
			const sectionStates = localStorage.getItem(DASHBOARD_SECTIONS_KEY);
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
	 * Gets Arabic month name from month number
	 * @param month Month number (1-12)
	 * @returns Arabic month name
	 */
	private getArabicMonthName(month: number): string {
		const arabicMonths = [
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

		return arabicMonths[month - 1] || "";
	}

	/**
	 * Calculates all statistics for the dashboard
	 */
	private calculateAllStatistics(): void {
		this.coreStats = this.calculateCoreStatistics();
		this.statusDistribution = this.calculateStatusDistribution();
		this.timeAnalysis = this.calculateTimeAnalysis();
		this.presenterStats = this.calculatePresenterStatistics();
		this.categoryData = this.calculateCategoryData();
	}

	/**
	 * Calculates core statistics
	 * @returns Core statistics object
	 */
	private calculateCoreStatistics(): CoreStatistics {
		let videoCount = 0;
		let playlistCount = 0;
		let totalSeconds = 0;
		let watchedSeconds = 0;
		let videoTotalSeconds = 0;
		let recentlyAddedCount = 0;

		// Get date 30 days ago
		const thirtyDaysAgo = moment().subtract(30, "days");

		// Process all items
		this.props.items.forEach((item) => {
			let durationSeconds = 0;

			if ("durationSeconds" in item) {
				// Regular video
				videoCount++;
				durationSeconds = item.durationSeconds;
				videoTotalSeconds += durationSeconds;
			} else if ("itemCount" in item) {
				// Playlist
				playlistCount++;
				durationSeconds = this.parseDuration(item.duration);
			}

			totalSeconds += durationSeconds;

			// Count watched content
			if (item.status === VIDEO_STATUS.WATCHED) {
				watchedSeconds += durationSeconds;
			} else if (item.status === VIDEO_STATUS.IN_PROGRESS) {
				// Assume 50% watched for in-progress items
				watchedSeconds += Math.round(durationSeconds * 0.5);
			}

			// Check if added in the last 30 days
			if (item.dateAdded) {
				const addedDate = moment(item.dateAdded);
				if (addedDate.isAfter(thirtyDaysAgo)) {
					recentlyAddedCount++;
				}
			}
		});

		// Calculate percentage watched
		const percentWatched =
			totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;

		// Calculate average video duration
		const avgVideoDurationSeconds =
			videoCount > 0 ? Math.round(videoTotalSeconds / videoCount) : 0;

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
			videoCount,
			playlistCount,
			totalDurationSeconds: totalSeconds,
			totalDuration: formatDuration(totalSeconds),
			watchedDurationSeconds: watchedSeconds,
			watchedDuration: formatDuration(watchedSeconds),
			percentWatched,
			averageVideoDurationSeconds: avgVideoDurationSeconds,
			averageVideoDuration: formatDuration(avgVideoDurationSeconds),
			recentlyAddedCount,
			SizeMB: actualSizeMB, // Now using actual size
		};
	}

	/**
	 * Calculates status distribution
	 * @returns Array of status distribution data
	 */
	private calculateStatusDistribution(): StatusDistribution[] {
		const statusMap = new Map<
			string,
			{
				count: number;
				durationSeconds: number;
			}
		>();

		// Get total items for percentage calculation
		const totalItems = this.props.items.length;

		// Count items and duration by status
		this.props.items.forEach((item) => {
			const status = item.status || "غير معروف";
			let durationSeconds = 0;

			// Get duration
			if ("durationSeconds" in item) {
				durationSeconds = item.durationSeconds;
			} else if ("duration" in item) {
				durationSeconds = this.parseDuration(item.duration);
			}

			// Update status map
			if (statusMap.has(status)) {
				const existing = statusMap.get(status)!;
				existing.count++;
				existing.durationSeconds += durationSeconds;
			} else {
				statusMap.set(status, {
					count: 1,
					durationSeconds: durationSeconds,
				});
			}
		});

		// Convert map to array with percentages
		const result: StatusDistribution[] = [];

		statusMap.forEach((data, status) => {
			const percentage =
				totalItems > 0 ? (data.count / totalItems) * 100 : 0;

			result.push({
				status,
				count: data.count,
				percentage,
				durationSeconds: data.durationSeconds,
				duration: formatDuration(data.durationSeconds),
			});
		});

		// Sort by count (descending)
		return result.sort((a, b) => b.count - a.count);
	}

	/**
	 * Calculates time-based analysis
	 * @returns Array of time analysis data by month
	 */
	private calculateTimeAnalysis(): TimeAnalysis[] {
		const timeMap = new Map<
			string,
			{
				count: number;
				durationSeconds: number;
			}
		>();

		// Group items by month
		this.props.items.forEach((item) => {
			if (!item.dateAdded) return;

			try {
				const date = moment(item.dateAdded);
				const period = date.format("YYYY-MM"); // Group by month

				let durationSeconds = 0;

				// Get duration
				if ("durationSeconds" in item) {
					durationSeconds = item.durationSeconds;
				} else if ("duration" in item) {
					durationSeconds = this.parseDuration(item.duration);
				}

				// Update time map
				if (timeMap.has(period)) {
					const existing = timeMap.get(period)!;
					existing.count++;
					existing.durationSeconds += durationSeconds;
				} else {
					timeMap.set(period, {
						count: 1,
						durationSeconds: durationSeconds,
					});
				}
			} catch (error) {
				console.warn("Error parsing date", item.dateAdded, error);
			}
		});

		// Convert map to array
		const result: TimeAnalysis[] = [];

		timeMap.forEach((data, period) => {
			result.push({
				period,
				count: data.count,
				durationSeconds: data.durationSeconds,
				duration: formatDuration(data.durationSeconds),
			});
		});

		// Sort by period (ascending)
		return result.sort((a, b) => a.period.localeCompare(b.period));
	}

	/**
	 * Calculates presenter statistics
	 * @returns Array of presenter statistics
	 */
	private calculatePresenterStatistics(): PresenterStats[] {
		const presenterMap = new Map<
			string,
			{
				count: number;
				durationSeconds: number;
				watchedSeconds: number;
			}
		>();

		// Get total items for percentage calculation
		const totalItems = this.props.items.length;

		// Process items by presenter
		this.props.items.forEach((item) => {
			if (!("presenter" in item)) return;

			const presenter = item.presenter || "غير معروف";
			let durationSeconds = 0;
			let watchedSeconds = 0;

			// Get duration
			if ("durationSeconds" in item) {
				durationSeconds = item.durationSeconds;
			} else if ("duration" in item) {
				durationSeconds = this.parseDuration(item.duration);
			}

			// Calculate watched duration based on status
			if (item.status === VIDEO_STATUS.WATCHED) {
				watchedSeconds = durationSeconds;
			} else if (item.status === VIDEO_STATUS.IN_PROGRESS) {
				watchedSeconds = Math.round(durationSeconds * 0.5);
			}

			// Update presenter map
			if (presenterMap.has(presenter)) {
				const existing = presenterMap.get(presenter)!;
				existing.count++;
				existing.durationSeconds += durationSeconds;
				existing.watchedSeconds += watchedSeconds;
			} else {
				presenterMap.set(presenter, {
					count: 1,
					durationSeconds: durationSeconds,
					watchedSeconds: watchedSeconds,
				});
			}
		});

		// Convert map to array with percentages
		const result: PresenterStats[] = [];

		presenterMap.forEach((data, name) => {
			const percentage =
				totalItems > 0 ? (data.count / totalItems) * 100 : 0;

			const completionPercentage =
				data.durationSeconds > 0
					? (data.watchedSeconds / data.durationSeconds) * 100
					: 0;

			result.push({
				name,
				count: data.count,
				percentage,
				durationSeconds: data.durationSeconds,
				duration: formatDuration(data.durationSeconds),
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

		// Count items by category
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
	 * Parses duration string to seconds
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
	 * Cleans up component resources
	 */
	public destroy(): void {
		this.container = null;
		this.dashboardContainer = null;
		this.coreStatsSection = null;
		this.statusSection = null;
		this.timeAnalysisSection = null;
		this.presentersSection = null;
		this.categorySection = null;
	}
}
