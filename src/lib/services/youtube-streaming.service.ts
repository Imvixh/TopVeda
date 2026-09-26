/**
 * TopVeda Phase 6 Loop 1: YouTube Streaming Provider Implementation
 * Implements IStreamingProvider abstraction for YouTube live broadcasting.
 * Connects directly to YouTubeLiveService to provision real broadcasts,
 * RTMP ingest streams, and lifecycle transitions.
 */

import {
  IStreamingProvider,
  CreateSessionDTO,
  JoinSessionDTO,
  StreamingSessionResult,
  SessionStatusResult,
} from "@/types/streaming.types";
import { YouTubeService } from "./youtube.service";
import { YouTubeLiveService } from "./youtube-live.service";

export class YouTubeStreamingProvider implements IStreamingProvider {
  public readonly providerName = "youtube";

  async createSession(params: CreateSessionDTO): Promise<StreamingSessionResult> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const roomUrl = `${baseUrl}/student/live/${params.liveClassId}`;

    const connection = await YouTubeService.getConnectionStatus(params.client);

    // 1. Configured & Connected: Create real YouTube Live resources
    if (connection.connected) {
      try {
        // Step A: Create Live Broadcast (TopVeda authentication and enrollment control access to the embedded player; YouTube Unlisted reduces public discoverability)
        const broadcast = await YouTubeLiveService.createLiveBroadcast({
          title: params.topic,
          description: `TopVeda Live Class: ${params.topic}\nEducator: ${params.educatorName}`,
          scheduledStartTime: params.scheduledStart,
          scheduledEndTime: params.scheduledEnd || undefined,
          privacyStatus: "unlisted",
          enableAutoStart: true,
          enableAutoStop: true,
          latencyPreference: "ultraLow",
        }, params.client);

        // Step B: Create Ingest Stream
        const stream = await YouTubeLiveService.createLiveStream({
          title: `${params.topic} (${params.liveClassId.slice(0, 8)})`,
          frameRate: "variable",
          resolution: "variable",
        }, params.client);

        // Step C: Bind Broadcast to Stream
        await YouTubeLiveService.bindBroadcastToStream(broadcast.id, stream.id, params.client);

        const streamKey = stream.cdn?.ingestionInfo?.streamName;
        const rtmpUrl = stream.cdn?.ingestionInfo?.ingestionAddress;
        const rtmpsUrl = stream.cdn?.ingestionInfo?.rtmpsIngestionAddress || rtmpUrl;
        const embedPlaybackUrl = `https://www.youtube-nocookie.com/embed/${broadcast.id}`;
        const studioPublishUrl = "https://www.youtube.com/webcam";

        return {
          provider: this.providerName,
          sessionId: broadcast.id, // Real YouTube Broadcast Video ID
          streamRoomUrl: studioPublishUrl || roomUrl,
          internalStreamKey: streamKey,
          rtmpsUrl,
          webRtcPlaybackUrl: embedPlaybackUrl,
          webRtcPublishUrl: studioPublishUrl,
        };
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw err;
        }
        console.warn(
          `[DEV WARNING] Failed to create live YouTube broadcast: ${err instanceof Error ? err.message : String(err)}. Falling back to local simulated session.`
        );
      }
    }

    // 2. Production Guard: Never silently fake sessions in production without connected YouTube
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "YouTube integration is not connected in production. Super Admin must connect YouTube in CMS Integrations before scheduling live classes."
      );
    }

    // 3. Development Fallback (simulated session)
    return {
      provider: this.providerName,
      sessionId: `dev_yt_${params.liveClassId.slice(0, 8)}_${Date.now()}`,
      streamRoomUrl: roomUrl,
      internalStreamKey: `dev_stream_key_${Math.random().toString(36).substring(7)}`,
      webRtcPlaybackUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    };
  }

  async getJoinUrl(params: JoinSessionDTO): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (params.userRole === "ADMIN" || params.userRole === "SUPER_ADMIN") {
      if (params.sessionId && !params.sessionId.startsWith("dev_yt_")) {
        return "https://www.youtube.com/webcam";
      }
    }
    return `${baseUrl}/student/live/${params.liveClassId}?role=${params.userRole.toLowerCase()}&session=${params.sessionId}`;
  }

  async startSession(sessionId: string): Promise<{ success: boolean; startedAt: string }> {
    const now = new Date().toISOString();

    if (!sessionId.startsWith("dev_yt_")) {
      try {
        await YouTubeLiveService.transitionBroadcast(sessionId, "live");
      } catch {
        // If auto-start is enabled or transition already occurred, ignore and proceed
      }
    }

    return {
      success: true,
      startedAt: now,
    };
  }

  async endSession(sessionId: string): Promise<{ success: boolean; endedAt: string; recordingId?: string }> {
    const now = new Date().toISOString();

    if (!sessionId.startsWith("dev_yt_")) {
      try {
        await YouTubeLiveService.transitionBroadcast(sessionId, "complete");
      } catch {
        // If auto-stop is enabled or broadcast completed, ignore and proceed
      }
    }

    // On YouTube, the broadcast video ID becomes the permanent recording ID
    return {
      success: true,
      endedAt: now,
      recordingId: sessionId,
    };
  }

  async terminateSession(sessionId: string, reason: string): Promise<{ success: boolean; terminatedAt: string }> {
    const now = new Date().toISOString();

    if (!sessionId.startsWith("dev_yt_")) {
      try {
        await YouTubeLiveService.transitionBroadcast(sessionId, "complete");
      } catch {
        // Fallback gracefully
      }
    }

    return {
      success: true,
      terminatedAt: now,
    };
  }

  async getStatus(sessionId: string): Promise<SessionStatusResult> {
    if (!sessionId.startsWith("dev_yt_")) {
      try {
        const broadcast = await YouTubeLiveService.getBroadcast(sessionId);
        if (broadcast) {
          const lifeCycle = broadcast.status?.lifeCycleStatus;
          let mappedStatus: "SCHEDULED" | "LIVE" | "COMPLETED" | "TERMINATED" | "CANCELLED" = "SCHEDULED";

          if (lifeCycle === "live") {
            mappedStatus = "LIVE";
          } else if (lifeCycle === "complete") {
            mappedStatus = "COMPLETED";
          } else if (lifeCycle === "revoked") {
            mappedStatus = "TERMINATED";
          }

          return {
            sessionId,
            status: mappedStatus,
            viewerCount: 0,
            durationSeconds: 0,
            recordingStatus: lifeCycle === "complete" ? "READY" : "NONE",
            recordingUrl: `https://www.youtube.com/watch?v=${sessionId}`,
          };
        }
      } catch {
        // Fall back gracefully to scheduled state
      }
    }

    return {
      sessionId,
      status: "SCHEDULED",
      viewerCount: 0,
      durationSeconds: 0,
      recordingStatus: "NONE",
      recordingUrl: null,
    };
  }

  async getRecordingDownloadUrl(recordingId: string, userRole: string): Promise<string | null> {
    // YouTube recordings are streamed via YouTube player; downloads are restricted to Super Admin
    if (userRole !== "SUPER_ADMIN") {
      return null;
    }
    return `https://www.youtube.com/watch?v=${recordingId}`;
  }
}
