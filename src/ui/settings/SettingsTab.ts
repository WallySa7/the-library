import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { LibrarySettings } from "../../core/settings";
import {
	getFolderExample,
	PLACEHOLDER_DOCS,
} from "../../core/settings/placeholders";
import LibraryPlugin from "../../../main";

/**
 * Settings tab for The Library plugin
 * Provides UI for configuring plugin settings
 */
export class SettingsTab extends PluginSettingTab {
	plugin: LibraryPlugin;

	constructor(app: App, plugin: LibraryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClasses(["library-settings", "library-rtl"]);

		// Create settings sections
		this.addGeneralSection(containerEl);
		this.addYoutubeSection(containerEl);
		this.addFolderOrgSection(containerEl);
		this.addProgressTrackingSection(containerEl);
		this.addTemplateSection(containerEl);
	}

	/**
	 * Adds general settings section
	 * @param containerEl Container element
	 */
	private addGeneralSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "إعدادات عامة" });

		// Default folder setting
		new Setting(containerEl)
			.setName("المجلد الافتراضي")
			.setDesc("المجلد الذي سيتم حفظ محتوى المكتبة فيه")
			.addText((text) =>
				text
					.setPlaceholder("The Library")
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value;
						await this.plugin.saveSettings();
					})
			);

		// Default presenter setting
		new Setting(containerEl)
			.setName("المقدم الافتراضي")
			.setDesc("الاسم الافتراضي للمقدم عندما لا يتم تحديد أحد")
			.addText((text) =>
				text
					.setPlaceholder("غير معروف")
					.setValue(this.plugin.settings.defaultPresenter)
					.onChange(async (value) => {
						this.plugin.settings.defaultPresenter = value;
						await this.plugin.saveSettings();
					})
			);

		// Date format setting
		new Setting(containerEl)
			.setName("تنسيق التاريخ")
			.setDesc("تنسيق التواريخ في الملاحظات")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value;
						await this.plugin.saveSettings();
					})
			);

		// Show thumbnails setting
		new Setting(containerEl)
			.setName("عرض الصور المصغرة")
			.setDesc("عرض الصور المصغرة للفيديوهات")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showThumbnails)
					.onChange(async (value) => {
						this.plugin.settings.showThumbnails = value;
						await this.plugin.saveSettings();
					})
			);

		// Max title length setting
		new Setting(containerEl)
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
	}

	/**
	 * Adds YouTube integration settings section
	 * @param containerEl Container element
	 */
	private addYoutubeSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "إعدادات يوتيوب" });

		// YouTube API key setting
		new Setting(containerEl)
			.setName("مفتاح API ليوتيوب")
			.setDesc(
				"(اختياري) أضف مفتاح API ليوتيوب للحصول على معلومات أكثر دقة عن الفيديوهات"
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
		const apiKeyHelp = containerEl.createEl("div", {
			cls: "library-setting-help",
		});

		apiKeyHelp.createEl("p", {
			text: "للحصول على مفتاح API ليوتيوب، يمكنك:",
		});

		const steps = apiKeyHelp.createEl("ol");
		steps.createEl("li", {
			text: "الذهاب إلى Google Cloud Console",
		});
		steps.createEl("li", {
			text: "إنشاء مشروع جديد",
		});
		steps.createEl("li", {
			text: "تفعيل YouTube Data API v3",
		});
		steps.createEl("li", {
			text: "إنشاء بيانات اعتماد لمفتاح API",
		});
	}

	/**
	 * Adds folder organization settings section
	 * @param containerEl Container element
	 */
	private addFolderOrgSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "تنظيم المجلدات" });

		// Enable folder rules
		new Setting(containerEl)
			.setName("تنظيم المجلدات التلقائي")
			.setDesc("تمكين تنظيم الملفات في هيكل مجلدات محدد تلقائيًا")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.folderRules.enabled)
					.onChange(async (value) => {
						this.plugin.settings.folderRules.enabled = value;
						await this.plugin.saveSettings();
					})
			);

		// Folder structure template
		const folderStructure = new Setting(containerEl)
			.setName("هيكل المجلدات")
			.setDesc("حدد هيكل المجلدات باستخدام المتغيرات المتاحة")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.folderRules.structure)
					.setPlaceholder("{{type}}/{{presenter}}")
					.onChange(async (value) => {
						this.plugin.settings.folderRules.structure = value;
						await this.plugin.saveSettings();
						this.updateFolderExample();
					})
			);

		// Add folder example display
		if (this.plugin.settings.folderRules.showExamples) {
			const exampleEl = folderStructure.descEl.createDiv({
				cls: "library-example-text",
			});

			exampleEl.createEl("span", { text: "مثال: " });

			const exampleText = exampleEl.createEl("code");
			exampleText.textContent = getFolderExample(
				this.plugin.settings.folderRules.structure
			);

			// Store reference for updating later
			(folderStructure as any).exampleEl = exampleText;
		}

		// Show examples setting
		new Setting(containerEl)
			.setName("عرض الأمثلة")
			.setDesc("عرض أمثلة على هيكل المجلدات")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.folderRules.showExamples)
					.onChange(async (value) => {
						this.plugin.settings.folderRules.showExamples = value;
						await this.plugin.saveSettings();
						// Reload to apply the change
						this.display();
					})
			);

		// Folder variables documentation
		if (this.plugin.settings.folderRules.showExamples) {
			const folderVariables = containerEl.createEl("div", {
				cls: "library-placeholders",
			});

			folderVariables.createEl("h3", {
				text: "المتغيرات المتاحة:",
			});

			const table = folderVariables.createEl("table", {
				cls: "library-placeholders-table",
			});

			const thead = table.createEl("thead");
			const headerRow = thead.createEl("tr");
			headerRow.createEl("th", { text: "المتغير" });
			headerRow.createEl("th", { text: "الوصف" });

			const tbody = table.createEl("tbody");

			const folderPlaceholders = PLACEHOLDER_DOCS["folder"] || [];
			folderPlaceholders.forEach((placeholder) => {
				const row = tbody.createEl("tr");
				row.createEl("td", { text: placeholder.placeholder });
				row.createEl("td", { text: placeholder.description });
			});
		}
	}

	/**
	 * Updates the folder example based on current structure
	 */
	private updateFolderExample(): void {
		const folderStructure = this.plugin.settings.folderRules.structure;
		// Find the setting with the example (this is a bit hacky, but works)
		const settingsEls = Array.from(
			document.querySelectorAll(".library-settings .setting")
		);

		for (const settingEl of settingsEls) {
			const exampleEl = settingEl.querySelector(
				".library-example-text code"
			);
			if (exampleEl) {
				exampleEl.textContent = getFolderExample(folderStructure);
				break;
			}
		}
	}

	/**
	 * Adds progress tracking settings section
	 * @param containerEl Container element
	 */
	private addProgressTrackingSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "تتبع المشاهدة" });

		// Default status setting
		new Setting(containerEl)
			.setName("الحالة الافتراضية")
			.setDesc("الحالة الافتراضية للمحتوى الجديد")
			.addDropdown((dropdown) => {
				this.plugin.settings.progressTracking.statusOptions.forEach(
					(status) => {
						dropdown.addOption(status, status);
					}
				);

				return dropdown
					.setValue(
						this.plugin.settings.progressTracking.defaultStatus
					)
					.onChange(async (value) => {
						this.plugin.settings.progressTracking.defaultStatus =
							value;
						await this.plugin.saveSettings();
					});
			});
	}

	/**
	 * Adds template settings section
	 * @param containerEl Container element
	 */
	private addTemplateSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "قوالب الملاحظات" });

		// Video template setting with editor button
		this.addTemplateWithEditor(
			containerEl,
			"قالب الفيديو",
			"قالب الملاحظات لفيديوهات يوتيوب",
			"video"
		);

		// Playlist template setting with editor button
		this.addTemplateWithEditor(
			containerEl,
			"قالب السلسلة",
			"قالب الملاحظات لسلاسل يوتيوب",
			"playlist"
		);
	}

	/**
	 * Adds a template editor setting with a button to open the editor modal
	 * @param containerEl Container element
	 * @param name Setting name
	 * @param desc Setting description
	 * @param type Template type (video/playlist)
	 */
	private addTemplateWithEditor(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		type: "video" | "playlist"
	): void {
		const templateSetting = new Setting(containerEl)
			.setName(name)
			.setDesc(desc);

		// Add an edit button
		templateSetting.addButton((button) => {
			button
				.setButtonText("فتح محرر القالب")
				.setCta()
				.onClick(() => {
					// Import dynamically to avoid circular dependencies
					import("../modals/TemplateEditorModal").then(
						({ TemplateEditorModal }) => {
							new TemplateEditorModal(
								this.app,
								this.plugin.settings,
								type,
								async () => {
									await this.plugin.saveSettings();
									// Update the preview
								}
							).open();
						}
					);
				});
		});
	}

	/**
	 * Adds advanced settings section
	 * @param containerEl Container element
	 */
}
