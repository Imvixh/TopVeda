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

  /**
   * Retrieves all currently active broadcasts on the connected YouTube channel.
   * Endpoint: GET /youtube/v3/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=active&mine=true
   */
  public static async getActiveBroadcasts(
    client?: SupabaseClient
  ): Promise<YouTubeLiveBroadcast[]> {
    try {
      const accessToken = await this.getValidAccessToken(client);
      const url = `${this.YOUTUBE_API_BASE}/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=active&mine=true&maxResults=25`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || data.error || !data.items) {
        return [];
      }

      return data.items as YouTubeLiveBroadcast[];
    } catch {
      return [];
    }
  }

  /**
   * Deterministically matches an active YouTube broadcast to a specific TopVeda Live Class.
   * 
   * MATCHING LOGIC (Anti-Collision & Ambiguity Protection):
   * 1. Only considers broadcasts with lifeCycleStatus === 'live'.
   * 2. If no active broadcasts -> returns null.
   * 3. Calculates match score for each active broadcast:
   *    - Title similarity: exact (100), substring (75), token overlap (up to 50).
   *    - Time proximity: within 15m (50), within 30m (35), within 60m (20), within 120m (10).
   * 4. Single-stream safety: If 1 stream is live, requires either title relevance (>=20) OR start within 30m of scheduled time. Unrelated stale streams from hours ago are rejected.
   * 5. Multi-stream ambiguity guard: Requires score >= 50 and at least a 20-point lead over runner-up.
   * 6. Ties/ambiguities return null (refuses to guess).
   */
  public static async matchActiveBroadcast(params: {
    topic: string;
    scheduledStart: string;
    currentBroadcastId?: string | null;
    client?: SupabaseClient;
  }): Promise<YouTubeLiveBroadcast | null> {
    const activeBroadcasts = await this.getActiveBroadcasts(params.client);
    if (!activeBroadcasts || activeBroadcasts.length === 0) {
      return null;
    }

    const liveItems = activeBroadcasts.filter(
      (b) => b.status?.lifeCycleStatus === "live"
    );
    if (liveItems.length === 0) {
      return null;
    }

    // 1. Idempotency: If currentBroadcastId is already among the active live broadcasts, return it directly
    if (params.currentBroadcastId) {
      const existing = liveItems.find((b) => b.id === params.currentBroadcastId);
      if (existing) {
        return existing;
      }
    }

    const scheduledStartMs = new Date(params.scheduledStart).getTime();
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
    const targetTopicNorm = normalize(params.topic);
    const targetTokens = new Set(targetTopicNorm.split(/\s+/).filter(Boolean));

    let bestMatch: YouTubeLiveBroadcast | null = null;
    let highestScore = 0;
    let secondHighestScore = 0;

    for (const item of liveItems) {
      let score = 0;
      let titleScore = 0;
      let timeScore = 0;

      const title = item.snippet?.title || "";
      const titleNorm = normalize(title);

      // A. Title Scoring
      if (titleNorm && targetTopicNorm) {
        if (titleNorm === targetTopicNorm) {
          titleScore = 100;
        } else if (titleNorm.includes(targetTopicNorm) || targetTopicNorm.includes(titleNorm)) {
          titleScore = 75;
        } else {
          const itemTokens = titleNorm.split(/\s+/).filter(Boolean);
          let commonCount = 0;
          for (const token of itemTokens) {
            if (targetTokens.has(token)) commonCount++;
          }
          if (commonCount > 0) {
            titleScore = Math.min(50, commonCount * 20);
          }
        }
      }

      // B. Time Proximity Scoring (to class scheduled start)
      const actualStart = item.snippet?.actualStartTime || item.snippet?.publishedAt || item.snippet?.scheduledStartTime;
      let diffMinutes = 999;
      if (actualStart) {
        const actualStartMs = new Date(actualStart).getTime();
        diffMinutes = Math.abs(actualStartMs - scheduledStartMs) / (60 * 1000);
        if (diffMinutes <= 15) {
          timeScore = 50;
        } else if (diffMinutes <= 30) {
          timeScore = 35;
        } else if (diffMinutes <= 60) {
          timeScore = 20;
        } else if (diffMinutes <= 120) {
          timeScore = 10;
        }
      }

      score = titleScore + timeScore;

      // C. Safe Single-Stream Verification:
      // If only 1 broadcast is live on the channel:
      // Must EITHER have title relevance (titleScore >= 20) OR start within the tight class prep/start window (diffMinutes <= 30)
      if (liveItems.length === 1) {
        if (titleScore >= 20 || diffMinutes <= 30) {
          score += 30;
        } else {
          // Unrelated stream left running from hours ago with zero title match: reject
          score = 0;
        }
      }

      if (score > highestScore) {
        secondHighestScore = highestScore;
        highestScore = score;
        bestMatch = item;
      } else if (score > secondHighestScore) {
        secondHighestScore = score;
      }
    }

    // D. Anti-Collision & Ambiguity Guard:
    // 1. Strict minimum confidence threshold of 50 points
    // 2. If multiple candidates exist, highest score must be distinctly higher than runner-up (margin >= 20)
    // 3. If ambiguous tie occurs, reject binding to prevent incorrect stream display
    if (liveItems.length > 1 && (highestScore - secondHighestScore < 20)) {
      return null;
    }

    if (highestScore >= 50 && bestMatch) {
      return bestMatch;
    }

    return null;
  }
}
