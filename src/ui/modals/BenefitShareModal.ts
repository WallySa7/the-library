// src/ui/modals/BenefitShareModal.ts

import { App, Modal, Notice, setIcon } from "obsidian";
import { BenefitItem, BenefitShareOptions } from "../../core";
import { DEFAULT_SHARE_OPTIONS } from "../../core/settings/defaults";

/**
 * Social media platform presets
 */
interface SocialMediaPreset {
	name: string;
	width: number;
	height: number;
	description: string;
	icon: string;
}

/**
 * Design template interface
 */
interface DesignTemplate {
	name: string;
	background: string;
	textColor: string;
	accentColor: string;
	secondaryColor: string;
	fontFamily: string;
	titleFontFamily: string;
	style:
		| "modern"
		| "classic"
		| "minimalist"
		| "fancy"
		| "academic"
		| "elegant";
	borderRadius: number;
	padding: number;
	shadowStrength: number;
}

/**
 * Field customization interface
 */
interface FieldCustomization {
	enabled: boolean;
	fontSize: number;
	color: string;
	bold: boolean;
	position: "top" | "bottom" | "custom";
	customY?: number;
	style: "plain" | "bubble" | "underline" | "box";
}

/**
 * Layout type
 */
type LayoutType =
	| "centered"
	| "top-emphasis"
	| "balanced"
	| "quote-focused"
	| "academic";

/**
 * Modal for sharing benefits as professionally styled images for social media
 */
export class BenefitShareModal extends Modal {
	private plugin: any;
	private benefit: BenefitItem;
	private options: BenefitShareOptions;
	private canvas: HTMLCanvasElement;
	private previewContainer: HTMLElement;

	// Design settings
	private selectedTemplate: string = "modern-gradient";
	private selectedPlatform: string = "square";
	private aspectRatio: number = 1; // Default square
	private useGradient: boolean = true;
	private gradientType: "linear" | "radial" = "linear";
	private gradientDirection: string = "to bottom right";
	private accentColor: string = "#f6ad55";
	private secondaryColor: string = "#4299e1";
	private showQuoteMarks: boolean = true;
	private borderRadius: number = 16;
	private shadowStrength: number = 3;
	private backgroundImage: HTMLImageElement | null = null;
	private backgroundOverlay: number = 0.5;
	private layoutType: LayoutType = "balanced";
	private patternType: string = "none";
	private textureOpacity: number = 0.1;

	// Field customization
	private fieldCustomization: {
		title: FieldCustomization;
		source: FieldCustomization;
		author: FieldCustomization;
		location: FieldCustomization;
		content: FieldCustomization;
		tags: FieldCustomization;
		watermark: FieldCustomization;
	};

	// Arabic fonts
	private arabicFonts: { value: string; text: string }[] = [
		{ value: "Arial, sans-serif", text: "Arial" },
		{ value: "Tahoma, sans-serif", text: "Tahoma" },
		{ value: "Cairo, sans-serif", text: "Cairo" },
		{ value: "Tajawal, sans-serif", text: "Tajawal" },
		{ value: "Almarai, sans-serif", text: "Almarai" },
		{ value: "Amiri, serif", text: "Amiri" },
		{ value: "Scheherazade, serif", text: "Scheherazade" },
		{ value: "Reem Kufi, sans-serif", text: "Reem Kufi" },
		{ value: "Lateef, serif", text: "Lateef" },
		{ value: "El Messiri, sans-serif", text: "El Messiri" },
	];

	// Predefined social media platform sizes
	private socialMediaPresets: SocialMediaPreset[] = [
		{
			name: "square",
			width: 1080,
			height: 1080,
			description: "مربع (انستجرام)",
			icon: "square",
		},
		{
			name: "story",
			width: 1080,
			height: 1920,
			description: "ستوري",
			icon: "smartphone",
		},
		{
			name: "twitter",
			width: 1200,
			height: 675,
			description: "تويتر",
			icon: "twitter",
		},
		{
			name: "facebook",
			width: 1200,
			height: 630,
			description: "فيسبوك",
			icon: "facebook",
		},
		{
			name: "wide",
			width: 1920,
			height: 1080,
			description: "عريض 16:9",
			icon: "monitor",
		},
		{
			name: "custom",
			width: 800,
			height: 800,
			description: "مخصص",
			icon: "settings",
		},
	];

	// Pattern types
	private patterns: { value: string; text: string }[] = [
		{ value: "none", text: "بدون" },
		{ value: "dots", text: "نقاط" },
		{ value: "lines", text: "خطوط" },
		{ value: "grid", text: "شبكة" },
		{ value: "diamonds", text: "معينات" },
		{ value: "waves", text: "أمواج" },
	];

	// Layout types
	private layouts: { value: LayoutType; text: string }[] = [
		{ value: "centered", text: "متمركز" },
		{ value: "top-emphasis", text: "التركيز على العنوان" },
		{ value: "balanced", text: "متوازن" },
		{ value: "quote-focused", text: "اقتباسي" },
		{ value: "academic", text: "أكاديمي" },
	];

	// Design templates
	private designTemplates: DesignTemplate[] = [
		{
			name: "modern-gradient",
			background: "linear-gradient(to bottom right, #4a5568, #1a202c)",
			textColor: "#ffffff",
			accentColor: "#f6ad55",
			secondaryColor: "#4299e1",
			fontFamily: "Tajawal, sans-serif",
			titleFontFamily: "Tajawal, sans-serif",
			style: "modern",
			borderRadius: 16,
			padding: 50,
			shadowStrength: 3,
		},
		{
			name: "elegant-dark",
			background: "linear-gradient(to right, #000000, #1a1a2e)",
			textColor: "#ffffff",
			accentColor: "#d69e2e",
			secondaryColor: "#c53030",
			fontFamily: "Amiri, serif",
			titleFontFamily: "El Messiri, sans-serif",
			style: "elegant",
			borderRadius: 8,
			padding: 60,
			shadowStrength: 2,
		},
		{
			name: "light-clean",
			background: "linear-gradient(to bottom right, #f7fafc, #e2e8f0)",
			textColor: "#1a202c",
			accentColor: "#3182ce",
			secondaryColor: "#805ad5",
			fontFamily: "Cairo, sans-serif",
			titleFontFamily: "Cairo, sans-serif",
			style: "modern",
			borderRadius: 16,
			padding: 50,
			shadowStrength: 1,
		},
		{
			name: "minimal-white",
			background: "#ffffff",
			textColor: "#000000",
			accentColor: "#718096",
			secondaryColor: "#a0aec0",
			fontFamily: "Almarai, sans-serif",
			titleFontFamily: "Almarai, sans-serif",
			style: "minimalist",
			borderRadius: 0,
			padding: 40,
			shadowStrength: 0,
		},
		{
			name: "vibrant-purple",
			background: "linear-gradient(135deg, #667eea, #764ba2)",
			textColor: "#ffffff",
			accentColor: "#fbd38d",
			secondaryColor: "#b794f4",
			fontFamily: "Tajawal, sans-serif",
			titleFontFamily: "Reem Kufi, sans-serif",
			style: "fancy",
			borderRadius: 24,
			padding: 45,
			shadowStrength: 4,
		},
		{
			name: "academic-paper",
			background: "#f8f9fa",
			textColor: "#333333",
			accentColor: "#2b6cb0",
			secondaryColor: "#718096",
			fontFamily: "Amiri, serif",
			titleFontFamily: "El Messiri, sans-serif",
			style: "academic",
			borderRadius: 2,
			padding: 50,
			shadowStrength: 1,
		},
		{
			name: "forest-green",
			background: "linear-gradient(to bottom, #1e3c35, #112d26)",
			textColor: "#e2f0cb",
			accentColor: "#81b29a",
			secondaryColor: "#f2cc8f",
			fontFamily: "Almarai, sans-serif",
			titleFontFamily: "El Messiri, sans-serif",
			style: "elegant",
			borderRadius: 12,
			padding: 55,
			shadowStrength: 3,
		},
		{
			name: "tech-blue",
			background: "linear-gradient(125deg, #0f172a, #1e40af)",
			textColor: "#e0f2fe",
			accentColor: "#38bdf8",
			secondaryColor: "#e11d48",
			fontFamily: "Cairo, sans-serif",
			titleFontFamily: "Cairo, sans-serif",
			style: "modern",
			borderRadius: 20,
			padding: 50,
			shadowStrength: 2,
		},
		{
			name: "desert-warm",
			background: "linear-gradient(to bottom right, #92400e, #78350f)",
			textColor: "#fef3c7",
			accentColor: "#fbbf24",
			secondaryColor: "#f59e0b",
			fontFamily: "Tajawal, sans-serif",
			titleFontFamily: "Reem Kufi, sans-serif",
			style: "fancy",
			borderRadius: 16,
			padding: 45,
			shadowStrength: 2,
		},
		{
			name: "coral-vibes",
			background: "linear-gradient(to right, #7f1d1d, #be123c)",
			textColor: "#fee2e2",
			accentColor: "#fb7185",
			secondaryColor: "#fecaca",
			fontFamily: "Almarai, sans-serif",
			titleFontFamily: "El Messiri, sans-serif",
			style: "fancy",
			borderRadius: 18,
			padding: 50,
			shadowStrength: 3,
		},
	];

	constructor(app: App, plugin: any, benefit: BenefitItem) {
		super(app);
		this.plugin = plugin;
		this.benefit = benefit;
		this.options = { ...DEFAULT_SHARE_OPTIONS };

		// Initialize field customization with defaults
		this.fieldCustomization = {
			title: {
				enabled: true,
				fontSize: 24,
				color: "#ffffff",
				bold: true,
				position: "top",
				style: "underline",
			},
			source: {
				enabled: true,
				fontSize: 16,
				color: "#ffffff",
				bold: false,
				position: "top",
				style: "plain",
			},
			author: {
				enabled: true,
				fontSize: 16,
				color: "#ffffff",
				bold: false,
				position: "top",
				style: "plain",
			},
			location: {
				enabled: true,
				fontSize: 14,
				color: "#ffffff",
				bold: false,
				position: "top",
				style: "bubble",
			},
			content: {
				enabled: true,
				fontSize: 20,
				color: "#ffffff",
				bold: false,
				position: "custom",
				customY: 300,
				style: "plain",
			},
			tags: {
				enabled: true,
				fontSize: 14,
				color: "#ffffff",
				bold: false,
				position: "bottom",
				style: "bubble",
			},
			watermark: {
				enabled: true,
				fontSize: 14,
				color: "#ffffff",
				bold: false,
				position: "bottom",
				style: "plain",
			},
		};

		// Initialize with modern template settings
		this.applyTemplate("modern-gradient");
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("library-share-modal");
		contentEl.addClass("benefit-share-pro");

		contentEl.createEl("h2", { text: "مشاركة الفائدة" });

		// Create layout containers with resizable interface
		const mainContainer = contentEl.createEl("div", {
			cls: "library-share-main",
		});

		// Options panel with tabs
		const optionsContainer = mainContainer.createEl("div", {
			cls: "library-share-options",
		});

		const previewSection = mainContainer.createEl("div", {
			cls: "library-share-preview-section",
		});

		// Add resizing handle between options and preview
		const resizeHandle = mainContainer.createEl("div", {
			cls: "library-resize-handle",
		});

		// Make the panel resizable
		this.setupResizeHandle(resizeHandle, optionsContainer, previewSection);

		// Render options
		this.renderOptions(optionsContainer);

		// Render preview
		this.previewContainer = previewSection.createEl("div", {
			cls: "library-share-preview",
		});

		// Add zoom controls for the preview
		const zoomControls = previewSection.createEl("div", {
			cls: "library-preview-zoom-controls",
		});

		const zoomOutBtn = zoomControls.createEl("button", {
			cls: "library-zoom-btn",
			attr: { title: "تصغير" },
		});
		setIcon(zoomOutBtn, "zoom-out");

		const zoomInBtn = zoomControls.createEl("button", {
			cls: "library-zoom-btn",
			attr: { title: "تكبير" },
		});
		setIcon(zoomInBtn, "zoom-in");

		const zoomResetBtn = zoomControls.createEl("button", {
			cls: "library-zoom-btn",
			attr: { title: "إعادة ضبط" },
		});
		setIcon(zoomResetBtn, "maximize");

		// Create canvas and initialize
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

		// Zoom control event handlers
		let zoomLevel = 1;
		zoomOutBtn.addEventListener("click", () => {
			zoomLevel = Math.max(0.5, zoomLevel - 0.1);
			this.canvas.style.transform = `scale(${zoomLevel})`;
		});

		zoomInBtn.addEventListener("click", () => {
			zoomLevel = Math.min(2, zoomLevel + 0.1);
			this.canvas.style.transform = `scale(${zoomLevel})`;
		});

		zoomResetBtn.addEventListener("click", () => {
			zoomLevel = 1;
			this.canvas.style.transform = `scale(${zoomLevel})`;
		});

		// Add enhanced CSS styles
		this.addEnhancedStyles();
	}

	/**
	 * Apply a predefined design template
	 */
	private applyTemplate(templateName: string): void {
		const template = this.designTemplates.find(
			(t) => t.name === templateName
		);
		if (!template) return;

		this.selectedTemplate = templateName;
		this.options.backgroundColor = template.background;
		this.options.textColor = template.textColor;
		this.accentColor = template.accentColor;
		this.secondaryColor = template.secondaryColor;
		this.options.fontFamily = template.fontFamily;
		this.borderRadius = template.borderRadius;
		this.options.padding = template.padding;
		this.shadowStrength = template.shadowStrength;

		// Enable gradient for templates that use it
		this.useGradient = template.background.includes("gradient");

		// Parse gradient type and direction if it's a gradient
		if (this.useGradient) {
			if (template.background.includes("linear")) {
				this.gradientType = "linear";
				const directionMatch = template.background.match(
					/linear-gradient\((.*?),/
				);
				if (directionMatch && directionMatch[1]) {
					this.gradientDirection = directionMatch[1];
				}
			} else if (template.background.includes("radial")) {
				this.gradientType = "radial";
			}
		}

		// Update field colors based on template
		this.fieldCustomization.title.color = template.textColor;
		this.fieldCustomization.source.color = template.textColor;
		this.fieldCustomization.author.color = template.textColor;
		this.fieldCustomization.content.color = template.textColor;
		this.fieldCustomization.location.color = template.accentColor;
		this.fieldCustomization.tags.color = template.textColor;
		this.fieldCustomization.watermark.color = this.adjustColorOpacity(
			template.textColor,
			0.5
		);

		// Choose layout based on template style
		switch (template.style) {
			case "modern":
				this.layoutType = "balanced";
				break;
			case "classic":
			case "academic":
				this.layoutType = "academic";
				break;
			case "fancy":
				this.layoutType = "quote-focused";
				break;
			case "minimalist":
				this.layoutType = "centered";
				break;
			case "elegant":
				this.layoutType = "top-emphasis";
				break;
			default:
				this.layoutType = "balanced";
		}

		// Adjust pattern based on style
		if (template.style === "academic") {
			this.patternType = "none";
		} else if (template.style === "modern") {
			this.patternType = "dots";
			this.textureOpacity = 0.1;
		} else if (template.style === "fancy") {
			this.patternType = "waves";
			this.textureOpacity = 0.15;
		} else {
			this.patternType = "none";
		}
	}

	/**
	 * Set up resizable panel functionality
	 */
	private setupResizeHandle(
		handle: HTMLElement,
		leftPanel: HTMLElement,
		rightPanel: HTMLElement
	): void {
		let startX: number;
		let startWidth: number;

		handle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			startX = e.clientX;
			startWidth = leftPanel.offsetWidth;
			document.addEventListener("mousemove", resize);
			document.addEventListener("mouseup", stopResize);
		});

		const resize = (e: MouseEvent) => {
			// Calculate the new width (RTL-aware)
			const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
			const newWidth = startWidth - (e.clientX - startX);

			// Limit the min/max width (40% - 70% of the container)
			const minWidth = containerWidth * 0.2;
			const maxWidth = containerWidth * 0.6;
			const clampedWidth = Math.max(
				minWidth,
				Math.min(maxWidth, newWidth)
			);

			leftPanel.style.width = `${clampedWidth}px`;
		};

		const stopResize = () => {
			document.removeEventListener("mousemove", resize);
			document.removeEventListener("mouseup", stopResize);
		};
	}

	/**
	 * Renders options with tabbed interface
	 */
	private renderOptions(container: HTMLElement): void {
		// Create tabbed interface for options
		const tabsContainer = container.createEl("div", {
			cls: "share-options-tabs",
		});

		const templateTab = tabsContainer.createEl("button", {
			text: "القوالب",
			cls: "share-option-tab active",
			attr: { "data-tab": "templates" },
		});

		const layoutTab = tabsContainer.createEl("button", {
			text: "التخطيط",
			cls: "share-option-tab",
			attr: { "data-tab": "layout" },
		});

		const styleTab = tabsContainer.createEl("button", {
			text: "المظهر",
			cls: "share-option-tab",
			attr: { "data-tab": "style" },
		});

		const contentTab = tabsContainer.createEl("button", {
			text: "الحقول",
			cls: "share-option-tab",
			attr: { "data-tab": "fields" },
		});

		const effectsTab = tabsContainer.createEl("button", {
			text: "تأثيرات",
			cls: "share-option-tab",
			attr: { "data-tab": "effects" },
		});

		// Options panels
		const optionsContent = container.createEl("div", {
			cls: "share-options-content",
		});

		const templatesPanel = optionsContent.createEl("div", {
			cls: "share-option-panel active",
			attr: { "data-panel": "templates" },
		});

		const layoutPanel = optionsContent.createEl("div", {
			cls: "share-option-panel",
			attr: { "data-panel": "layout" },
		});

		const stylePanel = optionsContent.createEl("div", {
			cls: "share-option-panel",
			attr: { "data-panel": "style" },
		});

		const fieldsPanel = optionsContent.createEl("div", {
			cls: "share-option-panel",
			attr: { "data-panel": "fields" },
		});

		const effectsPanel = optionsContent.createEl("div", {
			cls: "share-option-panel",
			attr: { "data-panel": "effects" },
		});

		// Setup tab switching
		[templateTab, layoutTab, styleTab, contentTab, effectsTab].forEach(
			(tab) => {
				tab.addEventListener("click", () => {
					// Get the tab name
					const tabName = tab.getAttribute("data-tab");
					if (!tabName) return;

					// Remove active class from all tabs and panels
					tabsContainer
						.querySelectorAll(".share-option-tab")
						.forEach((t) => t.removeClass("active"));
					optionsContent
						.querySelectorAll(".share-option-panel")
						.forEach((p) => p.removeClass("active"));

					// Add active class to current tab and panel
					tab.addClass("active");
					optionsContent
						.querySelector(`[data-panel="${tabName}"]`)
						?.addClass("active");
				});
			}
		);

		// Fill template options
		this.renderTemplateOptions(templatesPanel);

		// Fill layout options
		this.renderLayoutOptions(layoutPanel);

		// Fill style options
		this.renderStyleOptions(stylePanel);

		// Fill field options
		this.renderFieldOptions(fieldsPanel);

		// Fill effects options
		this.renderEffectsOptions(effectsPanel);
	}

	/**
	 * Render template selection options
	 */
	private renderTemplateOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "اختر قالب التصميم" });

		// Search filter for templates
		const searchContainer = container.createEl("div", {
			cls: "template-search-container",
		});

		const searchInput = searchContainer.createEl("input", {
			type: "text",
			placeholder: "البحث في القوالب...",
			cls: "template-search-input",
		});

		// Template grid
		const templateGrid = container.createEl("div", {
			cls: "template-grid",
		});

		// Create template cards
		const renderTemplates = (searchTerm: string = "") => {
			templateGrid.empty();

			// Filter templates if search term exists
			const filteredTemplates =
				searchTerm.length > 0
					? this.designTemplates.filter((t) =>
							this.getTemplateName(t.name).includes(searchTerm)
					  )
					: this.designTemplates;

			filteredTemplates.forEach((template) => {
				const card = templateGrid.createEl("div", {
					cls: `template-card ${
						this.selectedTemplate === template.name
							? "selected"
							: ""
					}`,
					attr: {
						"data-template": template.name,
					},
				});

				// Template preview
				const preview = card.createEl("div", {
					cls: "template-preview",
				});

				preview.style.background = template.background;
				preview.style.borderRadius = `${template.borderRadius / 2}px`;

				// Add some example content
				const previewContent = preview.createEl("div", {
					cls: "template-preview-content",
				});

				previewContent.innerHTML = `
                    <div class="preview-title" style="color: ${template.textColor}; font-family: ${template.titleFontFamily}">عنوان الفائدة</div>
                    <div class="preview-text" style="color: ${template.textColor}; font-family: ${template.fontFamily}">نص الفائدة...</div>
                    <div class="preview-accent" style="background-color: ${template.accentColor}"></div>
                `;

				// Template name
				card.createEl("div", {
					text: this.getTemplateName(template.name),
					cls: "template-name",
				});

				// Select template on click
				card.addEventListener("click", () => {
					templateGrid
						.querySelectorAll(".template-card")
						.forEach((c) => c.removeClass("selected"));
					card.addClass("selected");
					this.applyTemplate(template.name);
					this.updatePreview();
				});
			});
		};

		// Initial render
		renderTemplates();

		// Search functionality
		searchInput.addEventListener("input", () => {
			renderTemplates(searchInput.value.trim());
		});

		// Load custom template section
		container.createEl("h4", { text: "تخصيص ألوان القالب" });

		const colorCustomizationContainer = container.createEl("div", {
			cls: "template-color-customization",
		});

		// Background color/gradient options
		const bgContainer = colorCustomizationContainer.createEl("div", {
			cls: "color-section",
		});

		bgContainer.createEl("label", {
			text: "الخلفية",
			cls: "color-section-label",
		});

		const bgTypeContainer = bgContainer.createEl("div", {
			cls: "bg-type-selector",
		});

		const solidBtn = bgTypeContainer.createEl("button", {
			text: "لون ثابت",
			cls: `bg-type-btn ${!this.useGradient ? "active" : ""}`,
		});

		const gradientBtn = bgTypeContainer.createEl("button", {
			text: "تدرج لوني",
			cls: `bg-type-btn ${this.useGradient ? "active" : ""}`,
		});

		// Gradient options
		const gradientOptions = bgContainer.createEl("div", {
			cls: "gradient-options",
			attr: { style: this.useGradient ? "" : "display: none;" },
		});

		// Switch between solid and gradient
		solidBtn.addEventListener("click", () => {
			solidBtn.addClass("active");
			gradientBtn.removeClass("active");
			this.useGradient = false;
			gradientOptions.style.display = "none";

			// Get single color
			const solidColor =
				this.extractGradientColors(this.options.backgroundColor)[0] ||
				"#000000";
			this.options.backgroundColor = solidColor;

			this.updatePreview();
		});

		gradientBtn.addEventListener("click", () => {
			gradientBtn.addClass("active");
			solidBtn.removeClass("active");
			this.useGradient = true;
			gradientOptions.style.display = "";

			// Create gradient from current color if it's solid
			if (!this.options.backgroundColor.includes("gradient")) {
				const startColor = this.options.backgroundColor;
				// Create a slightly darker end color
				const endColor = this.adjustColorBrightness(startColor, -30);
				this.updateGradientBackground(startColor, endColor);
			}

			this.updatePreview();
		});

		// Gradient type
		const gradientTypeField = gradientOptions.createEl("div", {
			cls: "library-field",
		});
		gradientTypeField.createEl("label", {
			text: "نوع التدرج",
			cls: "library-label",
		});

		const gradientTypeSelect = gradientTypeField.createEl("select", {
			cls: "library-select",
		});
		gradientTypeSelect.createEl("option", {
			text: "خطي",
			value: "linear",
			attr: { selected: this.gradientType === "linear" },
		});
		gradientTypeSelect.createEl("option", {
			text: "دائري",
			value: "radial",
			attr: { selected: this.gradientType === "radial" },
		});

		gradientTypeSelect.addEventListener("change", () => {
			this.gradientType = gradientTypeSelect.value as "linear" | "radial";

			// Show/hide direction selector based on type
			gradientDirectionField.style.display =
				this.gradientType === "linear" ? "" : "none";

			this.updatePreview();
		});

		// Gradient direction (for linear gradients)
		const gradientDirectionField = gradientOptions.createEl("div", {
			cls: "library-field",
			attr: {
				style: this.gradientType === "radial" ? "display: none;" : "",
			},
		});

		gradientDirectionField.createEl("label", {
			text: "اتجاه التدرج",
			cls: "library-label",
		});

		const gradientDirectionSelect = gradientDirectionField.createEl(
			"select",
			{ cls: "library-select" }
		);

		const directions = [
			{ text: "من الأعلى إلى الأسفل", value: "to bottom" },
			{ text: "من اليمين إلى اليسار", value: "to left" },
			{ text: "من اليسار إلى اليمين", value: "to right" },
			{
				text: "من الأعلى اليمين إلى الأسفل اليسار",
				value: "to bottom left",
			},
			{
				text: "من الأعلى اليسار إلى الأسفل اليمين",
				value: "to bottom right",
			},
			{ text: "قطري صاعد", value: "to top right" },
			{ text: "قطري عكسي", value: "to top left" },
		];

		directions.forEach((dir) => {
			gradientDirectionSelect.createEl("option", {
				text: dir.text,
				value: dir.value,
				attr: { selected: this.gradientDirection === dir.value },
			});
		});

		gradientDirectionSelect.addEventListener("change", () => {
			this.gradientDirection = gradientDirectionSelect.value;
			this.updatePreview();
		});

		// Colors section
		this.createColorPicker(
			this.useGradient ? gradientOptions : bgContainer,
			this.useGradient ? "لون البداية" : "لون الخلفية",
			this.extractGradientColors(this.options.backgroundColor)[0] ||
				"#000000",
			(color) => {
				if (this.useGradient) {
					const endColor =
						this.extractGradientColors(
							this.options.backgroundColor
						)[1] || color;
					this.updateGradientBackground(color, endColor);
				} else {
					this.options.backgroundColor = color;
				}
				this.updatePreview();
			}
		);

		// End color (only for gradients)
		if (this.useGradient) {
			this.createColorPicker(
				gradientOptions,
				"لون النهاية",
				this.extractGradientColors(this.options.backgroundColor)[1] ||
					"#333333",
				(color) => {
					const startColor =
						this.extractGradientColors(
							this.options.backgroundColor
						)[0] || color;
					this.updateGradientBackground(startColor, color);
				}
			);
		}

		// Text and accent colors
		const textColorSection = colorCustomizationContainer.createEl("div", {
			cls: "color-section",
		});

		textColorSection.createEl("label", {
			text: "ألوان النص",
			cls: "color-section-label",
		});

		this.createColorPicker(
			textColorSection,
			"لون النص الرئيسي",
			this.options.textColor,
			(color) => {
				this.options.textColor = color;
				this.fieldCustomization.title.color = color;
				this.fieldCustomization.content.color = color;
				this.updatePreview();
			}
		);

		this.createColorPicker(
			textColorSection,
			"لون التمييز",
			this.accentColor,
			(color) => {
				this.accentColor = color;
				this.fieldCustomization.location.color = color;
				this.updatePreview();
			}
		);

		this.createColorPicker(
			textColorSection,
			"لون ثانوي",
			this.secondaryColor,
			(color) => {
				this.secondaryColor = color;
				this.updatePreview();
			}
		);
	}

	/**
	 * Render layout options
	 */
	private renderLayoutOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "حجم وشكل الصورة" });

		// Layout types with visual preview
		const layoutsContainer = container.createEl("div", {
			cls: "layouts-container",
		});

		this.layouts.forEach((layout) => {
			const layoutItem = layoutsContainer.createEl("div", {
				cls: `layout-item ${
					this.layoutType === layout.value ? "active" : ""
				}`,
				attr: { "data-layout": layout.value },
			});

			// Visual representation of the layout
			const layoutPreview = layoutItem.createEl("div", {
				cls: "layout-preview",
			});

			// Add visual elements representing layout structure
			this.createLayoutPreviewElements(layoutPreview, layout.value);

			// Layout name
			layoutItem.createEl("div", {
				text: layout.text,
				cls: "layout-name",
			});

			layoutItem.addEventListener("click", () => {
				layoutsContainer
					.querySelectorAll(".layout-item")
					.forEach((item) => item.removeClass("active"));
				layoutItem.addClass("active");
				this.layoutType = layout.value;
				this.updatePreview();
			});
		});

		// Platform presets
		container.createEl("h4", { text: "أبعاد الصورة" });

		const platformsContainer = container.createEl("div", {
			cls: "platforms-container",
		});

		this.socialMediaPresets.forEach((platform) => {
			const platformBtn = platformsContainer.createEl("button", {
				cls: `platform-button ${
					this.selectedPlatform === platform.name ? "active" : ""
				}`,
				attr: {
					"data-platform": platform.name,
					title: `${platform.width} × ${platform.height}`,
				},
			});

			// Add icon and text
			setIcon(platformBtn, platform.icon);
			platformBtn.createEl("span", { text: platform.description });

			platformBtn.addEventListener("click", () => {
				platformsContainer
					.querySelectorAll(".platform-button")
					.forEach((b) => b.removeClass("active"));
				platformBtn.addClass("active");

				this.selectedPlatform = platform.name;
				this.options.width = platform.width;
				this.aspectRatio = platform.width / platform.height;

				// Update height input
				if (heightInput) {
					heightInput.value = platform.height.toString();
				}

				this.updatePreview();
			});
		});

		// Custom dimensions for "custom" preset
		const dimensionsContainer = container.createEl("div", {
			cls: "dimensions-container",
		});

		// Width control
		const widthField = dimensionsContainer.createEl("div", {
			cls: "library-field",
		});
		widthField.createEl("label", { text: "العرض", cls: "library-label" });
		const widthInput = widthField.createEl("input", {
			type: "number",
			value: this.options.width.toString(),
			cls: "library-input",
			attr: { min: "300", max: "3000", step: "10" },
		});

		// Height calculation based on aspect ratio
		const heightField = dimensionsContainer.createEl("div", {
			cls: "library-field",
		});
		heightField.createEl("label", {
			text: "الارتفاع",
			cls: "library-label",
		});
		const heightInput = heightField.createEl("input", {
			type: "number",
			value: Math.round(this.options.width / this.aspectRatio).toString(),
			cls: "library-input",
			attr: { min: "300", max: "3000", step: "10" },
		});

		// Maintain aspect ratio checkbox
		const aspectRatioContainer = dimensionsContainer.createEl("div", {
			cls: "library-checkbox-field",
		});
		const aspectRatioCheck = aspectRatioContainer.createEl("input", {
			type: "checkbox",
			cls: "library-checkbox",
		});
		aspectRatioCheck.checked = true;

		aspectRatioContainer.createEl("span", { text: "الحفاظ على النسبة" });

		// Update dimensions when changed
		widthInput.addEventListener("input", () => {
			const width = parseInt(widthInput.value);
			if (!isNaN(width) && width >= 300 && width <= 3000) {
				this.options.width = width;
				// Update height based on aspect ratio if checkbox is checked
				if (aspectRatioCheck.checked) {
					const newHeight = Math.round(width / this.aspectRatio);
					heightInput.value = newHeight.toString();
				} else {
					// Update aspect ratio
					this.aspectRatio = width / parseInt(heightInput.value);
				}
				this.updatePreview();
			}
		});

		heightInput.addEventListener("input", () => {
			const height = parseInt(heightInput.value);
			if (!isNaN(height) && height >= 300 && height <= 3000) {
				if (aspectRatioCheck.checked) {
					// Update width based on aspect ratio
					const newWidth = Math.round(height * this.aspectRatio);
					widthInput.value = newWidth.toString();
					this.options.width = newWidth;
				} else {
					// Update aspect ratio
					this.aspectRatio = this.options.width / height;
				}

				// Always update platform to custom
				this.selectedPlatform = "custom";
				platformsContainer
					.querySelectorAll(".platform-button")
					.forEach((b) => b.removeClass("active"));
				platformsContainer
					.querySelector('[data-platform="custom"]')
					?.addClass("active");

				this.updatePreview();
			}
		});

		// Border radius
		this.createSlider(
			container,
			"استدارة الزوايا",
			this.borderRadius,
			0,
			50,
			(value) => {
				this.borderRadius = value;
				this.updatePreview();
			}
		);

		// Padding
		this.createSlider(
			container,
			"الهوامش الداخلية",
			this.options.padding,
			20,
			120,
			(value) => {
				this.options.padding = value;
				this.updatePreview();
			}
		);
	}

	/**
	 * Creates visual preview for layout types
	 */
	private createLayoutPreviewElements(
		container: HTMLElement,
		layoutType: LayoutType
	): void {
		container.empty();

		switch (layoutType) {
			case "centered":
				this.createLayoutPreviewElement(
					container,
					"title",
					"top-center",
					30
				);
				this.createLayoutPreviewElement(
					container,
					"metadata",
					"top-center",
					50,
					0.7
				);
				this.createLayoutPreviewElement(
					container,
					"content",
					"center",
					100,
					1
				);
				this.createLayoutPreviewElement(
					container,
					"tags",
					"bottom",
					20,
					0.6
				);
				break;

			case "top-emphasis":
				this.createLayoutPreviewElement(container, "title", "top", 40);
				this.createLayoutPreviewElement(
					container,
					"metadata",
					"top",
					25,
					0.7
				);
				this.createLayoutPreviewElement(
					container,
					"content",
					"middle",
					90,
					1
				);
				this.createLayoutPreviewElement(
					container,
					"tags",
					"bottom",
					20,
					0.6
				);
				break;

			case "balanced":
				this.createLayoutPreviewElement(container, "title", "top", 30);
				this.createLayoutPreviewElement(
					container,
					"metadata",
					"top-middle",
					20,
					0.7
				);
				this.createLayoutPreviewElement(
					container,
					"content",
					"middle",
					100,
					1
				);
				this.createLayoutPreviewElement(
					container,
					"tags",
					"bottom",
					25,
					0.6
				);
				break;

			case "quote-focused":
				this.createLayoutPreviewElement(
					container,
					"quote-start",
					"top-left",
					15,
					0.5
				);
				this.createLayoutPreviewElement(
					container,
					"title",
					"top-center",
					20
				);
				this.createLayoutPreviewElement(
					container,
					"content",
					"center",
					120,
					1
				);
				this.createLayoutPreviewElement(
					container,
					"quote-end",
					"bottom-right",
					15,
					0.5
				);
				this.createLayoutPreviewElement(
					container,
					"metadata",
					"bottom",
					20,
					0.7
				);
				break;

			case "academic":
				this.createLayoutPreviewElement(container, "title", "top", 35);
				this.createLayoutPreviewElement(
					container,
					"line",
					"top-middle",
					2
				);
				this.createLayoutPreviewElement(
					container,
					"metadata",
					"top-middle",
					20,
					0.7
				);
				this.createLayoutPreviewElement(
					container,
					"content",
					"middle",
					100,
					1
				);
				this.createLayoutPreviewElement(
					container,
					"line",
					"bottom-middle",
					2
				);
				this.createLayoutPreviewElement(
					container,
					"tags",
					"bottom",
					20,
					0.6
				);
				break;
		}
	}

	/**
	 * Creates a visual element for layout preview
	 */
	private createLayoutPreviewElement(
		container: HTMLElement,
		type: string,
		position: string,
		height: number,
		opacity: number = 1
	): void {
		const element = container.createEl("div", {
			cls: `layout-element layout-${type} position-${position}`,
		});

		element.style.height = `${height}%`;
		element.style.opacity = opacity.toString();

		if (type === "line") {
			element.style.height = `${height}px`;
			element.style.backgroundColor = "#fff";
			element.style.margin = "4px 0";
		}
	}

	/**
	 * Render style options
	 */
	private renderStyleOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "تنسيق الخطوط" });

		// Primary font
		this.createSelect(
			container,
			"الخط الرئيسي",
			this.arabicFonts,
			this.options.fontFamily,
			(value) => {
				this.options.fontFamily = value;
				this.updatePreview();
			}
		);

		// Title font
		this.createSelect(
			container,
			"خط العنوان",
			this.arabicFonts,
			this.options.fontFamily,
			(value) => {
				this.fieldCustomization.title.fontFamily = value;
				this.updatePreview();
			}
		);

		// Font size sliders for main elements
		container.createEl("h4", { text: "حجم الخطوط" });

		this.createSlider(
			container,
			"حجم خط العنوان",
			this.fieldCustomization.title.fontSize,
			16,
			48,
			(value) => {
				this.fieldCustomization.title.fontSize = value;
				this.updatePreview();
			}
		);

		this.createSlider(
			container,
			"حجم النص الرئيسي",
			this.fieldCustomization.content.fontSize,
			14,
			36,
			(value) => {
				this.fieldCustomization.content.fontSize = value;
				this.updatePreview();
			}
		);

		this.createSlider(
			container,
			"حجم البيانات الوصفية",
			this.fieldCustomization.source.fontSize,
			10,
			24,
			(value) => {
				this.fieldCustomization.source.fontSize = value;
				this.fieldCustomization.author.fontSize = value;
				this.fieldCustomization.location.fontSize = value;
				this.updatePreview();
			}
		);

		// Font styles
		container.createEl("h4", { text: "أنماط الخطوط" });

		this.createCheckbox(
			container,
			"خط عريض للعنوان",
			this.fieldCustomization.title.bold,
			(checked) => {
				this.fieldCustomization.title.bold = checked;
				this.updatePreview();
			}
		);

		this.createCheckbox(
			container,
			"خط عريض للمحتوى",
			this.fieldCustomization.content.bold,
			(checked) => {
				this.fieldCustomization.content.bold = checked;
				this.updatePreview();
			}
		);

		// Title style
		const titleStyleOptions = [
			{ value: "plain", text: "عادي" },
			{ value: "underline", text: "مع تسطير" },
			{ value: "box", text: "في إطار" },
			{ value: "bubble", text: "فقاعة" },
		];

		this.createSelect(
			container,
			"نمط العنوان",
			titleStyleOptions,
			this.fieldCustomization.title.style,
			(value) => {
				this.fieldCustomization.title.style = value as any;
				this.updatePreview();
			}
		);
	}

	/**
	 * Render field customization options
	 */
	private renderFieldOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "تخصيص الحقول" });
		container.createEl("p", {
			text: "يمكنك تخصيص ظهور وشكل كل حقل من حقول الفائدة",
			cls: "fields-description",
		});

		// Fields accordion
		const fieldsAccordion = container.createEl("div", {
			cls: "fields-accordion",
		});

		// Title field
		this.createFieldAccordion(
			fieldsAccordion,
			"العنوان",
			this.fieldCustomization.title,
			(config) => {
				this.fieldCustomization.title = config;
				this.updatePreview();
			},
			true // Always show title field
		);

		// Source field (parent title)
		this.createFieldAccordion(
			fieldsAccordion,
			"المصدر",
			this.fieldCustomization.source,
			(config) => {
				this.fieldCustomization.source = config;
				this.updatePreview();
			}
		);

		// Author field
		this.createFieldAccordion(
			fieldsAccordion,
			"المؤلف / الملقي",
			this.fieldCustomization.author,
			(config) => {
				this.fieldCustomization.author = config;
				this.updatePreview();
			}
		);

		// Location field (page/timestamp)
		this.createFieldAccordion(
			fieldsAccordion,
			"الموقع (صفحة/وقت)",
			this.fieldCustomization.location,
			(config) => {
				this.fieldCustomization.location = config;
				this.updatePreview();
			}
		);

		// Content field
		this.createFieldAccordion(
			fieldsAccordion,
			"المحتوى الرئيسي",
			this.fieldCustomization.content,
			(config) => {
				this.fieldCustomization.content = config;
				this.updatePreview();
			},
			true // Always show content field
		);

		// Tags field
		this.createFieldAccordion(
			fieldsAccordion,
			"التصنيفات والوسوم",
			this.fieldCustomization.tags,
			(config) => {
				this.fieldCustomization.tags = config;
				this.updatePreview();
			}
		);

		// Watermark field
		this.createFieldAccordion(
			fieldsAccordion,
			"علامة مائية",
			this.fieldCustomization.watermark,
			(config) => {
				this.fieldCustomization.watermark = config;
				this.updatePreview();
			}
		);
	}

	/**
	 * Create field accordion for customization
	 */
	private createFieldAccordion(
		container: HTMLElement,
		title: string,
		config: FieldCustomization,
		onChange: (config: FieldCustomization) => void,
		required: boolean = false
	): void {
		const accordion = container.createEl("div", {
			cls: "field-accordion",
		});

		// Header
		const header = accordion.createEl("div", {
			cls: "field-accordion-header",
		});

		// Enable/disable checkbox
		if (!required) {
			const enableCheckbox = header.createEl("input", {
				type: "checkbox",
				cls: "field-toggle-checkbox",
			});
			enableCheckbox.checked = config.enabled;

			enableCheckbox.addEventListener("change", () => {
				config.enabled = enableCheckbox.checked;

				// Toggle the content visibility
				content.style.display = config.enabled ? "" : "none";

				// Update field state
				onChange(config);
			});
		}

		// Title
		header.createEl("span", {
			text: title,
			cls: "field-accordion-title",
		});

		// Toggle button
		const toggleBtn = header.createEl("button", {
			cls: "field-accordion-toggle",
		});

		setIcon(toggleBtn, "chevron-down");

		// Content
		const content = accordion.createEl("div", {
			cls: "field-accordion-content",
			attr: { style: "display: none;" },
		});

		// Configure options
		if (title !== "علامة مائية") {
			// Style selector
			const styleOptions = [
				{ value: "plain", text: "عادي" },
				{ value: "underline", text: "مع تسطير" },
				{ value: "box", text: "في إطار" },
				{ value: "bubble", text: "فقاعة" },
			];

			this.createSelect(
				content,
				"النمط",
				styleOptions,
				config.style,
				(value) => {
					config.style = value as any;
					onChange(config);
				}
			);

			// Position
			const positionOptions = [
				{ value: "top", text: "أعلى" },
				{ value: "bottom", text: "أسفل" },
			];

			if (title === "المحتوى الرئيسي") {
				positionOptions.push({ value: "custom", text: "مخصص" });
			}

			this.createSelect(
				content,
				"الموضع",
				positionOptions,
				config.position,
				(value) => {
					config.position = value as any;

					// Show custom Y position if selected
					if (value === "custom" && customYContainer) {
						customYContainer.style.display = "";
					} else if (customYContainer) {
						customYContainer.style.display = "none";
					}

					onChange(config);
				}
			);

			// Custom Y position (for content)
			let customYContainer: HTMLElement | null = null;
			if (title === "المحتوى الرئيسي") {
				customYContainer = content.createEl("div", {
					cls: "library-field",
					attr: {
						style:
							config.position === "custom"
								? ""
								: "display: none;",
					},
				});

				customYContainer.createEl("label", {
					text: "موضع مخصص (Y)",
					cls: "library-label",
				});

				const customYInput = customYContainer.createEl("input", {
					type: "number",
					value: (config.customY || 300).toString(),
					cls: "library-input",
					attr: { min: "100", max: "2000", step: "10" },
				});

				customYInput.addEventListener("input", () => {
					const value = parseInt(customYInput.value);
					if (!isNaN(value) && value >= 100 && value <= 2000) {
						config.customY = value;
						onChange(config);
					}
				});
			}
		}

		// Color picker
		this.createColorPicker(content, "اللون", config.color, (color) => {
			config.color = color;
			onChange(config);
		});

		// Font size slider
		this.createSlider(
			content,
			"حجم الخط",
			config.fontSize,
			title === "علامة مائية" ? 8 : 12,
			title === "العنوان" ? 48 : 36,
			(value) => {
				config.fontSize = value;
				onChange(config);
			}
		);

		// Bold text
		this.createCheckbox(content, "خط عريض", config.bold, (checked) => {
			config.bold = checked;
			onChange(config);
		});

		// Toggle accordion
		toggleBtn.addEventListener("click", () => {
			const isExpanded = content.style.display !== "none";

			// Toggle icon
			setIcon(toggleBtn, isExpanded ? "chevron-down" : "chevron-up");

			// Toggle content
			content.style.display = isExpanded ? "none" : "";
		});

		// Hide content initially
		if (!config.enabled && !required) {
			content.style.display = "none";
		}
	}

	/**
	 * Render effects options
	 */
	private renderEffectsOptions(container: HTMLElement): void {
		container.createEl("h3", { text: "تأثيرات بصرية" });

		// Shadow strength
		this.createSlider(
			container,
			"قوة الظلال",
			this.shadowStrength,
			0,
			10,
			(value) => {
				this.shadowStrength = value;
				this.updatePreview();
			}
		);

		// Pattern/texture
		container.createEl("h4", { text: "القوام والأنماط" });

		// Pattern selector
		this.createSelect(
			container,
			"نمط الخلفية",
			this.patterns,
			this.patternType,
			(value) => {
				this.patternType = value;
				this.updatePreview();
			}
		);

		// Pattern opacity
		this.createSlider(
			container,
			"شفافية النمط",
			this.textureOpacity * 100,
			0,
			50,
			(value) => {
				this.textureOpacity = value / 100;
				this.updatePreview();
			}
		);

		// Quote marks
		container.createEl("h4", { text: "عناصر إضافية" });

		this.createCheckbox(
			container,
			"إظهار علامات الاقتباس",
			this.showQuoteMarks,
			(checked) => {
				this.showQuoteMarks = checked;
				this.updatePreview();
			}
		);
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
			value: value.startsWith("#") ? value : "#000000", // Ensure it's a valid hex color
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
	 * Creates a select dropdown
	 */
	private createSelect(
		container: HTMLElement,
		label: string,
		options: { value: string; text: string }[],
		selectedValue: string,
		onChange: (value: string) => void
	): HTMLSelectElement {
		const field = container.createEl("div", { cls: "library-field" });
		field.createEl("label", { text: label, cls: "library-label" });

		const select = field.createEl("select", { cls: "library-select" });

		options.forEach((option) => {
			select.createEl("option", {
				text: option.text,
				value: option.value,
				attr: { selected: selectedValue === option.value },
			});
		});

		select.addEventListener("change", () => {
			onChange(select.value);
		});

		return select;
	}

	/**
	 * Creates a slider input
	 */
	private createSlider(
		container: HTMLElement,
		label: string,
		value: number,
		min: number,
		max: number,
		onChange: (value: number) => void
	): void {
		const field = container.createEl("div", { cls: "library-field" });

		const labelContainer = field.createEl("div", {
			cls: "slider-label-container",
		});
		labelContainer.createEl("label", { text: label, cls: "library-label" });
		const valueDisplay = labelContainer.createEl("span", {
			text: value.toString(),
			cls: "slider-value",
		});

		const slider = field.createEl("input", {
			type: "range",
			cls: "library-slider",
			attr: {
				min: min.toString(),
				max: max.toString(),
				value: value.toString(),
			},
		});

		slider.addEventListener("input", () => {
			const newValue = parseInt(slider.value);
			valueDisplay.textContent = newValue.toString();
			onChange(newValue);
		});
	}

	/**
	 * Update the gradient background with new colors
	 */
	private updateGradientBackground(
		startColor: string,
		endColor: string
	): void {
		if (this.gradientType === "linear") {
			this.options.backgroundColor = `linear-gradient(${this.gradientDirection}, ${startColor}, ${endColor})`;
		} else {
			this.options.backgroundColor = `radial-gradient(circle, ${startColor}, ${endColor})`;
		}
	}

	/**
	 * Extract colors from gradient string
	 */
	private extractGradientColors(gradientStr: string): [string, string] {
		if (!gradientStr.includes("gradient")) {
			return [gradientStr, gradientStr];
		}

		const colorMatches = gradientStr.match(/#[a-f0-9]{6}/gi);
		if (!colorMatches || colorMatches.length < 2) {
			return ["#000000", "#333333"];
		}

		return [colorMatches[0], colorMatches[1]];
	}

	/**
	 * Adjust color brightness
	 */
	private adjustColorBrightness(color: string, percent: number): string {
		// Convert hex to RGB
		let r = parseInt(color.substring(1, 3), 16);
		let g = parseInt(color.substring(3, 5), 16);
		let b = parseInt(color.substring(5, 7), 16);

		// Adjust brightness
		r = Math.max(0, Math.min(255, r + percent));
		g = Math.max(0, Math.min(255, g + percent));
		b = Math.max(0, Math.min(255, b + percent));

		// Convert back to hex
		return (
			"#" +
			r.toString(16).padStart(2, "0") +
			g.toString(16).padStart(2, "0") +
			b.toString(16).padStart(2, "0")
		);
	}

	/**
	 * Updates the preview canvas
	 */
	private updatePreview(): void {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) return;

		// Calculate dimensions
		const width = this.options.width;
		const height = Math.round(width / this.aspectRatio);

		// Set canvas size
		this.canvas.width = width;
		this.canvas.height = height;

		// Scale canvas for higher resolution on Retina displays
		const scaleFactor = 1;
		if (scaleFactor > 1) {
			this.canvas.style.width = width + "px";
			this.canvas.style.height = height + "px";
			this.canvas.width = width * scaleFactor;
			this.canvas.height = height * scaleFactor;
			ctx.scale(scaleFactor, scaleFactor);
		}

		// Draw background
		this.drawBackground(ctx, width, height);

		// Draw background pattern/texture if enabled
		if (this.patternType !== "none") {
			this.drawPattern(ctx, width, height, this.patternType);
		}

		// Draw content based on selected layout
		switch (this.layoutType) {
			case "centered":
				this.drawCenteredLayout(ctx, width, height);
				break;
			case "top-emphasis":
				this.drawTopEmphasisLayout(ctx, width, height);
				break;
			case "balanced":
				this.drawBalancedLayout(ctx, width, height);
				break;
			case "quote-focused":
				this.drawQuoteFocusedLayout(ctx, width, height);
				break;
			case "academic":
				this.drawAcademicLayout(ctx, width, height);
				break;
			default:
				this.drawBalancedLayout(ctx, width, height);
		}
	}

	/**
	 * Draw pattern/texture
	 */
	private drawPattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		patternType: string
	): void {
		// Set up pattern style
		ctx.save();
		ctx.globalAlpha = this.textureOpacity;

		switch (patternType) {
			case "dots":
				this.drawDotPattern(ctx, width, height);
				break;
			case "lines":
				this.drawLinePattern(ctx, width, height);
				break;
			case "grid":
				this.drawGridPattern(ctx, width, height);
				break;
			case "diamonds":
				this.drawDiamondPattern(ctx, width, height);
				break;
			case "waves":
				this.drawWavePattern(ctx, width, height);
				break;
		}

		ctx.restore();
	}

	/**
	 * Draw dot pattern
	 */
	private drawDotPattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const spacing = Math.max(20, width / 40);
		const dotSize = Math.max(2, width / 400);

		ctx.fillStyle = this.adjustColorOpacity(this.options.textColor, 0.5);

		for (let y = spacing; y < height; y += spacing) {
			for (let x = spacing; x < width; x += spacing) {
				ctx.beginPath();
				ctx.arc(x, y, dotSize, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	/**
	 * Draw line pattern
	 */
	private drawLinePattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const spacing = Math.max(40, width / 20);
		const lineWidth = Math.max(1, width / 800);

		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.5);
		ctx.lineWidth = lineWidth;

		for (let y = spacing; y < height; y += spacing) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
	}

	/**
	 * Draw grid pattern
	 */
	private drawGridPattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const spacing = Math.max(40, width / 20);
		const lineWidth = Math.max(1, width / 800);

		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.5);
		ctx.lineWidth = lineWidth;

		// Horizontal lines
		for (let y = spacing; y < height; y += spacing) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// Vertical lines
		for (let x = spacing; x < width; x += spacing) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
	}

	/**
	 * Draw diamond pattern
	 */
	private drawDiamondPattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const spacing = Math.max(40, width / 20);
		const size = spacing * 0.7;

		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.3);
		ctx.lineWidth = Math.max(1, width / 800);

		for (let y = spacing; y < height + spacing; y += spacing) {
			for (let x = spacing; x < width + spacing; x += spacing) {
				ctx.beginPath();
				ctx.moveTo(x, y - size / 2);
				ctx.lineTo(x + size / 2, y);
				ctx.lineTo(x, y + size / 2);
				ctx.lineTo(x - size / 2, y);
				ctx.closePath();
				ctx.stroke();
			}
		}
	}

	/**
	 * Draw wave pattern
	 */
	private drawWavePattern(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const waveHeight = Math.max(10, height / 40);
		const waveLength = Math.max(50, width / 15);
		const rows = Math.ceil(height / (waveHeight * 4)) + 1;

		ctx.strokeStyle = this.adjustColorOpacity(this.options.textColor, 0.3);
		ctx.lineWidth = Math.max(1, width / 800);

		for (let row = 0; row < rows; row++) {
			const y = row * waveHeight * 4;

			ctx.beginPath();
			ctx.moveTo(0, y);

			for (let x = 0; x <= width; x += waveLength) {
				ctx.quadraticCurveTo(
					x + waveLength / 2,
					y + waveHeight,
					x + waveLength,
					y
				);
			}

			ctx.stroke();
		}
	}

	/**
	 * Draw background with support for gradients and rounded corners
	 */
	private drawBackground(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		// Save current state
		ctx.save();

		// Create rounded corners if specified
		if (this.borderRadius > 0) {
			this.roundedRect(ctx, 0, 0, width, height, this.borderRadius);
			ctx.clip();
		}

		// Draw background
		if (this.useGradient) {
			const [startColor, endColor] = this.extractGradientColors(
				this.options.backgroundColor
			);

			if (this.gradientType === "linear") {
				// Linear gradient
				let gradient;

				switch (this.gradientDirection) {
					case "to right":
						gradient = ctx.createLinearGradient(0, 0, width, 0);
						break;
					case "to left":
						gradient = ctx.createLinearGradient(width, 0, 0, 0);
						break;
					case "to bottom right":
						gradient = ctx.createLinearGradient(
							0,
							0,
							width,
							height
						);
						break;
					case "to bottom left":
						gradient = ctx.createLinearGradient(
							width,
							0,
							0,
							height
						);
						break;
					case "to top right":
						gradient = ctx.createLinearGradient(
							0,
							height,
							width,
							0
						);
						break;
					case "to top left":
						gradient = ctx.createLinearGradient(
							width,
							height,
							0,
							0
						);
						break;
					default: // to bottom
						gradient = ctx.createLinearGradient(0, 0, 0, height);
				}

				gradient.addColorStop(0, startColor || "#000000");
				gradient.addColorStop(1, endColor || "#333333");
				ctx.fillStyle = gradient;
			} else {
				// Radial gradient
				const gradient = ctx.createRadialGradient(
					width / 2,
					height / 2,
					0,
					width / 2,
					height / 2,
					width / 1.5
				);
				gradient.addColorStop(0, startColor || "#000000");
				gradient.addColorStop(1, endColor || "#333333");
				ctx.fillStyle = gradient;
			}
		} else {
			// Solid color
			ctx.fillStyle = this.options.backgroundColor;
		}

		ctx.fillRect(0, 0, width, height);

		// If border radius is active, draw a subtle border
		if (this.borderRadius > 0) {
			ctx.strokeStyle = this.adjustColorOpacity(
				this.options.textColor,
				0.1
			);
			ctx.lineWidth = 1;
			this.roundedRect(ctx, 0, 0, width, height, this.borderRadius);
			ctx.stroke();
		}

		// Restore state
		ctx.restore();
	}

	/**
	 * Draws a rounded rectangle
	 */
	private roundedRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	): void {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(
			x + width,
			y + height,
			x + width - radius,
			y + height
		);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}

	/**
	 * Draws centered layout
	 */
	private drawCenteredLayout(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const padding = this.options.padding;

		// Center everything
		let y = padding * 1.5;

		// Draw title
		if (this.fieldCustomization.title.enabled) {
			y = this.drawStyledField(
				ctx,
				this.benefit.title,
				width / 2,
				y,
				width - padding * 2,
				this.fieldCustomization.title,
				"center"
			);
			y += padding * 0.6;
		}

		// Metadata group
		const metadataFields = [];

		if (
			this.fieldCustomization.source.enabled &&
			this.benefit.parentTitle
		) {
			metadataFields.push({
				text: this.benefit.parentTitle,
				config: this.fieldCustomization.source,
			});
		}

		if (this.fieldCustomization.author.enabled && this.benefit.author) {
			metadataFields.push({
				text: this.benefit.author,
				config: this.fieldCustomization.author,
			});
		}

		if (this.fieldCustomization.location.enabled) {
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
				metadataFields.push({
					text: locationText,
					config: this.fieldCustomization.location,
				});
			}
		}

		// Draw metadata fields
		if (metadataFields.length > 0) {
			// Draw metadata background if needed
			if (metadataFields.length > 1) {
				const metadataHeight = metadataFields.length * 30 + 20;
				ctx.fillStyle = this.adjustColorOpacity(
					this.options.textColor,
					0.1
				);
				this.roundedRect(
					ctx,
					width / 2 - (width - padding * 3) / 2,
					y - 15,
					width - padding * 3,
					metadataHeight,
					10
				);
				ctx.fill();
			}

			for (const field of metadataFields) {
				y = this.drawStyledField(
					ctx,
					field.text,
					width / 2,
					y + 20,
					width - padding * 3,
					field.config,
					"center"
				);
			}

			y += padding * 0.5;
		}

		// Draw quote mark if enabled (top)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 3
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.4);
			ctx.textAlign = "left";
			ctx.fillText("", padding + 20, y + 60);
			ctx.restore();
		}

		// Main content (centered)
		if (this.fieldCustomization.content.enabled) {
			const contentY = height / 2 - 50; // Centered vertically
			y = this.drawStyledField(
				ctx,
				this.benefit.text,
				width / 2,
				contentY,
				width - padding * 2.5,
				this.fieldCustomization.content,
				"center"
			);

			y = Math.max(y, contentY + 120); // Ensure enough space for tags
		}

		// Draw quote mark if enabled (bottom)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 3
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.4);
			ctx.textAlign = "right";
			ctx.fillText("", width - padding - 20, y - 30);
			ctx.restore();
		}

		// Draw tags as pills at the bottom
		if (
			this.fieldCustomization.tags.enabled &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			const tagsY = height - padding - 50; // Fixed position at bottom
			this.drawTagChips(
				ctx,
				[...this.benefit.categories, ...this.benefit.tags],
				width / 2,
				tagsY,
				width - padding * 2,
				this.fieldCustomization.tags,
				"center"
			);
		}

		// Draw watermark
		if (this.fieldCustomization.watermark.enabled) {
			ctx.save();
			ctx.font = `${this.fieldCustomization.watermark.fontSize}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.fieldCustomization.watermark.color,
				0.4
			);
			ctx.textAlign = "left";
			ctx.fillText("مكتبتي", padding, height - padding / 2);
			ctx.restore();
		}
	}

	/**
	 * Draws top emphasis layout
	 */
	private drawTopEmphasisLayout(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const padding = this.options.padding;
		let y = padding;

		// Draw large prominent title
		if (this.fieldCustomization.title.enabled) {
			// Title background
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.1);
			ctx.fillRect(0, 0, width, padding * 3);

			// Draw accent line
			ctx.fillStyle = this.accentColor;
			ctx.fillRect(padding, padding * 0.8, width / 4, 6);

			y = this.drawStyledField(
				ctx,
				this.benefit.title,
				width - padding,
				y + padding * 0.7,
				width - padding * 2,
				{
					...this.fieldCustomization.title,
					fontSize: this.fieldCustomization.title.fontSize * 1.2,
					style: "plain",
				},
				"right"
			);
			y += padding * 0.6;
		}

		// Source and author in a side-by-side layout if both present
		if (
			(this.fieldCustomization.source.enabled &&
				this.benefit.parentTitle) ||
			(this.fieldCustomization.author.enabled && this.benefit.author)
		) {
			ctx.save();
			ctx.textAlign = "right";
			let currentY = y;

			// Draw both fields on the same line if possible
			if (
				this.fieldCustomization.source.enabled &&
				this.benefit.parentTitle
			) {
				ctx.font = `${
					this.fieldCustomization.source.bold ? "bold " : ""
				}${this.fieldCustomization.source.fontSize}px ${
					this.options.fontFamily
				}`;
				ctx.fillStyle = this.fieldCustomization.source.color;
				ctx.fillText(
					this.benefit.parentTitle,
					width - padding,
					currentY
				);
			}

			if (this.fieldCustomization.author.enabled && this.benefit.author) {
				ctx.font = `${
					this.fieldCustomization.author.bold ? "bold " : ""
				}${this.fieldCustomization.author.fontSize}px ${
					this.options.fontFamily
				}`;
				ctx.fillStyle = this.adjustColorOpacity(
					this.fieldCustomization.author.color,
					0.8
				);

				// Position author
				let authorX = padding;
				if (
					this.fieldCustomization.source.enabled &&
					this.benefit.parentTitle
				) {
					authorX = padding;
					ctx.textAlign = "left";
				} else {
					authorX = width - padding;
					ctx.textAlign = "right";
				}

				ctx.fillText(this.benefit.author, authorX, currentY);
			}

			ctx.restore();
			y += this.fieldCustomization.source.fontSize * 1.5;
		}

		// Location info with icon
		if (this.fieldCustomization.location.enabled) {
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
				// Draw with styled field
				y = this.drawStyledField(
					ctx,
					locationText,
					width - padding,
					y + 25,
					width - padding * 2,
					this.fieldCustomization.location,
					"right"
				);
				y += 10;
			}
		}

		// Draw quote mark if enabled (top)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 3
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "left";
			ctx.fillText("", padding + 20, y + 60);
			ctx.restore();
		}

		// Main content with shadow for emphasis
		if (this.fieldCustomization.content.enabled) {
			// Add shadow effect for main content
			ctx.save();
			if (this.shadowStrength > 0) {
				ctx.shadowColor = "rgba(0,0,0,0.3)";
				ctx.shadowBlur = this.shadowStrength * 2;
				ctx.shadowOffsetX = 2;
				ctx.shadowOffsetY = 2;
			}

			y = this.drawStyledField(
				ctx,
				this.benefit.text,
				width - padding,
				y + 60,
				width - padding * 2,
				this.fieldCustomization.content,
				"right"
			);

			ctx.restore();
		}

		// Draw quote mark if enabled (bottom)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 3
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "right";
			ctx.fillText("", width - padding - 20, y - 20);
			ctx.restore();
		}

		// Tags at the bottom
		if (
			this.fieldCustomization.tags.enabled &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			const tagsY = height - padding - 40;
			this.drawTagChips(
				ctx,
				[...this.benefit.categories, ...this.benefit.tags],
				width - padding,
				tagsY,
				width - padding * 2,
				this.fieldCustomization.tags,
				"right"
			);
		}

		// Draw watermark
		if (this.fieldCustomization.watermark.enabled) {
			ctx.save();
			ctx.font = `${this.fieldCustomization.watermark.fontSize}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.fieldCustomization.watermark.color,
				0.4
			);
			ctx.textAlign = "left";
			ctx.fillText("مكتبتي", padding, height - padding / 2);
			ctx.restore();
		}
	}

	/**
	 * Draws balanced layout
	 */
	private drawBalancedLayout(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const padding = this.options.padding;
		let y = padding;

		// Draw title with optional style
		if (this.fieldCustomization.title.enabled) {
			y = this.drawStyledField(
				ctx,
				this.benefit.title,
				width - padding,
				y + 30,
				width - padding * 2,
				this.fieldCustomization.title,
				"right"
			);
			y += 20;
		}

		// Draw metadata section with source and author
		let metadataY = y;
		if (
			this.fieldCustomization.source.enabled &&
			this.benefit.parentTitle
		) {
			y = this.drawStyledField(
				ctx,
				this.benefit.parentTitle,
				width - padding,
				metadataY,
				width - padding * 2,
				this.fieldCustomization.source,
				"right"
			);
			metadataY = y + 5;
		}

		if (this.fieldCustomization.author.enabled && this.benefit.author) {
			y = this.drawStyledField(
				ctx,
				this.benefit.author,
				width - padding,
				metadataY,
				width - padding * 2,
				this.fieldCustomization.author,
				"right"
			);
			metadataY = y + 5;
		}

		if (this.fieldCustomization.location.enabled) {
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
				y = this.drawStyledField(
					ctx,
					locationText,
					width - padding,
					metadataY,
					width - padding * 2,
					this.fieldCustomization.location,
					"right"
				);
				metadataY = y + 5;
			}
		}

		y = Math.max(y, metadataY) + 20;

		// Draw quote mark if enabled (top)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 2.5
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "left";
			ctx.fillText("", padding + 20, y + 60);
			ctx.restore();
		}

		// Main content
		if (this.fieldCustomization.content.enabled) {
			// Add shadow effect for readability if enabled
			ctx.save();
			if (this.shadowStrength > 0) {
				ctx.shadowColor = "rgba(0,0,0,0.2)";
				ctx.shadowBlur = this.shadowStrength * 2;
				ctx.shadowOffsetX = 1;
				ctx.shadowOffsetY = 1;
			}

			// Calculate content position to balance the layout
			const contentY = Math.min(y + 40, height / 3);

			y = this.drawStyledField(
				ctx,
				this.benefit.text,
				width - padding,
				contentY,
				width - padding * 2,
				this.fieldCustomization.content,
				"right"
			);

			ctx.restore();
			y += 30;
		}

		// Draw quote mark if enabled (bottom)
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 2.5
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "right";
			ctx.fillText("", width - padding - 20, y - 30);
			ctx.restore();
		}

		// Tags at the bottom
		if (
			this.fieldCustomization.tags.enabled &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			// Position tags closer to bottom
			const tagsY = height - padding - 50;
			this.drawTagChips(
				ctx,
				[...this.benefit.categories, ...this.benefit.tags],
				width - padding,
				tagsY,
				width - padding * 2,
				this.fieldCustomization.tags,
				"right"
			);
		}

		// Draw watermark
		if (this.fieldCustomization.watermark.enabled) {
			ctx.save();
			ctx.font = `${this.fieldCustomization.watermark.fontSize}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.fieldCustomization.watermark.color,
				0.4
			);
			ctx.textAlign = "left";
			ctx.fillText("مكتبتي", padding, height - padding / 2);
			ctx.restore();
		}
	}

	/**
	 * Draws quote-focused layout
	 */
	private drawQuoteFocusedLayout(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const padding = this.options.padding;
		let y = padding * 1.2;

		// Large decorative quote mark at the top
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 4
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "left";
			ctx.fillText("", padding, padding + 80);
			ctx.restore();

			// Adjust starting position to accommodate the quote mark
			y += 40;
		}

		// Title with extra styling
		if (this.fieldCustomization.title.enabled) {
			y = this.drawStyledField(
				ctx,
				this.benefit.title,
				width - padding,
				y,
				width - padding * 2.5, // Narrower to make room for quote mark
				{
					...this.fieldCustomization.title,
					style: "underline",
				},
				"right"
			);
			y += 30;
		}

		// Main content with large, elegant presentation
		if (this.fieldCustomization.content.enabled) {
			// Add shadow for emphasis
			ctx.save();
			if (this.shadowStrength > 0) {
				ctx.shadowColor = "rgba(0,0,0,0.25)";
				ctx.shadowBlur = this.shadowStrength * 3;
				ctx.shadowOffsetX = 2;
				ctx.shadowOffsetY = 2;
			}

			// Position content in the middle for emphasis
			const contentY = Math.max(y + 30, height / 3);

			y = this.drawStyledField(
				ctx,
				this.benefit.text,
				width - padding * 1.5,
				contentY,
				width - padding * 3, // Narrower for elegant look
				{
					...this.fieldCustomization.content,
					fontSize: this.fieldCustomization.content.fontSize * 1.1,
					style: "plain",
				},
				"right"
			);

			ctx.restore();
			y += 50;
		}

		// Large decorative quote mark at the bottom
		if (this.showQuoteMarks) {
			ctx.save();
			ctx.font = `bold ${
				this.fieldCustomization.content.fontSize * 4
			}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.3);
			ctx.textAlign = "right";
			ctx.fillText("", width - padding, y);
			ctx.restore();
		}

		// Source, author and metadata at the bottom in an elegant box
		const metadataFields = [];

		if (
			this.fieldCustomization.source.enabled &&
			this.benefit.parentTitle
		) {
			metadataFields.push({
				text: this.benefit.parentTitle,
				config: this.fieldCustomization.source,
			});
		}

		if (this.fieldCustomization.author.enabled && this.benefit.author) {
			metadataFields.push({
				text: this.benefit.author,
				config: this.fieldCustomization.author,
			});
		}

		if (this.fieldCustomization.location.enabled) {
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
				metadataFields.push({
					text: locationText,
					config: this.fieldCustomization.location,
				});
			}
		}

		// Draw metadata at the bottom
		if (metadataFields.length > 0) {
			const metadataY =
				height - padding - metadataFields.length * 30 - 20;

			// Draw elegant container for metadata
			const metadataHeight = metadataFields.length * 30 + 30;

			ctx.save();
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.1);
			this.roundedRect(
				ctx,
				padding,
				metadataY - 15,
				width - padding * 2,
				metadataHeight,
				this.borderRadius / 2
			);
			ctx.fill();

			// Draw a decorative line
			ctx.strokeStyle = this.adjustColorOpacity(this.accentColor, 0.4);
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(padding * 1.5, metadataY - 5);
			ctx.lineTo(width - padding * 1.5, metadataY - 5);
			ctx.stroke();
			ctx.restore();

			// Draw each metadata field
			let currentY = metadataY + 20;
			for (const field of metadataFields) {
				currentY = this.drawTextField(
					ctx,
					field.text,
					width / 2,
					currentY,
					width - padding * 3,
					{
						...field.config,
						fontSize: field.config.fontSize * 0.9,
					},
					"center"
				);
				currentY += 10;
			}
		}

		// Tags as small, elegant chips
		if (
			this.fieldCustomization.tags.enabled &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			// Skip if we have metadata that already occupies the bottom space
			if (metadataFields.length === 0) {
				const tagsY = height - padding - 40;
				this.drawTagChips(
					ctx,
					[...this.benefit.categories, ...this.benefit.tags],
					width - padding,
					tagsY,
					width - padding * 2,
					{
						...this.fieldCustomization.tags,
						fontSize: this.fieldCustomization.tags.fontSize * 0.8,
					},
					"right"
				);
			}
		}

		// Subtle watermark
		if (this.fieldCustomization.watermark.enabled) {
			ctx.save();
			ctx.font = `${this.fieldCustomization.watermark.fontSize * 0.8}px ${
				this.options.fontFamily
			}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.fieldCustomization.watermark.color,
				0.3
			);
			ctx.textAlign = "left";
			ctx.fillText("مكتبتي", padding, height - padding / 3);
			ctx.restore();
		}
	}

	/**
	 * Draws academic layout
	 */
	private drawAcademicLayout(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const padding = this.options.padding;
		let y = padding;

		// Title with academic styling
		if (this.fieldCustomization.title.enabled) {
			y = this.drawStyledField(
				ctx,
				this.benefit.title,
				width - padding,
				y + 30,
				width - padding * 2,
				{
					...this.fieldCustomization.title,
					style: "plain",
				},
				"right"
			);

			// Horizontal rule under title
			y += 10;
			ctx.save();
			ctx.strokeStyle = this.accentColor;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(padding, y);
			ctx.lineTo(width - padding, y);
			ctx.stroke();
			ctx.restore();

			y += 20;
		}

		// Source and author with formal styling
		const metadataFields = [];

		if (
			this.fieldCustomization.source.enabled &&
			this.benefit.parentTitle
		) {
			metadataFields.push({
				text: `المصدر: ${this.benefit.parentTitle}`,
				config: this.fieldCustomization.source,
			});
		}

		if (this.fieldCustomization.author.enabled && this.benefit.author) {
			metadataFields.push({
				text: `${
					this.benefit.contentType === "book" ? "المؤلف" : "الملقي"
				}: ${this.benefit.author}`,
				config: this.fieldCustomization.author,
			});
		}

		if (this.fieldCustomization.location.enabled) {
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
				metadataFields.push({
					text: locationText,
					config: this.fieldCustomization.location,
				});
			}
		}

		// Draw metadata fields
		if (metadataFields.length > 0) {
			for (const field of metadataFields) {
				y = this.drawTextField(
					ctx,
					field.text,
					width - padding,
					y + 20,
					width - padding * 2,
					{
						...field.config,
						style: "plain",
					},
					"right"
				);
			}

			y += 15;
		}

		// Main content with academic formatting
		if (this.fieldCustomization.content.enabled) {
			// Add indentation
			const contentX = width - padding - 20; // Indented
			const contentWidth = width - padding * 2 - 40; // Narrower

			y = this.drawTextField(
				ctx,
				this.benefit.text,
				contentX,
				y + 30,
				contentWidth,
				this.fieldCustomization.content,
				"right"
			);

			y += 20;
		}

		// Bottom horizontal rule
		ctx.save();
		ctx.strokeStyle = this.accentColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padding, height - padding - 60);
		ctx.lineTo(width - padding, height - padding - 60);
		ctx.stroke();
		ctx.restore();

		// Tags with academic styling
		if (
			this.fieldCustomization.tags.enabled &&
			(this.benefit.categories.length > 0 || this.benefit.tags.length > 0)
		) {
			// Format tags academically
			const tagsY = height - padding - 40;

			ctx.save();
			ctx.textAlign = "center";
			ctx.font = `${this.fieldCustomization.tags.fontSize}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.fieldCustomization.tags.color;

			// Join tags with separator rather than drawing as chips
			const tagsText = `الكلمات المفتاحية: ${[
				...this.benefit.categories,
				...this.benefit.tags,
			].join(" - ")}`;
			ctx.fillText(tagsText, width / 2, tagsY);
			ctx.restore();
		}

		// Formal watermark
		if (this.fieldCustomization.watermark.enabled) {
			ctx.save();
			ctx.font = `${this.fieldCustomization.watermark.fontSize}px ${this.options.fontFamily}`;
			ctx.fillStyle = this.adjustColorOpacity(
				this.fieldCustomization.watermark.color,
				0.4
			);
			ctx.textAlign = "right";
			ctx.fillText("مكتبتي", width - padding, height - padding / 3);
			ctx.restore();
		}
	}

	/**
	 * Draws a field with styled container based on configuration
	 */
	private drawStyledField(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		config: FieldCustomization,
		textAlign: "right" | "center" | "left" = "right"
	): number {
		ctx.save();

		// Configure font
		ctx.font = `${config.bold ? "bold " : ""}${config.fontSize}px ${
			config.fontFamily || this.options.fontFamily
		}`;
		ctx.fillStyle = config.color;
		ctx.textAlign = textAlign;

		// For bubble style, we need to know the text height before drawing the background
		let textHeight = 0;
		let textWidth = 0;

		if (config.style === "bubble" || config.style === "box") {
			// Measure the text
			const lines = this.calculateTextLines(ctx, text, maxWidth);
			textHeight = lines.length * (config.fontSize * 1.2);

			// Find the longest line for width
			textWidth = 0;
			for (const line of lines) {
				const metrics = ctx.measureText(line);
				textWidth = Math.max(textWidth, metrics.width);
			}

			// Add padding
			textWidth += 40;
		}

		// Draw the style container
		switch (config.style) {
			case "bubble":
				// Draw rounded background
				ctx.fillStyle = this.adjustColorOpacity(config.color, 0.15);

				if (textAlign === "right") {
					this.roundedRect(
						ctx,
						x - textWidth,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize,
						config.fontSize / 2
					);
				} else if (textAlign === "center") {
					this.roundedRect(
						ctx,
						x - textWidth / 2,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize,
						config.fontSize / 2
					);
				} else {
					this.roundedRect(
						ctx,
						x,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize,
						config.fontSize / 2
					);
				}

				ctx.fill();

				// Restore text color
				ctx.fillStyle = config.color;
				break;

			case "box":
				// Draw rectangle
				ctx.fillStyle = this.adjustColorOpacity(config.color, 0.1);

				if (textAlign === "right") {
					ctx.fillRect(
						x - textWidth,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				} else if (textAlign === "center") {
					ctx.fillRect(
						x - textWidth / 2,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				} else {
					ctx.fillRect(
						x,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				}

				// Draw border
				ctx.strokeStyle = this.adjustColorOpacity(config.color, 0.3);
				ctx.lineWidth = 1;

				if (textAlign === "right") {
					ctx.strokeRect(
						x - textWidth,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				} else if (textAlign === "center") {
					ctx.strokeRect(
						x - textWidth / 2,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				} else {
					ctx.strokeRect(
						x,
						y - config.fontSize,
						textWidth,
						textHeight + config.fontSize
					);
				}

				// Restore text color
				ctx.fillStyle = config.color;
				break;

			case "underline":
				// Draw underline after text rendering
				break;
		}

		// Draw the text
		const finalY = this.drawTextField(
			ctx,
			text,
			x,
			y,
			maxWidth,
			config,
			textAlign
		);

		// Draw underline if needed
		if (config.style === "underline") {
			ctx.strokeStyle = this.adjustColorOpacity(config.color, 0.7);
			ctx.lineWidth = 2;
			ctx.beginPath();

			if (textAlign === "right") {
				const underlineWidth = Math.min(
					maxWidth,
					ctx.measureText(text).width * 1.1
				);
				ctx.moveTo(x, finalY + 10);
				ctx.lineTo(x - underlineWidth, finalY + 10);
			} else if (textAlign === "center") {
				const underlineWidth = Math.min(
					maxWidth,
					ctx.measureText(text).width * 1.1
				);
				ctx.moveTo(x - underlineWidth / 2, finalY + 10);
				ctx.lineTo(x + underlineWidth / 2, finalY + 10);
			} else {
				const underlineWidth = Math.min(
					maxWidth,
					ctx.measureText(text).width * 1.1
				);
				ctx.moveTo(x, finalY + 10);
				ctx.lineTo(x + underlineWidth, finalY + 10);
			}

			ctx.stroke();
		}

		ctx.restore();
		return finalY;
	}

	/**
	 * Draws text with proper wrapping and returns the final y-position
	 */
	private drawTextField(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		config: FieldCustomization,
		textAlign: "right" | "center" | "left" = "right"
	): number {
		// Set font and color
		ctx.font = `${config.bold ? "bold " : ""}${config.fontSize}px ${
			config.fontFamily || this.options.fontFamily
		}`;
		ctx.fillStyle = config.color;
		ctx.textAlign = textAlign;

		// Calculate text lines
		const lines = this.calculateTextLines(ctx, text, maxWidth);

		// Draw each line
		let currentY = y;
		const lineHeight = config.fontSize * 1.3; // Increase line height for Arabic text

		for (const line of lines) {
			ctx.fillText(line, x, currentY);
			currentY += lineHeight;
		}

		return currentY;
	}

	/**
	 * Calculate text lines with proper wrapping
	 */
	private calculateTextLines(
		ctx: CanvasRenderingContext2D,
		text: string,
		maxWidth: number
	): string[] {
		// Split on natural line breaks first
		const paragraphs = text.split("\n");
		const lines: string[] = [];

		for (const paragraph of paragraphs) {
			// For short paragraphs that fit, keep them as is
			if (ctx.measureText(paragraph).width <= maxWidth) {
				lines.push(paragraph);
				continue;
			}

			// For long paragraphs, wrap text
			const words = paragraph.split(" ");
			let line = "";

			for (let i = 0; i < words.length; i++) {
				const testLine = line + words[i] + " ";
				const metrics = ctx.measureText(testLine);
				const testWidth = metrics.width;

				if (testWidth > maxWidth && i > 0) {
					lines.push(line);
					line = words[i] + " ";
				} else {
					line = testLine;
				}
			}

			// Add the last line
			if (line.trim() !== "") {
				lines.push(line);
			}
		}

		return lines;
	}

	/**
	 * Draws tag chips with styling
	 */
	private drawTagChips(
		ctx: CanvasRenderingContext2D,
		tags: string[],
		x: number,
		y: number,
		maxWidth: number,
		config: FieldCustomization,
		textAlign: "right" | "center" | "left" = "right"
	): number {
		if (!tags || tags.length === 0) return y;

		ctx.save();

		const chipHeight = config.fontSize + 12;
		const chipPadding = 10;
		const chipSpacing = 8;
		const fontSize = config.fontSize;

		// Font setup
		ctx.font = `${config.fontSize}px ${
			config.fontFamily || this.options.fontFamily
		}`;

		// Start positions
		let startX = x;
		if (textAlign === "center") {
			startX = x - maxWidth / 2;
		} else if (textAlign === "right") {
			startX = x - chipPadding;
		} else {
			startX = x + chipPadding;
		}

		let currentX = startX;
		let currentY = y;
		const initialY = y;

		// Store chip positions for rendering
		const chipPositions: {
			tag: string;
			x: number;
			y: number;
			width: number;
		}[] = [];

		// Calculate positions first (RTL layout)
		for (const tag of tags) {
			// Measure tag width
			const metrics = ctx.measureText(tag);
			const tagWidth = metrics.width + chipPadding * 2;

			// Check if tag fits on current line
			if (textAlign === "right" || textAlign === "center") {
				if (
					currentX - tagWidth <
					(textAlign === "center" ? startX - maxWidth : x - maxWidth)
				) {
					currentY += chipHeight + chipSpacing;
					currentX = startX;
				}

				// RTL positioning
				currentX -= tagWidth;

				// Store position
				chipPositions.push({
					tag,
					x: currentX,
					y: currentY,
					width: tagWidth,
				});

				// Add spacing between tags
				currentX -= chipSpacing;
			} else {
				// LTR positioning for left align
				if (currentX + tagWidth > startX + maxWidth) {
					currentY += chipHeight + chipSpacing;
					currentX = startX;
				}

				// Store position
				chipPositions.push({
					tag,
					x: currentX,
					y: currentY,
					width: tagWidth,
				});

				// Move to next position
				currentX += tagWidth + chipSpacing;
			}
		}

		// Draw chips
		for (const chip of chipPositions) {
			// Draw chip background
			ctx.fillStyle = this.adjustColorOpacity(this.accentColor, 0.15);
			this.roundedRect(
				ctx,
				chip.x,
				chip.y - fontSize,
				chip.width,
				chipHeight,
				chipHeight / 2
			);
			ctx.fill();

			// Draw chip text
			ctx.fillStyle = config.color;
			ctx.textAlign = "center";
			const textX = chip.x + chip.width / 2;
			ctx.fillText(chip.tag, textX, chip.y);
		}

		ctx.restore();

		// Return the lowest Y coordinate (bottom of the last tag line)
		return currentY + chipHeight / 2;
	}

	/**
	 * Adjusts color opacity
	 */
	private adjustColorOpacity(color: string, opacity: number): string {
		// Handle non-hex colors
		if (!color.startsWith("#")) {
			return color;
		}

		// Convert hex to rgba
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	/**
	 * Gets the translated name of the template
	 */
	private getTemplateName(name: string): string {
		const names: Record<string, string> = {
			"modern-gradient": "عصري",
			"elegant-dark": "أنيق داكن",
			"light-clean": "فاتح نظيف",
			"minimal-white": "بسيط أبيض",
			"vibrant-purple": "بنفسجي حيوي",
			"academic-paper": "أكاديمي",
			"forest-green": "أخضر غابة",
			"tech-blue": "أزرق تقني",
			"desert-warm": "صحراوي دافئ",
			"coral-vibes": "مرجاني",
		};

		return names[name] || name;
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
			a.download = `${this.benefit.title.substring(
				0,
				30
			)}-${Date.now()}.png`;
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

	/**
	 * Adds enhanced CSS styles
	 */

	/**
	 * Adds enhanced CSS styles
	 */
	private addEnhancedStyles(): void {
		const styleId = "library-benefit-share-pro-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
            .benefit-share-pro .library-share-main {
                display: flex;
                position: relative;
                gap: 5px;
                margin-bottom: 20px;
                direction: rtl;
                max-height: 70vh;
            }
            
            .benefit-share-pro .library-share-options {
                flex: 0 0 350px;
                overflow-y: auto;
                direction: rtl;
                border-left: 1px solid var(--background-modifier-border);
                padding-left: 15px;
            }
            
            .benefit-share-pro .library-resize-handle {
                width: 5px;
                background: var(--background-modifier-border);
                cursor: col-resize;
                position: absolute;
                top: 0;
                bottom: 0;
                left: 350px;
                transition: background 0.2s;
            }
            
            .benefit-share-pro .library-resize-handle:hover {
                background: var(--text-accent);
            }
            
            .benefit-share-pro .library-share-preview-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                background: rgba(0, 0, 0, 0.03);
                padding: 15px;
                border-radius: 8px;
                overflow: hidden;
                position: relative;
            }
            
            .benefit-share-pro .library-preview-zoom-controls {
                position: absolute;
                top: 10px;
                left: 10px;
                display: flex;
                gap: 5px;
                z-index: 10;
                background: var(--background-secondary);
                padding: 5px;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .benefit-share-pro .library-zoom-btn {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: var(--background-secondary-alt);
                border-radius: 4px;
                cursor: pointer;
            }
            
            .benefit-share-pro .library-zoom-btn:hover {
                background: var(--interactive-hover);
            }
            
            .benefit-share-pro .library-share-preview {
                max-width: 100%;
                max-height: calc(70vh - 30px);
                overflow: auto;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding: 10px;
            }
            
            .benefit-share-pro .library-share-preview canvas {
                max-width: 100%;
                height: auto;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                transform-origin: top center;
                transition: transform 0.2s;
            }
            
            /* Tabs styling */
            .benefit-share-pro .share-options-tabs {
                display: flex;
                border-bottom: 1px solid var(--background-modifier-border);
                margin-bottom: 16px;
                direction: rtl;
                flex-wrap: wrap;
            }
            
            .benefit-share-pro .share-option-tab {
                padding: 8px 12px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
                color: var(--text-muted);
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
            }
            
            .benefit-share-pro .share-option-tab:hover {
                color: var(--text-normal);
            }
            
            .benefit-share-pro .share-option-tab.active {
                color: var(--text-accent);
                border-bottom: 2px solid var(--text-accent);
            }
            
            /* Option panels */
            .benefit-share-pro .share-option-panel {
                display: none;
                padding-top: 5px;
            }
            
            .benefit-share-pro .share-option-panel.active {
                display: block;
            }
            
            /* Template section */
            .benefit-share-pro .template-search-container {
                margin-bottom: 15px;
                position: relative;
            }
            
            .benefit-share-pro .template-search-input {
                width: 100%;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
            }
            
            .benefit-share-pro .template-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
                max-height: 350px;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .benefit-share-pro .template-card {
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .benefit-share-pro .template-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 10px rgba(0, 0, 0, 0.05);
            }
            
            .benefit-share-pro .template-card.selected {
                border-color: var(--text-accent);
            }
            
            .benefit-share-pro .template-preview {
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .benefit-share-pro .template-preview-content {
                width: 100%;
                height: 100%;
                padding: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-end;
            }
            
            .benefit-share-pro .template-preview .preview-title {
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 5px;
                text-align: right;
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .benefit-share-pro .template-preview .preview-text {
                font-size: 9px;
                opacity: 0.7;
                text-align: right;
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .benefit-share-pro .template-preview .preview-accent {
                position: absolute;
                bottom: 10px;
                right: 10px;
                width: 30px;
                height: 3px;
                border-radius: 2px;
            }
            
            .benefit-share-pro .template-name {
                text-align: center;
                padding: 8px 0;
                background: var(--background-secondary);
                font-size: 12px;
            }
            
            /* Template color customization */
            .benefit-share-pro .template-color-customization {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-top: 10px;
                margin-bottom: 15px;
            }
            
            .benefit-share-pro .color-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .benefit-share-pro .color-section-label {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 5px;
            }
            
            /* Platform buttons */
            .benefit-share-pro .platforms-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 16px;
            }
            
            .benefit-share-pro .platform-button {
                padding: 6px 8px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .benefit-share-pro .platform-button:hover {
                background: var(--background-modifier-hover);
            }
            
            .benefit-share-pro .platform-button.active {
                background: var(--text-accent);
                color: var(--text-on-accent);
                border-color: var(--text-accent);
            }
            
            .benefit-share-pro .platform-button svg {
                width: 16px;
                height: 16px;
            }
            
            /* Background options */
            .benefit-share-pro .bg-type-selector {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .benefit-share-pro .bg-type-btn {
                flex: 1;
                padding: 6px 12px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
            }
            
            .benefit-share-pro .bg-type-btn:hover {
                background: var(--background-modifier-hover);
            }
            
            .benefit-share-pro .bg-type-btn.active {
                background: var(--text-accent);
                color: var(--text-on-accent);
                border-color: var(--text-accent);
            }
            
            /* Layout items */
            .benefit-share-pro .layouts-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .benefit-share-pro .layout-item {
                border: 2px solid transparent;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .benefit-share-pro .layout-item:hover {
                transform: translateY(-2px);
            }
            
            .benefit-share-pro .layout-item.active {
                border-color: var(--text-accent);
            }
            
            .benefit-share-pro .layout-preview {
                height: 100px;
                background: var(--background-secondary);
                display: flex;
                flex-direction: column;
                padding: 5px;
                position: relative;
            }
            
            .benefit-share-pro .layout-name {
                text-align: center;
                padding: 6px 0;
                font-size: 12px;
                background: var(--background-secondary-alt);
            }
            
            /* Layout preview elements */
            .benefit-share-pro .layout-element {
                background: var(--text-muted);
                margin: 2px 0;
                border-radius: 2px;
            }
            
            .benefit-share-pro .layout-title {
                background: var(--text-normal);
            }
            
            .benefit-share-pro .layout-content {
                background: var(--text-normal);
            }
            
            .benefit-share-pro .layout-metadata, .layout-tags {
                background: var(--text-muted);
                opacity: 0.7;
            }
            
            .benefit-share-pro .position-top {
                align-self: flex-start;
                width: 100%;
            }
            
            .benefit-share-pro .position-top-center {
                align-self: center;
                width: 90%;
            }
            
            .benefit-share-pro .position-top-middle {
                align-self: flex-start;
                width: 70%;
                margin-right: 10px;
            }
            
            .benefit-share-pro .position-center {
                align-self: center;
                width: 90%;
            }
            
            .benefit-share-pro .position-middle {
                align-self: flex-start;
                width: 90%;
                margin-right: 10px;
            }
            
            .benefit-share-pro .position-bottom {
                align-self: flex-start;
                width: 80%;
                margin-top: auto;
            }
            
            .benefit-share-pro .position-bottom-middle {
                align-self: center;
                width: 60%;
                margin-top: auto;
            }
            
            .benefit-share-pro .position-top-left {
                align-self: flex-start;
                width: 40px;
                height: 40px !important;
                margin-left: auto;
            }
            
            .benefit-share-pro .position-bottom-right {
                align-self: flex-end;
                width: 40px;
                height: 40px !important;
                margin-right: 10px;
                margin-top: auto;
            }
            
            /* Field accordion */
            .benefit-share-pro .field-accordion {
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                margin-bottom: 10px;
                overflow: hidden;
            }
            
            .benefit-share-pro .field-accordion-header {
                display: flex;
                align-items: center;
                padding: 10px;
                background: var(--background-secondary);
                cursor: pointer;
            }
            
            .benefit-share-pro .field-toggle-checkbox {
                margin: 0 0 0 10px;
                width: 16px;
                height: 16px;
            }
            
            .benefit-share-pro .field-accordion-title {
                flex: 1;
                font-weight: 500;
            }
            
            .benefit-share-pro .field-accordion-toggle {
                background: transparent;
                border: none;
                color: var(--text-normal);
                cursor: pointer;
                padding: 0;
                display: flex;
            }
            
            .benefit-share-pro .field-accordion-content {
                padding: 10px;
                background: var(--background-primary);
                border-top: 1px solid var(--background-modifier-border);
            }
            
            .benefit-share-pro .fields-description {
                color: var(--text-muted);
                font-size: 14px;
                margin-bottom: 15px;
            }
            
            /* Sliders and inputs */
            .benefit-share-pro .slider-label-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }
            
            .benefit-share-pro .slider-value {
                font-size: 12px;
                opacity: 0.8;
            }
            
            .benefit-share-pro .library-slider {
                width: 100%;
                margin: 8px 0 16px;
            }
            
            .benefit-share-pro .library-color-input-container {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .benefit-share-pro .library-color-input {
                width: 40px;
                height: 30px;
                padding: 0;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
            }
            
            .benefit-share-pro .library-color-text {
                flex: 1;
            }
            
            /* Checkbox field */
            .benefit-share-pro .library-checkbox-field {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                cursor: pointer;
            }
            
            .benefit-share-pro .library-checkbox {
                margin-left: 8px;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .benefit-share-pro .library-share-main {
                    flex-direction: column;
                }
                
                .benefit-share-pro .library-share-options {
                    max-width: 100%;
                    max-height: 300px;
                }
                
                .benefit-share-pro .template-grid {
                    grid-template-columns: 1fr;
                }
                
                .benefit-share-pro .library-resize-handle {
                    display: none;
                }
            }
        `;
			document.head.appendChild(style);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
