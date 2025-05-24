// src/ui/modals/BenefitShareModal.ts

import { App, Modal, Notice } from "obsidian";
import { BenefitItem, BenefitShareOptions } from "../../core";
import { DEFAULT_SHARE_OPTIONS } from "../../core/settings/defaults";

/**
 * Modal for sharing benefits as images
 */
export class BenefitShareModal extends Modal {
	private plugin: any;
	private benefit: BenefitItem;
	private options: BenefitShareOptions;
	private canvas: HTMLCanvasElement;
	private previewContainer: HTMLElement;

	constructor(app: App, plugin: any, benefit: BenefitItem) {
		super(app);
		this.plugin = plugin;
		this.benefit = benefit;
		this.options = { ...DEFAULT_SHARE_OPTIONS };
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("library-share-modal");

		contentEl.createEl("h2", { text: "مشاركة الفائدة" });

		// Create layout containers
		const mainContainer = contentEl.createEl("div", {
			cls: "library-share-main",
		});

		const optionsContainer = mainContainer.createEl("div", {
			cls: "library-share-options",
		});

		const previewSection = mainContainer.createEl("div", {
			cls: "library-share-preview-section",
		});

		// Render options
		this.renderOptions(optionsContainer);

		// Render preview
		this.previewContainer = previewSection.createEl("div", {
			cls: "library-share-preview",
		});

		this.canvas = this.previewContainer.createEl("canvas");
		this.updatePreview();

		// Action buttons
		const buttonsContainer = contentEl.createEl("div", {
			cls: "library-buttons",
		});

		const downloadBtn = buttonsContainer.createEl("button", {
			text: "تحميل كصورة",
			cls: "library-button library-button-primary",
		});

		const copyBtn = buttonsContainer.createEl("button", {
			text: "نسخ إلى الحافظة",
			cls: "library-button",
		});

		const cancelBtn = buttonsContainer.createEl("button", {
			text: "إلغاء",
			cls: "library-button",
		});

		// Event handlers
		downloadBtn.addEventListener("click", () => this.downloadImage());
		copyBtn.addEventListener("click", () => this.copyToClipboard());
		cancelBtn.addEventListener("click", () => this.close());
	}

	/**
	 * Renders customization options
	 */
	private renderOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "خيارات التخصيص" });

		// Background color
		this.createColorPicker(
			container,
			"لون الخلفية",
			this.options.backgroundColor,
			(color) => {
				this.options.backgroundColor = color;
				this.updatePreview();
			}
		);

		// Text color
		this.createColorPicker(
			container,
			"لون النص",
			this.options.textColor,
			(color) => {
				this.options.textColor = color;
				this.updatePreview();
			}
		);

		// Font size
		this.createNumberInput(
			container,
			"حجم الخط",
			this.options.fontSize,
			12,
			32,
			(size) => {
				this.options.fontSize = size;
				this.updatePreview();
			}
		);

		// Width
		this.createNumberInput(
			container,
			"عرض الصورة",
			this.options.width,
			400,
			1200,
			(width) => {
				this.options.width = width;
				this.updatePreview();
			}
		);

		// Checkboxes for content options
		container.createEl("h4", { text: "المحتوى المضمّن" });

		this.createCheckbox(
			container,
			"معلومات المصدر",
			this.options.includeParentTitle,
			(checked) => {
				this.options.includeParentTitle = checked;
				this.updatePreview();
			}
		);

		this.createCheckbox(
			container,
			"اسم المؤلف/الملقي",
			this.options.includeAuthor,
			(checked) => {
				this.options.includeAuthor = checked;
				this.updatePreview();
			}
		);

		this.createCheckbox(
			container,
			"الموقع (صفحة/وقت)",
			this.options.includeMetadata,
			(checked) => {
				this.options.includeMetadata = checked;
				this.updatePreview();
			}
		);

		this.createCheckbox(
			container,
			"التصنيفات والوسوم",
			this.options.includeTags,
			(checked) => {
				this.options.includeTags = checked;
				this.updatePreview();
			}
		);

		// Preset themes
		container.createEl("h4", { text: "قوالب جاهزة" });

		const themesContainer = container.createEl("div", {
			cls: "library-share-themes",
		});

		this.createThemeButton(themesContainer, "داكن", {
			backgroundColor: "#1e1e1e",
			textColor: "#ffffff",
		});

		this.createThemeButton(themesContainer, "فاتح", {
			backgroundColor: "#ffffff",
			textColor: "#000000",
		});

		this.createThemeButton(themesContainer, "أزرق", {
			backgroundColor: "#1a365d",
			textColor: "#e2e8f0",
		});

		this.createThemeButton(themesContainer, "أخضر", {
			backgroundColor: "#064e3b",
			textColor: "#d1fae5",
		});
	}

	/**
	 * Creates a color picker input
	 */
	private createColorPicker(
		container: HTMLElement,
		label: string,
		value: string,
		onChange: (color: string) => void
	): void {
		const field = container.createEl("div", { cls: "library-field" });
		field.createEl("label", { text: label, cls: "library-label" });

		const inputContainer = field.createEl("div", {
			cls: "library-color-input-container",
		});

		const colorInput = inputContainer.createEl("input", {
			type: "color",
			value: value,
			cls: "library-color-input",
		});

		const textInput = inputContainer.createEl("input", {
			type: "text",
			value: value,
			cls: "library-input library-color-text",
		});

		colorInput.addEventListener("input", () => {
			textInput.value = colorInput.value;
			onChange(colorInput.value);
		});

		textInput.addEventListener("input", () => {
			if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
				colorInput.value = textInput.value;
				onChange(textInput.value);
			}
		});
	}

	/**
	 * Creates a number input
	 */
	private createNumberInput(
		container: HTMLElement,
		label: string,
		value: number,
		min: number,
		max: number,
		onChange: (value: number) => void
	): void {
		const field = container.createEl("div", { cls: "library-field" });
		field.createEl("label", { text: label, cls: "library-label" });

		const input = field.createEl("input", {
			type: "number",
			value: value.toString(),
			cls: "library-input",
			attr: { min: min.toString(), max: max.toString() },
		});

		input.addEventListener("input", () => {
			const newValue = parseInt(input.value);
			if (!isNaN(newValue) && newValue >= min && newValue <= max) {
				onChange(newValue);
			}
		});
	}

	/**
	 * Creates a checkbox input
	 */
	private createCheckbox(
		container: HTMLElement,
		label: string,
		checked: boolean,
		onChange: (checked: boolean) => void
	): void {
		const field = container.createEl("label", {
			cls: "library-checkbox-field",
		});

		const checkbox = field.createEl("input", {
			type: "checkbox",
			cls: "library-checkbox",
		});
		checkbox.checked = checked;

		field.createEl("span", { text: label });

		checkbox.addEventListener("change", () => {
			onChange(checkbox.checked);
		});
	}

	/**
	 * Creates a theme preset button
	 */
	private createThemeButton(
		container: HTMLElement,
		name: string,
		theme: Partial<BenefitShareOptions>
	): void {
		const button = container.createEl("button", {
			text: name,
			cls: "library-theme-button",
		});

		button.addEventListener("click", () => {
			Object.assign(this.options, theme);
			this.updatePreview();

			// Update color inputs
			const bgColorInput = this.contentEl.querySelector(
				'input[type="color"]'
			) as HTMLInputElement;
			const textColorInput = this.contentEl.querySelectorAll(
				'input[type="color"]'
			)[1] as HTMLInputElement;

			if (bgColorInput && theme.backgroundColor) {
				bgColorInput.value = theme.backgroundColor;
				(bgColorInput.nextElementSibling as HTMLInputElement).value =
					theme.backgroundColor;
			}

			if (textColorInput && theme.textColor) {
				textColorInput.value = theme.textColor;
				(textColorInput.nextElementSibling as HTMLInputElement).value =
					theme.textColor;
			}
		});
	}

	/**
	 * Updates the preview canvas
	 */
	private updatePreview(): void {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) return;

		// Calculate dimensions
		const padding = this.options.padding;
		const width = this.options.width;
		let height = 400; // Initial height, will be adjusted

		// Set canvas size
		this.canvas.width = width;

		// Fill background
		ctx.fillStyle = this.options.backgroundColor;
		ctx.fillRect(0, 0, width, height);

		// Set text properties
		ctx.fillStyle = this.options.textColor;
		ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
		ctx.textAlign = "right";
		ctx.direction = "rtl";

		let y = padding;

		// Draw title
		ctx.font = `bold ${this.options.fontSize + 4}px ${
			this.options.fontFamily
		}`;
		y = this.wrapText(
			ctx,
			this.benefit.title,
			width - padding,
			y + 30,
			width - 2 * padding,
			30
		);
		y += 20;

		// Draw metadata
		ctx.font = `${this.options.fontSize - 2}px ${this.options.fontFamily}`;
		ctx.fillStyle = this.adjustColorOpacity(this.options.textColor, 0.7);

		if (this.options.includeParentTitle && this.benefit.parentTitle) {
			y = this.wrapText(
				ctx,
				this.benefit.parentTitle,
				width - padding,
				y + 25,
				width - 2 * padding,
				25
			);
		}

		if (this.options.includeAuthor && this.benefit.author) {
			y = this.wrapText(
				ctx,
				this.benefit.author,
				width - padding,
				y + 25,
				width - 2 * padding,
				25
			);
		}

		if (this.options.includeMetadata) {
			let locationText = "";
			if (
				this.benefit.contentType === "book" &&
				this.benefit.pageNumber
			) {
				locationText = `الصفحة: ${this.benefit.pageNumber}`;
				if (this.benefit.volumeNumber) {
					locationText = `المجلد: ${this.benefit.volumeNumber} - ${locationText}`;
				}
			} else if (
				this.benefit.contentType === "video" &&
				this.benefit.timestamp
			) {
				locationText = `الوقت: ${this.formatTimestamp(
					this.benefit.timestamp
				)}`;
			}

			if (locationText) {
				y = this.wrapText(
					ctx,
					locationText,
					width - padding,
					y + 25,
					width - 2 * padding,
					25
				);
			}
		}

		// Draw separator
		y += 15;
		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.3);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padding, y);
		ctx.lineTo(width - padding, y);
		ctx.stroke();
		y += 25;

		// Draw main text
		ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
		ctx.fillStyle = this.options.textColor;
		y = this.wrapText(
			ctx,
			this.benefit.text,
			width - padding,
			y,
			width - 2 * padding,
			28
		);

		// Draw tags
		if (
			this.options.includeTags &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			y += 30;
			ctx.font = `${this.options.fontSize - 3}px ${
				this.options.fontFamily
			}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.options.textColor,
				0.6
			);

			const allTags = [
				...this.benefit.categories,
				...this.benefit.tags,
			].join(" • ");
			y = this.wrapText(
				ctx,
				allTags,
				width - padding,
				y,
				width - 2 * padding,
				25
			);
		}

		// Add some bottom padding
		height = y + padding;

		// Resize canvas to actual content height
		this.canvas.height = height;

		// Redraw everything with correct height
		this.redrawCanvas(ctx, width, height);
	}

	/**
	 * Redraws the canvas with the correct height
	 */
	private redrawCanvas(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		// Fill background
		ctx.fillStyle = this.options.backgroundColor;
		ctx.fillRect(0, 0, width, height);

		// Set text properties
		ctx.fillStyle = this.options.textColor;
		ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
		ctx.textAlign = "right";
		ctx.direction = "rtl";

		const padding = this.options.padding;
		let y = padding;

		// Draw title
		ctx.font = `bold ${this.options.fontSize + 4}px ${
			this.options.fontFamily
		}`;
		y = this.wrapText(
			ctx,
			this.benefit.title,
			width - padding,
			y + 30,
			width - 2 * padding,
			30
		);
		y += 20;

		// Draw metadata
		ctx.font = `${this.options.fontSize - 2}px ${this.options.fontFamily}`;
		ctx.fillStyle = this.adjustColorOpacity(this.options.textColor, 0.7);

		if (this.options.includeParentTitle && this.benefit.parentTitle) {
			y = this.wrapText(
				ctx,
				this.benefit.parentTitle,
				width - padding,
				y + 25,
				width - 2 * padding,
				25
			);
		}

		if (this.options.includeAuthor && this.benefit.author) {
			y = this.wrapText(
				ctx,
				this.benefit.author,
				width - padding,
				y + 25,
				width - 2 * padding,
				25
			);
		}

		if (this.options.includeMetadata) {
			let locationText = "";
			if (
				this.benefit.contentType === "book" &&
				this.benefit.pageNumber
			) {
				locationText = `الصفحة: ${this.benefit.pageNumber}`;
				if (this.benefit.volumeNumber) {
					locationText = `المجلد: ${this.benefit.volumeNumber} - ${locationText}`;
				}
			} else if (
				this.benefit.contentType === "video" &&
				this.benefit.timestamp
			) {
				locationText = `الوقت: ${this.formatTimestamp(
					this.benefit.timestamp
				)}`;
			}

			if (locationText) {
				y = this.wrapText(
					ctx,
					locationText,
					width - padding,
					y + 25,
					width - 2 * padding,
					25
				);
			}
		}

		// Draw separator
		y += 15;
		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.3);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padding, y);
		ctx.lineTo(width - padding, y);
		ctx.stroke();
		y += 25;

		// Draw main text
		ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
		ctx.fillStyle = this.options.textColor;
		y = this.wrapText(
			ctx,
			this.benefit.text,
			width - padding,
			y,
			width - 2 * padding,
			28
		);

		// Draw tags
		if (
			this.options.includeTags &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			y += 30;
			ctx.font = `${this.options.fontSize - 3}px ${
				this.options.fontFamily
			}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.options.textColor,
				0.6
			);

			const allTags = [
				...this.benefit.categories,
				...this.benefit.tags,
			].join(" • ");
			y = this.wrapText(
				ctx,
				allTags,
				width - padding,
				y,
				width - 2 * padding,
				25
			);
		}
	}

	/**
	 * Wraps text to fit within a maximum width
	 */
	private wrapText(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number
	): number {
		const words = text.split(" ");
		let line = "";
		let currentY = y;

		for (let i = 0; i < words.length; i++) {
			const testLine = line + words[i] + " ";
			const metrics = ctx.measureText(testLine);
			const testWidth = metrics.width;

			if (testWidth > maxWidth && i > 0) {
				ctx.fillText(line, x, currentY);
				line = words[i] + " ";
				currentY += lineHeight;
			} else {
				line = testLine;
			}
		}

		ctx.fillText(line, x, currentY);
		return currentY;
	}

	/**
	 * Adjusts color opacity
	 */
	private adjustColorOpacity(color: string, opacity: number): string {
		// Convert hex to rgba
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	/**
	 * Formats timestamp
	 */
	private formatTimestamp(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, "0")}`;
		}
	}

	/**
	 * Downloads the image
	 */
	private downloadImage(): void {
		this.canvas.toBlob((blob) => {
			if (!blob) {
				new Notice("فشل في إنشاء الصورة");
				return;
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `benefit-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);

			new Notice("تم تحميل الصورة");
			this.close();
		});
	}

	/**
	 * Copies image to clipboard
	 */
	private async copyToClipboard(): Promise<void> {
		try {
			this.canvas.toBlob(async (blob) => {
				if (!blob) {
					new Notice("فشل في إنشاء الصورة");
					return;
				}

				await navigator.clipboard.write([
					new ClipboardItem({
						"image/png": blob,
					}),
				]);

				new Notice("تم نسخ الصورة إلى الحافظة");
				this.close();
			});
		} catch (error) {
			console.error("Error copying to clipboard:", error);
			new Notice("فشل في النسخ إلى الحافظة");
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
