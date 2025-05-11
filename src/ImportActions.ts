// src/views/unifiedView/actions/EnhancedImportActions.ts
import { App, Notice } from "obsidian";
import { CONTENT_TYPE } from "../src/constants";
import { ContentType } from "../src/types";
import { DataService } from "../src/dataService";

/**
 * Enhanced import functionality for videos, books, and benefits
 * With optimized file handling and progress reporting
 */
export class ImportActions {
	private app: App;
	private plugin: any;
	private dataService: DataService;

	/**
	 * Creates a new EnhancedImportActions instance
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
	 * Shows the import dialog
	 * @param contentType - Current content type
	 * @param onComplete - Callback to run after import completes
	 */
	public showImportDialog(
		contentType: ContentType,
		onComplete: () => Promise<void>
	): void {
		const dialog = document.createElement("div");
		dialog.className = "alrawi-import-dialog";

		const title = document.createElement("h4");
		title.textContent = "استيراد بيانات الفيديوهات";
		title.className = "alrawi-import-title";

		const description = document.createElement("p");
		description.textContent =
			"اختر ملف JSON للاستيراد (يجب أن يكون بنفس تنسيق التصدير)";
		description.className = "alrawi-import-description";

		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.className = "alrawi-import-input";

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "alrawi-import-buttons";

		const importButton = document.createElement("button");
		importButton.textContent = "استيراد";
		importButton.className = "alrawi-import-submit";
		importButton.disabled = true;

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "إلغاء";
		cancelButton.className = "alrawi-import-cancel";
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		input.addEventListener("change", () => {
			importButton.disabled = !input.files || input.files.length === 0;
		});

		importButton.addEventListener("click", async () => {
			if (!input.files || input.files.length === 0) return;

			const file = input.files[0];
			const reader = new FileReader();

			reader.onload = async (e) => {
				try {
					if (!e.target?.result) return;
					const jsonData = e.target.result as string;
					document.body.removeChild(dialog);

					if (contentType === CONTENT_TYPE.VIDEOS) {
						await this.importVideosData(jsonData, onComplete);
					}
				} catch (error) {
					console.error("Error reading import file:", error);
					new Notice("❌ حدث خطأ أثناء قراءة ملف الاستيراد");
				}
			};

			reader.readAsText(file);
		});

		buttonContainer.appendChild(importButton);
		buttonContainer.appendChild(cancelButton);

		dialog.appendChild(title);
		dialog.appendChild(description);
		dialog.appendChild(input);
		dialog.appendChild(buttonContainer);

		document.body.appendChild(dialog);
	}

	/**
	 * Imports video data from a file
	 * @param file - File to import
	 * @param onComplete - Callback to run after import completes
	 */
	private async importVideosData(
		jsonData: string,
		onComplete: () => Promise<void>
	): Promise<void> {
		try {
			new Notice("⏳ جاري استيراد بيانات الفيديوهات...");

			const result = await this.dataService.importVideos(jsonData);

			if (result.success > 0) {
				new Notice(`✅ تم استيراد ${result.success} من العناصر بنجاح`);
			}

			if (result.failed > 0) {
				new Notice(`⚠️ فشل استيراد ${result.failed} من العناصر`);
			}

			await onComplete();
		} catch (error) {
			console.error("Error importing data:", error);
			new Notice("❌ حدث خطأ أثناء استيراد البيانات");
		}
	}

	/**
	 * Reads a file as text
	 * @param file - File to read
	 * @returns Promise resolving to file content as string
	 */
	private readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				if (!e.target?.result) {
					reject(new Error("Failed to read file"));
					return;
				}
				resolve(e.target.result as string);
			};

			reader.onerror = () => {
				reject(new Error("Error reading file"));
			};

			reader.readAsText(file);
		});
	}
}
