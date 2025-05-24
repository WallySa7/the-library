import {
	App,
	Modal,
	TextAreaComponent,
	Notice,
	TFile,
	MarkdownRenderer,
} from "obsidian";
import { BenefitData, BenefitItem } from "../../core";
import { generateId } from "../../utils";

/**
 * Modal for adding/editing benefits
 */
export class BenefitModal extends Modal {
	private plugin: any;
	private file: TFile;
	private benefit?: BenefitItem;
	private onSave: (benefit: BenefitData) => Promise<void>;

	// Form elements
	private titleInput: HTMLInputElement;
	private textArea: TextAreaComponent;
	private pageInput: HTMLInputElement;
	private volumeInput: HTMLInputElement;
	private timestampInput: HTMLInputElement;
	private categoriesInput: HTMLInputElement;
	private tagsInput: HTMLInputElement;

	// Preview element
	private previewEl: HTMLElement;
	private isPreviewMode = false;

	/**
	 * Creates a new BenefitModal
	 * @param app Obsidian app instance
	 * @param plugin Plugin instance
	 * @param file The file to add benefit to
	 * @param onSave Callback when benefit is saved
	 * @param benefit Optional existing benefit for editing
	 */
	constructor(
		app: App,
		plugin: any,
		file: TFile,
		onSave: (benefit: BenefitData) => Promise<void>,
		benefit?: BenefitItem
	) {
		super(app);
		this.plugin = plugin;
		this.file = file;
		this.onSave = onSave;
		this.benefit = benefit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("library-benefit-modal");

		// Modal title
		contentEl.createEl("h2", {
			text: this.benefit ? "تعديل الفائدة" : "إضافة فائدة جديدة",
		});

		// Check if it's a book or video
		const isBook = this.file.path.startsWith(
			this.plugin.settings.booksFolder
		);

		// Title field
		const titleField = contentEl.createEl("div", { cls: "library-field" });
		titleField.createEl("label", {
			text: "عنوان الفائدة",
			cls: "library-label",
		});
		this.titleInput = titleField.createEl("input", {
			type: "text",
			cls: "library-input",
			value: this.benefit?.title || "",
		});

		// Text area with preview toggle
		const textField = contentEl.createEl("div", {
			cls: "library-field library-benefit-text-field",
		});
		const textHeader = textField.createEl("div", {
			cls: "library-field-header",
		});
		textHeader.createEl("label", {
			text: "نص الفائدة",
			cls: "library-label",
		});

		const previewToggle = textHeader.createEl("button", {
			text: "معاينة",
			cls: "library-preview-toggle",
		});

		const textContainer = textField.createEl("div", {
			cls: "library-text-container",
		});

		// Text area
		this.textArea = new TextAreaComponent(textContainer);
		this.textArea.inputEl.addClass("library-benefit-textarea");
		this.textArea.setValue(this.benefit?.text || "");
		this.textArea.inputEl.placeholder =
			"اكتب الفائدة هنا (يدعم Markdown)...";

		// Preview container
		this.previewEl = textContainer.createEl("div", {
			cls: "library-benefit-preview",
			attr: { style: "display: none;" },
		});

		// Preview toggle functionality
		previewToggle.addEventListener("click", () => {
			this.togglePreview();
		});

		// Location fields (page/volume for books, timestamp for videos)
		const locationField = contentEl.createEl("div", {
			cls: "library-field library-location-field",
		});

		if (isBook) {
			// Page number
			const pageGroup = locationField.createEl("div", {
				cls: "library-input-group",
			});
			pageGroup.createEl("label", {
				text: "رقم الصفحة",
				cls: "library-label",
			});
			this.pageInput = pageGroup.createEl("input", {
				type: "number",
				cls: "library-input library-input-small",
				value: this.benefit?.pageNumber?.toString() || "",
			});

			// Volume number
			const volumeGroup = locationField.createEl("div", {
				cls: "library-input-group",
			});
			volumeGroup.createEl("label", {
				text: "رقم المجلد",
				cls: "library-label",
			});
			this.volumeInput = volumeGroup.createEl("input", {
				type: "number",
				cls: "library-input library-input-small",
				value: this.benefit?.volumeNumber?.toString() || "",
			});
		} else {
			// Timestamp for videos
			const timestampGroup = locationField.createEl("div", {
				cls: "library-input-group",
			});
			timestampGroup.createEl("label", {
				text: "الوقت",
				cls: "library-label",
			});
			this.timestampInput = timestampGroup.createEl("input", {
				type: "text",
				cls: "library-input library-input-small",
				placeholder: "00:00:00",
				value: this.formatTimestamp(this.benefit?.timestamp),
			});
		}

		// Categories field
		const categoriesField = contentEl.createEl("div", {
			cls: "library-field",
		});
		categoriesField.createEl("label", {
			text: "التصنيفات",
			cls: "library-label",
		});
		this.categoriesInput = categoriesField.createEl("input", {
			type: "text",
			cls: "library-input",
			placeholder: "فصل بفاصلة (،)",
			value: this.benefit?.categories?.join("، ") || "",
		});

		// Tags field
		const tagsField = contentEl.createEl("div", { cls: "library-field" });
		tagsField.createEl("label", {
			text: "الوسوم (اختياري)",
			cls: "library-label",
		});
		this.tagsInput = tagsField.createEl("input", {
			type: "text",
			cls: "library-input",
			placeholder: "فصل بفاصلة (،)",
			value: this.benefit?.tags?.join("، ") || "",
		});

		// Action buttons
		const buttonsContainer = contentEl.createEl("div", {
			cls: "library-buttons",
		});

		const saveBtn = buttonsContainer.createEl("button", {
			text: this.benefit ? "حفظ التعديلات" : "إضافة",
			cls: "library-button library-button-primary",
		});

		const cancelBtn = buttonsContainer.createEl("button", {
			text: "إلغاء",
			cls: "library-button",
		});

		// Event handlers
		saveBtn.addEventListener("click", () => this.saveBenefit());
		cancelBtn.addEventListener("click", () => this.close());

		// Set up markdown shortcuts
		this.setupMarkdownShortcuts();

		// Focus on title input
		this.titleInput.focus();
	}

	/**
	 * Toggles between edit and preview mode
	 */
	private togglePreview(): void {
		this.isPreviewMode = !this.isPreviewMode;

		if (this.isPreviewMode) {
			// Show preview
			this.textArea.inputEl.style.display = "none";
			this.previewEl.style.display = "block";
			this.previewEl.empty();

			// Render markdown preview
			MarkdownRenderer.renderMarkdown(
				this.textArea.getValue(),
				this.previewEl,
				"",
				null
			);
		} else {
			// Show editor
			this.textArea.inputEl.style.display = "block";
			this.previewEl.style.display = "none";
		}

		// Update button text
		const previewToggle = this.contentEl.querySelector(
			".library-preview-toggle"
		) as HTMLElement;
		if (previewToggle) {
			previewToggle.textContent = this.isPreviewMode ? "تحرير" : "معاينة";
		}
	}

	/**
	 * Sets up markdown shortcuts for the text area
	 */
	private setupMarkdownShortcuts(): void {
		this.textArea.inputEl.addEventListener(
			"keydown",
			(e: KeyboardEvent) => {
				if (e.ctrlKey || e.metaKey) {
					switch (e.key.toLowerCase()) {
						case "b":
							e.preventDefault();
							this.wrapSelection("**", "**");
							break;
						case "i":
							e.preventDefault();
							this.wrapSelection("*", "*");
							break;
						case "k":
							e.preventDefault();
							this.wrapSelection("[", "](url)");
							break;
					}
				}
			}
		);
	}

	/**
	 * Wraps the current selection with prefix and suffix
	 */
	private wrapSelection(prefix: string, suffix: string): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;
		const selectedText = text.substring(start, end);

		const newText =
			text.substring(0, start) +
			prefix +
			selectedText +
			suffix +
			text.substring(end);

		this.textArea.setValue(newText);

		// Restore cursor position
		textarea.selectionStart = start + prefix.length;
		textarea.selectionEnd = end + prefix.length;
		textarea.focus();
	}

	/**
	 * Formats timestamp from seconds to HH:MM:SS
	 */
	private formatTimestamp(seconds?: number): string {
		if (!seconds) return "";

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}

	/**
	 * Parses timestamp string to seconds
	 */
	private parseTimestamp(timestamp: string): number {
		const parts = timestamp.split(":");
		if (parts.length < 2) return 0;

		const hours = parseInt(parts[0]) || 0;
		const minutes = parseInt(parts[1]) || 0;
		const seconds = parseInt(parts[2]) || 0;

		return hours * 3600 + minutes * 60 + seconds;
	}

	/**
	 * Validates and saves the benefit
	 */
	private async saveBenefit(): Promise<void> {
		// Validate required fields
		const title = this.titleInput.value.trim();
		const text = this.textArea.getValue().trim();
		const isBook = this.file.path.startsWith(
			this.plugin.settings.booksFolder
		);

		if (!title) {
			new Notice("الرجاء إدخال عنوان الفائدة");
			this.titleInput.focus();
			return;
		}

		if (!text) {
			new Notice("الرجاء إدخال نص الفائدة");
			this.textArea.inputEl.focus();
			return;
		}

		// Parse categories and tags
		const categories = this.categoriesInput.value
			.split("،")
			.map((c) => c.trim())
			.filter((c) => c);

		const tags = this.tagsInput.value
			.split("،")
			.map((t) => t.trim())
			.filter((t) => t);

		// Create benefit data
		const benefitData: BenefitData = {
			title,
			text,
			categories,
			tags,
		};

		// Add location data based on content type
		if (isBook) {
			const pageNumber = parseInt(this.pageInput?.value) || undefined;
			const volumeNumber = parseInt(this.volumeInput?.value) || undefined;

			if (pageNumber) benefitData.pageNumber = pageNumber;
			if (volumeNumber) benefitData.volumeNumber = volumeNumber;
		} else {
			const timestamp = this.parseTimestamp(
				this.timestampInput?.value || ""
			);
			if (timestamp > 0) benefitData.timestamp = timestamp;
		}

		try {
			await this.onSave(benefitData);
			this.close();
		} catch (error) {
			console.error("Error saving benefit:", error);
			new Notice("حدث خطأ أثناء حفظ الفائدة");
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
