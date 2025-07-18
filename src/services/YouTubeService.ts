/**
 * Service for YouTube API integration
 * Handles fetching metadata from YouTube
 */
import { request } from "obsidian";
import {
	VideoDetails,
	PlaylistDetails,
	APIResponse,
} from "../core/serviceTypes";
import { parseYouTubeDuration, secondsToHMS } from "../utils/durationUtils";

/**
 * Service for interacting with YouTube API and fetching video metadata
 */
export class YouTubeService {
	private apiKey: string;
	private cache: Map<string, { data: any; timestamp: number }> = new Map();

	// Cache TTL - 1 hour (in milliseconds)
	private readonly CACHE_TTL = 3600000;

	// External service URLs
	private readonly CREATETHAT_API_URL =
		"https://www.createthat.ai/api/youtube-playlist-length";
	private readonly LENOSTUBE_URL =
		"https://www.lenostube.com/en/youtube-playlist-length-calculator";
	private readonly YOUTUBE_OEMBED_API = "https://www.youtube.com/oembed";

	/**
	 * Creates a new YouTubeService
	 * @param apiKey - YouTube API key
	 */
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * Updates the API key
	 * @param apiKey - New YouTube API key
	 */
	setApiKey(apiKey: string): void {
		this.apiKey = apiKey;
		this.clearCache();
	}

	/**
	 * Cleans up YouTube title by removing starting and ending quotes
	 * @param title - Raw title from YouTube
	 * @returns Cleaned title without surrounding quotes
	 */
	private cleanYouTubeTitle(title: string): string {
		if (!title || typeof title !== "string") {
			return "";
		}

		// Remove leading and trailing whitespace first
		let cleaned = title.trim();

		// Remove matching quotes from start and end
		// Handle both single and double quotes
		if (
			(cleaned.startsWith('"') && cleaned.endsWith('"')) ||
			(cleaned.startsWith("'") && cleaned.endsWith("'")) ||
			(cleaned.startsWith("«") && cleaned.endsWith("»")) ||
			(cleaned.startsWith("„") && cleaned.endsWith('"')) ||
			(cleaned.startsWith('"') && cleaned.endsWith('"'))
		) {
			cleaned = cleaned.slice(1, -1).trim();
		}

		// Handle cases where there might be multiple nested quotes
		// Keep removing outer quotes until no more matching pairs
		let previousLength;
		do {
			previousLength = cleaned.length;
			if (
				(cleaned.startsWith('"') && cleaned.endsWith('"')) ||
				(cleaned.startsWith("'") && cleaned.endsWith("'")) ||
				(cleaned.startsWith("«") && cleaned.endsWith("»")) ||
				(cleaned.startsWith("„") && cleaned.endsWith('"')) ||
				(cleaned.startsWith('"') && cleaned.endsWith('"'))
			) {
				cleaned = cleaned.slice(1, -1).trim();
			}
		} while (cleaned.length < previousLength && cleaned.length > 0);

		return cleaned;
	}

	/**
	 * Gets video details from YouTube
	 * @param videoId - YouTube video ID
	 * @returns Response containing video details or error
	 */
	async getVideoDetails(videoId: string): Promise<APIResponse<VideoDetails>> {
		try {
			if (!videoId) {
				return { success: false, error: "معرف المقطع غير صالح" };
			}

			// Check cache first
			const cacheKey = `video:${videoId}`;
			const cached = this.getFromCache<VideoDetails>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Use fallback if API key is not available
			if (!this.apiKey) {
				return this.getVideoDetailsFallback(videoId);
			}

			// Make API request
			const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails`;
			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				console.warn(
					"YouTube API request failed:",
					await response.text()
				);
				return this.getVideoDetailsFallback(videoId);
			}

			const data = await response.json();
			if (!data.items?.length) {
				return { success: false, error: "لم يتم العثور على المقطع" };
			}

			// Extract video details
			const item = data.items[0];
			const details: VideoDetails = {
				title: this.cleanYouTubeTitle(item.snippet.title),
				duration: parseYouTubeDuration(item.contentDetails.duration),
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
				description: item.snippet.description || "",
			};

			// Save to cache
			this.saveToCache(cacheKey, details);

			return { success: true, data: details };
		} catch (error) {
			console.error("Error fetching video details:", error);
			return { success: false, error: "فشل في جلب تفاصيل المقطع" };
		}
	}

	/**
	 * Gets playlist details from YouTube
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing playlist details or error
	 */
	async getPlaylistDetails(
		playlistId: string
	): Promise<APIResponse<PlaylistDetails>> {
		try {
			if (!playlistId) {
				return { success: false, error: "معرف قائمة التشغيل غير صالح" };
			}

			// Check cache first
			const cacheKey = `playlist:${playlistId}`;
			const cached = this.getFromCache<PlaylistDetails>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Use fallback if API key is not available
			if (!this.apiKey) {
				return this.getPlaylistDetailsFallback(playlistId);
			}

			// Make API request
			const apiUrl = `https://www.googleapis.com/youtube/v3/playlists?id=${playlistId}&key=${this.apiKey}&part=snippet,contentDetails`;
			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				console.warn(
					"YouTube API request failed:",
					await response.text()
				);
				return this.getPlaylistDetailsFallback(playlistId);
			}

			const data = await response.json();
			if (!data.items?.length) {
				return {
					success: false,
					error: "لم يتم العثور على قائمة التشغيل",
				};
			}

			const item = data.items[0];

			// Get additional details - duration from videos
			let duration = "00:00:00";
			let thumbnailUrl = this.getBestThumbnail(item.snippet.thumbnails);

			try {
				// Try to get first video thumbnail
				const videosResponse = await this.getPlaylistVideos(
					playlistId,
					1
				);
				if (
					videosResponse.success &&
					Array.isArray(videosResponse.data) &&
					videosResponse.data.length > 0
				) {
					// Use first video thumbnail if available
					thumbnailUrl =
						videosResponse.data[0].thumbnailUrl || thumbnailUrl;
				}

				// Try to estimate duration
				const durationResponse = await this.getPlaylistDuration(
					playlistId
				);
				if (durationResponse.success && durationResponse.data) {
					duration = durationResponse.data;
				}
			} catch (error) {
				console.warn(
					"Error getting playlist additional details:",
					error
				);
			}

			// Create playlist details
			const details: PlaylistDetails = {
				title: this.cleanYouTubeTitle(item.snippet.title),
				itemCount: item.contentDetails.itemCount || 0,
				duration,
				thumbnailUrl,
				description: item.snippet.description || "",
			};

			// Save to cache
			this.saveToCache(cacheKey, details);

			return { success: true, data: details };
		} catch (error) {
			console.error("Error fetching playlist details:", error);
			return { success: false, error: "فشل في جلب تفاصيل قائمة التشغيل" };
		}
	}

	/**
	 * Gets videos in a playlist
	 * @param playlistId - YouTube playlist ID
	 * @param maxResults - Maximum number of results (default: 50)
	 * @returns Response containing playlist videos or error
	 */
	async getPlaylistVideos(
		playlistId: string,
		maxResults = 50
	): Promise<APIResponse<any[]>> {
		try {
			if (!playlistId) {
				return { success: false, error: "معرف قائمة التشغيل غير صالح" };
			}

			if (!this.apiKey) {
				return {
					success: false,
					error: "مفتاح API مطلوب لهذه العملية",
				};
			}

			// Check cache
			const cacheKey = `playlistVideos:${playlistId}:${maxResults}`;
			const cached = this.getFromCache<any[]>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// API request
			const apiUrl =
				`https://www.googleapis.com/youtube/v3/playlistItems?` +
				`playlistId=${playlistId}&key=${this.apiKey}&` +
				`part=snippet,contentDetails&maxResults=${maxResults}`;

			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				return {
					success: false,
					error: "فشل في جلب مقاطع قائمة التشغيل",
				};
			}

			const data = await response.json();

			// Map items to a simpler format
			const videos = data.items.map((item: any) => ({
				title: this.cleanYouTubeTitle(item.snippet.title),
				videoId: item.contentDetails.videoId,
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
				position: item.snippet.position,
			}));

			// Save to cache
			this.saveToCache(cacheKey, videos);

			return { success: true, data: videos };
		} catch (error) {
			console.error("Error fetching playlist videos:", error);
			return { success: false, error: "فشل في جلب مقاطع قائمة التشغيل" };
		}
	}

	/**
	 * Retrieves the total duration of a playlist
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing playlist duration or error
	 */
	async getPlaylistDuration(
		playlistId: string
	): Promise<APIResponse<string>> {
		try {
			if (!playlistId) {
				return { success: false, error: "Invalid playlist ID" };
			}

			// Try cache first
			const cacheKey = `playlistDuration:${playlistId}`;
			const cached = this.getFromCache<string>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Try external services to get duration
			let duration: string | null = null;

			// Try createthat.ai service
			try {
				duration = await this.getDurationFromCreatethat(playlistId);
				if (duration) {
					this.saveToCache(cacheKey, duration);
					return { success: true, data: duration };
				}
			} catch (error) {
				console.warn(
					"Failed to get duration from createthat.ai:",
					error
				);
			}

			// Try lenostube service as fallback
			try {
				duration = await this.getDurationFromLenostube(playlistId);
				if (duration) {
					this.saveToCache(cacheKey, duration);
					return { success: true, data: duration };
				}
			} catch (error) {
				console.warn(
					"Failed to get duration from lenostube.com:",
					error
				);
			}

			// If API key is available, calculate duration from videos
			if (this.apiKey) {
				try {
					duration = await this.calculateDurationFromVideos(
						playlistId
					);
					if (duration) {
						this.saveToCache(cacheKey, duration);
						return { success: true, data: duration };
					}
				} catch (error) {
					console.warn(
						"Failed to calculate duration from videos:",
						error
					);
				}
			}

			return {
				success: false,
				error: "Could not retrieve playlist duration",
			};
		} catch (error) {
			console.error("Error fetching playlist duration:", error);
			return {
				success: false,
				error: "Failed to fetch playlist duration",
			};
		}
	}

	/**
	 * Calculates playlist duration from individual videos
	 * @param playlistId - Playlist ID
	 * @returns Formatted duration or null if failed
	 */
	private async calculateDurationFromVideos(
		playlistId: string
	): Promise<string | null> {
		if (!this.apiKey) return null;

		try {
			// Get playlist videos (maximum 50 to avoid API limits)
			const videosResponse = await this.getPlaylistVideos(playlistId, 50);
			if (!videosResponse.success || !videosResponse.data?.length) {
				return null;
			}

			// Fetch details for each video to get durations
			let totalSeconds = 0;
			const videos = videosResponse.data;

			// Process videos in batches of 5 to avoid rate limits
			const batchSize = 5;
			for (let i = 0; i < videos.length; i += batchSize) {
				const batch = videos.slice(i, i + batchSize);
				const batchRequests = batch.map((video) =>
					this.getVideoDetails(video.videoId)
						.then((response) => {
							if (response.success && response.data?.duration) {
								// Convert HH:MM:SS to seconds and add to total
								const parts = response.data.duration
									.split(":")
									.map(Number);
								const seconds =
									parts[0] * 3600 + parts[1] * 60 + parts[2];
								return seconds;
							}
							return 0;
						})
						.catch(() => 0)
				);

				const batchResults = await Promise.all(batchRequests);
				totalSeconds += batchResults.reduce(
					(sum, seconds) => sum + seconds,
					0
				);

				// Add a small delay between batches
				if (i + batchSize < videos.length) {
					await new Promise((resolve) => setTimeout(resolve, 300));
				}
			}

			// Multiply by ratio if we didn't process all videos
			if (videos.length < videosResponse.data.length) {
				const ratio = videosResponse.data.length / videos.length;
				totalSeconds = Math.round(totalSeconds * ratio);
			}

			return secondsToHMS(totalSeconds);
		} catch (error) {
			console.error("Error calculating duration from videos:", error);
			return null;
		}
	}

	/**
	 * Gets playlist duration from createthat.ai service
	 * @param playlistId - YouTube playlist ID
	 * @returns Formatted duration string or null
	 */
	private async getDurationFromCreatethat(
		playlistId: string
	): Promise<string | null> {
		const response = await request({
			url: `${this.CREATETHAT_API_URL}?playlistId=${playlistId}`,
			method: "GET",
		});

		try {
			const data = JSON.parse(response);

			if (data.totalDuration) {
				const hours = data.totalDuration.hours
					.toString()
					.padStart(2, "0");
				const minutes = data.totalDuration.minutes
					.toString()
					.padStart(2, "0");
				const seconds = data.totalDuration.seconds
					.toString()
					.padStart(2, "0");

				return `${hours}:${minutes}:${seconds}`;
			}
		} catch (error) {
			console.warn("Failed to parse createthat.ai response:", error);
		}

		return null;
	}

	/**
	 * Gets playlist duration from lenostube.com service
	 * @param playlistId - YouTube playlist ID
	 * @returns Formatted duration string or null
	 */
	private async getDurationFromLenostube(
		playlistId: string
	): Promise<string | null> {
		const response = await request({
			url: `${this.LENOSTUBE_URL}/?playlist_id=${playlistId}`,
			method: "GET",
		});

		try {
			return this.parseLenostubeResponse(response);
		} catch (error) {
			console.warn("Failed to parse lenostube.com response:", error);
			return null;
		}
	}

	/**
	 * Parses HTML response from lenostube.com to extract duration
	 * @param html - HTML response
	 * @returns Formatted duration string or null if not found
	 */
	private parseLenostubeResponse(html: string): string | null {
		const totalDurationMatch = html.match(
			/Total Duration: <strong>(.*?)<\/strong>/
		);
		if (totalDurationMatch && totalDurationMatch[1]) {
			// Convert to HH:MM:SS format
			const durationParts = totalDurationMatch[1].split(":");
			if (durationParts.length === 3) {
				return durationParts
					.map((part) => part.padStart(2, "0"))
					.join(":");
			}
		}

		// Fall back to extracting duration from table
		let totalSeconds = 0;

		// Look for duration values in the HTML
		const durationPattern = /(\d+:\d+:\d+)|(\d+:\d+)/g;
		const durationMatches = html.match(durationPattern);

		if (durationMatches && durationMatches.length > 0) {
			durationMatches.forEach((durationText) => {
				try {
					// Convert each duration to seconds and add to total
					const parts = durationText.split(":").map(Number);
					if (parts.length === 3) {
						totalSeconds +=
							parts[0] * 3600 + parts[1] * 60 + parts[2];
					} else if (parts.length === 2) {
						totalSeconds += parts[0] * 60 + parts[1];
					}
				} catch (e) {
					// Skip problematic durations
				}
			});

			// Return formatted duration
			return secondsToHMS(totalSeconds);
		}

		return null;
	}

	/**
	 * Makes an API request with error handling
	 * @param url - URL to request
	 * @returns Response object
	 */
	private async makeApiRequest(url: string): Promise<Response> {
		try {
			return await fetch(url);
		} catch (error) {
			console.error("API request failed:", error);
			throw new Error(`API request failed: ${error}`);
		}
	}

	/**
	 * Fallback method to get video details without API key
	 * @param videoId - YouTube video ID
	 * @returns Response with basic video info
	 */
	private async getVideoDetailsFallback(
		videoId: string
	): Promise<APIResponse<VideoDetails>> {
		try {
			// Use YouTube oEmbed API (doesn't require API key)
			const oembedUrl = `${this.YOUTUBE_OEMBED_API}?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

			try {
				const response = await request({
					url: oembedUrl,
					method: "GET",
				});

				const oembedData = JSON.parse(response);

				// Create basic video details
				const details: VideoDetails = {
					title: this.cleanYouTubeTitle(oembedData.title),
					duration: "00:00:00", // Unknown without API key
					thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
					description: "",
				};

				return { success: true, data: details };
			} catch (e) {
				return {
					success: false,
					error: "تعذر الوصول إلى بيانات المقطع",
				};
			}
		} catch (error) {
			console.error("Error in fallback video details:", error);
			return { success: false, error: "فشل في جلب تفاصيل المقطع" };
		}
	}

	/**
	 * Fallback method to get playlist details without API key
	 * @param playlistId - YouTube playlist ID
	 * @returns Response with basic playlist info
	 */
	private async getPlaylistDetailsFallback(
		playlistId: string
	): Promise<APIResponse<PlaylistDetails>> {
		try {
			// Try to scrape playlist page
			try {
				const html = await request({
					url: `https://www.youtube.com/playlist?list=${playlistId}`,
					method: "GET",
				});

				// Extract title from HTML
				const titleMatch = html.match(/<title>(.*?)<\/title>/);
				const rawTitle = titleMatch
					? titleMatch[1].replace(" - YouTube", "").trim()
					: "قائمة تشغيل غير معروفة";

				return {
					success: true,
					data: {
						title: this.cleanYouTubeTitle(rawTitle),
						itemCount: 0, // Unknown without API
						duration: "00:00:00", // Unknown without API
						thumbnailUrl: `https://img.youtube.com/vi/placeholder/hqdefault.jpg`,
					},
				};
			} catch (e) {
				return {
					success: false,
					error: "تعذر الوصول إلى بيانات قائمة التشغيل",
				};
			}
		} catch (error) {
			console.error("Error in playlist fallback:", error);
			return { success: false, error: "فشل في جلب تفاصيل قائمة التشغيل" };
		}
	}

	/**
	 * Gets the best quality thumbnail URL from YouTube thumbnails object
	 * @param thumbnails - YouTube thumbnails object
	 * @returns URL of best available thumbnail
	 */
	private getBestThumbnail(thumbnails: any): string {
		if (!thumbnails) return "";

		// Try thumbnails in descending quality order
		if (thumbnails.maxres) return thumbnails.maxres.url;
		if (thumbnails.high) return thumbnails.high.url;
		if (thumbnails.medium) return thumbnails.medium.url;
		if (thumbnails.standard) return thumbnails.standard.url;
		if (thumbnails.default) return thumbnails.default.url;

		return "";
	}

	/**
	 * Retrieves data from cache if not expired
	 * @param key - Cache key
	 * @returns Cached data or null if expired/not found
	 */
	private getFromCache<T>(key: string): T | null {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data as T;
		}
		return null;
	}

	/**
	 * Saves data to cache
	 * @param key - Cache key
	 * @param data - Data to cache
	 */
	private saveToCache(key: string, data: any): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	/**
	 * Clears all cached data
	 */
	private clearCache(): void {
		this.cache.clear();
	}
}
