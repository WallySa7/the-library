import {
	App,
	Modal,
	TextAreaComponent,
	Notice,
	TFile,
	MarkdownRenderer,
	setIcon,
	ButtonComponent,
} from "obsidian";
import { BenefitData, BenefitItem, LOCAL_STORAGE_KEYS } from "../../core";
import { generateId } from "../../utils";

/**
 * Interface for benefit draft data
 */
interface BenefitDraft {
	title: string;
	text: string;
	pageNumber?: string;
	volumeNumber?: string;
	timestamp?: string;
	categories: string;
	tags: string;
	filePath: string;
	benefitId?: string;
	lastSaved: number;
	isBook: boolean;
}

/**
 * Shortcut definition interface
 */
interface ShortcutInfo {
	key: string; // Key name
	keyCode?: number; // Key code (alternative for non-Latin keyboards)
	ctrl?: boolean; // Whether Ctrl key is required
	alt?: boolean; // Whether Alt key is required
	shift?: boolean; // Whether Shift key is required
	description: string; // Human-readable description
}

/**
 * Toolbar button definition
 */
interface ToolbarButton {
	id: string;
	tooltip: string;
	icon?: string;
	text?: string;
	shortcut?: ShortcutInfo;
	action: () => void;
	type?: "button" | "separator";
}

/**
 * History state for undo/redo
 */
interface HistoryState {
	text: string;
	selectionStart: number;
	selectionEnd: number;
}

/**
 * Modal for adding/editing benefits with rich text toolbar
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

	// Toolbar elements
	private toolbarEl: HTMLElement;
	private toolbarButtons: Map<string, HTMLElement> = new Map();

	// Shortcuts registry
	private shortcuts: ShortcutInfo[] = [];

	// Undo/redo state
	private history: HistoryState[] = [];
	private historyIndex = -1;
	private maxHistorySize = 100;
	private lastChangeTime = 0;
	private isUndoRedoAction = false;

	// Draft saving
	private draftSaveInterval: number;
	private draftSaveIntervalMs = 5000; // Save draft every 5 seconds
	private hasPendingChanges = false;
	private hasLoadedDraft = false;
	private draftBanner: HTMLElement;
	private statusIndicator: HTMLElement;
	private statusTimeout: number;

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

		// Check for existing draft
		const existingDraft = this.loadDraft();
		if (existingDraft && !this.hasLoadedDraft) {
			this.createDraftBanner(contentEl, existingDraft);
		}

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

		// Text area with preview toggle and toolbar
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

		// Add shortcuts help button
		const helpButton = textHeader.createEl("button", {
			cls: "library-shortcuts-help",
			attr: { title: "عرض اختصارات لوحة المفاتيح" },
		});
		setIcon(helpButton, "help-circle");
		helpButton.addEventListener("click", () => {
			this.showShortcutsHelp();
		});

		const previewToggle = textHeader.createEl("button", {
			text: "معاينة",
			cls: "library-preview-toggle",
		});

		// Text container
		const textContainer = textField.createEl("div", {
			cls: "library-text-container",
		});

		// Create toolbar
		this.toolbarEl = textContainer.createEl("div", {
			cls: "library-benefit-toolbar",
		});
		this.createToolbar();

		// Text area
		this.textArea = new TextAreaComponent(textContainer);
		this.textArea.inputEl.addClass("library-benefit-textarea");
		this.textArea.setValue(this.benefit?.text || "");
		this.textArea.inputEl.placeholder =
			"اكتب الفائدة هنا (يدعم Markdown)...";

		// Initialize history with current text state
		this.pushHistory();

		// Add input event listener for tracking changes
		this.textArea.inputEl.addEventListener("input", () => {
			// Only push to history if it's not an undo/redo action
			if (!this.isUndoRedoAction) {
				this.pushHistory();
			}
			this.isUndoRedoAction = false;

			// Update undo/redo button states
			this.updateUndoRedoButtons();

			// Mark that we have pending changes to save
			this.hasPendingChanges = true;
		});

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
			this.timestampInput = locationField.createEl("input", {
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

		// Set up keyboard shortcuts
		this.setupKeyboardShortcuts();

		// Add CSS styles for the toolbar
		this.addToolbarStyles();

		// Initial update of undo/redo buttons
		this.updateUndoRedoButtons();

		// Focus on title input
		this.titleInput.focus();

		// Setup automatic draft saving
		this.setupDraftSaving();

		// If we have a draft to load and we haven't loaded one yet, load it
		if (existingDraft && !this.hasLoadedDraft) {
			// We'll load it if the user clicks the restore button in the banner
		}

		// Add input event listeners for all form fields
		this.titleInput.addEventListener("input", () => {
			this.hasPendingChanges = true;
		});

		if (this.pageInput) {
			this.pageInput.addEventListener("input", () => {
				this.hasPendingChanges = true;
			});
		}

		if (this.volumeInput) {
			this.volumeInput.addEventListener("input", () => {
				this.hasPendingChanges = true;
			});
		}

		if (this.timestampInput) {
			this.timestampInput.addEventListener("input", () => {
				this.hasPendingChanges = true;
			});
		}

		this.categoriesInput.addEventListener("input", () => {
			this.hasPendingChanges = true;
		});

		this.tagsInput.addEventListener("input", () => {
			this.hasPendingChanges = true;
		});
	}

	/**
	 * Creates a banner to notify about available draft
	 */
	private createDraftBanner(containerEl: HTMLElement, draft: BenefitDraft) {
		// Create banner if it doesn't exist
		if (!this.draftBanner) {
			this.draftBanner = containerEl.createEl("div", {
				cls: "library-draft-banner",
			});

			const draftDate = new Date(draft.lastSaved);
			const formattedDate = draftDate.toLocaleString();

			this.draftBanner.createEl("div", {
				text: `توجد مسودة محفوظة من ${formattedDate}. هل تريد استعادتها؟`,
				cls: "library-draft-message",
			});

			const buttonsEl = this.draftBanner.createEl("div", {
				cls: "library-draft-buttons",
			});

			// Restore button
			const restoreBtn = new ButtonComponent(buttonsEl)
				.setButtonText("استعادة المسودة")
				.setClass("library-button-primary")
				.onClick(() => {
					this.restoreDraft(draft);
					this.draftBanner.remove();
				});

			restoreBtn.buttonEl.addClass("library-button");

			// Discard button
			const discardBtn = new ButtonComponent(buttonsEl)
				.setButtonText("تجاهل")
				.setClass("library-button")
				.onClick(() => {
					this.clearDraft();
					this.draftBanner.remove();
				});

			// Add the banner to the top of the modal
			containerEl.insertBefore(this.draftBanner, containerEl.firstChild);

			// Add banner styles
			this.addDraftBannerStyles();
		}
	}

	/**
	 * Add CSS styles for the draft banner
	 */
	private addDraftBannerStyles() {
		// Add styles if they don't already exist
		const styleId = "library-draft-banner-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.library-draft-banner {
					background-color: var(--background-secondary);
					border-radius: 4px;
					padding: 12px;
					margin-bottom: 16px;
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				
				.library-draft-message {
					color: var(--text-normal);
					font-weight: 500;
				}
				
				.library-draft-buttons {
					display: flex;
					gap: 8px;
					justify-content: flex-end;
				}
				
				.library-button {
					padding: 6px 12px;
					border-radius: 4px;
					border: 1px solid var(--background-modifier-border);
					background-color: var(--background-secondary-alt);
					color: var(--text-normal);
					cursor: pointer;
					font-size: 14px;
				}
				
				.library-button:hover {
					background-color: var(--background-modifier-hover);
				}
				
				.library-button-primary {
					background-color: var(--interactive-accent);
					color: var(--text-on-accent);
					border-color: var(--interactive-accent);
				}
				
				.library-button-primary:hover {
					background-color: var(--interactive-accent-hover);
				}
			`;
			document.head.appendChild(style);
		}
	}

	/**
	 * Sets up automatic draft saving
	 */
	private setupDraftSaving() {
		// Add status indicator to the modal
		this.createStatusIndicator();

		// Clear any existing interval
		if (this.draftSaveInterval) {
			window.clearInterval(this.draftSaveInterval);
		}

		// Set up new interval
		this.draftSaveInterval = window.setInterval(() => {
			if (this.hasPendingChanges) {
				this.saveDraft();
				this.hasPendingChanges = false;
				this.showStatusMessage("تم حفظ المسودة");
			}
		}, this.draftSaveIntervalMs);
	}

	/**
	 * Creates a status indicator element
	 */
	private createStatusIndicator() {
		if (!this.statusIndicator) {
			const footer = this.contentEl.createEl("div", {
				cls: "library-benefit-status-footer",
			});

			this.statusIndicator = footer.createEl("div", {
				cls: "library-benefit-status-message",
			});

			// Add styles for the status indicator
			this.addStatusStyles();
		}
	}

	/**
	 * Shows a temporary status message
	 */
	private showStatusMessage(message: string, duration: number = 2000) {
		if (!this.statusIndicator) return;

		// Clear any existing timeout
		if (this.statusTimeout) {
			clearTimeout(this.statusTimeout);
		}

		// Show the message
		this.statusIndicator.setText(message);
		this.statusIndicator.addClass("visible");

		// Hide after duration
		this.statusTimeout = window.setTimeout(() => {
			this.statusIndicator.removeClass("visible");
		}, duration);
	}

	/**
	 * Add CSS styles for the status indicator
	 */
	private addStatusStyles() {
		// Add styles if they don't already exist
		const styleId = "library-benefit-status-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.library-benefit-status-footer {
					position: absolute;
					bottom: 0;
					left: 0;
					right: 0;
					padding: 8px 16px;
					text-align: left;
					pointer-events: none;
				}
				
				.library-benefit-status-message {
					display: inline-block;
					padding: 4px 8px;
					border-radius: 4px;
					background-color: var(--background-secondary);
					color: var(--text-muted);
					font-size: 12px;
					opacity: 0;
					transition: opacity 0.2s ease;
				}
				
				.library-benefit-status-message.visible {
					opacity: 1;
				}
			`;
			document.head.appendChild(style);
		}
	}

	/**
	 * Saves the current state as a draft
	 */
	private saveDraft() {
		try {
			const isBook = this.file.path.startsWith(
				this.plugin.settings.booksFolder
			);
			const draft: BenefitDraft = {
				title: this.titleInput.value,
				text: this.textArea.getValue(),
				categories: this.categoriesInput.value,
				tags: this.tagsInput.value,
				filePath: this.file.path,
				lastSaved: Date.now(),
				isBook: isBook,
			};

			// Add content type specific fields
			if (isBook) {
				if (this.pageInput?.value) {
					draft.pageNumber = this.pageInput.value;
				}
				if (this.volumeInput?.value) {
					draft.volumeNumber = this.volumeInput.value;
				}
			} else {
				if (this.timestampInput?.value) {
					draft.timestamp = this.timestampInput.value;
				}
			}

			// Add benefit ID if editing an existing benefit
			if (this.benefit?.id) {
				draft.benefitId = this.benefit.id;
			}

			// Save to localStorage
			localStorage.setItem(
				LOCAL_STORAGE_KEYS.BENEFIT_DRAFT,
				JSON.stringify(draft)
			);
		} catch (error) {
			console.error("Error saving benefit draft:", error);
		}
	}

	/**
	 * Loads a saved draft if available
	 * @returns The loaded draft or null if none exists
	 */
	private loadDraft(): BenefitDraft | null {
		try {
			const draftJson = localStorage.getItem(
				LOCAL_STORAGE_KEYS.BENEFIT_DRAFT
			);
			if (!draftJson) return null;

			const draft: BenefitDraft = JSON.parse(draftJson);

			// Check if the draft is for the current file and benefit (if editing)
			if (draft.filePath !== this.file.path) return null;

			// If editing a benefit, check if the draft is for this benefit
			if (this.benefit?.id && draft.benefitId !== this.benefit.id)
				return null;

			// Check if it's the same content type (book/video)
			const isCurrentBook = this.file.path.startsWith(
				this.plugin.settings.booksFolder
			);
			if (draft.isBook !== isCurrentBook) return null;

			return draft;
		} catch (error) {
			console.error("Error loading benefit draft:", error);
			return null;
		}
	}

	/**
	 * Restores form values from a saved draft
	 */
	private restoreDraft(draft: BenefitDraft) {
		// Restore title and main text
		this.titleInput.value = draft.title || "";
		this.textArea.setValue(draft.text || "");

		// Restore categories and tags
		this.categoriesInput.value = draft.categories || "";
		this.tagsInput.value = draft.tags || "";

		// Restore content type specific fields
		if (draft.isBook) {
			if (this.pageInput && draft.pageNumber) {
				this.pageInput.value = draft.pageNumber;
			}
			if (this.volumeInput && draft.volumeNumber) {
				this.volumeInput.value = draft.volumeNumber;
			}
		} else {
			if (this.timestampInput && draft.timestamp) {
				this.timestampInput.value = draft.timestamp;
			}
		}

		// Reset history with restored text
		this.history = [];
		this.historyIndex = -1;
		this.pushHistory();
		this.updateUndoRedoButtons();

		// Mark as loaded so we don't show the banner again
		this.hasLoadedDraft = true;

		new Notice("تم استعادة المسودة بنجاح");
	}

	/**
	 * Clears any saved draft
	 */
	private clearDraft() {
		localStorage.removeItem(LOCAL_STORAGE_KEYS.BENEFIT_DRAFT);
	}

	/**
	 * Creates the rich text toolbar with formatting buttons
	 */
	private createToolbar(): void {
		// Define toolbar buttons with their actions
		const buttons: ToolbarButton[] = [
			{
				id: "undo",
				tooltip: "تراجع",
				icon: "undo-2",
				shortcut: {
					key: "Z",
					keyCode: 90,
					ctrl: true,
					description: "Ctrl+Z",
				},
				action: () => this.undo(),
			},
			{
				id: "redo",
				tooltip: "إعادة",
				icon: "redo-2",
				shortcut: {
					key: "Y",
					keyCode: 89,
					ctrl: true,
					description: "Ctrl+Y",
				},
				action: () => this.redo(),
			},
			{
				id: "separator-0",
				type: "separator",
				tooltip: "",
				action: function (): void {
					throw new Error("Function not implemented.");
				},
			},
			{
				id: "bold",
				tooltip: "خط غامق",
				icon: "bold",
				shortcut: {
					key: "B",
					keyCode: 66,
					ctrl: true,
					description: "Ctrl+B",
				},
				action: () => this.wrapSelection("**", "**"),
			},
			{
				id: "italic",
				tooltip: "خط مائل",
				icon: "italic",
				shortcut: {
					key: "I",
					keyCode: 73,
					ctrl: true,
					description: "Ctrl+I",
				},
				action: () => this.wrapSelection("*", "*"),
			},
			{
				id: "strikethrough",
				tooltip: "خط في المنتصف",
				icon: "strikethrough",
				shortcut: {
					key: "S",
					keyCode: 83,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+S",
				},
				action: () => this.wrapSelection("~~", "~~"),
			},
			{
				id: "link",
				tooltip: "رابط",
				icon: "link",
				shortcut: {
					key: "K",
					keyCode: 75,
					ctrl: true,
					description: "Ctrl+K",
				},
				action: () => this.insertLink(),
			},
			{
				id: "separator-1",
				type: "separator",
				tooltip: "",
				action: function (): void {
					throw new Error("Function not implemented.");
				},
			},
			{
				id: "h1",
				tooltip: "عنوان 1",
				text: "عنوان 1",
				shortcut: {
					key: "1",
					keyCode: 49,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+1",
				},
				action: () => this.addHeading(1),
			},
			{
				id: "h2",
				tooltip: "عنوان 2",
				text: "عنوان 2",
				shortcut: {
					key: "2",
					keyCode: 50,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+2",
				},
				action: () => this.addHeading(2),
			},
			{
				id: "h3",
				tooltip: "عنوان 3",
				text: "عنوان 3",
				shortcut: {
					key: "3",
					keyCode: 51,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+3",
				},
				action: () => this.addHeading(3),
			},
			{
				id: "separator-2",
				type: "separator",
				tooltip: "",
				action: function (): void {
					throw new Error("Function not implemented.");
				},
			},
			{
				id: "bullet-list",
				tooltip: "قائمة نقطية",
				icon: "list",
				shortcut: {
					key: "U",
					keyCode: 85,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+U",
				},
				action: () => this.addList("- "),
			},
			{
				id: "numbered-list",
				tooltip: "قائمة مرقمة",
				icon: "list-ordered",
				shortcut: {
					key: "O",
					keyCode: 79,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+O",
				},
				action: () => this.addList("1. "),
			},
			{
				id: "separator-3",
				type: "separator",
				tooltip: "",
				action: function (): void {
					throw new Error("Function not implemented.");
				},
			},
			{
				id: "quote",
				tooltip: "اقتباس",
				icon: "quote",
				shortcut: {
					key: "Q",
					keyCode: 81,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+Q",
				},
				action: () => this.addPrefix("> "),
			},
			{
				id: "code",
				tooltip: "شيفرة",
				icon: "code",
				shortcut: {
					key: "`",
					keyCode: 192,
					ctrl: true,
					description: "Ctrl+`",
				},
				action: () => this.wrapSelection("`", "`"),
			},
			{
				id: "codeblock",
				tooltip: "كتلة شيفرة",
				icon: "code-2",
				shortcut: {
					key: "`",
					keyCode: 192,
					ctrl: true,
					shift: true,
					description: "Ctrl+Shift+`",
				},
				action: () => this.wrapBlock("```\n", "\n```"),
			},
			{
				id: "hr",
				tooltip: "خط أفقي",
				icon: "minus",
				shortcut: {
					key: "H",
					keyCode: 72,
					ctrl: true,
					alt: true,
					description: "Ctrl+Alt+H",
				},
				action: () => this.insertAtCursor("\n---\n"),
			},
		];

		// Register shortcuts
		buttons.forEach((button) => {
			if (button.shortcut) {
				this.shortcuts.push(button.shortcut);
			}
		});

		// Create the buttons in the toolbar
		buttons.forEach((button) => {
			if (button.type === "separator") {
				this.toolbarEl.createEl("div", {
					cls: "library-toolbar-separator",
				});
				return;
			}

			const tooltipText = button.shortcut
				? `${button.tooltip} (${button.shortcut.description})`
				: button.tooltip;

			const btn = this.toolbarEl.createEl("button", {
				cls: "library-toolbar-button",
				attr: {
					title: tooltipText,
					"data-id": button.id,
					"data-shortcut": button.shortcut?.description || "",
				},
			});

			if (button.icon) {
				setIcon(btn, button.icon);
			} else if (button.text) {
				btn.textContent = button.text;
			}

			btn.addEventListener("click", (e) => {
				e.preventDefault();
				button.action();
				this.textArea.inputEl.focus();
			});

			this.toolbarButtons.set(button.id, btn);
		});
	}

	/**
	 * Updates the enabled/disabled state of undo/redo buttons
	 */
	private updateUndoRedoButtons(): void {
		const undoBtn = this.toolbarButtons.get("undo");
		const redoBtn = this.toolbarButtons.get("redo");

		if (undoBtn) {
			undoBtn.toggleClass("disabled", this.historyIndex <= 0);
			undoBtn.toggleAttribute("disabled", this.historyIndex <= 0);
		}

		if (redoBtn) {
			redoBtn.toggleClass(
				"disabled",
				this.historyIndex >= this.history.length - 1
			);
			redoBtn.toggleAttribute(
				"disabled",
				this.historyIndex >= this.history.length - 1
			);
		}
	}

	/**
	 * Pushes the current text state to history
	 */
	private pushHistory(): void {
		const now = Date.now();

		// Group changes that happen within 2 seconds (to avoid creating many history entries for continuous typing)
		if (
			now - this.lastChangeTime < 2000 &&
			this.history.length > 0 &&
			this.historyIndex === this.history.length - 1
		) {
			// Replace the last history entry
			this.history[this.historyIndex] = this.getCurrentState();
		} else {
			// If we're in the middle of the history stack (after undo), discard future states
			if (this.historyIndex < this.history.length - 1) {
				this.history = this.history.slice(0, this.historyIndex + 1);
			}

			// Add new state
			this.history.push(this.getCurrentState());
			this.historyIndex = this.history.length - 1;

			// Limit history size
			if (this.history.length > this.maxHistorySize) {
				this.history.shift();
				this.historyIndex--;
			}
		}

		this.lastChangeTime = now;
	}

	/**
	 * Gets the current text state
	 */
	private getCurrentState(): HistoryState {
		const textarea = this.textArea.inputEl;
		return {
			text: this.textArea.getValue(),
			selectionStart: textarea.selectionStart,
			selectionEnd: textarea.selectionEnd,
		};
	}

	/**
	 * Performs undo operation
	 */
	private undo(): void {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			this.restoreState(this.history[this.historyIndex]);
			this.updateUndoRedoButtons();
		}
	}

	/**
	 * Performs redo operation
	 */
	private redo(): void {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.restoreState(this.history[this.historyIndex]);
			this.updateUndoRedoButtons();
		}
	}

	/**
	 * Restores a history state
	 */
	private restoreState(state: HistoryState): void {
		this.isUndoRedoAction = true;
		this.textArea.setValue(state.text);

		// Restore cursor position
		const textarea = this.textArea.inputEl;
		textarea.selectionStart = state.selectionStart;
		textarea.selectionEnd = state.selectionEnd;
		textarea.focus();
	}

	/**
	 * Shows a help modal with all keyboard shortcuts
	 */
	private showShortcutsHelp(): void {
		const modal = new Modal(this.app);
		modal.titleEl.setText("اختصارات لوحة المفاتيح");

		const content = modal.contentEl;
		content.addClass("library-shortcuts-modal");

		// Create a table to display shortcuts
		const table = content.createEl("table", {
			cls: "library-shortcuts-table",
		});

		// Table header
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "الوظيفة" });
		headerRow.createEl("th", { text: "الاختصار" });

		// Table body
		const tbody = table.createEl("tbody");

		// Get all toolbar buttons with shortcuts
		this.toolbarEl
			.querySelectorAll(".library-toolbar-button[data-shortcut]")
			.forEach((button) => {
				const shortcutText = button.getAttribute("data-shortcut");
				const tooltipText =
					button.getAttribute("title")?.split(" (")[0] || "";

				if (shortcutText) {
					const row = tbody.createEl("tr");
					row.createEl("td", { text: tooltipText });
					row.createEl("td", { text: shortcutText });
				}
			});

		// Add some additional useful shortcuts
		const additionalShortcuts = [
			{ action: "معاينة", shortcut: "Ctrl+P" },
			{ action: "مسافة بادئة", shortcut: "Tab" },
			{ action: "إزالة المسافة البادئة", shortcut: "Shift+Tab" },
		];

		additionalShortcuts.forEach((item) => {
			const row = tbody.createEl("tr");
			row.createEl("td", { text: item.action });
			row.createEl("td", { text: item.shortcut });
		});

		// Add styles for the shortcuts modal
		this.addShortcutsModalStyles();

		modal.open();
	}

	/**
	 * Adds CSS styles for the shortcuts modal
	 */
	private addShortcutsModalStyles(): void {
		// Add styles if they don't already exist
		const styleId = "library-shortcuts-modal-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.library-shortcuts-modal {
					direction: rtl;
				}
				
				.library-shortcuts-table {
					width: 100%;
					border-collapse: collapse;
				}
				
				.library-shortcuts-table th,
				.library-shortcuts-table td {
					padding: 8px 12px;
					text-align: right;
					border-bottom: 1px solid var(--background-modifier-border);
				}
				
				.library-shortcuts-table th {
					font-weight: bold;
					background-color: var(--background-secondary);
				}
				
				.library-shortcuts-table tr:nth-child(even) {
					background-color: var(--background-secondary-alt);
				}
			`;
			document.head.appendChild(style);
		}
	}

	/**
	 * Adds CSS styles for the toolbar
	 */
	private addToolbarStyles(): void {
		// Add styles if they don't already exist
		const styleId = "library-benefit-toolbar-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.library-benefit-toolbar {
					display: flex;
					flex-wrap: wrap;
					gap: 4px;
					padding: 8px;
					background: var(--background-secondary);
					border-radius: 4px 4px 0 0;
					border-bottom: 1px solid var(--background-modifier-border);
					direction: rtl;
				}
				
				.library-toolbar-button {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 28px;
					height: 28px;
					border-radius: 4px;
					border: none;
					background: transparent;
					color: var(--text-normal);
					cursor: pointer;
					padding: 0;
					font-size: 12px;
				}
				
				.library-toolbar-button:hover:not(.disabled) {
					background: var(--background-modifier-hover);
				}
				
				.library-toolbar-button.disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				
				.library-toolbar-button[data-id^="h"] {
					width: auto;
					padding: 0 8px;
					font-weight: bold;
				}
				
				.library-toolbar-separator {
					width: 1px;
					height: 24px;
					background: var(--background-modifier-border);
					margin: 0 4px;
				}
				
				.library-benefit-textarea {
					border-radius: 0 0 4px 4px !important;
					min-height: 200px;
				}
				
				.library-shortcuts-help {
					background: transparent;
					border: none;
					color: var(--text-muted);
					cursor: pointer;
					padding: 0;
					margin-left: 8px;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				
				.library-shortcuts-help:hover {
					color: var(--text-normal);
				}
				
				.library-field-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
			`;
			document.head.appendChild(style);
		}
	}

	/**
	 * Toggles between edit and preview mode
	 */
	private togglePreview(): void {
		this.isPreviewMode = !this.isPreviewMode;

		// Update toolbar visibility
		if (this.toolbarEl) {
			this.toolbarEl.style.display = this.isPreviewMode ? "none" : "flex";
		}

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
	 * Sets up keyboard shortcuts for the text area
	 */
	private setupKeyboardShortcuts(): void {
		this.textArea.inputEl.addEventListener(
			"keydown",
			(e: KeyboardEvent) => {
				// Handle undo/redo first
				if (e.ctrlKey || e.metaKey) {
					if ((e.key === "z" || e.keyCode === 90) && !e.shiftKey) {
						e.preventDefault();
						this.undo();
						return;
					} else if (
						e.key === "y" ||
						e.keyCode === 89 ||
						((e.key === "z" || e.keyCode === 90) && e.shiftKey)
					) {
						e.preventDefault();
						this.redo();
						return;
					}
				}

				// Check for registered shortcuts
				for (const shortcut of this.shortcuts) {
					// Match using either key or keyCode (for non-Latin keyboards)
					const keyMatch =
						(shortcut.key &&
							e.key.toUpperCase() ===
								shortcut.key.toUpperCase()) ||
						(shortcut.keyCode && e.keyCode === shortcut.keyCode);

					// Check modifiers
					const ctrlMatch =
						shortcut.ctrl === undefined ||
						e.ctrlKey === shortcut.ctrl;
					const altMatch =
						shortcut.alt === undefined || e.altKey === shortcut.alt;
					const shiftMatch =
						shortcut.shift === undefined ||
						e.shiftKey === shortcut.shift;

					if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
						e.preventDefault();

						// Find and trigger the corresponding toolbar button
						for (const [
							id,
							button,
						] of this.toolbarButtons.entries()) {
							const buttonShortcut =
								button.getAttribute("data-shortcut");
							if (buttonShortcut === shortcut.description) {
								button.click();
								return;
							}
						}
					}
				}

				// Handle preview toggle
				if (
					(e.ctrlKey || e.metaKey) &&
					(e.key === "p" || e.keyCode === 80)
				) {
					e.preventDefault();
					this.togglePreview();
				}

				// Handle tab key for indentation
				if (e.key === "Tab") {
					e.preventDefault();
					if (e.shiftKey) {
						// Remove indentation
						this.removeIndentation();
					} else {
						// Add indentation
						this.insertAtCursor("    ");
					}
				}

				// Mark that we have pending changes
				this.hasPendingChanges = true;
			}
		);
	}

	/**
	 * Removes indentation from the current line or selection
	 */
	private removeIndentation(): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;

		// If we have a selection spanning multiple lines
		if (start !== end && text.substring(start, end).includes("\n")) {
			// Get the selected text
			const selectedText = text.substring(start, end);
			// Remove one level of indentation from each line
			const dedentedText = selectedText.replace(/^([ \t]{1,4})/gm, "");

			// Calculate the new selection points
			const beforeSelection = text.substring(0, start);
			const afterSelection = text.substring(end);

			// Update the text
			this.textArea.setValue(
				beforeSelection + dedentedText + afterSelection
			);

			// Restore the selection
			textarea.selectionStart = start;
			textarea.selectionEnd = start + dedentedText.length;
		} else {
			// Find the start of the current line
			let lineStart = start;
			while (lineStart > 0 && text.charAt(lineStart - 1) !== "\n") {
				lineStart--;
			}

			// Check if there's indentation to remove
			const currentLineStart = text.substring(lineStart, start);
			const match = currentLineStart.match(/^([ \t]{1,4})/);

			if (match) {
				// Remove the indentation
				const indentLength = match[0].length;
				const newText =
					text.substring(0, lineStart) +
					text.substring(lineStart + indentLength);

				this.textArea.setValue(newText);

				// Adjust the cursor position
				const newCursorPos = start - indentLength;
				textarea.selectionStart = newCursorPos;
				textarea.selectionEnd = newCursorPos;
			}
		}

		textarea.focus();
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

		// Push history state
		this.pushHistory();
	}

	/**
	 * Wraps the current selection with a block (multi-line)
	 */
	private wrapBlock(prefix: string, suffix: string): void {
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

		// Position cursor after the prefix
		const newCursorPos = start + prefix.length;
		textarea.selectionStart = newCursorPos;
		textarea.selectionEnd = newCursorPos + selectedText.length;
		textarea.focus();

		// Push history state
		this.pushHistory();
	}

	/**
	 * Inserts text at cursor position
	 */
	private insertAtCursor(text: string): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const value = textarea.value;

		const newValue =
			value.substring(0, start) + text + value.substring(start);
		this.textArea.setValue(newValue);

		// Position cursor after inserted text
		const newCursorPos = start + text.length;
		textarea.selectionStart = newCursorPos;
		textarea.selectionEnd = newCursorPos;
		textarea.focus();

		// Push history state
		this.pushHistory();
	}

	/**
	 * Adds a heading of the specified level
	 */
	private addHeading(level: number): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const text = textarea.value;

		// Find the start of the current line
		let lineStart = start;
		while (lineStart > 0 && text.charAt(lineStart - 1) !== "\n") {
			lineStart--;
		}

		// Check if there's already a heading
		const currentLine = text.substring(
			lineStart,
			text.indexOf("\n", lineStart) > -1
				? text.indexOf("\n", lineStart)
				: text.length
		);
		const headingMatch = currentLine.match(/^(#{1,6})\s/);

		let newText;
		if (headingMatch) {
			// Replace existing heading
			const existingPrefix = headingMatch[0];
			const newPrefix = "#".repeat(level) + " ";
			newText =
				text.substring(0, lineStart) +
				currentLine.replace(existingPrefix, newPrefix) +
				text.substring(lineStart + currentLine.length);
		} else {
			// Add new heading
			const prefix = "#".repeat(level) + " ";
			newText =
				text.substring(0, lineStart) +
				prefix +
				text.substring(lineStart);
		}

		this.textArea.setValue(newText);

		// Set cursor position to end of the heading prefix
		const newCursorPos = lineStart + level + 1;
		textarea.selectionStart = newCursorPos;
		textarea.selectionEnd = newCursorPos;
		textarea.focus();

		// Push history state
		this.pushHistory();
	}

	/**
	 * Adds a list item prefix to the current line
	 */
	private addList(prefix: string): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;

		// If multiple lines are selected, add list to each line
		if (start !== end && text.substring(start, end).includes("\n")) {
			const selectedText = text.substring(start, end);
			const lines = selectedText.split("\n");
			const listItems = lines.map((line) => prefix + line);

			const newText =
				text.substring(0, start) +
				listItems.join("\n") +
				text.substring(end);

			this.textArea.setValue(newText);

			textarea.selectionStart = start;
			textarea.selectionEnd = start + listItems.join("\n").length;
		} else {
			// Find the start of the current line
			let lineStart = start;
			while (lineStart > 0 && text.charAt(lineStart - 1) !== "\n") {
				lineStart--;
			}

			// Add the list prefix
			const newText =
				text.substring(0, lineStart) +
				prefix +
				text.substring(lineStart);

			this.textArea.setValue(newText);

			// Set cursor position to end of the list prefix
			const newCursorPos = lineStart + prefix.length;
			textarea.selectionStart = newCursorPos;
			textarea.selectionEnd = newCursorPos;
		}

		textarea.focus();

		// Push history state
		this.pushHistory();
	}

	/**
	 * Adds a prefix to the current line (for quotes, etc.)
	 */
	private addPrefix(prefix: string): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;

		// If multiple lines are selected, add prefix to each line
		if (start !== end) {
			const selectedText = text.substring(start, end);
			const lines = selectedText.split("\n");
			const prefixedLines = lines.map((line) => prefix + line);
			const newText =
				text.substring(0, start) +
				prefixedLines.join("\n") +
				text.substring(end);

			this.textArea.setValue(newText);

			// Set selection to the prefixed text
			textarea.selectionStart = start;
			textarea.selectionEnd = start + prefixedLines.join("\n").length;
		} else {
			// Find the start of the current line
			let lineStart = start;
			while (lineStart > 0 && text.charAt(lineStart - 1) !== "\n") {
				lineStart--;
			}

			// Add the prefix
			const newText =
				text.substring(0, lineStart) +
				prefix +
				text.substring(lineStart);

			this.textArea.setValue(newText);

			// Set cursor position after the prefix
			const newCursorPos = lineStart + prefix.length;
			textarea.selectionStart = newCursorPos;
			textarea.selectionEnd = newCursorPos;
		}

		textarea.focus();

		// Push history state
		this.pushHistory();
	}

	/**
	 * Inserts a link at the cursor position or around selected text
	 */
	private insertLink(): void {
		const textarea = this.textArea.inputEl;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;
		const selectedText = text.substring(start, end);

		if (selectedText) {
			// If text is selected, wrap it as the link text
			const newText =
				text.substring(0, start) +
				`[${selectedText}](رابط)` +
				text.substring(end);

			this.textArea.setValue(newText);

			// Position cursor inside the URL parentheses
			const urlStart = start + selectedText.length + 3;
			textarea.selectionStart = urlStart;
			textarea.selectionEnd = urlStart + 4; // Select "رابط"
		} else {
			// If no text is selected, insert a link template
			const linkTemplate = "[نص الرابط](رابط)";
			const newText =
				text.substring(0, start) + linkTemplate + text.substring(end);

			this.textArea.setValue(newText);

			// Select "نص الرابط" for easy replacement
			textarea.selectionStart = start + 1;
			textarea.selectionEnd = start + 9;
		}

		textarea.focus();

		// Push history state
		this.pushHistory();
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

			// Clear draft after successful save
			this.clearDraft();

			this.close();
		} catch (error) {
			console.error("Error saving benefit:", error);
			new Notice("حدث خطأ أثناء حفظ الفائدة");
		}
	}

	onClose() {
		// Clear the automatic save interval
		if (this.draftSaveInterval) {
			window.clearInterval(this.draftSaveInterval);
		}

		// Clear any existing status timeout
		if (this.statusTimeout) {
			clearTimeout(this.statusTimeout);
		}

		// Save draft on close if we have pending changes
		if (this.hasPendingChanges) {
			this.saveDraft();
		}

		const { contentEl } = this;
		contentEl.empty();
	}
}
