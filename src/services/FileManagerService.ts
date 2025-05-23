/**
 * Service for handling file management operations
 */
import { App, TFolder } from "obsidian";

export class FileManagerService {
	private app: App;

	/**
	 * Creates a new FileManagerService
	 * @param app Obsidian app instance
	 */
	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Moves a file to a new location and optionally cleans up empty folders
	 * @param currentPath Current file path
	 * @param newPath New file path
	 * @param cleanupEmptyFolders Whether to delete empty folders after moving
	 * @returns Whether the operation was successful
	 */
	async moveFile(
		currentPath: string,
		newPath: string,
		cleanupEmptyFolders = true
	): Promise<boolean> {
		try {
			// Don't do anything if paths are the same
			if (currentPath === newPath) {
				return true;
			}

			const file = this.app.vault.getAbstractFileByPath(currentPath);
			if (!file) {
				console.error(`File not found: ${currentPath}`);
				return false;
			}

			// Get the original folder path (for cleanup later)
			const originalFolder = currentPath.substring(
				0,
				currentPath.lastIndexOf("/")
			);

			// Create the target folder if it doesn't exist
			const targetFolder = newPath.substring(0, newPath.lastIndexOf("/"));
			await this.createFolderIfNeeded(targetFolder);

			// Move the file
			await this.app.fileManager.renameFile(file, newPath);

			// Clean up empty folders if requested
			if (cleanupEmptyFolders) {
				await this.cleanupEmptyFolders(originalFolder);
			}

			return true;
		} catch (error) {
			console.error(
				`Error moving file from ${currentPath} to ${newPath}:`,
				error
			);
			return false;
		}
	}

	/**
	 * Creates a folder path if it doesn't exist
	 * @param folderPath Folder path to create
	 * @returns Whether the operation was successful
	 */
	async createFolderIfNeeded(folderPath: string): Promise<boolean> {
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
	 * Recursively deletes empty folders
	 * @param folderPath Folder path to check and potentially delete
	 * @returns Whether the operation was successful
	 */
	async cleanupEmptyFolders(folderPath: string): Promise<boolean> {
		try {
			// Don't try to delete root or empty path
			if (!folderPath || folderPath === "/") {
				return true;
			}

			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folder || !(folder instanceof TFolder)) {
				return true; // Folder doesn't exist or isn't a folder
			}

			// Check if the folder is empty
			if (folder.children.length === 0) {
				// Delete the folder
				await this.app.vault.delete(folder);

				// Check if parent folder is now empty
				const parentPath = folderPath.substring(
					0,
					folderPath.lastIndexOf("/")
				);
				if (parentPath && parentPath !== "/") {
					await this.cleanupEmptyFolders(parentPath);
				}
			}

			return true;
		} catch (error) {
			console.error(`Error cleaning up folder ${folderPath}:`, error);
			return false;
		}
	}
}
