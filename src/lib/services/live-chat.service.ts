/**
 * TopVeda Phase 6 Loop 3: Live Chat Service
 * Server-authoritative chat messaging, rate limiting, and teacher/admin moderation.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { LiveChatMessage, SendLiveChatMessageDTO, ModerateChatMessageDTO } from "@/types/live-interaction.types";

export class LiveChatService {
  private static readonly MAX_MESSAGE_LENGTH = 500;
  private static readonly RATE_LIMIT_WINDOW_SECS = 10;
  private static readonly MAX_MESSAGES_PER_WINDOW = 5;

  /**
   * Sends a new chat message to a live class with server-side rate limiting and validation.
   */
  public static async sendMessage(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      senderId: string;
      message: string;
    }
  ): Promise<{ success: boolean; message?: LiveChatMessage; error?: string }> {
    const { liveClassId, senderId, message } = params;

    const trimmedMsg = (message || "").trim();
    if (!trimmedMsg) {
      return { success: false, error: "Message cannot be empty." };
    }

    if (trimmedMsg.length > this.MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        error: `Message exceeds maximum permitted length of ${this.MAX_MESSAGE_LENGTH} characters.`,
      };
    }

    try {
      // 1. Fetch sender profile to derive authoritative name and role
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", senderId)
        .single();

      if (profileErr || !profile) {
        return { success: false, error: "Sender profile not found." };
      }

      // 2. Spam & Rate Limiting Check (Students only)
      if (profile.role === "STUDENT") {
        const windowThreshold = new Date(Date.now() - this.RATE_LIMIT_WINDOW_SECS * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from("live_class_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", senderId)
          .eq("live_class_id", liveClassId)
          .gte("created_at", windowThreshold);

        if (!countErr && (count || 0) >= this.MAX_MESSAGES_PER_WINDOW) {
          return {
            success: false,
            error: `Slow down: Maximum ${this.MAX_MESSAGES_PER_WINDOW} messages per ${this.RATE_LIMIT_WINDOW_SECS} seconds allowed.`,
          };
        }
      }

      const senderName = profile.full_name || (profile.role === "STUDENT" ? "Student" : "Educator");
      const senderRole = profile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : profile.role === "ADMIN" ? "ADMIN" : "STUDENT";
      const nowIso = new Date().toISOString();

      // 3. Insert into live_class_messages
      const { data: newMsg, error: insertErr } = await supabase
        .from("live_class_messages")
        .insert({
          live_class_id: liveClassId,
          sender_id: senderId,
          sender_name: senderName,
          sender_role: senderRole,
          message: trimmedMsg,
          is_hidden: false,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("*")
        .single();

      if (insertErr || !newMsg) {
        return { success: false, error: insertErr?.message || "Failed to post message." };
      }

      // 4. If student, log study activity
      if (profile.role === "STUDENT") {
        try {
          await supabase.from("student_learning_activity").insert({
            student_id: senderId,
            activity_type: "LIVE_CHAT",
            entity_type: "LIVE_CLASS",
            entity_id: liveClassId,
            duration_seconds: 5,
            activity_date: nowIso.split("T")[0],
            metadata: { liveClassId, messageId: newMsg.id },
          });
        } catch (logErr) {
          console.warn("[LiveChatService] Non-blocking activity log warning:", logErr);
        }
      }

      const mappedMsg: LiveChatMessage = {
        id: newMsg.id,
        liveClassId: newMsg.live_class_id,
        senderId: newMsg.sender_id,
        senderName: newMsg.sender_name,
        senderRole: newMsg.sender_role,
        message: newMsg.message,
        isHidden: newMsg.is_hidden,
        moderatedBy: newMsg.moderated_by,
        moderatedAt: newMsg.moderated_at,
        createdAt: newMsg.created_at,
        updatedAt: newMsg.updated_at,
      };

      return { success: true, message: mappedMsg };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetches recent messages for a live class.
   */
  public static async getMessages(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      isTeacherOrAdmin?: boolean;
      limit?: number;
    }
  ): Promise<{ messages: LiveChatMessage[]; error?: string }> {
    const { liveClassId, isTeacherOrAdmin = false, limit = 100 } = params;

    try {
      let query = supabase
        .from("live_class_messages")
        .select("*")
        .eq("live_class_id", liveClassId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (!isTeacherOrAdmin) {
        query = query.eq("is_hidden", false);
      }

      const { data, error } = await query;

      if (error) {
        return { messages: [], error: error.message };
      }

      const messages: LiveChatMessage[] = (data || []).map((m) => ({
        id: m.id,
        liveClassId: m.live_class_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        message: m.message,
        isHidden: m.is_hidden,
        moderatedBy: m.moderated_by,
        moderatedAt: m.moderated_at,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      return { messages };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { messages: [], error: error.message };
    }
  }

  /**
   * Moderates (hides or unhides) a chat message.
   */
  public static async moderateMessage(
    supabase: SupabaseClient,
    params: {
      messageId: string;
      liveClassId: string;
      moderatorId: string;
      isHidden: boolean;
      reason?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { messageId, liveClassId, moderatorId, isHidden } = params;

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("live_class_messages")
        .update({
          is_hidden: isHidden,
          moderated_by: moderatorId,
          moderated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", messageId)
        .eq("live_class_id", liveClassId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }
}
