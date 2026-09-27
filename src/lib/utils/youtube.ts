/**
 * TopVeda YouTube Utility Helpers
 * Robust extraction of 11-character YouTube video IDs and construction of safe,
 * privacy-enhanced embed URLs (youtube-nocookie.com) for Super Admin Review and Student Playback.
 */

/**
 * Extracts a valid 11-character YouTube Video ID from any input:
 * - Direct 11-character ID (e.g. "8QKkL4phbKk")
 * - Watch URL (e.g. "https://www.youtube.com/watch?v=8QKkL4phbKk")
 * - Embed URL (e.g. "https://www.youtube.com/embed/8QKkL4phbKk" or "https://www.youtube-nocookie.com/embed/8QKkL4phbKk")
 * - Short URL (e.g. "https://youtu.be/8QKkL4phbKk")
 * - Live URL (e.g. "https://www.youtube.com/live/8QKkL4phbKk")
 * - Studio URL (e.g. "https://studio.youtube.com/video/8QKkL4phbKk/...")
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct 11-character YouTube ID (alphanumeric, underscore, hyphen)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL patterns
  const patterns = [
    /(?:v=|v\/|embed\/|live\/|video\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return null;
}

/**
 * Resolves the authoritative YouTube Video ID from a lecture record.
 * Checks video_stream_id first, then video_playback_url.
 */
export function resolveLectureVideoId(lecture?: {
  video_stream_id?: string | null;
  video_playback_url?: string | null;
} | null): string | null {
  if (!lecture) return null;

  // 1. Check video_stream_id
  const fromStreamId = extractYouTubeVideoId(lecture.video_stream_id);
  if (fromStreamId) return fromStreamId;

  // 2. Check video_playback_url
  const fromPlaybackUrl = extractYouTubeVideoId(lecture.video_playback_url);
  if (fromPlaybackUrl) return fromPlaybackUrl;

  return null;
}

/**
 * Builds a privacy-enhanced, responsive YouTube Embed URL with standard TopVeda player parameters.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options?: {
    autoplay?: boolean;
    startTimeSeconds?: number;
    controls?: boolean;
  }
): string {
  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (options?.autoplay) params.set("autoplay", "1");
  if (options?.startTimeSeconds && options.startTimeSeconds > 0) {
    params.set("start", Math.floor(options.startTimeSeconds).toString());
  }
  if (options?.controls === false) params.set("controls", "0");

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * Resolves the full Embed Playback URL for a lecture.
 */
export function resolveLectureEmbedUrl(
  lecture?: {
    video_stream_id?: string | null;
    video_playback_url?: string | null;
  } | null,
  options?: {
    autoplay?: boolean;
    startTimeSeconds?: number;
    controls?: boolean;
  }
): string | null {
  const videoId = resolveLectureVideoId(lecture);
  if (!videoId) return null;
  return buildYouTubeEmbedUrl(videoId, options);
}

/**
 * Returns standard YouTube Thumbnail URLs for a given video ID.
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: "maxres" | "hq" | "default" = "maxres"
): string {
  switch (quality) {
    case "maxres":
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case "hq":
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case "default":
    default:
      return `https://img.youtube.com/vi/${videoId}/default.jpg`;
  }
}
