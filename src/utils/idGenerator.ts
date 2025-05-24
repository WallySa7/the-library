// src/utils/idGenerator.ts

/**
 * Generates a unique ID for benefits and other entities
 * @returns A unique string ID
 */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
