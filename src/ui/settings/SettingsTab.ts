import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import {
	getFolderExample,
	PLACEHOLDER_DOCS,
} from "../../core/settings/placeholders";
import LibraryPlugin from "../../../main";

/**
 * Enhanced settings tab with tabbed interface and improved visual design
 */
export class SettingsTab extends PluginSettingTab {
	plugin: LibraryPlugin;
	containerEl: HTMLElement;

	// Tab elements
	private tabs: { id: string; name: string; icon: string }[] = [
		{ id: "general", name: "عام", icon: "settings" },
		{ id: "content", name: "المحتوى", icon: "layers" },
		{ id: "folders", name: "المجلدات", icon: "folder" },
		{ id: "templates", name: "القوالب", icon: "file-text" },
	];

	private activeTab: string = "general";
	private tabContainers: Map<string, HTMLElement> = new Map();

	constructor(app: App, plugin: LibraryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.addClasses([
			"library-settings",
			"library-rtl",
			"library-settings-enhanced",
		]);

		// Add heading
		const headerEl = this.containerEl.createEl("div", {
			cls: "library-settings-header",
		});
		headerEl.createEl("h1", { text: "إعدادات المكتبة" });

		// Add tabs navigation
		this.createTabsNavigation(this.containerEl);

		// Add tab content containers
		this.createTabContainers(this.containerEl);

		// Populate tab contents
		this.populateGeneralTab();
		this.populateContentTab();
		this.populateFoldersTab();
		this.populateTemplatesTab();

		// Set active tab
		this.setActiveTab(this.activeTab);
	}

	/**
	 * Creates the tabs navigation bar
	 */
	private createTabsNavigation(containerEl: HTMLElement): void {
		const tabsNav = containerEl.createEl("div", {
			cls: "library-settings-tabs",
		});

		this.tabs.forEach((tab) => {
			const tabButton = tabsNav.createEl("button", {
				cls: `library-settings-tab ${
					tab.id === this.activeTab ? "active" : ""
				}`,
				attr: { "data-tab": tab.id },
			});

			const tabIcon = tabButton.createEl("span", {
				cls: "library-settings-tab-icon",
			});
			setIcon(tabIcon, tab.icon);

			tabButton.createEl("span", {
				text: tab.name,
				cls: "library-settings-tab-name",
			});

			tabButton.addEventListener("click", () => {
				this.setActiveTab(tab.id);
			});
		});
	}

	/**
	 * Creates tab content containers
	 */
	private createTabContainers(containerEl: HTMLElement): void {
		const tabContentsEl = containerEl.createEl("div", {
			cls: "library-settings-tab-contents",
		});

		this.tabs.forEach((tab) => {
			const tabContentEl = tabContentsEl.createEl("div", {
				cls: `library-settings-tab-content`,
				attr: { "data-tab": tab.id },
			});

			this.tabContainers.set(tab.id, tabContentEl);
		});
	}

	/**
	 * Sets the active tab
	 */
	private setActiveTab(tabId: string): void {
		// Update active tab state
		this.activeTab = tabId;

		// Update tab buttons
		const tabButtons = this.containerEl.querySelectorAll(
			".library-settings-tab"
		);
		tabButtons.forEach((button) => {
			const buttonTabId = button.getAttribute("data-tab");
			button.toggleClass("active", buttonTabId === tabId);
		});

		// Update tab content visibility
		this.tabContainers.forEach((container, id) => {
			container.style.display = id === tabId ? "block" : "none";
		});
	}

	/**
	 * Creates a section header
	 */
	private createSectionHeader(
		container: HTMLElement,
		title: string
	): HTMLElement {
		const sectionHeader = container.createEl("div", {
			cls: "library-settings-section-header",
		});

		sectionHeader.createEl("h2", {
			text: title,
			cls: "library-settings-section-title",
		});

		return sectionHeader;
	}

	/**
	 * Creates a collapsible section
	 */
	private createCollapsibleSection(
		container: HTMLElement,
		title: string
	): HTMLElement {
		const section = container.createEl("div", {
			cls: "library-settings-collapsible",
		});

		const sectionHeader = section.createEl("div", {
			cls: "library-settings-collapsible-header",
		});

		sectionHeader.createEl("h3", {
			text: title,
			cls: "library-settings-section-title",
		});

		const toggleIcon = sectionHeader.createEl("span", {
			cls: "library-settings-collapse-icon",
		});
		setIcon(toggleIcon, "chevron-down");

		const contentEl = section.createEl("div", {
			cls: "library-settings-collapsible-content",
		});

		sectionHeader.addEventListener("click", () => {
			// Check if the section has the collapsed class
			const isCurrentlyCollapsed = section.hasClass("collapsed");
			// Toggle to the opposite state
			section.toggleClass("collapsed", !isCurrentlyCollapsed);
			// Update the icon accordingly
			setIcon(
				toggleIcon,
				!isCurrentlyCollapsed ? "chevron-down" : "chevron-up"
			);
		});

		return contentEl;
	}

	/**
	 * Add info notice to settings
	 */
	private addInfoNotice(
		container: HTMLElement,
		text: string,
		type: "info" | "warning" | "success" | "error" = "info"
	): HTMLElement {
		const notice = container.createEl("div", {
			cls: `library-settings-notice library-settings-notice-${type}`,
		});

		const iconName = {
			info: "info",
			warning: "alert-triangle",
			success: "check-circle",
			error: "alert-octagon",
		}[type];

		const iconEl = notice.createEl("span", {
			cls: "library-settings-notice-icon",
		});
		setIcon(iconEl, iconName);

		notice.createEl("span", {
			text: text,
			cls: "library-settings-notice-text",
		});

		return notice;
	}

	/**
	 * Populates the General tab
	 */
	private populateGeneralTab(): void {
		const tabContent = this.tabContainers.get("general");
		if (!tabContent) return;

		this.createSectionHeader(tabContent, "الإعدادات العامة");

		// Date format setting
		new Setting(tabContent)
			.setName("تنسيق التاريخ")
			.setDesc("تنسيق التواريخ المستخدم في الملاحظات")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value;
						await this.plugin.saveSettings();
					})
			);

		// Max title length setting
		new Setting(tabContent)
			.setName("الحد الأقصى لطول العناوين")
			.setDesc("الحد الأقصى لطول العناوين عند استخدامها كأسماء ملفات")
			.addSlider((slider) =>
				slider
					.setLimits(20, 200, 5)
					.setValue(this.plugin.settings.maxTitleLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxTitleLength = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(tabContent)
			.setName("مفتاح API ليوتيوب")
			.setDesc(
				"أضف مفتاح API ليوتيوب للحصول على معلومات أكثر دقة عن الفيديوهات"
			)
			.addText((text) =>
				text
					.setPlaceholder("مفتاح API ليوتيوب")
					.setValue(this.plugin.settings.youtubeApiKey)
					.onChange(async (value) => {
						this.plugin.settings.youtubeApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		// Help text for API key
		this.addInfoNotice(
			tabContent,
			"للحصول على مفتاح API ليوتيوب، يرجى زيارة Google Cloud Console وإنشاء مشروع جديد وتفعيل YouTube Data API v3"
		);
	}

	/**
	 * Populates the Content tab
	 */
	private populateContentTab(): void {
		const tabContent = this.tabContainers.get("content");
		if (!tabContent) return;

		// Video settings section
		const videoSection = this.createCollapsibleSection(
			tabContent,
			"إعدادات الفيديو"
		);

		new Setting(videoSection)
			.setName("الملقي الافتراضي")
			.setDesc("الاسم الافتراضي للملقي عندما لا يتم تحديد أحد")
			.addText((text) =>
				text
					.setPlaceholder("غير معروف")
					.setValue(this.plugin.settings.defaultPresenter)
					.onChange(async (value) => {
						this.plugin.settings.defaultPresenter = value;
						await this.plugin.saveSettings();
					})
			);

		// Default status setting for videos
		new Setting(videoSection)
			.setName("الحالة الافتراضية للفيديوهات")
			.setDesc("الحالة الافتراضية للفيديوهات الجديدة")
			.addDropdown((dropdown) => {
				this.plugin.settings.videoTracking.statusOptions.forEach(
					(status) => {
						dropdown.addOption(status, status);
					}
				);

				return dropdown
					.setValue(this.plugin.settings.videoTracking.defaultStatus)
					.onChange(async (value) => {
						this.plugin.settings.videoTracking.defaultStatus =
							value;
						await this.plugin.saveSettings();
					});
			});

		// Show thumbnails setting
		new Setting(videoSection)
			.setName("عرض الصور المصغرة")
			.setDesc("عرض الصور المصغرة للفيديوهات في القائمة")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showVideosThumbnails)
					.onChange(async (value) => {
						this.plugin.settings.showVideosThumbnails = value;
						await this.plugin.saveSettings();
					})
			);

		// Book settings section
		const bookSection = this.createCollapsibleSection(
			tabContent,
			"إعدادات الكتب"
		);

		new Setting(bookSection)
			.setName("المؤلف الافتراضي")
			.setDesc("الاسم الافتراضي للمؤلف عندما لا يتم تحديد أحد")
			.addText((text) =>
				text
					.setPlaceholder("غير معروف")
					.setValue(this.plugin.settings.defaultAuthor)
					.onChange(async (value) => {
						this.plugin.settings.defaultAuthor = value;
						await this.plugin.saveSettings();
					})
			);

		// Default status setting for books
		new Setting(bookSection)
			.setName("الحالة الافتراضية للكتب")
			.setDesc("الحالة الافتراضية للكتب الجديدة")
			.addDropdown((dropdown) => {
				this.plugin.settings.bookTracking.statusOptions.forEach(
					(status) => {
						dropdown.addOption(status, status);
					}
				);

				return dropdown
					.setValue(this.plugin.settings.bookTracking.defaultStatus)
					.onChange(async (value) => {
						this.plugin.settings.bookTracking.defaultStatus = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(bookSection)
			.setName("عرض الصور المصغرة")
			.setDesc("عرض الصور المصغرة للكتب في القائمة")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showBooksThumbnails)
					.onChange(async (value) => {
						this.plugin.settings.showBooksThumbnails = value;
						await this.plugin.saveSettings();
					})
			);
	}

	/**
	 * Populates the Folders tab
	 */
	private populateFoldersTab(): void {
		const tabContent = this.tabContainers.get("folders");
		if (!tabContent) return;

		// Video folders section
		const videoFoldersSection = this.createCollapsibleSection(
			tabContent,
			"مجلدات الفيديو"
		);

		new Setting(videoFoldersSection)
			.setName("المجلد الرئيسي للفيديوهات")
			.setDesc("المجلد الذي سيتم حفظ محتوى الفيديوهات فيه")
			.addText((text) =>
				text
					.setPlaceholder("The Library")
					.setValue(this.plugin.settings.videosFolder)
					.onChange(async (value) => {
						this.plugin.settings.videosFolder = value;
						await this.plugin.saveSettings();
					})
			);

		// Enable folder rules for videos
		new Setting(videoFoldersSection)
			.setName("تنظيم مجلدات الفيديو التلقائي")
			.setDesc("تمكين تنظيم ملفات الفيديو في هيكل مجلدات محدد تلقائيًا")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.videoFolderRules.enabled)
					.onChange(async (value) => {
						this.plugin.settings.videoFolderRules.enabled = value;
						await this.plugin.saveSettings();
					})
			);

		// Folder structure template with live preview for videos
		const videoFolderStructure = new Setting(videoFoldersSection)
			.setName("هيكل مجلدات الفيديو")
			.setDesc("حدد هيكل مجلدات الفيديو باستخدام المتغيرات المتاحة");

		// Create example container
		const videoExampleContainer = videoFolderStructure.descEl.createDiv({
			cls: "library-example-container",
		});

		videoExampleContainer.createEl("div", {
			text: "معاينة:",
			cls: "library-example-label",
		});

		const videoExampleEl = videoExampleContainer.createEl("code", {
			cls: "library-example-text",
		});

		videoExampleEl.textContent = getFolderExample(
			this.plugin.settings.videoFolderRules.structure
		);

		// Add text input with live update function
		videoFolderStructure.addText((text) => {
			const input = text
				.setValue(this.plugin.settings.videoFolderRules.structure)
				.setPlaceholder("{{type}}/{{presenter}}");

			// Create the live update handler
			const updateVideoExample = () => {
				const currentValue = input.inputEl.value;
				videoExampleEl.textContent = getFolderExample(currentValue);
			};

			// Add input event for live updates as you type
			input.inputEl.addEventListener("input", updateVideoExample);

			// Also handle onChange for saving
			input.onChange(async (value) => {
				this.plugin.settings.videoFolderRules.structure = value;
				await this.plugin.saveSettings();
				updateVideoExample();
			});

			return input;
		});

		// Book folders section
		const bookFoldersSection = this.createCollapsibleSection(
			tabContent,
			"مجلدات الكتب"
		);

		new Setting(bookFoldersSection)
			.setName("المجلد الرئيسي للكتب")
			.setDesc("المجلد الذي سيتم حفظ محتوى الكتب فيه")
			.addText((text) =>
				text
					.setPlaceholder("The Library/Books")
					.setValue(this.plugin.settings.booksFolder)
					.onChange(async (value) => {
						this.plugin.settings.booksFolder = value;
						await this.plugin.saveSettings();
					})
			);

		// Enable folder rules for books
		new Setting(bookFoldersSection)
			.setName("تنظيم مجلدات الكتب التلقائي")
			.setDesc("تمكين تنظيم ملفات الكتب في هيكل مجلدات محدد تلقائيًا")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.bookFolderRules.enabled)
					.onChange(async (value) => {
						this.plugin.settings.bookFolderRules.enabled = value;
						await this.plugin.saveSettings();
					})
			);

		// Folder structure template with live preview for books
		const bookFolderStructure = new Setting(bookFoldersSection)
			.setName("هيكل مجلدات الكتب")
			.setDesc("حدد هيكل مجلدات الكتب باستخدام المتغيرات المتاحة");

		// Create example container
		const bookExampleContainer = bookFolderStructure.descEl.createDiv({
			cls: "library-example-container",
		});

		bookExampleContainer.createEl("div", {
			text: "معاينة:",
			cls: "library-example-label",
		});

		const bookExampleEl = bookExampleContainer.createEl("code", {
			cls: "library-example-text",
		});

		bookExampleEl.textContent = getFolderExample(
			this.plugin.settings.bookFolderRules.structure
		);

		// Add text input with live update function
		bookFolderStructure.addText((text) => {
			const input = text
				.setValue(this.plugin.settings.bookFolderRules.structure)
				.setPlaceholder("{{type}}/{{author}}");

			// Create the live update handler
			const updateBookExample = () => {
				const currentValue = input.inputEl.value;
				bookExampleEl.textContent = getFolderExample(currentValue);
			};

			// Add input event for live updates as you type
			input.inputEl.addEventListener("input", updateBookExample);

			// Also handle onChange for saving
			input.onChange(async (value) => {
				this.plugin.settings.bookFolderRules.structure = value;
				await this.plugin.saveSettings();
				updateBookExample();
			});

			return input;
		});

		// Add placeholders reference
		const placeholdersSection = this.createCollapsibleSection(
			tabContent,
			"المتغيرات المتاحة"
		);

		const placeholdersTable = placeholdersSection.createEl("table", {
			cls: "library-placeholders-table",
		});

		const thead = placeholdersTable.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "المتغير" });
		headerRow.createEl("th", { text: "الوصف" });

		const tbody = placeholdersTable.createEl("tbody");

		const folderPlaceholders = PLACEHOLDER_DOCS["folder"] || [];
		folderPlaceholders.forEach((placeholder) => {
			const row = tbody.createEl("tr");
			row.createEl("td", { text: placeholder.placeholder });
			row.createEl("td", { text: placeholder.description });
		});

		this.addInfoNotice(
			placeholdersSection,
			"استخدم {{author}} بدلاً من {{presenter}} لتنظيم الكتب حسب المؤلف.",
			"info"
		);
	}

	/**
	 * Populates the Templates tab
	 */
	private populateTemplatesTab(): void {
		const tabContent = this.tabContainers.get("templates");
		if (!tabContent) return;

		// Create a section header for templates
		this.createSectionHeader(tabContent, "قوالب الملاحظات");

		// Video template
		const videoTemplateContainer = tabContent.createEl("div", {
			cls: "library-template-item",
		});

		// Add header with icon for video template
		const videoHeader = videoTemplateContainer.createEl("div", {
			cls: "library-template-header",
		});

		videoHeader.createEl("h3", {
			text: "قالب المقطع",
			cls: "library-template-title",
		});

		this.addTemplateWithEditor(
			videoTemplateContainer,
			"قالب المقطع",
			"قالب الملاحظات للمقاطع",
			"video"
		);

		// Playlist template
		const playlistTemplateContainer = tabContent.createEl("div", {
			cls: "library-template-item",
		});

		// Add header with icon for playlist template
		const playlistHeader = playlistTemplateContainer.createEl("div", {
			cls: "library-template-header",
		});

		playlistHeader.createEl("h3", {
			text: "قالب السلسلة",
			cls: "library-template-title",
		});

		this.addTemplateWithEditor(
			playlistTemplateContainer,
			"قالب السلسلة",
			"قالب الملاحظات للسلاسل",
			"playlist"
		);

		// Book template
		const bookTemplateContainer = tabContent.createEl("div", {
			cls: "library-template-item",
		});

		// Add header with icon for book template
		const bookHeader = bookTemplateContainer.createEl("div", {
			cls: "library-template-header",
		});

		bookHeader.createEl("h3", {
			text: "قالب الكتاب",
			cls: "library-template-title",
		});

		this.addTemplateWithEditor(
			bookTemplateContainer,
			"قالب الكتاب",
			"قالب الملاحظات للكتب",
			"book"
		);
	}

	/**
	 * Adds a template editor setting with a button to open the editor modal
	 */
	private addTemplateWithEditor(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		type: "video" | "playlist" | "book"
	): void {
		// Open editor button
		const buttonContainer = containerEl.createEl("div", {
			cls: "library-template-editor-buttons",
		});

		const editButton = buttonContainer.createEl("button", {
			cls: "library-button library-template-editor-button",
			text: "فتح محرر القالب",
		});

		const editIcon = editButton.createEl("span", {
			cls: "library-button-icon",
		});
		setIcon(editIcon, "edit-3");

		editButton.addEventListener("click", () => {
			// Import dynamically to avoid circular dependencies
			import("../modals/TemplateEditorModal").then(
				({ TemplateEditorModal }) => {
					new TemplateEditorModal(
						this.app,
						this.plugin.settings,
						type,
						async () => {
							await this.plugin.saveSettings();
						}
					).open();
				}
			);
		});
	}
}
