/**
 * Simple event emitter for state change notifications
 * Allows components to subscribe to specific state changes
 */
export class EventEmitter {
	// Map of event names to arrays of callback functions
	private listeners: Map<string, Function[]> = new Map();

	/**
	 * Subscribe to an event
	 * @param event - Event name to subscribe to
	 * @param callback - Function to call when event is emitted
	 * @returns Unsubscribe function
	 */
	public on(event: string, callback: Function): () => void {
		// Initialize array if this is the first listener for this event
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}

		// Add callback to listeners array
		this.listeners.get(event)?.push(callback);

		// Return unsubscribe function
		return () => {
			const eventListeners = this.listeners.get(event);
			if (eventListeners) {
				const index = eventListeners.indexOf(callback);
				if (index !== -1) {
					eventListeners.splice(index, 1);

					// Clean up empty arrays
					if (eventListeners.length === 0) {
						this.listeners.delete(event);
					}
				}
			}
		};
	}

	/**
	 * Emit an event with optional data
	 * @param event - Event name to emit
	 * @param data - Data to pass to listeners
	 */
	public emit(event: string, data?: any): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			// Create a copy to avoid issues if listeners modify the array
			const listeners = [...eventListeners];
			listeners.forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error(
						`Error in event listener for ${event}:`,
						error
					);
				}
			});
		}
	}

	/**
	 * Remove all listeners for an event or all events
	 * @param event - Optional event name to clear listeners for
	 */
	public clear(event?: string): void {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
	}

	/**
	 * Get the number of listeners for an event
	 * @param event - Event name to check
	 * @returns Number of listeners
	 */
	public listenerCount(event: string): number {
		return this.listeners.get(event)?.length || 0;
	}
}
