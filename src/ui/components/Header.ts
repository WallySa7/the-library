/**
 * Header component for the library view
 * Contains title, content type switchers, and action buttons
 */
import { setIcon } from "obsidian";
import { CONTENT_TYPE, VIEW_MODE } from "../../core/constants";
import { ContentType, ViewProps } from "../../core/uiTypes";
import {
	SelectionState,
	SelectionStateEvents,
} from "../../core/state/SelectionState";
import { VideoModal } from "../modals/VideoModal";
import { ExportActions } from "../actions/ExportActions";
import { ImportActions } from "../actions/ImportActions";
import { BookModal } from "../modals/BookModal";

/**
 * Props for Header component
 */
interface HeaderProps extends ViewProps {
	/** Selection state for handling selected items */
	selectionState: SelectionState;

	/** Callback when content type changes */
	onContentTypeChange: (type: ContentType) => void;

	/** Callback when view mode changes */
	onViewModeChange: (mode: "table" | "card") => void;
}

/**
 * Header component with content type switchers and action buttons
 */
export class Header {
	private props: HeaderProps;
	private container: HTMLElement | null = null;
	private exportActions: ExportActions;
	private importActions: ImportActions;

	// Button references for updating state
	private exportButton: HTMLButtonElement | null = null;
	private videoButton: HTMLButtonElement | null = null;
	private bookButton: HTMLButtonElement | null = null;
	private tableViewBtn: HTMLButtonElement | null = null;
	private cardViewBtn: HTMLButtonElement | null = null;

	// Event unsubscribe functions
	private stateUnsubscribes: (() => void)[] = [];

	/**
	 * Creates a new Header component
	 * @param props Component props
	 */
	constructor(props: HeaderProps) {
		this.props = props;

		// Initialize actions
		this.exportActions = new ExportActions(
			props.app,
			props.plugin,
			props.settings
		);

		this.importActions = new ImportActions(
			props.app,
			props.plugin,
			props.settings
		);

		// Set up selection change listener
		const unsubscribe = props.selectionState.subscribe(
			SelectionStateEvents.SELECTION_CHANGED,
			this.updateSelectionDependentUI.bind(this)
		);

		this.stateUnsubscribes.push(unsubscribe);
	}

	/**
	 * Renders the header
	 * @param container Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		const header = container.createEl("div", {
			cls: "library-header",
		});

		// Add title
		this.renderTitle(header);

		// Add action bar with buttons
		this.renderActionBar(header);
	}

	/**
	 * Renders the header title
	 * @param container Header container
	 */
	private renderTitle(container: HTMLElement): void {
		container.createEl("h2", {
			text: "مكتبتي",
			cls: "library-title",
		});
	}

	/**
	 * Renders the action bar with buttons
	 * @param container Header container
	 */
	private renderActionBar(container: HTMLElement): void {
		const actionBar = container.createEl("div", {
			cls: "library-action-bar",
		});

		// Content type toggle
		this.renderContentTypeToggle(actionBar);

		// Add item button
		this.renderAddButton(actionBar);

		// Export button
		this.exportButton = this.renderExportButton(actionBar);

		// Import button
		this.renderImportButton(actionBar);

		// Refresh button
		this.renderRefreshButton(actionBar);

		// View toggle (table/card)
		this.renderViewToggle(actionBar);
	}

	/**
	 * Renders content type toggle buttons
	 * @param container Action bar container
	 */
	private renderContentTypeToggle(container: HTMLElement): void {
		const contentTypeToggle = container.createEl("div", {
			cls: "library-content-type-toggle",
		});

		// Video button
		this.videoButton = contentTypeToggle.createEl("button", {
			cls: `library-content-toggle ${
				this.props.contentType === CONTENT_TYPE.VIDEO ? "active" : ""
			}`,
			text: "مقاطع",
			attr: { title: "عرض المقاطع" },
		});

		setIcon(this.videoButton, "play-circle");

		this.videoButton.addEventListener("click", () => {
			this.props.onContentTypeChange(CONTENT_TYPE.VIDEO);
		});

		// Book button (now active, not disabled)
		this.bookButton = contentTypeToggle.createEl("button", {
			cls: `library-content-toggle ${
				this.props.contentType === CONTENT_TYPE.BOOK ? "active" : ""
			}`,
			text: "كتب",
			attr: { title: "عرض الكتب" },
		});

		setIcon(this.bookButton, "book");

		this.bookButton.addEventListener("click", () => {
			this.props.onContentTypeChange(CONTENT_TYPE.BOOK);
		});
	}

	/**
	 * Renders the add button
	 * @param container Action bar container
	 */
	private renderAddButton(container: HTMLElement): void {
		const addButton = container.createEl("button", {
			cls: "library-action-button",
			text: "إضافة",
			attr: {
				title:
					this.props.contentType === CONTENT_TYPE.VIDEO
						? "اضافة فيديو"
						: "اضافة كتاب",
			},
		});

		setIcon(addButton, "plus-circle");

		addButton.addEventListener("click", () => {
			if (this.props.contentType === CONTENT_TYPE.VIDEO) {
				const modal = new VideoModal(this.props.app, this.props.plugin);

				// Set up auto-refresh after modal is closed
				const originalOnClose = modal.onClose;
				modal.onClose = () => {
					if (originalOnClose) {
						originalOnClose.call(modal);
					}
					this.props.onRefresh();
				};

				modal.open();
			} else if (this.props.contentType === CONTENT_TYPE.BOOK) {
				const modal = new BookModal(this.props.app, this.props.plugin);

				// Set up auto-refresh after modal is closed
				const originalOnClose = modal.onClose;
				modal.onClose = () => {
					if (originalOnClose) {
						originalOnClose.call(modal);
					}
					this.props.onRefresh();
				};

				modal.open();
			}
		});
	}

	/**
	 * Renders the export button
	 * @param container Action bar container
	 * @returns The created button element
	 */
	private renderExportButton(container: HTMLElement): HTMLButtonElement {
		const exportButton = container.createEl("button", {
			cls: "library-action-button",
			text: "تصدير",
		});

		setIcon(exportButton, "download");

		exportButton.addEventListener("click", () => {
			// Get selected items if available
			const selectedItems = this.props.selectionState.getSelectedItems();

			// Show export menu
			this.exportActions.showExportMenu(
				exportButton,
				this.props.contentType,
				selectedItems
			);
		});

		return exportButton;
	}

	/**
	 * Renders the import button
	 * @param container Action bar container
	 */
	private renderImportButton(container: HTMLElement): void {
		const importButton = container.createEl("button", {
			cls: "library-action-button",
			text: "استيراد",
		});

		setIcon(importButton, "upload");

		importButton.addEventListener("click", () => {
			this.importActions.showImportDialog(
				this.props.contentType,
				this.props.onRefresh
			);
		});
	}

	/**
	 * Renders the refresh button
	 * @param container Action bar container
	 */
	private renderRefreshButton(container: HTMLElement): void {
		const refreshButton = container.createEl("button", {
			cls: "library-action-button",
			text: "تحديث",
		});

		setIcon(refreshButton, "refresh-cw");

		refreshButton.addEventListener("click", () => {
			this.props.onRefresh();
		});
	}

	/**
	 * Renders view mode toggle buttons (table/card)
	 * @param container Action bar container
	 */
	private renderViewToggle(container: HTMLElement): void {
		const viewToggleContainer = container.createEl("div", {
			cls: "library-view-toggles",
		});

		// Table view toggle
		this.tableViewBtn = viewToggleContainer.createEl("button", {
			cls: `library-view-toggle ${
				this.props.settings.viewMode === VIEW_MODE.TABLE ? "active" : ""
			}`,
			attr: { title: "عرض جدولي" },
		});

		setIcon(this.tableViewBtn, "table");

		this.tableViewBtn.createEl("span", {
			text: "جدول",
			cls: "library-view-toggle-label",
		});

		this.tableViewBtn.addEventListener("click", () => {
			this.props.onViewModeChange(VIEW_MODE.TABLE);
		});

		// Card view toggle
		this.cardViewBtn = viewToggleContainer.createEl("button", {
			cls: `library-view-toggle ${
				this.props.settings.viewMode === VIEW_MODE.CARD ? "active" : ""
			}`,
			attr: { title: "عرض البطاقات" },
		});

		setIcon(this.cardViewBtn, "grid");

		this.cardViewBtn.createEl("span", {
			text: "بطاقات",
			cls: "library-view-toggle-label",
		});

		this.cardViewBtn.addEventListener("click", () => {
			this.props.onViewModeChange(VIEW_MODE.CARD);
		});
	}

	/**
	 * Updates UI elements that depend on selection state
	 */
	private updateSelectionDependentUI(): void {
		if (!this.exportButton) return;

		const hasSelection = this.props.selectionState.hasSelection();

		// Update export button text based on selection
		if (hasSelection) {
			const count = this.props.selectionState.getSelectionCount();
			this.exportButton.textContent = `تصدير (${count})`;
		} else {
			this.exportButton.textContent = "تصدير";
		}
	}

	/**
	 * Updates view mode buttons to reflect current mode
	 * @param viewMode Current view mode
	 */
	public updateViewMode(viewMode: "table" | "card"): void {
		if (this.tableViewBtn && this.cardViewBtn) {
			if (viewMode === VIEW_MODE.TABLE) {
				this.tableViewBtn.classList.add("active");
				this.cardViewBtn.classList.remove("active");
			} else {
				this.tableViewBtn.classList.remove("active");
				this.cardViewBtn.classList.add("active");
			}
		}
	}

	/**
	 * Updates content type buttons to reflect current type
	 * @param contentType Current content type
	 */
	public updateContentType(contentType: ContentType): void {
		if (this.videoButton) {
			this.videoButton.classList.remove("active");
		}

		if (this.bookButton) {
			this.bookButton.classList.remove("active");
		}

		if (contentType === CONTENT_TYPE.VIDEO && this.videoButton) {
			this.videoButton.classList.add("active");
		} else if (contentType === CONTENT_TYPE.BOOK && this.bookButton) {
			this.bookButton.classList.add("active");
		}
	}

	/**
	 * Cleans up component resources
	 */
	public destroy(): void {
		// Unsubscribe from state changes
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clear references
		this.container = null;
		this.exportButton = null;
		this.videoButton = null;
		this.tableViewBtn = null;
		this.cardViewBtn = null;
	}
}
