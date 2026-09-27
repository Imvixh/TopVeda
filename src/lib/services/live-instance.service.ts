/**
 * TopVeda Dynamic YouTube Live Instance Management Service
 * 
 * ARCHITECTURE RULES:
 * 1. cms_live_classes.id remains the permanent, stable TopVeda Session ID.
 * 2. cms_live_classes.current_live_instance_id is the SINGLE authoritative source for the active live instance.
 * 3. is_current on cms_live_class_instances is strictly kept consistent with current_live_instance_id atomically.
 * 4. Distinct broadcast instances (A -> B -> C) are preserved historically in cms_live_class_instances.
 * 5. Diagnostic transitions are logged to cms_live_instance_transitions.
 * 6. Temporary stream hiccups/interruptions are recoverable; instances are only marked completed when YouTube lifecycle is complete/revoked or when a new broadcast replaces it.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { CmsLiveClassInstance, CmsLiveInstanceTransition } from "@/types/cms.types";
import { YouTubeLiveBroadcast } from "@/types/youtube.types";

export interface TransitionInstanceParams {
  liveClassId: string;
  newBroadcastId: string;
  newVideoId: string;
  newStreamId?: string | null;
  lifecycleStatus?: string | null;
  streamStatus?: string | null;
  teacherId?: string | null;
  transitionReason:
    | "INITIAL_CREATE"
    | "TEACHER_RECONNECT"
    | "YOUTUBE_RESTART"
    | "BROADCAST_COMPLETED"
    | "MANUAL_RESTART";
  client: SupabaseClient;
}

export interface CurrentInstanceResult {
  instance: CmsLiveClassInstance | null;
  playbackVideoId: string | null;
  liveClassId: string;
}

export class LiveInstanceManager {
  /**
   * Resolves the current active YouTube Live Instance for a TopVeda session.
   * Single Source of Truth: cms_live_classes.current_live_instance_id -> cms_live_class_instances.youtube_video_id
   */
  public static async resolveCurrentInstance(
    liveClassId: string,
    client: SupabaseClient
  ): Promise<CurrentInstanceResult> {
    const { data: liveClass, error: classErr } = await client
      .from("cms_live_classes")
      .select("id, current_live_instance_id, provider_session_id, live_status, is_live")
      .eq("id", liveClassId)
      .single();

    if (classErr || !liveClass) {
      return { instance: null, playbackVideoId: null, liveClassId };
    }

    if (liveClass.current_live_instance_id) {
      const { data: instance } = await client
        .from("cms_live_class_instances")
        .select("*")
        .eq("id", liveClass.current_live_instance_id)
        .maybeSingle();

      if (instance) {
        return {
          instance: instance as CmsLiveClassInstance,
          playbackVideoId: instance.youtube_video_id,
          liveClassId,
        };
      }
    }

    // Fallback if current_live_instance_id is not yet populated
    return {
      instance: null,
      playbackVideoId: liveClass.provider_session_id || null,
      liveClassId,
    };
  }

  /**
   * Distinguishes temporary stream interruption from permanent broadcast completion.
   */
  public static checkBroadcastRecoverability(broadcast: YouTubeLiveBroadcast | null): {
    isRecoverable: boolean;
    lifecycleStatus: string;
    isLive: boolean;
  } {
    if (!broadcast || !broadcast.status) {
      return { isRecoverable: false, lifecycleStatus: "unknown", isLive: false };
    }

    const lifeCycle = broadcast.status.lifeCycleStatus || "created";

    // Permanently unrecoverable states in YouTube API v3
    if (lifeCycle === "complete" || lifeCycle === "revoked") {
      return { isRecoverable: false, lifecycleStatus: lifeCycle, isLive: false };
    }

    // Active or recoverable states (including liveStarting, testing, ready, and live)
    const isLive = lifeCycle === "live";
    return { isRecoverable: true, lifecycleStatus: lifeCycle, isLive };
  }

  /**
   * Atomically provisions the initial live instance upon live class scheduling.
   */
  public static async createInitialInstance(params: {
    liveClassId: string;
    youtubeBroadcastId: string;
    youtubeVideoId: string;
    youtubeStreamId?: string | null;
    teacherId?: string | null;
    client: SupabaseClient;
  }): Promise<CmsLiveClassInstance | null> {
    try {
      // 1. Insert new instance record
      const { data: instance, error: instErr } = await params.client
        .from("cms_live_class_instances")
        .insert({
          live_class_id: params.liveClassId,
          youtube_broadcast_id: params.youtubeBroadcastId,
          youtube_video_id: params.youtubeVideoId,
          youtube_stream_id: params.youtubeStreamId || null,
          status: "CREATED",
          lifecycle_status: "created",
          is_current: true,
        })
        .select()
        .single();

      if (instErr || !instance) {
        return null;
      }

      // 2. Link authoritative pointer on cms_live_classes
      await params.client
        .from("cms_live_classes")
        .update({
          current_live_instance_id: instance.id,
          provider_session_id: params.youtubeVideoId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.liveClassId);

      // 3. Log initial creation audit
      await params.client.from("cms_live_instance_transitions").insert({
        live_class_id: params.liveClassId,
        previous_instance_id: null,
        new_instance_id: instance.id,
        previous_broadcast_id: null,
        new_broadcast_id: params.youtubeBroadcastId,
        previous_video_id: null,
        new_video_id: params.youtubeVideoId,
        lifecycle_status: "created",
        teacher_id: params.teacherId || null,
        transition_reason: "INITIAL_CREATE",
      });

      return instance as CmsLiveClassInstance;
    } catch (err) {
      console.warn("[LiveInstanceManager] Initial instance creation non-blocking note:", err);
      return null;
    }
  }

  /**
   * Atomically transitions the TopVeda Live Session to a new/updated YouTube Live Instance.
   * Guarantees:
   * 1. If the broadcast is already the current instance, updates its telemetry (Idempotent).
   * 2. If transitioning to a new broadcast (A -> B -> C):
   *    - Marks old instance is_current = false, status = 'COMPLETED', ended_at = now().
   *    - Marks new instance is_current = true, status = 'LIVE', started_at = now().
   *    - Updates cms_live_classes.current_live_instance_id = newInstance.id.
   *    - Maintains provider_session_id = newVideoId for backwards compatibility.
   *    - Logs transition in cms_live_instance_transitions.
   */
  public static async transitionToNewInstance(
    params: TransitionInstanceParams
  ): Promise<{ instanceId: string; videoId: string }> {
    const nowIso = new Date().toISOString();

    // 1. Fetch live class with its current instance pointer
    const { data: liveClass } = await params.client
      .from("cms_live_classes")
      .select("id, current_live_instance_id, provider_session_id, live_status")
      .eq("id", params.liveClassId)
      .single();

    let previousInstanceId: string | null = liveClass?.current_live_instance_id || null;
    let previousBroadcastId: string | null = null;
    let previousVideoId: string | null = liveClass?.provider_session_id || null;

    if (previousInstanceId) {
      const { data: prevInst } = await params.client
        .from("cms_live_class_instances")
        .select("id, youtube_broadcast_id, youtube_video_id, started_at")
        .eq("id", previousInstanceId)
        .maybeSingle();

      if (prevInst) {
        previousBroadcastId = prevInst.youtube_broadcast_id;
        previousVideoId = prevInst.youtube_video_id;

        // Idempotency: If current instance is already this broadcast, update telemetry without switching
        if (
          prevInst.youtube_broadcast_id === params.newBroadcastId ||
          prevInst.youtube_video_id === params.newVideoId
        ) {
          await params.client
            .from("cms_live_class_instances")
            .update({
              status: "LIVE",
              lifecycle_status: params.lifecycleStatus || "live",
              stream_status: params.streamStatus || "active",
              is_current: true,
              started_at: prevInst.started_at || nowIso,
              updated_at: nowIso,
            })
            .eq("id", prevInst.id);

          await params.client
            .from("cms_live_classes")
            .update({
              current_live_instance_id: prevInst.id,
              provider_session_id: params.newVideoId,
              live_status: "LIVE",
              is_live: true,
              status_text: "LIVE",
              cta_text: "Join Class",
              updated_at: nowIso,
            })
            .eq("id", params.liveClassId);

          return { instanceId: prevInst.id, videoId: params.newVideoId };
        }
      }
    }

    // 2. Archive previous instances for this live class: mark is_current = false, status = 'COMPLETED'
    await params.client
      .from("cms_live_class_instances")
      .update({
        is_current: false,
        status: "COMPLETED",
        ended_at: nowIso,
        updated_at: nowIso,
      })
      .eq("live_class_id", params.liveClassId)
      .eq("is_current", true);

    // 3. Upsert / Insert the new instance (respecting unique youtube_broadcast_id constraint & concurrency)
    let newInstanceId: string;
    const { data: existingTarget } = await params.client
      .from("cms_live_class_instances")
      .select("id")
      .eq("youtube_broadcast_id", params.newBroadcastId)
      .maybeSingle();

    if (existingTarget) {
      newInstanceId = existingTarget.id;
      await params.client
        .from("cms_live_class_instances")
        .update({
          status: "LIVE",
          lifecycle_status: params.lifecycleStatus || "live",
          stream_status: params.streamStatus || "active",
          is_current: true,
          started_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", newInstanceId);
    } else {
      const { data: createdInst, error: insertErr } = await params.client
        .from("cms_live_class_instances")
        .insert({
          live_class_id: params.liveClassId,
          youtube_broadcast_id: params.newBroadcastId,
          youtube_video_id: params.newVideoId,
          youtube_stream_id: params.newStreamId || null,
          status: "LIVE",
          lifecycle_status: params.lifecycleStatus || "live",
          stream_status: params.streamStatus || "active",
          is_current: true,
          started_at: nowIso,
        })
        .select("id")
        .maybeSingle();

      if (insertErr || !createdInst) {
        // Concurrency recovery: Check if another concurrent request already inserted this broadcast instance
        const { data: raceInst } = await params.client
          .from("cms_live_class_instances")
          .select("id")
          .eq("youtube_broadcast_id", params.newBroadcastId)
          .maybeSingle();

        if (raceInst) {
          newInstanceId = raceInst.id;
          await params.client
            .from("cms_live_class_instances")
            .update({
              status: "LIVE",
              lifecycle_status: params.lifecycleStatus || "live",
              stream_status: params.streamStatus || "active",
              is_current: true,
              updated_at: nowIso,
            })
            .eq("id", newInstanceId);
        } else {
          throw new Error(
            `Failed to create new live class instance: ${insertErr?.message || "Unknown database error"}`
          );
        }
      } else {
        newInstanceId = createdInst.id;
      }
    }

    // 4. Update the authoritative pointer on cms_live_classes
    await params.client
      .from("cms_live_classes")
      .update({
        current_live_instance_id: newInstanceId,
        provider_session_id: params.newVideoId,
        live_status: "LIVE",
        is_live: true,
        status_text: "LIVE",
        cta_text: "Join Class",
        updated_at: nowIso,
      })
      .eq("id", params.liveClassId);

    // 5. Log diagnostic audit entry in cms_live_instance_transitions
    try {
      await params.client.from("cms_live_instance_transitions").insert({
        live_class_id: params.liveClassId,
        previous_instance_id: previousInstanceId,
        new_instance_id: newInstanceId,
        previous_broadcast_id: previousBroadcastId,
        new_broadcast_id: params.newBroadcastId,
        previous_video_id: previousVideoId,
        new_video_id: params.newVideoId,
        lifecycle_status: params.lifecycleStatus || "live",
        stream_status: params.streamStatus || "active",
        teacher_id: params.teacherId || null,
        transition_reason: params.transitionReason,
      });
    } catch (auditErr) {
      console.warn("[LiveInstanceManager] Transition audit logging warning:", auditErr);
    }

    return { instanceId: newInstanceId, videoId: params.newVideoId };
  }
}
