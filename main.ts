import { Plugin, TFile, Notice } from "obsidian";
import { VideoModal } from "./src/ui/modals/VideoModal";
import { LibrarySettings, DEFAULT_SETTINGS } from "./src/core/settings";
import { SettingsTab } from "./src/ui/settings/SettingsTab";
import { DataService } from "./src/services/DataService";
import { YouTubeService } from "./src/services/YouTubeService";
import { BenefitService } from "./src/services/BenefitService";
import { LibraryView } from "./src/ui/views/LibraryView";
import { VIEW_TYPE_LIBRARY } from "./src/core/constants";
import { ContentType } from "src/core";
import { BenefitModal } from "./src/ui/modals/BenefitModal";

/**
 * Main plugin class for The Library
 * Manages plugin lifecycle and core functionality
 */
export default class LibraryPlugin extends Plugin {
	// Plugin settings
	settings: LibrarySettings;

	// Core services
	dataService: DataService;
	youtubeService: YouTubeService;
	benefitService: BenefitService;

	/**
	 * Plugin initialization on load
	 */
	async onload() {
		console.log("Loading The Library plugin");

		// Load settings first as other components depend on them
		await this.loadSettings();

		// Initialize core services
		this.initializeServices();

		// Register plugin components
		this.registerViews();
		this.registerCommands();
		this.registerRibbonIcons();
		this.registerEvents();

		// Ensure required directories exist
		await this.ensureDirectoriesExist();
	}

	/**
	 * Clean up when plugin is disabled
	 */
	onunload() {
		console.log("Unloading The Library plugin");

		// Detach any active views
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_LIBRARY);
	}

	/**
	 * Initialize core services used throughout the plugin
	 */
	private initializeServices(): void {
		this.dataService = new DataService(this.app, this.settings);
		this.youtubeService = new YouTubeService(this.settings.youtubeApiKey);
		this.benefitService = new BenefitService(this.app, this);
	}

	/**
	 * Register plugin views
	 */
	private registerViews(): void {
		// Register main library view
		this.registerView(
			VIEW_TYPE_LIBRARY,
			(leaf) => new LibraryView(leaf, this)
		);

		// Add settings tab
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	/**
	 * Register all plugin commands
	 */
	private registerCommands(): void {
		// Command to open the main library view
		this.addCommand({
			id: "open-library-view",
			name: "فتح مكتبتي",
			callback: () => this.activateView(VIEW_TYPE_LIBRARY),
		});

		// Command to add benefit to current note
		this.addCommand({
			id: "add-benefit-to-note",
			name: "إضافة فائدة للملاحظة الحالية",
			callback: () => this.addBenefitToCurrentNote(),
		});
	}

	/**
	 * Register ribbon icons for quick access
	 */
	private registerRibbonIcons(): void {
		// Main library icon
		this.addRibbonIcon("book-open", "مكتبتي", () => {
			this.activateView(VIEW_TYPE_LIBRARY);
		});
	}

	/**
	 * Register event handlers for file system events
	 */
	private registerEvents(): void {
		// File modification event - refresh views when relevant files change
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					this.refreshViews();
				}
			})
		);

		// File deletion event - refresh views when files are deleted
		this.registerEvent(
			this.app.vault.on("delete", () => {
				this.refreshViews();
			})
		);
	}

	/**
	 * Ensures required directories exist for storing content
	 */
	private async ensureDirectoriesExist(): Promise<void> {
		const contentFolder = this.settings.videosFolder;

		if (!this.app.vault.getAbstractFileByPath(contentFolder)) {
			try {
				await this.app.vault.createFolder(contentFolder);
				console.log(`Created content folder: ${contentFolder}`);
			} catch (error) {
				console.error(`Failed to create content folder: ${error}`);
			}
		}
	}

	/**
	 * Loads plugin settings
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		// Ensure all settings have default values
		this.ensureSettingsAreComplete();
		await this.saveSettings();
	}

	/**
	 * Ensures all settings have proper default values
	 */
	private ensureSettingsAreComplete(): void {
		// Fill in any missing folder settings
		if (!this.settings.videoFolderRules) {
			this.settings.videoFolderRules = DEFAULT_SETTINGS.videoFolderRules;
		}

		// Ensure view mode is set
		if (!this.settings.viewMode) {
			this.settings.viewMode = DEFAULT_SETTINGS.viewMode;
		}
	}

	/**
	 * Saves plugin settings
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update services with new settings
		if (this.youtubeService) {
			this.youtubeService.setApiKey(this.settings.youtubeApiKey);
		}
	}

	/**
	 * Activates the specified view
	 * @param viewType - The type of view to activate
	 * @param contentType - Optional content type to display
	 */
	async activateView(
		viewType: string,
		contentType?: ContentType
	): Promise<void> {
		// Detach existing views of this type first for clean state
		this.app.workspace.detachLeavesOfType(viewType);

		// Create a new leaf for the view
		const leaf = this.app.workspace.getLeaf("tab");
		if (!leaf) return;

		// Set the view state
		await leaf.setViewState({
			type: viewType,
			active: true,
		});

		// If we need to switch content type
		if (contentType && viewType === VIEW_TYPE_LIBRARY) {
			const view = leaf.view as LibraryView;
			if (view && typeof view.setContentType === "function") {
				// Small delay to ensure view is ready
				setTimeout(() => {
					view.setContentType(contentType);
				}, 100);
			}
		}

		// Reveal the leaf
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		if (leaves.length > 0) {
			this.app.workspace.revealLeaf(leaves[0]);
		}
	}

	/**
	 * Adds a benefit to the current note
	 */
	async addBenefitToCurrentNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice("الرجاء فتح ملاحظة أولاً");
			return;
		}

		// Check if the file is in the library folders
		const isLibraryNote =
			activeFile.path.startsWith(this.settings.videosFolder) ||
			activeFile.path.startsWith(this.settings.booksFolder);

		if (!isLibraryNote) {
			new Notice("يمكن إضافة الفوائد فقط لملاحظات المكتبة");
			return;
		}

		// Open benefit modal
		const modal = new BenefitModal(
			this.app,
			this,
			activeFile,
			async (benefitData) => {
				try {
					await this.benefitService.addBenefitToNote(
						activeFile,
						benefitData
					);
					new Notice("تمت إضافة الفائدة بنجاح");

					// Refresh the library view if it's open
					this.refreshViews();
				} catch (error) {
					console.error("Error adding benefit:", error);
					new Notice("حدث خطأ أثناء إضافة الفائدة");
				}
			}
		);

		modal.open();
	}

	/**
	 * Refreshes all open plugin views
	 */
	refreshViews(): void {
		// Find all open Library views and trigger a refresh
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LIBRARY);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof LibraryView) {
				leaf.view.refresh();
			}
		});
	}
}
