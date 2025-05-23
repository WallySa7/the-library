/**
 * Export actions for The Library plugin
 * Handles exporting videos and other content
 */
import { App, Menu, Notice } from "obsidian";
import { CONTENT_TYPE } from "../../core/constants";
import { ContentType, ExportOptions } from "../../core/uiTypes";
import { LibrarySettings } from "../../core/settings";

/**
 * Handles export functionality for videos, books, and benefits
 */
export class ExportActions {
	private app: App;
	private plugin: any;
	private settings: LibrarySettings;

	/**
	 * Creates a new ExportActions instance
	 * @param app Obsidian app instance
	 * @param plugin Plugin instance
	 * @param settings Plugin settings
	 */
	constructor(app: App, plugin: any, settings: LibrarySettings) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
	}

	/**
	 * Shows the export menu with appropriate options
	 * @param buttonEl Button element to position the menu against
	 * @param contentType Current content type
	 * @param selectedItems Optional array of selected items to export
	 */
	public showExportMenu(
		buttonEl: HTMLElement,
		contentType: ContentType,
		selectedItems: string[] = []
	): void {
		const menu = new Menu();

		if (contentType === CONTENT_TYPE.VIDEO) {
			this.buildVideoExportMenu(menu, selectedItems);
		} else if (contentType === CONTENT_TYPE.BOOK) {
			this.buildBookExportMenu(menu, selectedItems);
		}

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Builds the book export menu
	 * @param menu Menu instance to build
	 * @param selectedItems Optional array of selected items
	 */
	private buildBookExportMenu(
		menu: Menu,
		selectedItems: string[] = []
	): void {
		// JSON export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportBooks({
						format: "json",
						selectedItems,
						contentType: CONTENT_TYPE.BOOK,
					});
				});
		});

		// JSON with content export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON مع المحتوى")
				.setIcon("file-text")
				.onClick(async () => {
					await this.exportBooks({
						format: "jsonWithContent",
						selectedItems,
						contentType: CONTENT_TYPE.BOOK,
					});
				});
		});

		// CSV export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("table")
				.onClick(async () => {
					await this.exportBooks({
						format: "csv",
						selectedItems,
						contentType: CONTENT_TYPE.BOOK,
					});
				});
		});

		// If there are selected items, add a separator and selected-only options
		if (selectedItems.length > 0) {
			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} كتاب محدد إلى JSON`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooks({
							format: "json",
							selectedItems,
							contentType: CONTENT_TYPE.BOOK,
						});
					});
			});

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} كتاب محدد إلى JSON مع المحتوى`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooks({
							format: "jsonWithContent",
							selectedItems,
							contentType: CONTENT_TYPE.BOOK,
						});
					});
			});

			menu.addItem((item) => {
				item.setTitle(`تصدير ${selectedItems.length} كتاب محدد إلى CSV`)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooks({
							format: "csv",
							selectedItems,
							contentType: CONTENT_TYPE.BOOK,
						});
					});
			});
		}
	}

	/**
	 * Builds the video export menu
	 * @param menu Menu instance to build
	 * @param selectedItems Optional array of selected items
	 */
	private buildVideoExportMenu(
		menu: Menu,
		selectedItems: string[] = []
	): void {
		// JSON export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportVideos({
						format: "json",
						selectedItems,
					});
				});
		});

		// JSON with content export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON مع المحتوى")
				.setIcon("file-text")
				.onClick(async () => {
					await this.exportVideos({
						format: "jsonWithContent",
						selectedItems,
					});
				});
		});

		// CSV export option
		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("table")
				.onClick(async () => {
					await this.exportVideos({
						format: "csv",
						selectedItems,
					});
				});
		});

		// If there are selected items, add a separator and selected-only options
		if (selectedItems.length > 0) {
			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideos({
							format: "json",
							selectedItems,
						});
					});
			});

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON مع المحتوى`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideos({
							format: "jsonWithContent",
							selectedItems,
						});
					});
			});

			menu.addItem((item) => {
				item.setTitle(`تصدير ${selectedItems.length} عنصر محدد إلى CSV`)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideos({
							format: "csv",
							selectedItems,
						});
					});
			});
		}
	}

	/**
	 * Exports books based on specified options
	 * @param options Export options
	 */
	private async exportBooks(options: ExportOptions): Promise<void> {
		try {
			const loadingNotice = new Notice("⏳ جاري تصدير البيانات...", 0);

			let data: string;
			let filename: string;
			let contentType: string;

			const dateStr = new Date().toISOString().slice(0, 10);

			switch (options.format) {
				case "json":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-books-export-${dateStr}.json`;
					contentType = "application/json";
					break;

				case "jsonWithContent":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-books-export-with-content-${dateStr}.json`;
					contentType = "application/json";
					break;

				case "csv":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-books-export-${dateStr}.csv`;
					contentType = "text/csv;charset=utf-8;";
					break;

				default:
					loadingNotice.hide();
					new Notice("❌ صيغة تصدير غير صالحة");
					return;
			}

			// Create and download file
			this.downloadFile(data, filename, contentType);

			loadingNotice.hide();
			new Notice("✅ تم تصدير البيانات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Exports videos based on specified options
	 * @param options Export options
	 */
	private async exportVideos(options: ExportOptions): Promise<void> {
		try {
			const loadingNotice = new Notice("⏳ جاري تصدير البيانات...", 0);

			let data: string;
			let filename: string;
			let contentType: string;

			const dateStr = new Date().toISOString().slice(0, 10);

			switch (options.format) {
				case "json":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-videos-export-${dateStr}.json`;
					contentType = "application/json";
					break;

				case "jsonWithContent":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-videos-export-with-content-${dateStr}.json`;
					contentType = "application/json";
					break;

				case "csv":
					data = await this.plugin.dataService.exportContent(options);
					filename = `library-videos-export-${dateStr}.csv`;
					contentType = "text/csv;charset=utf-8;";
					break;

				default:
					loadingNotice.hide();
					new Notice("❌ صيغة تصدير غير صالحة");
					return;
			}

			// Create and download file
			this.downloadFile(data, filename, contentType);

			loadingNotice.hide();
			new Notice("✅ تم تصدير البيانات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Helper function to download a file
	 * @param content File content
	 * @param filename Filename
	 * @param contentType MIME type
	 */
	private downloadFile(
		content: string,
		filename: string,
		contentType: string
	): void {
		// Use Blob for better memory efficiency
		const blob = new Blob([content], { type: contentType });

		// Create object URL for the blob
		const url = URL.createObjectURL(blob);

		// Create a link element
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;

		// Add to body, click, and remove
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}
}
