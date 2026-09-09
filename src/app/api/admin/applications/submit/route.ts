import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { EmailService } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    // 1. Verify user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // 2. Verify applicant email is confirmed
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your Gmail address before submitting an admin application." },
        { status: 400 }
      );
    }

    // 3. Verify applicant current role is ADMIN
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrator applicant accounts are eligible to submit an administrator application." },
        { status: 403 }
      );
    }

    // 5. Parse request body
    const body = await request.json();
    const {
      fullName,
      phone: reqPhone,
      documentStoragePath,
      documentFileName,
      documentFileSize,
      documentMimeType,
    } = body;

    if (
      !fullName ||
      !documentStoragePath ||
      !documentFileName ||
      !documentFileSize ||
      !documentMimeType
    ) {
      return NextResponse.json(
        { error: "Missing required application or document verification fields." },
        { status: 400 }
      );
    }

    // 6. Enforce document path ownership (<user.id>/...)
    if (!documentStoragePath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: "Security violation: Document path does not match applicant namespace." },
        { status: 403 }
      );
    }

    // 7. Verify document actually exists in the private 'admin-documents' storage bucket
    const fileNameOnly = documentStoragePath.replace(`${user.id}/`, "");
    const { data: fileList, error: listError } = await supabase.storage
      .from("admin-documents")
      .list(user.id, {
        search: fileNameOnly,
      });

    const fileExists = fileList && fileList.some((f) => f.name === fileNameOnly);

    if (listError || !fileExists) {
      return NextResponse.json(
        { error: "Verification document was not found in storage. Please re-upload your document." },
        { status: 400 }
      );
    }

    const applicationPhone = reqPhone || profile.phone || user.phone || "";

    // 8. Insert into public.admin_applications
    const { data: appData, error: insertError } = await supabase
      .from("admin_applications")
      .insert({
        user_id: user.id,
        full_name: fullName.trim(),
        email: user.email!,
        phone: applicationPhone,
        document_storage_path: documentStoragePath,
        document_file_name: documentFileName,
        document_file_size: documentFileSize,
        document_mime_type: documentMimeType,
        status: "PENDING",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message.toLowerCase().includes("unique") || insertError.code === "23505") {
        return NextResponse.json(
          { error: "You already have a pending admin application under review." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // 9. Decoupled Owner Alert Email
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
      await EmailService.sendOwnerNewApplicationAlert({
        applicantName: fullName.trim(),
        applicantEmail: user.email!,
        applicantPhone: applicationPhone,
        applicationId: appData.id,
        reviewUrl: `${origin}/admin/applications`,
      });
    } catch (emailErr) {
      console.error("[Submit API] Failed to notify owner:", emailErr);
    }

    return NextResponse.json({
      success: true,
      application: appData,
    });
  } catch (err: unknown) {
    console.error("[Submit API] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
