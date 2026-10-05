import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Super Admin endpoint to fetch all users (students and teachers/admins)
 * with their associated batch enrollments / assignments.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Super Admin role
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!currentProfile || currentProfile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators have access to user management." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // 2. Fetch student enrollments with batches
    const { data: enrollments } = await adminClient
      .from("student_enrollments")
      .select(`
        student_id,
        batch_id,
        course_id,
        is_active,
        enrolled_at,
        batch:cms_batches(id, title, board_label)
      `);

    // 3. Fetch teacher batch assignments with batches and subjects
    const { data: teacherAssignments } = await adminClient
      .from("cms_batch_teachers")
      .select(`
        teacher_id,
        batch_id,
        assigned_at,
        batch:cms_batches(id, title, board_label),
        cms_batch_subjects (
          subject:cms_subjects (
            id,
            name
          )
        )
      `);

    // 4. Group enrollments by student_id
    const enrollmentsByStudent: Record<string, any[]> = {};
    if (enrollments) {
      for (const e of enrollments) {
        if (!enrollmentsByStudent[e.student_id]) {
          enrollmentsByStudent[e.student_id] = [];
        }
        enrollmentsByStudent[e.student_id].push({
          batchId: e.batch_id,
          batchTitle: (e.batch as any)?.title || "Batch",
          boardLabel: (e.batch as any)?.board_label || null,
          enrolledAt: e.enrolled_at,
          isActive: e.is_active,
        });
      }
    }

    // 5. Group teacher assignments by teacher_id
    const assignmentsByTeacher: Record<string, any[]> = {};
    if (teacherAssignments) {
      for (const t of teacherAssignments) {
        if (!assignmentsByTeacher[t.teacher_id]) {
          assignmentsByTeacher[t.teacher_id] = [];
        }
        const subjects = (t.cms_batch_subjects || [])
          .map((s: any) => s.subject?.name)
          .filter(Boolean);

        assignmentsByTeacher[t.teacher_id].push({
          batchId: t.batch_id,
          batchTitle: (t.batch as any)?.title || "Batch",
          boardLabel: (t.batch as any)?.board_label || null,
          assignedAt: t.assigned_at,
          subjects,
        });
      }
    }

    // 6. Assemble complete user objects
    const assembledUsers = (profiles || []).map((p) => {
      const isTeacherOrAdmin = p.role === "ADMIN" || p.role === "SUPER_ADMIN";
      const teacherBatches = assignmentsByTeacher[p.id] || [];
      const studentBatches = enrollmentsByStudent[p.id] || [];

      return {
        id: p.id,
        fullName: p.full_name || "Unnamed User",
        email: p.email || "",
        phone: p.phone || "",
        role: p.role,
        avatarUrl: p.avatar_url,
        qualification: p.qualification || null,
        bio: p.bio || null,
        status: p.status || "ACTIVE",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        teacherBatches: isTeacherOrAdmin ? teacherBatches : [],
        studentBatches: !isTeacherOrAdmin ? studentBatches : [],
      };
    });

    return NextResponse.json({
      success: true,
      users: assembledUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user status (ACTIVE / BLOCKED) or role
 */
export async function PATCH(request: NextRequest) {
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
        { error: "Forbidden: Only Super Administrators can modify users." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, status, role, fullName, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const updates: Record<string, any> = {};

    if (status !== undefined) updates.status = status;
    if (role !== undefined) updates.role = role;
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;

    const { data, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Permanently delete user profile and auth credentials
 */
export async function DELETE(request: NextRequest) {
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
        { error: "Forbidden: Only Super Administrators can delete users." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own root Super Admin account." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Delete from profiles
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
    }

    // 2. Delete from auth.users via admin API
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch {
      // Auth delete may fail if user only exists in profiles
    }

    return NextResponse.json({
      success: true,
      message: "User permanently deleted.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
