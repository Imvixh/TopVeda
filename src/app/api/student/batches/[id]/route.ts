import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await context.params;
    if (!batchId) {
      return NextResponse.json({ error: "Missing batch ID" }, { status: 400 });
    }

    const adminDb = createAdminClient();

    const { data: batch, error } = await adminDb
      .from("cms_batches")
      .select(`
        id,
        title,
        subtitle,
        description,
        board_label,
        badge_text,
        badge_variant,
        educator_name,
        educator_avatar_url,
        starts_at,
        course_id,
        is_ongoing,
        status,
        is_visible,
        board:cms_boards(id, name, code),
        class_level:cms_class_levels(id, name, code),
        batch_subjects:cms_batch_subjects(
          subject_id,
          subject:cms_subjects(id, name, code)
        ),
        batch_teachers:cms_batch_teachers(
          display_order,
          teacher:profiles!fk_cms_batch_teachers_teacher(id, full_name, avatar_url, qualification)
        )
      `)
      .eq("id", batchId)
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .single();

    if (error || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Resolve published lectures and study materials with admin privileges as fallback
    const [lecturesRes, materialsRes] = await Promise.all([
      adminDb
        .from("cms_lectures")
        .select("id, title, duration_formatted, duration_human, teacher_name, display_order, subject, subject_id")
        .eq("batch_id", batchId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      adminDb
        .from("cms_study_materials")
        .select("id, title, material_type, file_format, file_url, subject, subject_id")
        .eq("batch_id", batchId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
    ]);

    return NextResponse.json({
      batch: {
        ...batch,
        batch_lectures: lecturesRes.data || [],
        batch_study_materials: materialsRes.data || [],
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
