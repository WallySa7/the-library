/**
 * Service for YouTube API integration
 */
import { request } from "obsidian";
import {
	VideoDetails,
	PlaylistDetails,
	APIResponse,
} from "../core/serviceTypes";
import { parseYouTubeDuration, secondsToHMS } from "../utils/durationUtils";

/**
 * Service for interacting with YouTube API
 */
export class YouTubeService {
	private apiKey: string;
	private cache: Map<string, { data: any; timestamp: number }> = new Map();
	private readonly CACHE_TTL = 3600000; // 1 hour cache time

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
	 * Gets video details from YouTube
	 * @param videoId - YouTube video ID
	 * @returns Response containing video details or error
	 */
	async getVideoDetails(videoId: string): Promise<APIResponse<VideoDetails>> {
		try {
			if (!videoId) {
				return { success: false, error: "معرف الفيديو غير صالح" };
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
				return { success: false, error: "لم يتم العثور على الفيديو" };
			}

			// Extract video details
			const item = data.items[0];
			const details: VideoDetails = {
				title: item.snippet.title,
				duration: parseYouTubeDuration(item.contentDetails.duration),
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
				description: item.snippet.description || "",
			};

			// Save to cache
			this.saveToCache(cacheKey, details);

			return { success: true, data: details };
		} catch (error) {
			console.error("Error fetching video details:", error);
			return { success: false, error: "فشل في جلب تفاصيل الفيديو" };
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
				// Try to get first video thumbnail and calculate duration
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
				const durationResponse = await this.estimatePlaylistDuration(
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
				title: item.snippet.title,
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
					error: "فشل في جلب فيديوهات قائمة التشغيل",
				};
			}

			const data = await response.json();

			// Map items to a simpler format
			const videos = data.items.map((item: any) => ({
				title: item.snippet.title,
				videoId: item.contentDetails.videoId,
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
				position: item.snippet.position,
			}));

			// Save to cache
			this.saveToCache(cacheKey, videos);

			return { success: true, data: videos };
		} catch (error) {
			console.error("Error fetching playlist videos:", error);
			return {
				success: false,
				error: "فشل في جلب فيديوهات قائمة التشغيل",
			};
		}
	}

	/**
	 * Estimates the total duration of a playlist
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing duration string or error
	 */
	async estimatePlaylistDuration(
		playlistId: string
	): Promise<APIResponse<string>> {
		try {
			if (!playlistId) {
				return { success: false, error: "معرف قائمة التشغيل غير صالح" };
			}

			// Check cache
			const cacheKey = `playlistDuration:${playlistId}`;
			const cached = this.getFromCache<string>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Without API key we can't estimate
			if (!this.apiKey) {
				return {
					success: false,
					error: "مفتاح API مطلوب لهذه العملية",
				};
			}

			let totalSeconds = 0;
			let estimatedDuration = "00:00:00";

			// Get first 50 videos to estimate (limit API usage)
			const videosResponse = await this.getPlaylistVideos(playlistId, 50);
			if (!videosResponse.success || !videosResponse.data) {
				return {
					success: false,
					error: "فشل في تقدير مدة قائمة التشغيل",
				};
			}

			const videos = videosResponse.data;

			// If we have videos, get duration of each
			if (videos.length > 0) {
				// Get details for first 5 videos to estimate average duration
				const videoIds = videos
					.slice(0, 5)
					.map((v) => v.videoId)
					.join(",");

				if (videoIds) {
					const apiUrl =
						`https://www.googleapis.com/youtube/v3/videos?` +
						`id=${videoIds}&key=${this.apiKey}&` +
						`part=contentDetails`;

					const response = await this.makeApiRequest(apiUrl);

					if (response.ok) {
						const data = await response.json();
						if (data.items?.length > 0) {
							// Calculate average duration
							let totalDuration = 0;
							data.items.forEach((item: any) => {
								const duration = item.contentDetails.duration;
								const seconds =
									this.isoDurationToSeconds(duration);
								totalDuration += seconds;
							});

							const avgDuration =
								totalDuration / data.items.length;

							// Estimate total duration based on playlist item count
							const playlistResponse =
								await this.getPlaylistDetails(playlistId);
							if (
								playlistResponse.success &&
								playlistResponse.data
							) {
								const itemCount =
									playlistResponse.data.itemCount;
								totalSeconds = avgDuration * itemCount;
								estimatedDuration = secondsToHMS(totalSeconds);
							}
						}
					}
				}
			}

			// If we have a valid duration, cache it
			if (estimatedDuration !== "00:00:00") {
				this.saveToCache(cacheKey, estimatedDuration);
				return { success: true, data: estimatedDuration };
			}

			return { success: false, error: "لا يمكن تقدير المدة" };
		} catch (error) {
			console.error("Error estimating playlist duration:", error);
			return { success: false, error: "فشل في تقدير مدة قائمة التشغيل" };
		}
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
	 * Converts ISO 8601 duration to seconds
	 * @param isoDuration - ISO duration string (PT1H30M15S)
	 * @returns Duration in seconds
	 */
	private isoDurationToSeconds(isoDuration: string): number {
		if (!isoDuration || !isoDuration.startsWith("PT")) {
			return 0;
		}

		const timeStr = isoDuration.substring(2);
		let hours = 0,
			minutes = 0,
			seconds = 0;

		const hoursMatch = timeStr.match(/(\d+)H/);
		const minutesMatch = timeStr.match(/(\d+)M/);
		const secondsMatch = timeStr.match(/(\d+)S/);

		if (hoursMatch) hours = parseInt(hoursMatch[1], 10);
		if (minutesMatch) minutes = parseInt(minutesMatch[1], 10);
		if (secondsMatch) seconds = parseInt(secondsMatch[1], 10);

		return hours * 3600 + minutes * 60 + seconds;
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
			const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

			try {
				const response = await request({
					url: oembedUrl,
					method: "GET",
				});

				const oembedData = JSON.parse(response);

				// Create basic video details
				const details: VideoDetails = {
					title: oembedData.title,
					duration: "00:00:00", // Unknown without API key
					thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
					description: "",
				};

				return { success: true, data: details };
			} catch (e) {
				return {
					success: false,
					error: "تعذر الوصول إلى بيانات الفيديو",
				};
			}
		} catch (error) {
			console.error("Error in fallback video details:", error);
			return { success: false, error: "فشل في جلب تفاصيل الفيديو" };
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
				const title = titleMatch
					? titleMatch[1].replace(" - YouTube", "").trim()
					: "قائمة تشغيل غير معروفة";

				return {
					success: true,
					data: {
						title,
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
			return {
				success: false,
				error: "فشل في جلب تفاصيل قائمة التشغيل",
			};
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
}
