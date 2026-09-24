/**
 * TopVeda Phase 6A: Cloudflare Stream Live Video & Provider Types
 * Defines server-authoritative interfaces for Cloudflare Stream Live Inputs,
 * WebRTC / RTMPS ingest protocols, automatic recording configuration,
 * and the platform streaming provider abstraction.
 */

// ------------------------------------------------------------------------------
// 1. Cloudflare Stream REST API Types
// ------------------------------------------------------------------------------

export interface CloudflareLiveInputRecording {
  mode: "automatic" | "off";
  requireSignedURLs?: boolean;
  timeoutSeconds?: number;
  allowedOrigins?: string[];
}

export interface CloudflareLiveInputRtmps {
  url: string;
  streamKey: string;
}

export interface CloudflareLiveInputSrt {
  url: string;
  streamId: string;
  passphrase?: string;
}

export interface CloudflareLiveInputWebRTC {
  url: string;
}

export interface CloudflareLiveInputWebRTCPlayback {
  url: string;
}

export interface CloudflareLiveInput {
  uid: string;
  rtmps: CloudflareLiveInputRtmps;
  srt?: CloudflareLiveInputSrt;
  webRTC?: CloudflareLiveInputWebRTC;
  webRTCPlayback?: CloudflareLiveInputWebRTCPlayback;
  created?: string;
  modified?: string;
  meta?: Record<string, unknown>;
  status?: "connected" | "disconnected" | "reconnecting" | null;
  recording?: CloudflareLiveInputRecording;
  deleteRecordingAfterDays?: number | null;
}

export interface CloudflareApiError {
  code: number;
  message: string;
}

export interface CloudflareApiResponse<T> {
  result: T;
  success: boolean;
  errors: CloudflareApiError[];
  messages: string[];
}

export interface CloudflareStreamConfig {
  accountId: string;
  apiToken: string;
  customerSubdomain?: string;
}

export interface CreateLiveInputOptions {
  name?: string;
  liveClassId?: string;
  recordingMode?: "automatic" | "off";
  timeoutSeconds?: number;
  requireSignedURLs?: boolean;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}

// ------------------------------------------------------------------------------
// 2. TopVeda Platform Streaming Provider Abstraction
// ------------------------------------------------------------------------------

export interface CreateSessionDTO {
  liveClassId: string;
  topic: string;
  educatorId: string;
  educatorName: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
}

export interface JoinSessionDTO {
  sessionId: string;
  liveClassId: string;
  userId: string;
  userName: string;
  userRole: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
}

export interface StreamingSessionResult {
  provider: "cloudflare_stream" | string;
  sessionId: string; // Real Cloudflare Live Input UID in production
  streamRoomUrl: string;
  // Internal server stream key / credentials (never exposed in public client responses)
  internalStreamKey?: string;
  webRtcPublishUrl?: string;
  webRtcPlaybackUrl?: string;
  rtmpsUrl?: string;
  srtUrl?: string;
}

export interface SessionStatusResult {
  sessionId: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "TERMINATED" | "CANCELLED";
  viewerCount: number;
  durationSeconds: number;
  recordingStatus: "NONE" | "PROCESSING" | "READY" | "FAILED";
  recordingUrl?: string | null;
}

export interface IStreamingProvider {
  createSession(params: CreateSessionDTO): Promise<StreamingSessionResult>;
  getJoinUrl(params: JoinSessionDTO): Promise<string>;
  startSession(sessionId: string): Promise<{ success: boolean; startedAt: string }>;
  endSession(sessionId: string): Promise<{ success: boolean; endedAt: string; recordingId?: string }>;
  terminateSession(sessionId: string, reason: string): Promise<{ success: boolean; terminatedAt: string }>;
  getStatus(sessionId: string): Promise<SessionStatusResult>;
  getRecordingDownloadUrl(recordingId: string, userRole: string): Promise<string | null>;
}
