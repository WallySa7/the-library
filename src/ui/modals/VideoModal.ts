// src/ui/modals/VideoModal.ts
import {
	App,
	TextComponent,
	DropdownComponent,
	Notice,
	ButtonComponent,
	TFile,
} from "obsidian";
import { BaseModal } from "./BaseModal";
import {
	VideoData,
	PlaylistData,
	VideoItem,
	PlaylistItem,
} from "../../core/contentTypes";
import {
	extractVideoId,
	extractPlaylistId,
	determineYoutubeUrlType,
} from "../../utils/youtubeUtils";
import { VIDEO_STATUS } from "src/core/constants";
import { formatDate } from "src/utils";

/**
 * Modal for adding or editing a video or playlist
 */
export class VideoModal extends BaseModal {
	private urlInput: TextComponent;
	private typeInput: DropdownComponent;
	private presenterInput: TextComponent;
	private titleInput: TextComponent;
	private descriptionInput: TextComponent;
	private tagsInput: TextComponent;
	private statusInput: DropdownComponent;
	private languageInput: DropdownComponent;
	private thumbnailPreview: HTMLElement;
	private previewContainer: HTMLElement;
	private videoPreviewContainer: HTMLElement;
	private playlistThumbnailUrl?: string = "";
	private categoriesInput: TextComponent;

	// New field for playlist video titles
	private addVideoTitlesCheckbox: HTMLInputElement;
	private playlistVideoTitlesContainer: HTMLElement;

	// Edit mode properties
	private existingItem: VideoItem | PlaylistItem | null = null;
	private isEditMode: boolean = false;

	/**
	 * Creates a new VideoModal for adding or editing a video
	 * @param app Obsidian app instance
	 * @param plugin Plugin instance
	 * @param existingItem Optional existing video or playlist for editing mode
	 */
	constructor(
		app: App,
		plugin: any,
		existingItem?: VideoItem | PlaylistItem
	) {
		super(app, plugin);

		if (existingItem) {
			this.existingItem = existingItem;
			this.isEditMode = true;
		}
	}

	/**
	 * Gets the submit button text
	 */
	protected getSubmitButtonText(): string {
		return this.isEditMode ? "تحديث" : "إضافة";
	}

	/**
	 * Renders the modal content
	 */
	protected renderModalContent(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: this.isEditMode ? "تعديل المحتوى" : "إضافة عنصر جديد",
		});

		const form = contentEl.createEl("div", { cls: "library-form" });

		this.renderUrlSection(form);
		this.renderPreviewContainer(form);
		this.renderContentFields(form);

		// Button container
		const buttonContainer = form.createEl("div", {
			cls: "library-buttons",
		});
		this.renderActionButtons(buttonContainer);

		// Pre-populate fields for edit mode
		if (this.isEditMode && this.existingItem) {
			this.populateFieldsFromExistingItem();
		}
	}

	/**
	 * Populates form fields from existing item when in edit mode
	 */
	private populateFieldsFromExistingItem(): void {
		if (!this.existingItem) return;

		// Common fields for both video and playlist
		this.titleInput.setValue(this.existingItem.title || "");

		if ("presenter" in this.existingItem && this.existingItem.presenter) {
			this.presenterInput.setValue(this.existingItem.presenter);
		}

		// Set the type
		this.typeInput.setValue(this.existingItem.type);

		// Set the URL
		if ("url" in this.existingItem && this.existingItem.url) {
			this.urlInput.setValue(this.existingItem.url);
		}

		// Set the language
		if (this.existingItem.language) {
			this.languageInput.setValue(this.existingItem.language);
		}

		// Set the status
		if (this.existingItem.status) {
			this.statusInput.setValue(this.existingItem.status);
		}

		// Set categories - handle both array and string formats
		const categories = Array.isArray(this.existingItem.categories)
			? this.existingItem.categories.join(", ")
			: typeof this.existingItem.categories === "string"
			? this.existingItem.categories
			: "";
		this.categoriesInput.setValue(categories);

		// Set tags - handle both array and string formats
		const tags = Array.isArray(this.existingItem.tags)
			? this.existingItem.tags.join(", ")
			: typeof this.existingItem.tags === "string"
			? this.existingItem.tags
			: "";
		this.tagsInput.setValue(tags);

		// If there's a thumbnail, show it
		if (
			"thumbnailUrl" in this.existingItem &&
			this.existingItem.thumbnailUrl
		) {
			this.showThumbnailPreview(
				this.existingItem.thumbnailUrl,
				this.existingItem.title
			);

			if ("playlistId" in this.existingItem) {
				this.playlistThumbnailUrl = this.existingItem.thumbnailUrl;
			}
		}

		// Load description from file content for videos and playlists
		this.loadDescriptionFromFile(this.existingItem.filePath);

		// Show/hide playlist-specific fields
		this.togglePlaylistFields();
	}

	/**
	 * Loads description from the file
	 * @param filePath Path to file
	 */
	private async loadDescriptionFromFile(filePath: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return;

			const content = await this.app.vault.read(file);

			// Extract description from content
			// This is a basic approach - you may need a more sophisticated parser for actual markdown
			const descriptionRegex = /## الوصف\s*\n\n([\s\S]*?)(?=\n\n##|$)/;
			const match = content.match(descriptionRegex);

			if (match && match[1]) {
				this.descriptionInput.setValue(match[1].trim());
			}
		} catch (error) {
			console.error("Error loading description from file:", error);
		}
	}

	/**
	 * Shows a thumbnail preview
	 * @param thumbnailUrl URL of the thumbnail
	 * @param title Title for the alt text
	 */
	private showThumbnailPreview(thumbnailUrl: string, title: string): void {
		if (!this.thumbnailPreview || !this.previewContainer) return;

		// Show thumbnail
		this.thumbnailPreview.empty();
		const img = this.thumbnailPreview.createEl("img", {
			cls: "library-thumbnail",
			attr: { src: thumbnailUrl, alt: title },
		});

		// Add size constraints
		img.style.maxWidth = "100%";
		img.style.maxHeight = "200px";
		img.style.objectFit = "contain";

		this.previewContainer.style.display = "block";

		// For video items, add click to play functionality
		if (
			this.existingItem &&
			"videoId" in this.existingItem &&
			this.existingItem.videoId
		) {
			const videoId = this.existingItem.videoId;
			// Add click to play behavior
			img.addEventListener("click", () => {
				// Use the captured videoId value to avoid null reference issues
				this.showVideoEmbed(videoId);
			});

			// Add play button overlay
			const playButton = this.thumbnailPreview.createEl("div", {
				cls: "library-play-button",
			});
			playButton.createEl("div", { cls: "library-play-icon" });
		}
	}

	/**
	 * Renders the URL input section with preview button
	 * @param form Form container
	 */
	private renderUrlSection(form: HTMLElement): void {
		this.createFormField(form, "رابط يوتيوب", () => {
			const container = form.createEl("div", {
				cls: "library-url-container",
			});

			this.urlInput = new TextComponent(container);
			this.urlInput.setPlaceholder(
				"https://www.youtube.com/watch?v=... أو قائمة تشغيل"
			);
			this.urlInput.inputEl.addClass("library-input");

			// Add preview button
			const previewButton = new ButtonComponent(container)
				.setButtonText("معاينة")
				.setClass("library-preview-button")
				.onClick(async () => {
					await this.previewVideo();
				});

			return container;
		});
	}

	/**
	 * Creates the preview containers
	 * @param form Form container
	 */
	private renderPreviewContainer(form: HTMLElement): void {
		// Preview container (initially hidden)
		this.previewContainer = form.createEl("div", {
			cls: "library-preview-container",
		});
		this.previewContainer.style.display = "none";

		this.thumbnailPreview = this.previewContainer.createEl("div", {
			cls: "library-thumbnail-container",
		});

		// Video preview container (for embedding iframe)
		this.videoPreviewContainer = this.previewContainer.createEl("div", {
			cls: "library-video-embed-container",
		});
		this.videoPreviewContainer.style.display = "none";
	}

	/**
	 * Renders content-related form fields
	 * @param form Form container
	 */
	private renderContentFields(form: HTMLElement): void {
		// Content type selection
		this.createFormField(form, "نوع المحتوى", () => {
			const container = form.createEl("div");
			this.typeInput = new DropdownComponent(container);
			this.typeInput.addOption("مقطع", "مقطع");
			this.typeInput.addOption("سلسلة", "سلسلة");
			this.typeInput.setValue("مقطع");

			// Add change listener to show/hide playlist-specific fields
			this.typeInput.onChange(() => {
				this.togglePlaylistFields();
			});

			return container;
		});

		// Presenter input with autocomplete
		this.createFormField(form, "اسم الملقي", () => {
			const container = form.createEl("div");
			this.presenterInput = new TextComponent(container);
			this.presenterInput.setPlaceholder("اسم الملقي أو المحاضر");
			this.presenterInput.inputEl.addClass("library-input");

			const datalist = container.createEl("datalist");
			datalist.id = "presenter-suggestions";
			this.presenterInput.inputEl.setAttr(
				"list",
				"presenter-suggestions"
			);

			this.plugin.dataService
				.getPresenters()
				.then((presenters: any[]) => {
					presenters.forEach((presenter) => {
						const option = datalist.createEl("option");
						option.value = presenter;
					});
				});

			return container;
		});

		// Title input
		this.createFormField(form, "العنوان", () => {
			this.titleInput = new TextComponent(form);
			this.titleInput.setPlaceholder(
				this.isEditMode ? "العنوان" : "سيتم ملؤه تلقائياً"
			);
			this.titleInput.inputEl.addClass("library-input");
			return this.titleInput.inputEl;
		});

		// Description input
		this.createFormField(form, "الوصف", () => {
			const container = form.createEl("div");
			// Use textarea for longer text
			const textarea = container.createEl("textarea", {
				cls: "library-textarea",
				attr: { rows: "4", placeholder: "وصف المحتوى (اختياري)" },
			});

			this.descriptionInput = new TextComponent(container);
			this.descriptionInput.inputEl.replaceWith(textarea);
			(this.descriptionInput as any).inputEl = textarea;

			return container;
		});

		// Categories field
		this.renderCategoriesSection(form);

		// Tags input with suggestions
		this.createFormField(form, "وسوم", () => {
			const container = form.createEl("div");
			this.tagsInput = new TextComponent(container);
			this.tagsInput.setPlaceholder("وسوم مفصولة بفواصل (اختياري)");
			this.tagsInput.inputEl.addClass("library-input");

			// Add tag suggestions
			this.plugin.dataService.getTags("video").then((tags: any[]) => {
				if (tags.length === 0) return;

				const tagSuggestions = container.createEl("div", {
					cls: "library-tag-suggestions",
				});

				tags.slice(0, 10).forEach((tag) => {
					const tagChip = tagSuggestions.createEl("span", {
						text: tag,
						cls: "library-tag-chip",
					});

					tagChip.addEventListener("click", () => {
						const currentTags = this.tagsInput
							.getValue()
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t);

						if (!currentTags.includes(tag)) {
							const newTagsValue =
								currentTags.length > 0
									? `${this.tagsInput.getValue()}, ${tag}`
									: tag;
							this.tagsInput.setValue(newTagsValue);
						}
					});
				});
			});

			return container;
		});

		// Language input
		this.createFormField(form, "لغة المحتوى", () => {
			const container = form.createEl("div");
			this.languageInput = new DropdownComponent(container);

			// Add common languages in Arabic
			this.languageInput.addOption("", "اختر اللغة");
			this.languageInput.addOption("العربية", "العربية");
			this.languageInput.addOption("الإنجليزية", "الإنجليزية");
			this.languageInput.addOption("الفرنسية", "الفرنسية");
			this.languageInput.addOption("الإسبانية", "الإسبانية");
			this.languageInput.addOption("الألمانية", "الألمانية");
			this.languageInput.addOption("أخرى", "أخرى");

			return container;
		});

		// Status dropdown
		this.createFormField(form, "حالة المشاهدة", () => {
			const container = form.createEl("div");
			this.statusInput = new DropdownComponent(container);

			this.settings.videoTracking.statusOptions.forEach((option) => {
				this.statusInput.addOption(option, option);
			});

			this.statusInput.setValue(
				this.settings.videoTracking.defaultStatus
			);

			return container;
		});

		// Add playlist-specific fields
		this.renderPlaylistSpecificFields(form);
	}

	/**
	 * Renders playlist-specific fields
	 * @param form Form container
	 */
	private renderPlaylistSpecificFields(form: HTMLElement): void {
		// Checkbox for adding video titles as headers (playlist only)
		const playlistOptionsContainer = this.createFormField(
			form,
			"خيارات السلسلة",
			() => {
				const container = form.createEl("div", {
					cls: "library-playlist-options",
				});

				const checkboxContainer = container.createEl("div", {
					cls: "library-checkbox-container",
				});

				this.addVideoTitlesCheckbox = checkboxContainer.createEl(
					"input",
					{
						type: "checkbox",
						cls: "library-checkbox",
					}
				);

				const label = checkboxContainer.createEl("label", {
					text: "إضافة عناوين المقاطع كرؤوس",
					cls: "library-checkbox-label",
				});

				label.addEventListener("click", () => {
					this.addVideoTitlesCheckbox.checked =
						!this.addVideoTitlesCheckbox.checked;
					this.toggleVideoTitlesPreview();
				});

				this.addVideoTitlesCheckbox.addEventListener("change", () => {
					this.toggleVideoTitlesPreview();
				});

				return container;
			}
		);

		// Container for video titles preview
		this.playlistVideoTitlesContainer = form.createEl("div", {
			cls: "library-playlist-videos-preview",
		});
		this.playlistVideoTitlesContainer.style.display = "none";

		// Initially hide playlist options
		playlistOptionsContainer.style.display = "none";
		(playlistOptionsContainer as any).isPlaylistField = true;
	}

	/**
	 * Toggles visibility of playlist-specific fields
	 */
	private togglePlaylistFields(): void {
		const isPlaylist = this.typeInput.getValue() === "سلسلة";

		// Find all playlist-specific fields
		const playlistFields =
			this.contentEl.querySelectorAll(".library-field");
		playlistFields.forEach((field) => {
			if ((field as any).isPlaylistField) {
				(field as HTMLElement).style.display = isPlaylist
					? "block"
					: "none";
			}
		});

		// Also hide the video titles container if not playlist
		if (!isPlaylist) {
			this.playlistVideoTitlesContainer.style.display = "none";
		}
	}

	/**
	 * Toggles video titles preview based on checkbox state
	 */
	private toggleVideoTitlesPreview(): void {
		const isChecked = this.addVideoTitlesCheckbox.checked;

		if (isChecked) {
			this.playlistVideoTitlesContainer.style.display = "block";
			this.loadVideoTitlesPreview();
		} else {
			this.playlistVideoTitlesContainer.style.display = "none";
		}
	}

	/**
	 * Loads and displays video titles preview
	 */
	private async loadVideoTitlesPreview(): Promise<void> {
		const url = this.urlInput.getValue().trim();
		if (!url) return;

		const playlistId = extractPlaylistId(url);
		if (!playlistId) return;

		this.playlistVideoTitlesContainer.empty();

		const loadingDiv = this.playlistVideoTitlesContainer.createEl("div", {
			text: "جاري تحميل عناوين المقاطع...",
			cls: "library-loading-text",
		});

		try {
			// Get playlist videos (limit to 50 to avoid too many requests)
			const response = await this.plugin.youtubeService.getPlaylistVideos(
				playlistId,
				50
			);

			loadingDiv.remove();

			if (response.success && response.data && response.data.length > 0) {
				const previewTitle = this.playlistVideoTitlesContainer.createEl(
					"h4",
					{
						text: `معاينة عناوين المقاطع (${response.data.length})`,
						cls: "library-preview-title",
					}
				);

				const videosList = this.playlistVideoTitlesContainer.createEl(
					"div",
					{
						cls: "library-videos-list",
					}
				);

				response.data.forEach((video: any, index: number) => {
					const videoItem = videosList.createEl("div", {
						cls: "library-video-item",
					});

					videoItem.createEl("span", {
						text: `${index + 1}. `,
						cls: "library-video-number",
					});

					videoItem.createEl("span", {
						text: video.title,
						cls: "library-video-title",
					});
				});

				// Add note about headers
				const note = this.playlistVideoTitlesContainer.createEl("p", {
					text: "ستتم إضافة هذه العناوين كرؤوس (#) في ملاحظة السلسلة",
					cls: "library-note",
				});
			} else {
				this.playlistVideoTitlesContainer.createEl("div", {
					text: "لم يتم العثور على مقاطع في هذه السلسلة",
					cls: "library-error-text",
				});
			}
		} catch (error) {
			console.error("Error loading video titles:", error);
			loadingDiv.remove();
			this.playlistVideoTitlesContainer.createEl("div", {
				text: "خطأ في تحميل عناوين المقاطع",
				cls: "library-error-text",
			});
		}
	}

	// Dedicated method for categories section
	private renderCategoriesSection(form: HTMLElement): void {
		// Categories input
		this.createFormField(form, "التصنيفات", () => {
			const container = form.createEl("div");
			this.categoriesInput = new TextComponent(container);
			this.categoriesInput.setPlaceholder(
				"تصنيفات مفصولة بفواصل (اختياري)"
			);
			this.categoriesInput.inputEl.addClass("library-input");

			// Add category suggestions
			this.plugin.dataService
				.getCategories("video")
				.then((categories: any[]) => {
					if (categories.length === 0) return;

					const categorySuggestions = container.createEl("div", {
						cls: "library-tag-suggestions",
					});

					categories.slice(0, 10).forEach((category) => {
						const categoryChip = categorySuggestions.createEl(
							"span",
							{
								text: category,
								cls: "library-tag-chip",
							}
						);

						categoryChip.addEventListener("click", () => {
							const currentCategories = this.categoriesInput
								.getValue()
								.split(",")
								.map((t) => t.trim())
								.filter((t) => t);

							if (!currentCategories.includes(category)) {
								const newCategoriesValue =
									currentCategories.length > 0
										? `${this.categoriesInput.getValue()}, ${category}`
										: category;
								this.categoriesInput.setValue(
									newCategoriesValue
								);
							}
						});
					});
				});

			return container;
		});
	}

	/**
	 * Previews the video or playlist from URL
	 */
	private async previewVideo(): Promise<void> {
		const url = this.urlInput.getValue().trim();
		if (!url) {
			this.showWarning("الرجاء إدخال رابط يوتيوب");
			return;
		}

		this.isLoading = true;
		this.loadingMessage = "جاري جلب معلومات المقطع...";
		this.updateLoadingUI();

		try {
			// Determine URL type
			const urlType = determineYoutubeUrlType(url);

			if (urlType === "video") {
				// Treat as a video
				const videoId = extractVideoId(url);
				if (!videoId) {
					this.showError("لم نتمكن من استخراج معرف المقطع");
					return;
				}

				const response =
					await this.plugin.youtubeService.getVideoDetails(videoId);

				if (!response.success) {
					this.showError(
						response.error || "فشل في جلب معلومات المقطع"
					);
					return;
				}

				if (!response.data) {
					this.showError("فشل في جلب معلومات المقطع");
					return;
				}

				const { title, thumbnailUrl } = response.data;

				// Update title input if empty
				if (!this.titleInput.getValue()) {
					this.titleInput.setValue(title);
				}

				// Show thumbnail
				this.showThumbnailPreview(thumbnailUrl, title);

				// Add click to play behavior
				const img = this.thumbnailPreview.querySelector("img");
				if (img) {
					img.addEventListener("click", () => {
						this.showVideoEmbed(videoId);
					});
				}
			} else if (urlType === "playlist") {
				// Pure playlist URL
				const playlistId = extractPlaylistId(url);
				if (playlistId) {
					await this.previewPlaylist(playlistId);
				} else {
					this.showError("لم نتمكن من استخراج معرف السلسلة");
				}
			} else {
				this.showError("رابط يوتيوب غير صالح");
			}
		} catch (error) {
			console.error("Error previewing video:", error);
			this.showError("حدث خطأ أثناء معاينة المقطع");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Previews a playlist
	 * @param playlistId YouTube playlist ID
	 */
	private async previewPlaylist(playlistId: string): Promise<void> {
		try {
			const response =
				await this.plugin.youtubeService.getPlaylistDetails(playlistId);

			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات السلسلة");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات السلسلة");
				return;
			}

			const { title, itemCount, thumbnailUrl } = response.data;

			// Update form
			if (!this.titleInput.getValue()) {
				this.titleInput.setValue(title);
			}

			// Store the thumbnail URL for later use
			this.playlistThumbnailUrl = thumbnailUrl;

			// Set type to playlist
			this.typeInput.setValue("سلسلة");
			this.togglePlaylistFields();

			// Show playlist info
			this.thumbnailPreview.empty();
			const playlistInfo = this.thumbnailPreview.createEl("div", {
				cls: "library-playlist-info",
			});
			playlistInfo.createEl("h3", { text: title });
			playlistInfo.createEl("p", { text: `عدد المقاطع: ${itemCount}` });

			// Show thumbnail if available
			if (thumbnailUrl) {
				const img = this.thumbnailPreview.createEl("img", {
					cls: "library-thumbnail",
					attr: {
						src: thumbnailUrl,
						alt: "صورة السلسلة",
					},
				});
			}

			this.previewContainer.style.display = "block";
		} catch (error) {
			console.error("Error previewing playlist:", error);
			this.showError("حدث خطأ أثناء معاينة السلسلة");
		}
	}

	/**
	 * Shows video embed instead of thumbnail
	 * @param videoId YouTube video ID
	 */
	private showVideoEmbed(videoId: string): void {
		// Hide thumbnail and show video container
		this.thumbnailPreview.style.display = "none";
		this.videoPreviewContainer.style.display = "block";
		this.videoPreviewContainer.empty();

		// Create iframe with proper attributes for YouTube embedding
		const iframe = this.videoPreviewContainer.createEl("iframe", {
			attr: {
				src: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
				frameborder: "0",
				allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
				allowfullscreen: "true",
				width: "100%",
				height: "100%",
			},
		});
		iframe.addClass("library-video-iframe");

		// Add close button
		const closeBtn = this.videoPreviewContainer.createEl("button", {
			text: "×",
			cls: "library-video-close-btn",
		});
		closeBtn.addEventListener("click", () => {
			this.videoPreviewContainer.style.display = "none";
			this.thumbnailPreview.style.display = "block";
			this.videoPreviewContainer.empty();
		});
	}

	/**
	 * Handles form submission
	 */
	protected async onSubmit(): Promise<void> {
		if (this.isLoading) return;

		const url = this.urlInput.getValue().trim();
		if (!url) {
			this.showWarning("الرجاء إدخال رابط يوتيوب");
			return;
		}

		this.isLoading = true;
		this.loadingMessage = "جاري معالجة الطلب...";
		this.updateLoadingUI();

		try {
			// If we're in edit mode, handle update
			if (this.isEditMode && this.existingItem) {
				await this.handleUpdateItem();
				return;
			}

			// Otherwise handle new item creation
			// If URL contains watch?v=, always treat as video
			if (url.includes("watch?v=")) {
				this.loadingMessage = "جاري جلب تفاصيل المقطع...";
				this.updateLoadingUI();
				await this.handleSingleVideo(url);
			}
			// Only treat as playlist if it's a pure playlist URL
			else if (url.includes("playlist?list=")) {
				this.loadingMessage = "جاري جلب تفاصيل السلسلة...";
				this.updateLoadingUI();
				await this.handlePlaylist(url);
			} else {
				this.showError("رابط يوتيوب غير صالح");
				this.isLoading = false;
				this.updateLoadingUI();
				return;
			}

			this.close();
		} catch (error) {
			console.error("Error handling video:", error);
			this.showError("حدث خطأ أثناء معالجة المقطع");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Handles updating an existing item
	 */
	private async handleUpdateItem(): Promise<void> {
		if (!this.existingItem) return;

		try {
			// Common updated fields
			const title = this.titleInput.getValue().trim();
			if (!title) {
				this.showWarning("الرجاء إدخال عنوان للمحتوى");
				return;
			}

			const presenter =
				this.presenterInput.getValue().trim() ||
				this.settings.defaultPresenter;
			const status = this.statusInput.getValue();
			const language = this.languageInput.getValue() || "";
			const description = this.descriptionInput.getValue().trim();

			// Process tags - convert to array
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			// Process categories - convert to array
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Determine if it's a video or playlist
			if ("videoId" in this.existingItem) {
				// Update video - pass arrays directly
				const videoData: Partial<VideoData> = {
					title,
					presenter,
					status,
					tags, // Pass as array
					categories, // Pass as array
					language,
					description,
				};

				// Update URL if changed
				const newUrl = this.urlInput.getValue().trim();
				if (newUrl && newUrl !== this.existingItem.url) {
					const videoId = extractVideoId(newUrl);
					if (videoId) {
						videoData.url = newUrl;
						videoData.videoId = videoId;
					}
				}

				this.loadingMessage = "جاري تحديث المقطع...";
				this.updateLoadingUI();

				// Call update video function - this will need to be implemented
				const success = await this.updateVideo(
					this.existingItem.filePath,
					videoData
				);

				if (success) {
					this.showSuccess(`تم تحديث المقطع "${title}" بنجاح`);
					this.close();
				} else {
					this.showError("حدث خطأ أثناء تحديث المقطع");
				}
			} else if ("playlistId" in this.existingItem) {
				// Update playlist - pass arrays directly
				const playlistData: Partial<PlaylistData> = {
					title,
					presenter,
					status,
					tags, // Pass as array
					categories, // Pass as array
					language,
				};

				// Update URL if changed
				const newUrl = this.urlInput.getValue().trim();
				if (newUrl && newUrl !== this.existingItem.url) {
					const playlistId = extractPlaylistId(newUrl);
					if (playlistId) {
						playlistData.url = newUrl;
						playlistData.playlistId = playlistId;
					}
				}

				this.loadingMessage = "جاري تحديث السلسلة...";
				this.updateLoadingUI();

				// Call update playlist function - this will need to be implemented
				const success = await this.updatePlaylist(
					this.existingItem.filePath,
					playlistData
				);

				if (success) {
					this.showSuccess(`تم تحديث السلسلة "${title}" بنجاح`);
					this.close();
				} else {
					this.showError("حدث خطأ أثناء تحديث السلسلة");
				}
			}
		} catch (error) {
			console.error("Error updating item:", error);
			this.showError("حدث خطأ أثناء تحديث المحتوى");
			throw error;
		}
	}

	/**
	 * Updates a video in the data service
	 * @param filePath Path to the video file
	 * @param videoData Updated video data
	 * @returns Whether update was successful
	 */
	private async updateVideo(
		filePath: string,
		videoData: Partial<VideoData>
	): Promise<boolean> {
		try {
			// This method would need to be implemented in the DataService
			// Similar to updateBook but for videos
			return await this.plugin.dataService.updateVideo(
				filePath,
				videoData
			);
		} catch (error) {
			console.error("Error updating video:", error);
			return false;
		}
	}

	/**
	 * Updates a playlist in the data service
	 * @param filePath Path to the playlist file
	 * @param playlistData Updated playlist data
	 * @returns Whether update was successful
	 */
	private async updatePlaylist(
		filePath: string,
		playlistData: Partial<PlaylistData>
	): Promise<boolean> {
		try {
			// This method would need to be implemented in the DataService
			// Similar to updateBook but for playlists
			return await this.plugin.dataService.updatePlaylist(
				filePath,
				playlistData
			);
		} catch (error) {
			console.error("Error updating playlist:", error);
			return false;
		}
	}

	/**
	 * Handles adding a single video
	 * @param url YouTube video URL
	 */
	private async handleSingleVideo(url: string): Promise<void> {
		const videoId = extractVideoId(url);
		if (!videoId) {
			this.showError("رابط يوتيوب غير صالح");
			return;
		}

		try {
			// Fetch video details from YouTube
			this.loadingMessage = "جاري جلب تفاصيل المقطع من يوتيوب...";
			this.updateLoadingUI();

			const response = await this.plugin.youtubeService.getVideoDetails(
				videoId
			);
			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات المقطع");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات المقطع");
				return;
			}

			const { title, duration, thumbnailUrl, description } =
				response.data;

			// Get form values
			const presenter =
				this.presenterInput.getValue().trim() ||
				this.settings.defaultPresenter;
			const type = this.typeInput.getValue();
			const videoDescription =
				this.descriptionInput.getValue().trim() || description || "";

			// Process tags - convert to array
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			const status =
				this.statusInput?.getValue() ||
				this.settings.videoTracking.defaultStatus;

			// Get language
			const language = this.languageInput?.getValue() || "";

			// Get categories - convert to array
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Set initial start and completion dates based on status
			const today = formatDate(new Date(), this.settings.dateFormat);
			let startDate = "";
			let completionDate = "";

			if (status === VIDEO_STATUS.WATCHED) {
				completionDate = today;
			} else if (status === VIDEO_STATUS.IN_PROGRESS) {
				startDate = today;
			}

			// Create the note - pass arrays directly
			this.loadingMessage = "جاري إنشاء الملاحظة...";
			this.updateLoadingUI();

			const success = await this.plugin.dataService.createVideo({
				url,
				videoId,
				title: this.titleInput.getValue().trim() || title,
				duration,
				presenter,
				type,
				description: videoDescription,
				tags, // Pass as array
				categories, // Pass as array
				thumbnailUrl,
				status,
				startDate,
				completionDate,
				language,
			});

			if (success) {
				this.showSuccess("تمت إضافة المقطع بنجاح");
			} else {
				this.showError("حدث خطأ أثناء إنشاء الملاحظة");
			}
		} catch (error) {
			console.error("Error creating video note:", error);
			this.showError("حدث خطأ أثناء إضافة المقطع");
			throw error;
		}
	}

	/**
	 * Handles adding a playlist
	 * @param url YouTube playlist URL
	 */
	private async handlePlaylist(url: string): Promise<void> {
		const playlistId = extractPlaylistId(url);
		if (!playlistId) {
			this.showError("رابط السلسلة غير صالح");
			return;
		}

		try {
			new Notice("⏳ جاري جلب تفاصيل السلسلة...");

			const response =
				await this.plugin.youtubeService.getPlaylistDetails(playlistId);

			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات السلسلة");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات السلسلة");
				return;
			}

			const { title, itemCount, duration, thumbnailUrl } = response.data;

			// Get form values
			const presenter =
				this.presenterInput.getValue().trim() ||
				this.settings.defaultPresenter;
			const type = this.typeInput.getValue();

			// Process tags - convert to array
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			const status =
				this.statusInput?.getValue() ||
				this.settings.videoTracking.defaultStatus;

			// Get language
			const language = this.languageInput?.getValue() || "";

			// Get categories - convert to array
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Set initial start and completion dates based on status
			const today = formatDate(new Date(), this.settings.dateFormat);
			let startDate = "";
			let completionDate = "";

			if (status === VIDEO_STATUS.WATCHED) {
				completionDate = today;
			} else if (status === VIDEO_STATUS.IN_PROGRESS) {
				startDate = today;
			}

			// Check if user wants to add video titles
			let videoTitlesContent = "";
			if (this.addVideoTitlesCheckbox.checked) {
				this.loadingMessage = "جاري جلب عناوين المقاطع...";
				this.updateLoadingUI();

				videoTitlesContent = await this.getVideoTitlesContent(
					playlistId
				);
			}

			// Create the note - pass arrays directly
			this.loadingMessage = "جاري إنشاء الملاحظة...";
			this.updateLoadingUI();

			const success = await this.plugin.dataService.createPlaylist({
				url,
				playlistId,
				title: this.titleInput.getValue().trim() || title,
				presenter,
				type,
				itemCount,
				duration,
				status,
				categories, // Pass as array
				thumbnailUrl: thumbnailUrl || this.playlistThumbnailUrl,
				tags, // Pass as array
				startDate,
				completionDate,
				language,
				videoTitlesContent, // Pass the video titles content
			});

			if (success) {
				this.showSuccess(`تمت إضافة السلسلة "${title}" بنجاح`);
			} else {
				this.showError("حدث خطأ أثناء إنشاء ملاحظة السلسلة");
			}
		} catch (error) {
			console.error("Error adding playlist:", error);
			this.showError("حدث خطأ أثناء إضافة السلسلة");
			throw error;
		}
	}

	/**
	 * Gets video titles content for playlist
	 * @param playlistId YouTube playlist ID
	 * @returns Formatted content with video titles as headers
	 */
	private async getVideoTitlesContent(playlistId: string): Promise<string> {
		try {
			const response = await this.plugin.youtubeService.getPlaylistVideos(
				playlistId,
				100
			);

			if (
				!response.success ||
				!response.data ||
				response.data.length === 0
			) {
				return "";
			}

			const videoTitles = response.data
				.map((video: any, index: number) => {
					return `# ${index + 1}. ${video.title}`;
				})
				.join("\n\n");

			return `${videoTitles}`;
		} catch (error) {
			console.error("Error getting video titles:", error);
			return "";
		}
	}
}
