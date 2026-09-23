/**
 * TopVeda Phase 5H: Admin Profile & Settings Service
 * Strictly isolated to ADMIN and SUPER_ADMIN roles.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminProfileSummary,
  UpdateAdminProfilePayload,
} from "@/types/student-profile.types";

export class AdminProfileService {
  /**
   * Fetch admin profile details (strictly for ADMIN and SUPER_ADMIN roles)
   */
  public static async getAdminProfile(
    supabase: SupabaseClient,
    adminId: string
  ): Promise<AdminProfileSummary | null> {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, avatar_url, qualification, bio, created_at")
        .eq("id", adminId)
        .single();

      if (error || !profile) {
        return null;
      }

      if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
        return null; // Reject non-admin profiles
      }

      // Count unread admin notifications
      const isSuperAdmin = profile.role === "SUPER_ADMIN";
      let notifQuery = supabase
        .from("cms_notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (isSuperAdmin) {
        notifQuery = notifQuery.or(`recipient_id.eq.${adminId},recipient_role.eq.SUPER_ADMIN`);
      } else {
        notifQuery = notifQuery.or(`recipient_id.eq.${adminId},recipient_role.eq.ADMIN`);
      }

      const { count: unreadCount } = await notifQuery;

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role as "ADMIN" | "SUPER_ADMIN",
        avatar_url: profile.avatar_url,
        qualification: profile.qualification,
        bio: profile.bio,
        created_at: profile.created_at,
        unread_notifications_count: unreadCount || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update admin personal profile details
   */
  public static async updateAdminProfile(
    supabase: SupabaseClient,
    adminId: string,
    payload: UpdateAdminProfilePayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", adminId)
        .single();

      if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
        return { success: false, error: "Unauthorized. Admin privileges required." };
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.full_name !== undefined) updateData.full_name = payload.full_name.trim();
      if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
      if (payload.qualification !== undefined) updateData.qualification = payload.qualification?.trim() || null;
      if (payload.bio !== undefined) updateData.bio = payload.bio?.trim() || null;
      if (payload.avatar_url !== undefined) updateData.avatar_url = payload.avatar_url;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", adminId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update admin profile";
      return { success: false, error: message };
    }
  }
}
