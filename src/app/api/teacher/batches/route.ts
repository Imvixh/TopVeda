import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTeacherId = searchParams.get("teacherId") || user.id;

    // Verify user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Educator access required." },
        { status: 403 }
      );
    }

    const isSuperAdmin = profile.role === "SUPER_ADMIN";
    const targetTeacherId = isSuperAdmin ? requestedTeacherId : user.id;

    const adminDb = createAdminClient();

    // 1. Find batches assigned to this teacher from cms_batch_teachers
    const { data: teacherRows } = await adminDb
      .from("cms_batch_teachers")
      .select("batch_id")
      .eq("teacher_id", targetTeacherId);

    // 2. Find batches assigned from cms_batch_subjects
    const { data: subjectRows } = await adminDb
      .from("cms_batch_subjects")
      .select("batch_id")
      .eq("primary_teacher_id", targetTeacherId);

    // 3. Find batches where lead_educator_id matches
    const { data: leadRows } = await adminDb
      .from("cms_batches")
      .select("id")
      .eq("lead_educator_id", targetTeacherId);

    const idSet = new Set<string>();
    (teacherRows || []).forEach((r) => r.batch_id && idSet.add(r.batch_id));
    (subjectRows || []).forEach((r) => r.batch_id && idSet.add(r.batch_id));
    (leadRows || []).forEach((r) => r.id && idSet.add(r.id));

    let batchIds = Array.from(idSet);

    let query = adminDb
      .from("cms_batches")
      .select(`
        *,
        board:cms_boards(id, name, code),
        class_level:cms_class_levels(id, name, code),
        subject:cms_subjects(id, name, code),
        batch_teachers:cms_batch_teachers(
          id,
          batch_id,
          teacher_id,
          display_order,
          created_at,
          teacher:profiles!teacher_id(id, full_name, avatar_url, qualification, role)
        ),
        batch_subjects:cms_batch_subjects(
          id,
          batch_id,
          subject_id,
          primary_teacher_id,
          created_at,
          subject:cms_subjects(id, name, code, icon_name, icon_color, icon_bg)
        )
      `)
      .neq("status", "ARCHIVED");

    if (!isSuperAdmin || (requestedTeacherId && requestedTeacherId !== user.id)) {
      if (batchIds.length === 0) {
        return NextResponse.json({ batches: [] });
      }
      query = query.in("id", batchIds);
    }

    const { data: batches, error } = await query.order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ batches: batches || [] });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
