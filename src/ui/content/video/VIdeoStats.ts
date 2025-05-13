/**
 * Component for displaying video statistics
 */
import { ContentComponentProps } from "../../../core/uiTypes";
import {
	LibraryItem,
	VideoItem,
	PlaylistItem,
} from "../../../core/contentTypes";
import { formatDuration } from "../../../utils/durationUtils";

/**
 * Props for VideoStats component
 */
interface VideoStatsProps extends ContentComponentProps {
	/** All available items */
	items: LibraryItem[];
}

/**
 * Statistics data structure
 */
interface VideoStatistics {
	/** Number of videos */
	videoCount: number;

	/** Number of playlists */
	playlistCount: number;

	/** Total duration formatted */
	totalDuration: string;

	/** Total watched duration formatted */
	watchedDuration: string;

	/** Percentage of content watched */
	percentWatched: number;
}

/**
 * Displays statistics for video content
 */
export class VideoStats {
	private props: VideoStatsProps;
	private container: HTMLElement | null = null;

	/**
	 * Creates a new VideoStats component
	 * @param props Component props
	 */
	constructor(props: VideoStatsProps) {
		this.props = props;
	}

	/**
	 * Renders the video statistics
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Calculate statistics
		const stats = this.calculateStats();

		// Create stats cards container
		const statsContainer = container.createEl("div", {
			cls: "library-stats-cards",
		});

		// Create individual stat cards
		this.createStatCard(
			statsContainer,
			"عدد المقاطع",
			stats.videoCount.toString()
		);

		this.createStatCard(
			statsContainer,
			"عدد السلاسل",
			stats.playlistCount.toString()
		);

		this.createStatCard(
			statsContainer,
			"المدة الإجمالية",
			stats.totalDuration
		);

		this.createStatCard(statsContainer, "المشاهد", stats.watchedDuration);

		// Progress bar for watched percentage
		this.createProgressBar(
			statsContainer,
			"نسبة المشاهدة",
			stats.percentWatched
		);
	}

	/**
	 * Creates a single stat card
	 * @param container Parent container
	 * @param label Card label
	 * @param value Card value
	 * @returns Created card element
	 */
	private createStatCard(
		container: HTMLElement,
		label: string,
		value: string
	): HTMLElement {
		const card = container.createEl("div", { cls: "library-stat-card" });
		card.createEl("div", { text: label, cls: "library-stat-label" });
		card.createEl("div", { text: value, cls: "library-stat-value" });
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
		const card = container.createEl("div", { cls: "library-stat-card" });
		card.createEl("div", { text: label, cls: "library-stat-label" });

		const progressContainer = card.createEl("div", {
			cls: "library-progress-container",
		});

		const progressBar = progressContainer.createEl("div", {
			cls: "library-progress-bar",
		});

		progressBar.style.width = `${percent}%`;

		const percentText = progressContainer.createEl("div", {
			text: `${Math.round(percent)}%`,
			cls: "library-progress-text",
		});

		return card;
	}

	/**
	 * Calculates statistics for video content
	 * @returns Video statistics object
	 */
	private calculateStats(): VideoStatistics {
		let totalSeconds = 0;
		let watchedSeconds = 0;
		let videoCount = 0;
		let playlistCount = 0;

		// Process all items
		this.props.items.forEach((item) => {
			let durationSeconds = 0;

			if ("durationSeconds" in item) {
				// Regular video
				videoCount++;
				durationSeconds = item.durationSeconds;
			} else if ("itemCount" in item) {
				// Playlist
				playlistCount++;
				durationSeconds = this.parseDuration(item.duration);
			}

			totalSeconds += durationSeconds;

			// Count watched content
			if (item.status === "تمت المشاهدة") {
				watchedSeconds += durationSeconds;
			} else if (item.status === "قيد المشاهدة") {
				// Assume 50% watched for in-progress items
				watchedSeconds += Math.round(durationSeconds * 0.5);
			}
		});

		// Calculate percentage watched
		const percentWatched =
			totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;

		return {
			videoCount,
			playlistCount,
			totalDuration: formatDuration(totalSeconds),
			watchedDuration: formatDuration(watchedSeconds),
			percentWatched,
		};
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
	}
}
