// src/ui/modals/TemplateEditorModal.ts
import { App, Modal } from "obsidian";
import { LibrarySettings, PLACEHOLDER_DOCS } from "../../core/settings";
import { splitTemplate, combineTemplate } from "../../utils/templateUtils";

/**
 * Template types that can be edited
 */
export type TemplateType = "video" | "playlist" | "book";

/**
 * Modal for editing only the content part of templates
 * Provides a more focused editing experience than the full settings page
 */
export class TemplateEditorModal extends Modal {
	private settings: LibrarySettings;
	private templateType: TemplateType;
	private onSave: () => Promise<void>;
	private originalTemplate: string;
	private frontmatter: string;
	private content: string;
	private contentEditor: HTMLTextAreaElement;

	/**
	 * Creates a new template editor modal
	 * @param app Obsidian app instance
	 * @param settings Plugin settings
	 * @param templateType Type of template to edit
	 * @param onSave Callback to run after saving
	 */
	constructor(
		app: App,
		settings: LibrarySettings,
		templateType: TemplateType,
		onSave: () => Promise<void>
	) {
		super(app);
		this.settings = settings;
		this.templateType = templateType;
		this.onSave = onSave;

		// Get original template
		this.originalTemplate = this.settings.templates[templateType];

		// Split into frontmatter and content
		const parts = splitTemplate(this.originalTemplate);
		this.frontmatter = parts.frontmatter;
		this.content = parts.content;
	}

	/**
	 * Opens the modal and renders its content
	 */
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("library-template-editor-modal");
		contentEl.addClass("library-rtl"); // Add RTL support

		// Add title
		this.addTitle();

		// Add description and warning
		this.addDescription();

		// Show frontmatter preview (not editable)
		this.addFrontmatterPreview();

		// Add content editor
		this.addContentEditor();

		// Add placeholder documentation
		this.addPlaceholderDocs();

		// Add buttons
		this.addButtons();
	}

	/**
	 * Adds the modal title
	 */
	private addTitle() {
		const titleMap: Record<TemplateType, string> = {
			video: "تعديل قالب المقطع",
			playlist: "تعديل قالب السلسلة",
			book: "تعديل قالب الكتاب",
		};

		const title = this.contentEl.createEl("h2", {
			text: titleMap[this.templateType],
			cls: "library-modal-title",
		});
	}

	/**
	 * Adds a description and warning about frontmatter
	 */
	private addDescription() {
		const description = this.contentEl.createEl("div", {
			cls: "library-template-description",
		});

		description.createEl("p", {
			text: "يمكنك تعديل محتوى القالب فقط. بيانات الترويسة (Frontmatter) لا يمكن تعديلها.",
			cls: "library-template-warning",
		});

		description.createEl("p", {
			text: "استخدم {{placeholders}} للبيانات الديناميكية، واستخدم {{#if متغير}}المحتوى{{/if}} للعرض المشروط.",
			cls: "library-template-tip",
		});
	}

	/**
	 * Adds a non-editable frontmatter preview
	 */
	private addFrontmatterPreview() {
		const frontmatterContainer = this.contentEl.createEl("div", {
			cls: "library-frontmatter-container",
		});

		frontmatterContainer.createEl("h3", {
			text: "معلومات الترويسة (Frontmatter) - للعرض فقط",
			cls: "library-frontmatter-header",
		});

		const frontmatterPreview = frontmatterContainer.createEl("pre", {
			cls: "library-frontmatter-preview",
		});

		frontmatterPreview.createEl("code", {
			text: `---\n${this.frontmatter}\n---`,
			cls: "library-frontmatter-code",
		});
	}

	/**
	 * Adds the content editor
	 */
	private addContentEditor() {
		const contentContainer = this.contentEl.createEl("div", {
			cls: "library-content-container",
		});

		contentContainer.createEl("h3", {
			text: "محتوى القالب (يمكن تعديله)",
			cls: "library-content-header",
		});

		// Create editor
		this.contentEditor = contentContainer.createEl("textarea", {
			cls: "library-content-editor",
			attr: {
				rows: "15",
				spellcheck: "false",
			},
		});

		this.contentEditor.value = this.content;

		// Set focus to the editor
		setTimeout(() => {
			this.contentEditor.focus();
		}, 50);
	}

	/**
	 * Adds placeholder documentation if available
	 */
	private addPlaceholderDocs() {
		const placeholders = PLACEHOLDER_DOCS[this.templateType];
		if (!placeholders) return;

		const docsContainer = this.contentEl.createEl("div", {
			cls: "library-placeholder-docs",
		});

		docsContainer.createEl("h4", {
			text: "العناصر النائبة المتاحة:",
			cls: "library-placeholder-header",
		});

		const docsList = docsContainer.createEl("div", {
			cls: "library-placeholder-grid",
		});

		placeholders.forEach(({ placeholder, description }) => {
			const docItem = docsList.createEl("div", {
				cls: "library-placeholder-item",
			});

			docItem.createEl("code", {
				text: placeholder,
				cls: "library-placeholder-code",
			});

			docItem.createEl("span", {
				text: description,
				cls: "library-placeholder-desc",
			});
		});

		// Add conditional syntax help
		docsContainer.createEl("div", {
			cls: "library-placeholder-conditional",
			text: "استخدم {{#if متغير}}المحتوى{{/if}} لعرض المحتوى شرطياً",
		});
	}

	/**
	 * Adds save and cancel buttons
	 */
	private addButtons() {
		const buttonContainer = this.contentEl.createEl("div", {
			cls: "library-template-buttons",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "إلغاء",
			cls: "library-button",
		});

		const saveButton = buttonContainer.createEl("button", {
			text: "حفظ",
			cls: "library-button library-button-primary",
		});

		// Cancel button handler
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		// Save button handler
		saveButton.addEventListener("click", async () => {
			await this.saveTemplate();
			this.close();
		});

		// Handle keyboard shortcuts
		this.scope.register([], "Escape", () => {
			this.close();
			return false;
		});

		this.scope.register([], "Enter", (evt: KeyboardEvent) => {
			if (evt.ctrlKey || evt.metaKey) {
				this.saveTemplate().then(() => this.close());
				return false;
			}
			return true;
		});
	}

	/**
	 * Saves the updated template
	 */
	private async saveTemplate() {
		const newContent = this.contentEditor.value;

		// Update only the content part, keeping the original frontmatter
		this.settings.templates[this.templateType] = combineTemplate(
			this.frontmatter,
			newContent
		);

		// Run the onSave callback (which will typically save settings)
		await this.onSave();
	}

	/**
	 * Cleans up when the modal is closed
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
