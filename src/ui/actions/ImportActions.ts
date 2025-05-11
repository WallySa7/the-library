/**
 * Import actions for handling content import
 */
import { App, Notice } from "obsidian";
import { ContentType } from "../../core/uiTypes";
import { ImportResult } from "../../core/serviceTypes";

/**
 * Provides functionality for importing content
 */
export class ImportActions {
	private app: App;
	private plugin: any;
	private settings: any;

	/**
	 * Creates a new ImportActions instance
	 * @param app - Obsidian app instance
	 * @param plugin - Plugin instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, plugin: any, settings: any) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
	}

	/**
	 * Shows the import dialog
	 * @param contentType - Type of content being imported
	 * @param onComplete - Callback after import completes
	 */
	public showImportDialog(
		contentType: ContentType,
		onComplete: () => Promise<void>
	): void {
		const dialog = document.createElement("div");
		dialog.className = "library-import-dialog";

		// Set title based on content type
		const title = document.createElement("h4");
		title.textContent = "استيراد بيانات";
		title.className = "library-import-title";

		// Set description
		const description = document.createElement("p");
		description.textContent =
			"اختر ملف JSON للاستيراد (يجب أن يكون بنفس تنسيق التصدير)";
		description.className = "library-import-description";

		// Create file input
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.className = "library-import-input";

		// Create button container
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "library-import-buttons";

		// Create import button
		const importButton = document.createElement("button");
		importButton.textContent = "استيراد";
		importButton.className = "library-import-submit";
		importButton.disabled = true; // Disabled until file is selected

		// Create cancel button
		const cancelButton = document.createElement("button");
		cancelButton.textContent = "إلغاء";
		cancelButton.className = "library-import-cancel";
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Enable import button when file is selected
		input.addEventListener("change", () => {
			importButton.disabled = !input.files || input.files.length === 0;
		});

		// Handle import button click
		importButton.addEventListener("click", async () => {
			if (!input.files || input.files.length === 0) return;

			const file = input.files[0];
			const reader = new FileReader();

			reader.onload = async (e) => {
				try {
					if (!e.target?.result) return;
					const jsonData = e.target.result as string;
					document.body.removeChild(dialog);

					// Import based on content type
					if (contentType === "video") {
						await this.importVideoData(jsonData, onComplete);
					}
				} catch (error) {
					console.error("Error reading import file:", error);
					new Notice("❌ حدث خطأ أثناء قراءة ملف الاستيراد");
				}
			};

			reader.readAsText(file);
		});

		// Assemble dialog
		buttonContainer.appendChild(importButton);
		buttonContainer.appendChild(cancelButton);

		dialog.appendChild(title);
		dialog.appendChild(description);
		dialog.appendChild(input);
		dialog.appendChild(buttonContainer);

		document.body.appendChild(dialog);
	}

	/**
	 * Imports video data from JSON
	 * @param jsonData - JSON data to import
	 * @param onComplete - Callback after import completes
	 */
	private async importVideoData(
		jsonData: string,
		onComplete: () => Promise<void>
	): Promise<void> {
		try {
			new Notice("⏳ جاري استيراد بيانات...");

			const result: ImportResult =
				await this.plugin.dataService.importVideos(jsonData);

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
}
