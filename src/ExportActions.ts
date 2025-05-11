// src/views/unifiedView/actions/EnhancedExportActions.ts
import { App, Menu, Notice } from "obsidian";
import { CONTENT_TYPE } from "../src/constants";
import { ContentType } from "../src/types";
import { DataService } from "../src/dataService";

/**
 * Enhanced export functionality for videos, books, and benefits
 * With optimized file handling and progress reporting
 */
export class ExportActions {
	private app: App;
	private plugin: any;
	private dataService: DataService;

	/**
	 * Creates a new instance of EnhancedExportActions
	 * @param app - Obsidian app instance
	 * @param plugin - Plugin instance
	 * @param dataService - Data service
	 */
	constructor(app: App, plugin: any, dataService: DataService) {
		this.app = app;
		this.plugin = plugin;
		this.dataService = dataService;
	}

	/**
	 * Shows the export menu with appropriate options
	 * @param buttonEl - Button element to position the menu against
	 * @param contentType - Current content type
	 * @param selectedItems - Optional array of selected items to export
	 */
	public showExportMenu(
		buttonEl: HTMLElement,
		contentType: ContentType,
		selectedItems: string[] = []
	): void {
		const menu = new Menu();

		if (contentType === CONTENT_TYPE.VIDEOS) {
			this.buildVideoExportMenu(menu, selectedItems);
		}

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Builds the video export menu
	 * @param menu - Menu instance to build
	 * @param selectedItems - Optional array of selected items
	 */
	private buildVideoExportMenu(
		menu: Menu,
		selectedItems: string[] = []
	): void {
		// Video export options
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportVideosToJson();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON مع المحتوى")
				.setIcon("file-text")
				.onClick(async () => {
					await this.exportVideosToJsonWithContent();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("download")
				.onClick(async () => {
					await this.exportVideosToCsv();
				});
		});

		// Export selected items
		if (selectedItems.length > 0) {
			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToJson(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON مع المحتوى`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToJsonWithContent(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(`تصدير ${selectedItems.length} عنصر محدد إلى CSV`)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToCsv(selectedItems);
					});
			});
		}
	}

	/**
	 * Exports videos to JSON
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToJson(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const jsonData = await this.dataService.exportVideosToJson(
				selectedItems
			);

			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-videos-export-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			new Notice("✅ تم تصدير بيانات الفيديوهات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Exports videos to JSON with content
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToJsonWithContent(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const loadingNotice = new Notice(
				"⏳ جاري تصدير البيانات مع المحتوى...",
				0
			);

			const jsonData = await this.dataService.exportVideosWithContent(
				selectedItems
			);

			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-videos-export-with-content-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			loadingNotice.hide();
			new Notice("✅ تم تصدير بيانات الفيديوهات مع المحتوى بنجاح");
		} catch (error) {
			console.error("Error exporting data with content:", error);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات مع المحتوى");
		}
	}

	/**
	 * Exports videos to CSV
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToCsv(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const csvData = await this.dataService.exportVideosToCsv(
				selectedItems
			);

			// Create and download file
			this.downloadFile(
				csvData,
				`alrawi-videos-export-${new Date()
					.toISOString()
					.slice(0, 10)}.csv`,
				"text/csv;charset=utf-8;"
			);

			new Notice("✅ تم تصدير بيانات الفيديوهات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Helper function to download a file
	 * @param content - The content of the file
	 * @param filename - The filename
	 * @param contentType - The content type
	 */
	private downloadFile(
		content: string,
		filename: string,
		contentType: string
	): void {
		// Use Blob for better memory efficiency and handling of large files
		const blob = new Blob([content], { type: contentType });

		// Create object URL for the blob
		const url = URL.createObjectURL(blob);

		// Create a link element
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;

		// Append to body, click, and remove - this ensures it works across browsers
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}
}
