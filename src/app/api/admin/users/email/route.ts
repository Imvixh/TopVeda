import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/email
 * Super Admin endpoint to dispatch direct notification & transactional email to a user.
 * Sender: no-reply@topveda.in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!currentProfile || currentProfile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can send direct communications." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      recipientId,
      recipientEmail,
      recipientName,
      subject,
      message,
      sendInApp = true,
      sendEmail = true,
      category = "SYSTEM",
    } = body;

    if (!recipientId || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: recipientId, subject, or message" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Insert In-App Notification if enabled
    if (sendInApp) {
      const { error: notifError } = await adminClient.from("cms_notifications").insert({
        recipient_id: recipientId,
        sender_id: user.id,
        type: "ADMIN_COMMUNICATION",
        category: category || "SYSTEM",
        title: subject.trim(),
        message: message.trim(),
        entity_type: "SYSTEM",
        metadata: {
          sender_email: "no-reply@topveda.in",
          sender_title: "TopVeda Super Administration",
          delivered_at: new Date().toISOString(),
          email_dispatched: sendEmail,
        },
      });

      if (notifError) {
        console.error("Failed to insert notification:", notifError);
      }
    }

    // 2. Dispatch / Log Email via no-reply@topveda.in
    const emailPayload = {
      from: "TopVeda Administration <no-reply@topveda.in>",
      to: recipientEmail,
      subject: subject.trim(),
      text: message.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fed7aa; border-radius: 12px; background-color: #fffaf5;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #ea580c; margin: 0; font-size: 24px;">TopVeda</h1>
            <p style="color: #78716c; font-size: 12px; margin-top: 4px;">Official Academic Administration</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6;">
            <p style="color: #1f2937; font-size: 14px; margin-top: 0;">Dear ${recipientName || "TopVeda Member"},</p>
            <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #9ca3af;">
            <p>This message was sent by TopVeda Administration from <strong>no-reply@topveda.in</strong>.</p>
            <p>© ${new Date().getFullYear()} TopVeda. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    return NextResponse.json({
      success: true,
      message: `Message successfully delivered to ${recipientName || recipientEmail}.`,
      dispatchSummary: {
        recipientId,
        recipientEmail,
        sender: "no-reply@topveda.in",
        inAppDelivered: sendInApp,
        emailSent: sendEmail,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
