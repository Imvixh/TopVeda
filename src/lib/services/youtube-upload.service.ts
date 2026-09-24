/**
 * TopVeda Phase 6 Loop 2: YouTube Recorded Video Upload Service
 * Implements server-authoritative resumable video uploads to the dedicated
 * TopVeda YouTube channel using the YouTube Data API v3.
 * 
 * SECURITY RULES:
 * 1. Tokens and upload URIs are server-only secrets (never exposed to browser/client).
 * 2. Uploaded videos default to "unlisted" to reduce public discoverability while TopVeda
 *    authentication and enrollment govern access to the embedded player.
 * 3. Sanitizes all network errors to prevent credential leakage.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { YouTubeOAuthService, YouTubeOAuthError } from "./youtube-oauth.service";
import { YouTubeLiveService } from "./youtube-live.service";
import {
  UploadYouTubeVideoOptions,
  UploadedYouTubeVideoResult,
  YouTubeVideoProcessingStatus,
} from "@/types/youtube.types";

export class YouTubeUploadService {
  private static readonly YOUTUBE_UPLOAD_INIT_ENDPOINT =
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
  private static readonly YOUTUBE_VIDEOS_ENDPOINT =
    "https://www.googleapis.com/youtube/v3/videos";

  /**
   * Parses ISO 8601 duration (e.g. PT1H2M30S, PT45M12S) into seconds.
   */
  public static parseIsoDuration(durationStr?: string): number {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Formats seconds into human-readable duration (e.g. 2700s -> "45:00", "45 min").
   */
  public static formatDuration(seconds: number): { formatted: string; human: string } {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      const formatted = `${hours}:${remainingMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      const human = `${hours} hr ${remainingMins} min`;
      return { formatted, human };
    }

    const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    const human = `${mins} min`;
    return { formatted, human };
  }

  /**
   * Uploads a recorded lecture video buffer directly to the authenticated TopVeda YouTube channel.
   */
  public static async uploadVideo(
    options: UploadYouTubeVideoOptions,
    dbClient?: SupabaseClient
  ): Promise<UploadedYouTubeVideoResult> {
    if (!options.title?.trim()) {
      throw new YouTubeOAuthError("Video title is required for YouTube upload.", 400, "INVALID_TITLE");
    }

    if (!options.videoBuffer || options.videoBuffer.length === 0) {
      throw new YouTubeOAuthError("Video file buffer is empty or missing.", 400, "EMPTY_BUFFER");
    }

    const accessToken = await YouTubeLiveService.getValidAccessToken(dbClient);
    const mimeType = options.mimeType || "video/mp4";
    const fileSize = options.videoBuffer.length;

    // 1. Prepare video metadata
    const metadata = {
      snippet: {
        title: options.title.trim(),
        description:
          options.description?.trim() ||
          `TopVeda Recorded Lecture: ${options.title.trim()}\nTopVeda Academic Learning Platform`,
        tags: options.tags || ["TopVeda", "Education", "Lecture", "Learning"],
        categoryId: options.categoryId || "27", // 27 = Education
      },
      status: {
        privacyStatus: options.privacyStatus || "unlisted",
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    };

    // 2. Initiate Resumable Upload Session
    let initResponse: Response;
    try {
      initResponse = await fetch(this.YOUTUBE_UPLOAD_INIT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(fileSize),
          Accept: "application/json",
        },
        body: JSON.stringify(metadata),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      throw new YouTubeOAuthError(`Network failure initiating YouTube video upload: ${msg}`, 503, "NETWORK_ERROR");
    }

    if (!initResponse.ok) {
      let errorMsg = `HTTP ${initResponse.status}`;
      try {
        const errJson = await initResponse.json();
        if (errJson.error?.message) errorMsg = errJson.error.message;
      } catch {
        // Fallback to HTTP status
      }
      throw new YouTubeOAuthError(`Failed to initiate YouTube video upload session: ${errorMsg}`, initResponse.status, "UPLOAD_INIT_FAILED");
    }

    const uploadLocation = initResponse.headers.get("Location") || initResponse.headers.get("location");
    if (!uploadLocation) {
      throw new YouTubeOAuthError("YouTube API did not return a resumable upload location URI.", 502, "MISSING_UPLOAD_URI");
    }

    // 3. Upload Video Binary Data to the Resumable Location
    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(uploadLocation, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(fileSize),
        },
        body: new Uint8Array(options.videoBuffer),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      throw new YouTubeOAuthError(`Network failure uploading video binary to YouTube: ${msg}`, 503, "UPLOAD_TRANSFER_FAILED");
    }

    if (!uploadResponse.ok) {
      let errorMsg = `HTTP ${uploadResponse.status}`;
      try {
        const errJson = await uploadResponse.json();
        if (errJson.error?.message) errorMsg = errJson.error.message;
      } catch {
        // Fallback
      }
      throw new YouTubeOAuthError(`YouTube video binary upload failed: ${errorMsg}`, uploadResponse.status, "UPLOAD_FAILED");
    }

    let resultJson: { id: string; snippet?: { title?: string; description?: string }; status?: { privacyStatus?: string; uploadStatus?: string } };
    try {
      resultJson = await uploadResponse.json();
    } catch {
      throw new YouTubeOAuthError("Failed to parse YouTube upload response.", 500, "MALFORMED_RESPONSE");
    }

    if (!resultJson.id) {
      throw new YouTubeOAuthError("YouTube upload succeeded but did not return a Video ID.", 502, "MISSING_VIDEO_ID");
    }

    const videoId = resultJson.id;
    const embedPlaybackUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      videoId,
      title: resultJson.snippet?.title || options.title,
      description: resultJson.snippet?.description || options.description,
      privacyStatus: resultJson.status?.privacyStatus || "unlisted",
      uploadStatus: resultJson.status?.uploadStatus || "uploaded",
      embedPlaybackUrl,
      watchUrl,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Queries YouTube Data API v3 for the video processing and encoding status.
   */
  public static async getVideoProcessingStatus(
    videoId: string,
    dbClient?: SupabaseClient
  ): Promise<YouTubeVideoProcessingStatus> {
    if (!videoId?.trim()) {
      throw new YouTubeOAuthError("Video ID is required to query processing status.", 400, "INVALID_ID");
    }

    const accessToken = await YouTubeLiveService.getValidAccessToken(dbClient);
    const url = `${this.YOUTUBE_VIDEOS_ENDPOINT}?id=${encodeURIComponent(videoId.trim())}&part=snippet,status,contentDetails,processingDetails`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      throw new YouTubeOAuthError(`Network failure fetching video status: ${msg}`, 503, "NETWORK_ERROR");
    }

    if (!response.ok) {
      throw new YouTubeOAuthError(`YouTube API returned HTTP ${response.status} querying video status.`, response.status, "API_ERROR");
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return {
        videoId,
        uploadStatus: "not_found",
        isProcessed: false,
        embedPlaybackUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      };
    }

    const item = data.items[0];
    const uploadStatus = item.status?.uploadStatus || "uploaded";
    const processingStatus = item.processingDetails?.processingStatus || (uploadStatus === "processed" ? "succeeded" : "processing");
    const durationIso = item.contentDetails?.duration;
    const durationSeconds = this.parseIsoDuration(durationIso);
    const { formatted: durationFormatted, human: durationHuman } = this.formatDuration(durationSeconds);

    const isProcessed = uploadStatus === "processed" || processingStatus === "succeeded";

    return {
      videoId,
      uploadStatus,
      processingStatus,
      durationSeconds,
      durationFormatted,
      durationHuman,
      isProcessed,
      embedPlaybackUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }
}
