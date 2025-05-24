import { App, TFile } from "obsidian";
import {
	BenefitItem,
	BenefitData,
	BENEFIT_PATTERNS,
	BENEFIT_HEADER_PATTERN,
} from "../core";
import { generateId, formatDate } from "../utils";
import { VIDEO_FRONTMATTER, BOOK_FRONTMATTER } from "../core/constants";

/**
 * Service for managing benefits within notes
 */
export class BenefitService {
	private app: App;
	private plugin: any;

	constructor(app: App, plugin: any) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Extracts all benefits from a note
	 * @param file The note file
	 * @returns Array of benefit items
	 */
	async getBenefitsFromNote(file: TFile): Promise<BenefitItem[]> {
		const content = await this.app.vault.read(file);
		const benefits: BenefitItem[] = [];

		// Determine content type
		const isBook = file.path.startsWith(this.plugin.settings.booksFolder);
		const contentType = isBook ? "book" : "video";

		// Get parent metadata from frontmatter
		const frontmatter = this.parseFrontmatter(content);
		const parentTitle =
			frontmatter?.[
				isBook ? BOOK_FRONTMATTER.TITLE : VIDEO_FRONTMATTER.TITLE
			] || file.basename;
		const author =
			frontmatter?.[
				isBook ? BOOK_FRONTMATTER.AUTHOR : VIDEO_FRONTMATTER.PRESENTER
			] || "";

		// Find benefits section
		const benefitsSection = this.extractBenefitsSection(content);
		if (!benefitsSection) return benefits;

		// Parse individual benefits
		const benefitBlocks = this.splitBenefitBlocks(benefitsSection);

		for (const block of benefitBlocks) {
			const benefit = this.parseBenefitBlock(
				block,
				file.path,
				contentType,
				parentTitle,
				author
			);
			if (benefit) {
				benefits.push(benefit);
			}
		}

		return benefits;
	}

	/**
	 * Adds a new benefit to a note
	 * @param file The note file
	 * @param benefitData The benefit data to add
	 */
	async addBenefitToNote(
		file: TFile,
		benefitData: BenefitData
	): Promise<void> {
		let content = await this.app.vault.read(file);
		const isBook = file.path.startsWith(this.plugin.settings.booksFolder);

		// Generate benefit ID
		const benefitId = generateId();
		const dateCreated = formatDate(new Date(), "YYYY-MM-DD HH:mm:ss");

		// Format benefit text
		const benefitText = this.formatBenefit(
			benefitData,
			benefitId,
			dateCreated,
			isBook
		);

		// Find or create benefits section
		const benefitsSectionHeader = "# الفوائد";
		const sectionIndex = content.indexOf(benefitsSectionHeader);

		if (sectionIndex === -1) {
			// Add benefits section at the end
			content += `\n\n${benefitsSectionHeader}\n\n${benefitText}`;
		} else {
			// Find the end of the benefits section
			const afterHeader = sectionIndex + benefitsSectionHeader.length;
			const nextSectionMatch = content
				.substring(afterHeader)
				.match(/\n# /);
			const insertPosition = nextSectionMatch
				? afterHeader + (nextSectionMatch.index ?? 0)
				: content.length;

			// Insert the new benefit
			content =
				content.substring(0, insertPosition) +
				`\n\n${benefitText}` +
				content.substring(insertPosition);
		}

		// Save the updated content
		await this.app.vault.modify(file, content);
	}

	/**
	 * Updates an existing benefit in a note
	 * @param file The note file
	 * @param benefitId The ID of the benefit to update
	 * @param benefitData The new benefit data
	 */
	async updateBenefitInNote(
		file: TFile,
		benefitId: string,
		benefitData: BenefitData
	): Promise<void> {
		let content = await this.app.vault.read(file);
		const isBook = file.path.startsWith(this.plugin.settings.booksFolder);

		// Find the benefit block
		const benefitIdPattern = new RegExp(
			`<!-- benefit-id:\\s*${benefitId}\\s*-->`,
			"g"
		);
		const idMatch = benefitIdPattern.exec(content);

		if (!idMatch) {
			throw new Error("Benefit not found");
		}

		// Find the start of this benefit (look backwards for ## header)
		let benefitStart = content.lastIndexOf("\n## ", idMatch.index);
		if (benefitStart === -1) benefitStart = 0;
		else benefitStart += 1; // Skip the newline

		// Find the end of this benefit (next ## or end of content)
		let benefitEnd = content.indexOf("\n## ", idMatch.index);
		if (benefitEnd === -1) benefitEnd = content.length;

		// Get original date created
		const originalBlock = content.substring(benefitStart, benefitEnd);
		const dateCreatedMatch = originalBlock.match(
			/<!-- date-created:\s*(.+)\s*-->/
		);
		const dateCreated = dateCreatedMatch
			? dateCreatedMatch[1]
			: formatDate(new Date(), "YYYY-MM-DD HH:mm:ss");
		const dateModified = formatDate(new Date(), "YYYY-MM-DD HH:mm:ss");

		// Format the updated benefit
		const updatedBenefit = this.formatBenefit(
			benefitData,
			benefitId,
			dateCreated,
			isBook,
			dateModified
		);

		// Replace the benefit block
		content =
			content.substring(0, benefitStart) +
			updatedBenefit +
			content.substring(benefitEnd);

		// Save the updated content
		await this.app.vault.modify(file, content);
	}

	/**
	 * Deletes a benefit from a note
	 * @param file The note file
	 * @param benefitId The ID of the benefit to delete
	 */
	async deleteBenefitFromNote(file: TFile, benefitId: string): Promise<void> {
		let content = await this.app.vault.read(file);

		// Find the benefit block
		const benefitIdPattern = new RegExp(
			`<!-- benefit-id:\\s*${benefitId}\\s*-->`,
			"g"
		);
		const idMatch = benefitIdPattern.exec(content);

		if (!idMatch) {
			throw new Error("Benefit not found");
		}

		// Find the start of this benefit
		let benefitStart = content.lastIndexOf("\n## ", idMatch.index);
		if (benefitStart === -1) benefitStart = 0;
		else benefitStart += 1;

		// Find the end of this benefit
		let benefitEnd = content.indexOf("\n## ", idMatch.index);
		if (benefitEnd === -1) benefitEnd = content.length;

		// Remove the benefit block
		content =
			content.substring(0, benefitStart) + content.substring(benefitEnd);

		// Clean up extra newlines
		content = content.replace(/\n{3,}/g, "\n\n");

		// Save the updated content
		await this.app.vault.modify(file, content);
	}

	/**
	 * Gets all benefits from all notes
	 * @param contentType Optional filter by content type
	 * @returns Array of all benefits
	 */
	async getAllBenefits(
		contentType?: "video" | "book"
	): Promise<BenefitItem[]> {
		const benefits: BenefitItem[] = [];

		// Get folders to search
		const folders: string[] = [];
		if (!contentType || contentType === "video") {
			folders.push(this.plugin.settings.videosFolder);
		}
		if (!contentType || contentType === "book") {
			folders.push(this.plugin.settings.booksFolder);
		}

		// Search through all notes in the folders
		for (const folderPath of folders) {
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folder) continue;

			const files = this.getAllMarkdownFiles(folder);
			for (const file of files) {
				try {
					const noteBenefits = await this.getBenefitsFromNote(file);
					benefits.push(...noteBenefits);
				} catch (error) {
					console.error(
						`Error extracting benefits from ${file.path}:`,
						error
					);
				}
			}
		}

		return benefits;
	}

	/**
	 * Formats a benefit for insertion into a note
	 */
	private formatBenefit(
		data: BenefitData,
		id: string,
		dateCreated: string,
		isBook: boolean,
		dateModified?: string
	): string {
		let benefitText = `## ${data.title}\n`;
		benefitText += `<!-- benefit-id: ${id} -->\n`;
		benefitText += `<!-- date-created: ${dateCreated} -->\n`;

		if (dateModified) {
			benefitText += `<!-- date-modified: ${dateModified} -->\n`;
		}

		// Add location metadata
		if (isBook) {
			if (data.pageNumber) {
				benefitText += `الصفحة: ${data.pageNumber}\n`;
			}
			if (data.volumeNumber) {
				benefitText += `المجلد: ${data.volumeNumber}\n`;
			}
		} else {
			if (data.timestamp) {
				const formatted = this.formatTimestamp(data.timestamp);
				benefitText += `الوقت: ${formatted}\n`;
			}
		}

		// Add categories if any
		if (data.categories.length > 0) {
			benefitText += `التصنيفات: ${data.categories.join("، ")}\n`;
		}

		// Add tags if any
		if (data.tags.length > 0) {
			benefitText += `الوسوم: ${data.tags.join("، ")}\n`;
		}

		// Add the main benefit text
		benefitText += `الفائدة: ${data.text}`;

		return benefitText;
	}

	/**
	 * Formats timestamp from seconds to HH:MM:SS
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
	 * Extracts the benefits section from note content
	 */
	private extractBenefitsSection(content: string): string | null {
		const benefitsSectionStart = content.indexOf("# الفوائد");
		if (benefitsSectionStart === -1) return null;

		// Find the next main section (# header) or end of content
		const afterBenefitsHeader = benefitsSectionStart + "# الفوائد".length;
		const nextSectionMatch = content
			.substring(afterBenefitsHeader)
			.match(/\n# [^#]/);

		const benefitsSectionEnd = nextSectionMatch
			? afterBenefitsHeader + (nextSectionMatch.index ?? 0)
			: content.length;

		return content.substring(benefitsSectionStart, benefitsSectionEnd);
	}

	/**
	 * Splits benefits section into individual benefit blocks
	 */
	private splitBenefitBlocks(benefitsSection: string): string[] {
		const blocks: string[] = [];
		const lines = benefitsSection.split("\n");

		let currentBlock: string[] = [];
		let inBenefit = false;

		for (const line of lines) {
			if (line.startsWith("## ") && line !== "# الفوائد") {
				// Start of a new benefit
				if (currentBlock.length > 0) {
					blocks.push(currentBlock.join("\n"));
				}
				currentBlock = [line];
				inBenefit = true;
			} else if (inBenefit) {
				currentBlock.push(line);
			}
		}

		// Add the last block
		if (currentBlock.length > 0) {
			blocks.push(currentBlock.join("\n"));
		}

		return blocks;
	}

	/**
	 * Parses a single benefit block
	 */
	private parseBenefitBlock(
		block: string,
		filePath: string,
		contentType: "video" | "book",
		parentTitle: string,
		author: string
	): BenefitItem | null {
		const lines = block.split("\n").filter((line) => line.trim());
		if (lines.length === 0) return null;

		// Extract title
		const titleMatch = lines[0].match(BENEFIT_HEADER_PATTERN);
		if (!titleMatch) return null;

		const benefit: Partial<BenefitItem> = {
			title: titleMatch[1],
			filePath,
			contentType,
			parentTitle,
			author,
			categories: [],
			tags: [],
		};

		// Parse metadata and content
		let benefitTextLines: string[] = [];
		let foundBenefitText = false;

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];

			// Check for metadata patterns
			const idMatch = line.match(BENEFIT_PATTERNS.ID);
			if (idMatch) {
				benefit.id = idMatch[1];
				continue;
			}

			const dateCreatedMatch = line.match(BENEFIT_PATTERNS.DATE_CREATED);
			if (dateCreatedMatch) {
				benefit.dateCreated = dateCreatedMatch[1];
				continue;
			}

			const dateModifiedMatch = line.match(
				BENEFIT_PATTERNS.DATE_MODIFIED
			);
			if (dateModifiedMatch) {
				benefit.dateModified = dateModifiedMatch[1];
				continue;
			}

			const pageMatch = line.match(BENEFIT_PATTERNS.PAGE);
			if (pageMatch) {
				benefit.pageNumber = parseInt(pageMatch[1]);
				continue;
			}

			const volumeMatch = line.match(BENEFIT_PATTERNS.VOLUME);
			if (volumeMatch) {
				benefit.volumeNumber = parseInt(volumeMatch[1]);
				continue;
			}

			const timestampMatch = line.match(BENEFIT_PATTERNS.TIMESTAMP);
			if (timestampMatch) {
				const hours = parseInt(timestampMatch[1]) || 0;
				const minutes = parseInt(timestampMatch[2]) || 0;
				const seconds = parseInt(timestampMatch[3]) || 0;
				benefit.timestamp = hours * 3600 + minutes * 60 + seconds;
				continue;
			}

			const categoriesMatch = line.match(BENEFIT_PATTERNS.CATEGORIES);
			if (categoriesMatch) {
				benefit.categories = categoriesMatch[1]
					.split("،")
					.map((c) => c.trim())
					.filter((c) => c);
				continue;
			}

			const tagsMatch = line.match(BENEFIT_PATTERNS.TAGS);
			if (tagsMatch) {
				benefit.tags = tagsMatch[1]
					.split("،")
					.map((t) => t.trim())
					.filter((t) => t);
				continue;
			}

			const benefitTextMatch = line.match(BENEFIT_PATTERNS.BENEFIT_TEXT);
			if (benefitTextMatch) {
				benefitTextLines.push(benefitTextMatch[1]);
				foundBenefitText = true;
				// Continue reading subsequent lines as part of the benefit text
				for (let j = i + 1; j < lines.length; j++) {
					if (
						!lines[j].match(
							/^(الصفحة|المجلد|الوقت|التصنيفات|الوسوم|<!--):/
						)
					) {
						benefitTextLines.push(lines[j]);
					} else {
						break;
					}
				}
				break;
			}
		}

		// Set required fields with defaults if missing
		if (!benefit.id) benefit.id = generateId();
		if (!benefit.dateCreated)
			benefit.dateCreated = formatDate(new Date(), "YYYY-MM-DD HH:mm:ss");
		benefit.text = benefitTextLines.join("\n").trim();

		// Validate required fields
		if (!benefit.title || !benefit.text) return null;

		return benefit as BenefitItem;
	}

	/**
	 * Parses frontmatter from file content
	 */
	private parseFrontmatter(content: string): Record<string, any> | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatterStr = frontmatterMatch[1];
		const frontmatter: Record<string, any> = {};

		const lines = frontmatterStr.split("\n");
		for (const line of lines) {
			const match = line.match(/^([^:]+):\s*(.*)$/);
			if (match) {
				const key = match[1].trim();
				const value = match[2].trim().replace(/^["']|["']$/g, "");
				frontmatter[key] = value;
			}
		}

		return frontmatter;
	}

	/**
	 * Gets all markdown files recursively from a folder
	 */
	private getAllMarkdownFiles(folder: any): TFile[] {
		const files: TFile[] = [];

		if (folder.children) {
			for (const child of folder.children) {
				if (child instanceof TFile && child.extension === "md") {
					files.push(child);
				} else if (child.children) {
					files.push(...this.getAllMarkdownFiles(child));
				}
			}
		}

		return files;
	}
}
