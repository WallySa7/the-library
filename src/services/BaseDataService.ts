/**
 * Base data service with common filesystem operations
 */
import { App, TFile, TFolder } from "obsidian";
import { LibrarySettings } from "../core/settings";
import { FolderData } from "src/core";
import { formatDate } from "src/utils";
import { FileManagerService } from "./FileManagerService";

/**
 * Base data service providing common filesystem operations
 * All specialized services inherit from this class
 */
export abstract class BaseDataService {
	protected app: App;
	protected settings: LibrarySettings;

	/**
	 * Creates a new base data service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: LibrarySettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Recursively finds all markdown files in a folder and its subfolders
	 * @param folder - The folder to search
	 * @returns Array of markdown files
	 */
	protected findMarkdownFiles(folder: TFolder): TFile[] {
		let files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				files.push(child);
			} else if (child instanceof TFolder) {
				files = files.concat(this.findMarkdownFiles(child));
			}
		}

		return files;
	}

	/**
	 * Creates a folder path if it doesn't exist
	 * @param folderPath - Path to create
	 * @returns True if successful, false otherwise
	 */
	protected async createFolderIfNeeded(folderPath: string): Promise<boolean> {
		try {
			if (this.app.vault.getAbstractFileByPath(folderPath)) {
				return true; // Folder already exists
			}

			// Create nested folders by recursively building the path
			const pathParts = folderPath.split("/");
			let currentPath = "";

			for (const part of pathParts) {
				if (!part) continue; // Skip empty parts

				currentPath = currentPath ? `${currentPath}/${part}` : part;

				if (!this.app.vault.getAbstractFileByPath(currentPath)) {
					await this.app.vault.createFolder(currentPath);
				}
			}

			return true;
		} catch (error) {
			console.error(`Failed to create folder ${folderPath}:`, error);
			return false;
		}
	}

	/**
	 * Parses frontmatter from file content
	 * @param content - File content string
	 * @returns Parsed frontmatter as object or null if not found
	 */
	protected parseFrontmatter(content: string): Record<string, any> | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatterStr = frontmatterMatch[1];
		const frontmatter: Record<string, any> = {};

		// Parse frontmatter lines
		const lines = frontmatterStr.split("\n");
		let currentKey = "";
		let currentValue = "";
		let inListMode = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check if this is a list item
			if (line.trim().startsWith("- ")) {
				if (inListMode && currentKey) {
					// Add to existing array
					if (!Array.isArray(frontmatter[currentKey])) {
						frontmatter[currentKey] = [];
					}
					const listValue = line.trim().substring(2).trim();
					frontmatter[currentKey].push(
						this.parseYamlValue(listValue)
					);
				}
				continue;
			}

			// Match key-value pairs
			const match = line.match(/^([^:]+):\s*(.*?)$/);
			if (match) {
				// Save previous key-value if exists
				if (currentKey && !inListMode) {
					frontmatter[currentKey] = this.parseYamlValue(currentValue);
				}

				currentKey = match[1].trim();
				currentValue = match[2].trim();

				// Check if this starts a list (empty value or single item)
				if (currentValue === "" || currentValue === "[]") {
					// Look ahead to see if next lines are list items
					inListMode =
						i + 1 < lines.length &&
						lines[i + 1].trim().startsWith("- ");
					if (inListMode) {
						frontmatter[currentKey] = [];
					} else if (currentValue === "[]") {
						frontmatter[currentKey] = [];
					}
				} else {
					inListMode = false;
					// Parse single value
					frontmatter[currentKey] = this.parseYamlValue(currentValue);
				}
			} else if (currentKey && !inListMode) {
				// Continuation of previous value
				currentValue += "\n" + line;
			}
		}

		// Handle last key-value pair
		if (
			currentKey &&
			!inListMode &&
			!Array.isArray(frontmatter[currentKey])
		) {
			frontmatter[currentKey] = this.parseYamlValue(currentValue);
		}

		return frontmatter;
	}

	/**
	 * Parses a YAML value to the appropriate JavaScript type
	 * @param value - String value from YAML
	 * @returns Parsed value with appropriate type
	 */
	private parseYamlValue(value: string): any {
		// Remove quotes if present
		const cleanValue = value.replace(/^["']|["']$/g, "");

		// Boolean values
		if (cleanValue === "true") return true;
		if (cleanValue === "false") return false;

		// Numeric values
		if (!isNaN(Number(cleanValue)) && cleanValue !== "") {
			return Number(cleanValue);
		}

		// Array values (simple form [a, b, c])
		if (value.startsWith("[") && value.endsWith("]")) {
			try {
				return JSON.parse(value);
			} catch {
				// If parsing fails, leave as string
				return cleanValue;
			}
		}

		// Default to string
		return cleanValue;
	}

	/**
	 * Updates a value in file frontmatter
	 * @param content - File content
	 * @param key - Frontmatter key to update
	 * @param value - New value
	 * @returns Updated content string
	 */
	protected updateFrontmatter(
		content: string,
		key: string,
		value: any
	): string {
		const yamlValue = this.formatYamlValue(value, key);

		// Find frontmatter section
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) {
			// If no frontmatter, add it
			return `---\n${key}: ${yamlValue}\n---\n\n${content}`;
		}

		const frontmatter = frontmatterMatch[1];
		const lines = frontmatter.split("\n");

		// Find existing key and its range (including list items)
		let keyLineIndex = -1;
		let keyEndIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith(`${key}:`)) {
				keyLineIndex = i;
				keyEndIndex = i;

				// Check if next lines are list items for this key
				for (let j = i + 1; j < lines.length; j++) {
					if (lines[j].trim().startsWith("- ")) {
						keyEndIndex = j;
					} else if (
						lines[j].trim() === "" &&
						j + 1 < lines.length &&
						lines[j + 1].trim().startsWith("- ")
					) {
						// Allow empty lines within lists
						keyEndIndex = j;
					} else {
						break;
					}
				}
				break;
			}
		}

		if (keyLineIndex !== -1) {
			// Remove existing key and its list items
			lines.splice(keyLineIndex, keyEndIndex - keyLineIndex + 1);

			// Insert new value(s)
			if (
				Array.isArray(value) &&
				(key === "tags" ||
					key === "categories" ||
					key === "وسوم" ||
					key === "تصنيفات")
			) {
				// Insert as YAML list
				lines.splice(keyLineIndex, 0, `${key}:`);
				value.forEach((item, index) => {
					lines.splice(
						keyLineIndex + 1 + index,
						0,
						`  - ${this.formatYamlValue(item)}`
					);
				});
			} else {
				// Insert as single value
				lines.splice(keyLineIndex, 0, `${key}: ${yamlValue}`);
			}
		} else {
			// Add new key
			if (
				Array.isArray(value) &&
				(key === "tags" ||
					key === "categories" ||
					key === "وسوم" ||
					key === "تصنيفات")
			) {
				// Add as YAML list
				lines.push(`${key}:`);
				value.forEach((item) => {
					lines.push(`  - ${this.formatYamlValue(item)}`);
				});
			} else {
				// Add as single value
				lines.push(`${key}: ${yamlValue}`);
			}
		}

		// Rebuild frontmatter
		const updatedFrontmatter = lines.join("\n");
		return content.replace(
			/^---\n[\s\S]*?\n---/,
			`---\n${updatedFrontmatter}\n---`
		);
	}

	/**
	 * Formats a JavaScript value for YAML
	 * @param value - Value to format
	 * @param key - Optional key name for context-specific formatting
	 * @returns Formatted YAML string value
	 */
	protected formatYamlValue(value: any, key?: string): string {
		if (value === null || value === undefined) {
			return "";
		}

		if (typeof value === "string") {
			// Quote strings with special characters
			if (
				value.includes(":") ||
				value.includes("#") ||
				value.includes("{") ||
				value.includes("[") ||
				value.includes("\n") ||
				value.includes('"') ||
				value.includes("'")
			) {
				return `"${value.replace(/"/g, '\\"')}"`;
			}
			return value;
		}

		if (typeof value === "number" || typeof value === "boolean") {
			return value.toString();
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return "[]";
			}

			// For tags and categories, we handle them specially in updateFrontmatter
			// This method should only handle individual array items
			if (
				key === "tags" ||
				key === "categories" ||
				key === "وسوم" ||
				key === "تصنيفات"
			) {
				// This shouldn't be called for arrays of tags/categories directly
				// but if it is, format as empty (handled in updateFrontmatter)
				return "";
			}

			// Format as inline array for other short arrays
			if (
				value.length < 5 &&
				value.every((v) => typeof v === "string" && v.length < 20)
			) {
				return `[${value
					.map((v) => this.formatYamlValue(v))
					.join(", ")}]`;
			}

			// Format as multiline array for longer arrays
			return `\n  - ${value
				.map((v) => this.formatYamlValue(v))
				.join("\n  - ")}`;
		}

		if (typeof value === "object") {
			try {
				return JSON.stringify(value);
			} catch {
				return value.toString();
			}
		}

		return value.toString();
	}

	/**
	 * Normalizes tags from various formats to a consistent array
	 * @param tagData - Tags from frontmatter (string, array, or comma-separated)
	 * @returns Normalized array of tags
	 */
	protected normalizeTags(tagData: any): string[] {
		if (!tagData) return [];

		if (Array.isArray(tagData)) {
			return tagData.map((t) => t.toString().trim()).filter((t) => t);
		}

		if (typeof tagData === "string") {
			// Handle comma-separated strings (for backward compatibility)
			return tagData
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t);
		}

		return [];
	}

	/**
	 * Formats tags/categories array for template rendering
	 * @param tags - Array of tags or categories
	 * @returns Formatted string for templates
	 */
	protected formatTagsForTemplate(tags: string[]): string {
		if (!tags || tags.length === 0) return "";

		// Return as YAML list format for templates
		return tags.map((tag) => `  - ${this.formatYamlValue(tag)}`).join("\n");
	}

	/**
	 * Moves a file if folder-relevant fields have changed
	 * @param filePath Current file path
	 * @param frontmatter Current frontmatter data
	 * @param updatedData Updated data (potentially affecting folder structure)
	 * @param folderRulesEnabled Whether folder rules are enabled
	 * @param resolveFolderPath Function to resolve new folder path
	 * @param rootFolder Root folder for this content type
	 * @returns New file path if moved, original path otherwise
	 */
	protected async moveFileIfNeeded(
		filePath: string,
		frontmatter: Record<string, any>,
		updatedData: Record<string, any>,
		folderRulesEnabled: boolean,
		resolveFolderPath: (data: FolderData) => Promise<string>,
		rootFolder: string
	): Promise<string> {
		// Skip if folder rules are disabled
		if (!folderRulesEnabled) {
			return filePath;
		}

		// Get current folder path
		const originalFolder = filePath.substring(0, filePath.lastIndexOf("/"));

		// Prepare folder data (combining frontmatter with updates)
		const folderData = this.prepareFolderData(frontmatter, updatedData);

		// Resolve the new folder path
		const newFolderPath = await resolveFolderPath(folderData);

		// Only move if folder has changed
		if (originalFolder !== newFolderPath) {
			const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
			const newPath = `${newFolderPath}/${fileName}`;

			// Create file manager service
			const fileManager = new FileManagerService(this.app);

			// Move the file
			const moveResult = await fileManager.moveFile(
				filePath,
				newPath,
				true
			);
			if (moveResult) {
				console.log(`Moved file from ${filePath} to ${newPath}`);
				return newPath;
			} else {
				console.warn(
					`Failed to move file from ${filePath} to ${newPath}`
				);
			}
		}

		return filePath;
	}

	/**
	 * Prepares folder data from frontmatter and updated fields
	 * Subclasses should override this method for content-specific implementations
	 * @param frontmatter Current frontmatter data
	 * @param updatedData Updated data
	 * @returns Folder data for path resolution
	 */
	protected prepareFolderData(
		frontmatter: Record<string, any>,
		updatedData: Record<string, any>
	): FolderData {
		// Basic implementation, should be overridden by subclasses
		return {
			type: updatedData.type || frontmatter.type || "",
			presenter: updatedData.presenter || frontmatter.presenter || "",
			author: updatedData.author || frontmatter.author || "",
			date: frontmatter.dateAdded || formatDate(new Date(), "YYYY-MM-DD"),
			category: undefined,
		};
	}
}
