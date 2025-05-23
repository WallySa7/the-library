/**
 * Utilities for file operations
 */

/**
 * Sanitizes a filename to ensure it's compatible with file systems
 * @param name - The raw filename to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized filename
 */
export function sanitizeFileName(name: string, maxLength = 100): string {
	if (!name || typeof name !== "string") {
		return `file-${new Date().getTime()}`;
	}

	// Remove invalid file characters
	const invalidChars = /[*"\\/<>:|?#]/g;
	let sanitized = name.replace(invalidChars, "");

	// Clean up whitespace
	sanitized = sanitized.trim();
	sanitized = sanitized.replace(/\s+/g, " ");

	// Truncate if too long
	if (sanitized.length > maxLength) {
		sanitized = sanitized.substring(0, maxLength).trim();
	}

	// Ensure we have a valid name (non-empty)
	if (!sanitized) {
		sanitized = `file-${new Date().getTime()}`;
	}

	return sanitized;
}

/**
 * Creates a path by joining segments with proper separators
 * @param segments - Path segments to join
 * @returns Combined path with proper separators
 */
export function createPath(...segments: string[]): string {
	// Filter out empty segments and join with forward slash
	return segments
		.filter((segment) => segment && typeof segment === "string")
		.join("/");
}

/**
 * Gets the base name of a file (without extension)
 * @param filename - The filename to process
 * @returns The base name without extension
 */
export function getBaseName(filename: string): string {
	if (!filename || typeof filename !== "string") {
		return "";
	}

	// Get the last part of the path (handle both / and \ separators)
	const name = filename.split(/[\/\\]/).pop() || "";

	// Remove extension
	const dotIndex = name.lastIndexOf(".");
	return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

/**
 * Gets the parent directory of a path
 * @param path - The path to process
 * @returns The parent directory path
 */
export function getParentDir(path: string): string {
	if (!path || typeof path !== "string") {
		return "";
	}

	// Remove trailing slash if any
	const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

	// Split by path separator and remove last component
	const parts = normalizedPath.split("/");
	parts.pop();

	return parts.join("/");
}

/**
 * Checks if a path is a subpath of another
 * @param parent - The potential parent path
 * @param child - The potential child path
 * @returns Whether child is a subpath of parent
 */
export function isSubPath(parent: string, child: string): boolean {
	if (!parent || !child) return false;

	// Normalize paths
	const normalizedParent = parent.endsWith("/") ? parent : parent + "/";

	return child.startsWith(normalizedParent);
}
