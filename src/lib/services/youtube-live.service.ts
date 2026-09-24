/**
 * TopVeda Phase 6 Loop 1: YouTube Live Streaming Service
 * Implements server-authoritative live broadcast creation, stream ingest provisioning,
 * broadcast-to-stream binding, lifecycle transitions (testing -> live -> complete),
 * and live embed/stream key management via YouTube Live Streaming API v3.
 * 
 * SECURITY RULES:
 * 1. Stream keys and RTMP ingest URLs are server-only secrets (never exposed to students).
 * 2. TopVeda authentication and enrollment control access to the embedded player. YouTube Unlisted reduces public discoverability but cannot prevent sharing of a discovered URL.
 * 3. YouTube OAuth access tokens are refreshed on-demand from encrypted database refresh tokens.
 */

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { YouTubeOAuthService, YouTubeOAuthError } from "./youtube-oauth.service";
import {
  YouTubeLiveBroadcast,
  YouTubeLiveStream,
  CreateYouTubeBroadcastOptions,
  CreateYouTubeStreamOptions,
  YouTubeBroadcastTransition,
} from "@/types/youtube.types";

export class YouTubeLiveService {
  private static readonly YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

  /**
   * Resolves the appropriate database client.
   */
  private static async getDbClient(client?: SupabaseClient): Promise<SupabaseClient> {
    if (client) {
      return client;
    }
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (serviceRoleKey && !serviceRoleKey.includes("placeholder") && !serviceRoleKey.includes("your-")) {
      return createAdminClient();
    }
    try {
      return await createClient();
    } catch {
      return createAdminClient();
    }
  }

  /**
   * Resolves a fresh, valid Google OAuth access token using the stored encrypted refresh token.
   */
  public static async getValidAccessToken(client?: SupabaseClient): Promise<string> {
    const supabase = await this.getDbClient(client);
    const { data: integration, error } = await supabase
      .from("cms_platform_integrations")
      .select("encrypted_refresh_token, connection_status")
      .eq("provider", "youtube")
      .maybeSingle();

    if (error || !integration || integration.connection_status !== "CONNECTED") {
      throw new YouTubeOAuthError(
        "YouTube platform integration is not connected. Super Admin must connect YouTube in CMS Integrations.",
        400,
        "YOUTUBE_NOT_CONNECTED"
      );
    }

    if (!integration.encrypted_refresh_token) {
      throw new YouTubeOAuthError(
        "Corrupted YouTube connection record: missing encrypted refresh token.",
        500,
        "INVALID_TOKEN_RECORD"
      );
    }

    const { accessToken } = await YouTubeOAuthService.refreshAccessToken(
      integration.encrypted_refresh_token
    );

    return accessToken;
  }

  /**
   * Creates a new YouTube Live Broadcast.
   * Endpoint: POST /youtube/v3/liveBroadcasts?part=snippet,status,contentDetails
   */
  public static async createLiveBroadcast(
    options: CreateYouTubeBroadcastOptions,
    client?: SupabaseClient
  ): Promise<YouTubeLiveBroadcast> {
    const accessToken = await this.getValidAccessToken(client);

    const payload = {
      snippet: {
        title: options.title,
        description: options.description || "TopVeda Live Interactive Classroom Session",
        scheduledStartTime: options.scheduledStartTime || new Date().toISOString(),
        scheduledEndTime: options.scheduledEndTime || undefined,
      },
      status: {
        privacyStatus: options.privacyStatus || "unlisted",
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: options.enableAutoStart ?? true,
        enableAutoStop: options.enableAutoStop ?? true,
        enableDvr: true,
        enableContentEncryption: false,
        enableEmbed: true,
        recordFromStart: true,
        startWithSlate: false,
        closedCaptionsType: "closedCaptionsDisabled",
        latencyPreference: options.latencyPreference || "ultraLow",
      },
    };

    const url = `${this.YOUTUBE_API_BASE}/liveBroadcasts?part=snippet,status,contentDetails`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || `HTTP ${res.status}`;
      throw new YouTubeOAuthError(
        `Failed to create YouTube Live Broadcast: ${errorMsg}`,
        res.status,
        data.error?.errors?.[0]?.reason || "BROADCAST_CREATE_FAILED"
      );
    }

    return data as YouTubeLiveBroadcast;
  }

  /**
   * Creates a new YouTube Live Ingest Stream (RTMP).
   * Endpoint: POST /youtube/v3/liveStreams?part=snippet,cdn,contentDetails
   */
  public static async createLiveStream(
    options: CreateYouTubeStreamOptions,
    client?: SupabaseClient
  ): Promise<YouTubeLiveStream> {
    const accessToken = await this.getValidAccessToken(client);

    const payload = {
      snippet: {
        title: `${options.title} (TopVeda Ingest Stream)`,
      },
      cdn: {
        frameRate: options.frameRate || "variable",
        ingestionType: "rtmp",
        resolution: options.resolution || "variable",
      },
      contentDetails: {
        isReusable: options.isReusable ?? false,
      },
    };

    const url = `${this.YOUTUBE_API_BASE}/liveStreams?part=snippet,cdn,contentDetails`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || `HTTP ${res.status}`;
      throw new YouTubeOAuthError(
        `Failed to create YouTube Live Stream: ${errorMsg}`,
        res.status,
        data.error?.errors?.[0]?.reason || "STREAM_CREATE_FAILED"
      );
    }

    return data as YouTubeLiveStream;
  }

  /**
   * Binds a YouTube Live Broadcast to an Ingest Stream.
   * Endpoint: POST /youtube/v3/liveBroadcasts/bind?id={broadcastId}&streamId={streamId}&part=id,snippet,contentDetails,status
   */
  public static async bindBroadcastToStream(
    broadcastId: string,
    streamId: string,
    client?: SupabaseClient
  ): Promise<YouTubeLiveBroadcast> {
    const accessToken = await this.getValidAccessToken(client);

    const url = `${this.YOUTUBE_API_BASE}/liveBroadcasts/bind?id=${encodeURIComponent(broadcastId)}&streamId=${encodeURIComponent(streamId)}&part=id,snippet,contentDetails,status`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || `HTTP ${res.status}`;
      throw new YouTubeOAuthError(
        `Failed to bind YouTube broadcast to stream: ${errorMsg}`,
        res.status,
        data.error?.errors?.[0]?.reason || "BIND_FAILED"
      );
    }

    return data as YouTubeLiveBroadcast;
  }

  /**
   * Transitions a Live Broadcast status (e.g. testing, live, complete).
   * Endpoint: POST /youtube/v3/liveBroadcasts/transition?id={broadcastId}&broadcastStatus={status}&part=id,status
   */
  public static async transitionBroadcast(
    broadcastId: string,
    broadcastStatus: YouTubeBroadcastTransition,
    client?: SupabaseClient
  ): Promise<YouTubeLiveBroadcast> {
    const accessToken = await this.getValidAccessToken(client);

    const url = `${this.YOUTUBE_API_BASE}/liveBroadcasts/transition?id=${encodeURIComponent(broadcastId)}&broadcastStatus=${encodeURIComponent(broadcastStatus)}&part=id,status`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || `HTTP ${res.status}`;
      throw new YouTubeOAuthError(
        `Failed to transition YouTube broadcast to "${broadcastStatus}": ${errorMsg}`,
        res.status,
        data.error?.errors?.[0]?.reason || "TRANSITION_FAILED"
      );
    }

    return data as YouTubeLiveBroadcast;
  }

  /**
   * Retrieves a Live Broadcast by its ID.
   */
  public static async getBroadcast(
    broadcastId: string,
    client?: SupabaseClient
  ): Promise<YouTubeLiveBroadcast | null> {
    const accessToken = await this.getValidAccessToken(client);

    const url = `${this.YOUTUBE_API_BASE}/liveBroadcasts?id=${encodeURIComponent(broadcastId)}&part=id,snippet,status,contentDetails`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error || !data.items || data.items.length === 0) {
      return null;
    }

    return data.items[0] as YouTubeLiveBroadcast;
  }

  /**
   * Retrieves an Ingest Stream by its ID.
   */
  public static async getStream(
    streamId: string,
    client?: SupabaseClient
  ): Promise<YouTubeLiveStream | null> {
    const accessToken = await this.getValidAccessToken(client);

    const url = `${this.YOUTUBE_API_BASE}/liveStreams?id=${encodeURIComponent(streamId)}&part=id,snippet,cdn,status`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error || !data.items || data.items.length === 0) {
      return null;
    }

    return data.items[0] as YouTubeLiveStream;
  }
}
