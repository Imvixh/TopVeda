/**
 * TopVeda Phase 6A: YouTube OAuth & Integration Types
 * Defines server-authoritative interfaces for Google OAuth 2.0 flow,
 * YouTube Data API channel retrieval, encrypted token persistence,
 * and YouTube connection status monitoring.
 */

export interface YouTubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey?: string;
}

export interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleOAuthErrorResponse {
  error: string;
  error_description?: string;
}

export interface YouTubeChannelThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt?: string;
  thumbnails?: {
    default?: YouTubeChannelThumbnail;
    medium?: YouTubeChannelThumbnail;
    high?: YouTubeChannelThumbnail;
  };
}

export interface YouTubeChannelItem {
  id: string;
  snippet?: YouTubeChannelSnippet;
}

export interface YouTubeChannelsApiResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeChannelItem[];
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnailUrl?: string;
}

export type YouTubeBroadcastTransition = "testing" | "live" | "complete";

export interface CreateYouTubeBroadcastOptions {
  title: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  enableAutoStart?: boolean;
  enableAutoStop?: boolean;
  latencyPreference?: "normal" | "low" | "ultraLow";
}

export interface CreateYouTubeStreamOptions {
  title: string;
  frameRate?: "30fps" | "60fps" | "variable";
  resolution?: "720p" | "1080p" | "1440p" | "2160p" | "variable";
  isReusable?: boolean;
}

export interface YouTubeLiveBroadcast {
  id: string;
  snippet?: {
    title: string;
    description: string;
    scheduledStartTime: string;
    scheduledEndTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
    liveChatId?: string;
    thumbnails?: {
      default?: YouTubeChannelThumbnail;
      medium?: YouTubeChannelThumbnail;
      high?: YouTubeChannelThumbnail;
    };
  };
  status?: {
    lifeCycleStatus: "created" | "ready" | "testing" | "live" | "complete" | "revoked";
    privacyStatus: "public" | "unlisted" | "private";
    recordingStatus?: "notRecording" | "recording" | "recorded";
  };
  contentDetails?: {
    boundStreamId?: string;
    monitorStream?: {
      enableMonitorStream?: boolean;
      embedHtml?: string;
    };
    enableEmbed?: boolean;
    enableDvr?: boolean;
    enableAutoStart?: boolean;
    enableAutoStop?: boolean;
  };
}

export interface YouTubeLiveStream {
  id: string;
  snippet?: {
    title: string;
    description?: string;
  };
  cdn?: {
    ingestionType: "rtmp";
    ingestionInfo?: {
      streamName: string; // Stream key
      ingestionAddress: string; // Primary RTMP URL
      backupIngestionAddress?: string;
      rtmpsIngestionAddress?: string;
    };
    resolution?: string;
    frameRate?: string;
  };
  status?: {
    streamStatus: "active" | "created" | "error" | "inactive" | "ready";
  };
}

export interface YouTubeConnectionStatus {
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  channelThumbnailUrl?: string;
  connectedAt?: string;
  updatedAt?: string;
  error?: string;
}

export interface PlatformIntegrationRecord {
  id: string;
  provider: "youtube" | "cloudflare" | string;
  connection_status: "CONNECTED" | "DISCONNECTED" | "REVOKED" | "ERROR";
  channel_id: string | null;
  channel_title: string | null;
  channel_thumbnail_url: string | null;
  encrypted_refresh_token: string;
  token_metadata: Record<string, unknown>;
  connected_by: string | null;
  connected_at: string;
  updated_at: string;
}

export interface UploadYouTubeVideoOptions {
  title: string;
  description?: string;
  videoBuffer: Buffer;
  mimeType?: string;
  fileName?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  tags?: string[];
  categoryId?: string;
}

export interface UploadedYouTubeVideoResult {
  videoId: string;
  title: string;
  description?: string;
  privacyStatus: string;
  uploadStatus: string;
  embedPlaybackUrl: string;
  watchUrl: string;
  uploadedAt: string;
}

export interface YouTubeVideoProcessingStatus {
  videoId: string;
  uploadStatus: string;
  processingStatus?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  durationHuman?: string;
  isProcessed: boolean;
  embedPlaybackUrl: string;
}
