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
		this.addAdvancedSection(containerEl);
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

		// Default view mode setting
		new Setting(containerEl)
			.setName("طريقة العرض الافتراضية")
			.setDesc("اختر طريقة العرض الافتراضية للمحتوى")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("table", "جدول")
					.addOption("card", "بطاقات")
					.setValue(this.plugin.settings.viewMode)
					.onChange(async (value: "table" | "card") => {
						this.plugin.settings.viewMode = value;
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

		// Status options setting
		new Setting(containerEl)
			.setName("خيارات الحالة")
			.setDesc("حدد خيارات الحالة المتاحة (مفصولة بسطور جديدة)")
			.addTextArea((textarea) => {
				const statusOptions =
					this.plugin.settings.progressTracking.statusOptions;
				const statusText = statusOptions.join("\n");

				textarea
					.setValue(statusText)
					.setPlaceholder("حالة لكل سطر")
					.onChange(async (value) => {
						const newOptions = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line.length > 0);

						// Ensure there's at least one option
						if (newOptions.length === 0) {
							newOptions.push("لم يشاهد");
						}

						this.plugin.settings.progressTracking.statusOptions =
							newOptions;

						// Ensure default status is in the options
						if (
							!newOptions.includes(
								this.plugin.settings.progressTracking
									.defaultStatus
							)
						) {
							this.plugin.settings.progressTracking.defaultStatus =
								newOptions[0];
						}

						await this.plugin.saveSettings();
						// Reload to update dropdowns
						this.display();
					});

				// Adjust textarea height based on content
				textarea.inputEl.rows = Math.max(4, statusOptions.length);
				textarea.inputEl.style.minHeight = "100px";

				return textarea;
			});
	}

	/**
	 * Adds template settings section
	 * @param containerEl Container element
	 */
	private addTemplateSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "قوالب الملاحظات" });

		// Video template setting
		this.addTemplateEditor(
			containerEl,
			"قالب الفيديو",
			"قالب الملاحظات لفيديوهات يوتيوب",
			"video",
			this.plugin.settings.templates.video
		);

		// Playlist template setting
		this.addTemplateEditor(
			containerEl,
			"قالب السلسلة",
			"قالب الملاحظات لسلاسل يوتيوب",
			"playlist",
			this.plugin.settings.templates.playlist
		);
	}

	/**
	 * Adds a template editor setting
	 * @param containerEl Container element
	 * @param name Setting name
	 * @param desc Setting description
	 * @param type Template type (video/playlist)
	 * @param template Template content
	 */
	private addTemplateEditor(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		type: "video" | "playlist",
		template: string
	): void {
		const templateSetting = new Setting(containerEl)
			.setName(name)
			.setDesc(desc);

		// Full width container for template editor
		const templateContainer = containerEl.createEl("div", {
			cls: "library-template-container",
		});

		// Create editor
		const templateEditor = templateContainer.createEl("textarea", {
			cls: "library-template-editor",
		});
		templateEditor.value = template;
		templateEditor.rows = 15;
		templateEditor.addEventListener("change", async () => {
			// Update settings
			this.plugin.settings.templates[type] = templateEditor.value;
			await this.plugin.saveSettings();
		});

		// Placeholder documentation
		const placeholderSection = containerEl.createEl("div", {
			cls: "library-placeholders",
		});

		placeholderSection.createEl("h3", {
			text: `المتغيرات المتاحة في قالب ${
				type === "video" ? "الفيديو" : "السلسلة"
			}:`,
		});

		const table = placeholderSection.createEl("table", {
			cls: "library-placeholders-table",
		});

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "المتغير" });
		headerRow.createEl("th", { text: "الوصف" });

		const tbody = table.createEl("tbody");

		const placeholders = PLACEHOLDER_DOCS[type] || [];
		placeholders.forEach((placeholder) => {
			const row = tbody.createEl("tr");
			row.createEl("td", { text: placeholder.placeholder });
			row.createEl("td", { text: placeholder.description });
		});
	}

	/**
	 * Adds advanced settings section
	 * @param containerEl Container element
	 */
	private addAdvancedSection(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "إعدادات متقدمة" });

		// Table columns configuration button
		new Setting(containerEl)
			.setName("تخصيص أعمدة الجدول")
			.setDesc("تخصيص الأعمدة المعروضة في طريقة عرض الجدول")
			.addButton((button) =>
				button.setButtonText("فتح إعدادات الأعمدة").onClick(() => {
					// This needs implementation in a separate modal
					// But we'll just show a notice for now
					new Notice("ستتم إضافة هذه الميزة قريباً");
				})
			);

		// Reset settings button
	}
}
