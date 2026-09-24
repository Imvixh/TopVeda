/**
 * TopVeda Phase 6A: YouTube Data API & Platform Integration Service
 * Implements server-side channel verification via YouTube Data API v3
 * and persistent storage of YouTube connection records.
 * 
 * SECURITY RULES:
 * 1. Refresh tokens are strictly stored encrypted and never returned in status responses.
 * 2. Channel lookups use verified server-side YouTube Data API responses.
 */

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  YouTubeChannelInfo,
  YouTubeChannelsApiResponse,
  YouTubeConnectionStatus,
  PlatformIntegrationRecord,
} from "@/types/youtube.types";
import { YouTubeOAuthError } from "./youtube-oauth.service";

export class YouTubeService {
  private static readonly YOUTUBE_CHANNELS_ENDPOINT =
    "https://www.googleapis.com/youtube/v3/channels";

  /**
   * Resolves the appropriate database client (passed client, service-role admin client, or authenticated server client).
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
   * Fetches channel details for the authenticated Google account using YouTube Data API v3.
   * Endpoint: GET /youtube/v3/channels?part=snippet,contentDetails&mine=true
   */
  public static async getAuthenticatedChannel(
    accessToken: string
  ): Promise<YouTubeChannelInfo> {
    if (!accessToken?.trim()) {
      throw new YouTubeOAuthError("Missing access token for YouTube channel lookup.", 400, "MISSING_TOKEN");
    }

    const url = `${this.YOUTUBE_CHANNELS_ENDPOINT}?part=snippet,contentDetails&mine=true`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network failure";
      throw new YouTubeOAuthError(`Network error querying YouTube Data API: ${msg}`, 503, "NETWORK_ERROR");
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {
        // Fallback to HTTP status
      }

      if (response.status === 401 || response.status === 403) {
        throw new YouTubeOAuthError(`YouTube Data API authorization failed: ${errorMsg}`, response.status, "API_FORBIDDEN");
      }
      throw new YouTubeOAuthError(`YouTube Data API request failed: ${errorMsg}`, response.status, "API_ERROR");
    }

    let data: YouTubeChannelsApiResponse;
    try {
      data = await response.json();
    } catch {
      throw new YouTubeOAuthError("Failed to parse YouTube channels response.", 500, "MALFORMED_RESPONSE");
    }

    if (!data.items || data.items.length === 0) {
      throw new YouTubeOAuthError(
        "No YouTube channel found for the authenticated Google account. Please create a channel on YouTube and try again.",
        404,
        "NO_CHANNEL_FOUND"
      );
    }

    const channelItem = data.items[0];
    const snippet = channelItem.snippet;

    const thumbnailUrl =
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url;

    return {
      id: channelItem.id,
      title: snippet?.title || "Untitled Channel",
      description: snippet?.description,
      customUrl: snippet?.customUrl,
      thumbnailUrl,
    };
  }

  /**
   * Retrieves the current YouTube platform connection status from the database.
   * Safe for admin UI: never returns encrypted tokens or sensitive keys.
   */
  public static async getConnectionStatus(client?: SupabaseClient): Promise<YouTubeConnectionStatus> {
    try {
      const supabase = await this.getDbClient(client);
      const { data, error } = await supabase
        .from("cms_platform_integrations")
        .select("id, provider, connection_status, channel_id, channel_title, channel_thumbnail_url, connected_at, updated_at")
        .eq("provider", "youtube")
        .maybeSingle();

      if (error) {
        // If table does not exist or error occurs, return safe disconnected status
        return {
          connected: false,
          error: error.message,
        };
      }

      if (!data || data.connection_status !== "CONNECTED") {
        return {
          connected: false,
        };
      }

      return {
        connected: true,
        channelId: data.channel_id || undefined,
        channelTitle: data.channel_title || undefined,
        channelThumbnailUrl: data.channel_thumbnail_url || undefined,
        connectedAt: data.connected_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Database error";
      return {
        connected: false,
        error: msg,
      };
    }
  }

  /**
   * Persists a verified YouTube OAuth connection record to the database.
   */
  public static async saveConnection(params: {
    channelId: string;
    channelTitle: string;
    channelThumbnailUrl?: string;
    encryptedRefreshToken: string;
    tokenMetadata?: Record<string, unknown>;
    connectedBy?: string;
    client?: SupabaseClient;
  }): Promise<PlatformIntegrationRecord> {
    const supabase = await this.getDbClient(params.client);
    const now = new Date().toISOString();

    const payload = {
      provider: "youtube",
      connection_status: "CONNECTED",
      channel_id: params.channelId,
      channel_title: params.channelTitle,
      channel_thumbnail_url: params.channelThumbnailUrl || null,
      encrypted_refresh_token: params.encryptedRefreshToken,
      token_metadata: params.tokenMetadata || {},
      connected_by: params.connectedBy || null,
      connected_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("cms_platform_integrations")
      .upsert(payload, { onConflict: "provider" })
      .select()
      .single();

    if (error) {
      throw new YouTubeOAuthError(`Failed to persist YouTube integration: ${error.message}`, 500, "DB_PERSISTENCE_ERROR");
    }

    return data as PlatformIntegrationRecord;
  }

  /**
   * Disconnects the active YouTube platform integration.
   */
  public static async disconnect(client?: SupabaseClient): Promise<boolean> {
    const supabase = await this.getDbClient(client);
    const { error } = await supabase
      .from("cms_platform_integrations")
      .update({
        connection_status: "DISCONNECTED",
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "youtube");

    if (error) {
      throw new YouTubeOAuthError(`Failed to disconnect YouTube integration: ${error.message}`, 500, "DB_ERROR");
    }

    return true;
  }
}
