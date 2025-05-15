// src/ui/modals/VideoModal.ts
import {
	App,
	TextComponent,
	DropdownComponent,
	Notice,
	ButtonComponent,
} from "obsidian";
import { BaseModal } from "./BaseModal";
import { VideoData, PlaylistData } from "../../core/contentTypes";
import {
	extractVideoId,
	extractPlaylistId,
	determineYoutubeUrlType,
} from "../../utils/youtubeUtils";

/**
 * Modal for adding a new video or playlist
 */
export class VideoModal extends BaseModal {
	private urlInput: TextComponent;
	private typeInput: DropdownComponent;
	private presenterInput: TextComponent;
	private titleInput: TextComponent;
	private descriptionInput: TextComponent;
	private tagsInput: TextComponent;
	private statusInput: DropdownComponent;
	private thumbnailPreview: HTMLElement;
	private previewContainer: HTMLElement;
	private videoPreviewContainer: HTMLElement;
	private playlistThumbnailUrl?: string = "";
	private categoriesInput: TextComponent;

	/**
	 * Creates a new VideoModal
	 * @param app Obsidian app instance
	 * @param plugin Plugin instance
	 */
	constructor(app: App, plugin: any) {
		super(app, plugin);
	}

	/**
	 * Gets the submit button text
	 */
	protected getSubmitButtonText(): string {
		return "إضافة";
	}

	/**
	 * Renders the modal content
	 */
	protected renderModalContent(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "إضافة عنصر جديد" });

		const form = contentEl.createEl("div", { cls: "library-form" });

		this.renderUrlSection(form);
		this.renderPreviewContainer(form);
		this.renderContentFields(form);

		// Button container
		const buttonContainer = form.createEl("div", {
			cls: "library-buttons",
		});
		this.renderActionButtons(buttonContainer);
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
			this.titleInput.setPlaceholder("سيتم ملؤه تلقائياً");
			this.titleInput.inputEl.addClass("library-input");
			return this.titleInput.inputEl;
		});

		// Description input
		this.createFormField(form, "الوصف", () => {
			this.descriptionInput = new TextComponent(form);
			this.descriptionInput.setPlaceholder("وصف مختصر (اختياري)");
			this.descriptionInput.inputEl.addClass("library-input");
			return this.descriptionInput.inputEl;
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

		// Status dropdown
		this.createFormField(form, "حالة المشاهدة", () => {
			const container = form.createEl("div");
			this.statusInput = new DropdownComponent(container);

			this.settings.progressTracking.statusOptions.forEach((option) => {
				this.statusInput.addOption(option, option);
			});

			this.statusInput.setValue(
				this.settings.progressTracking.defaultStatus
			);

			return container;
		});
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

				// Add click to play behavior
				img.addEventListener("click", () => {
					this.showVideoEmbed(videoId);
				});

				// Add play button overlay
				const playButton = this.thumbnailPreview.createEl("div", {
					cls: "library-play-button",
				});
				playButton.createEl("div", { cls: "library-play-icon" });
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
			console.error("Error adding video:", error);
			this.showError("حدث خطأ أثناء إضافة المقطع");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
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
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput.split(",").map((t) => t.trim())
				: [];
			const status =
				this.statusInput?.getValue() ||
				this.settings.progressTracking.defaultStatus;

			// Get categories
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Create the note
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
				tags,
				categories,
				thumbnailUrl,
				status,
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

			// Process tags
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			const status =
				this.statusInput?.getValue() ||
				this.settings.progressTracking.defaultStatus;

			// Get categories
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Create the note
			const success = await this.plugin.dataService.createPlaylist({
				url,
				playlistId,
				title: this.titleInput.getValue().trim() || title,
				presenter,
				type,
				itemCount,
				duration,
				status,
				categories,
				thumbnailUrl: thumbnailUrl || this.playlistThumbnailUrl,
				tags,
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
}
