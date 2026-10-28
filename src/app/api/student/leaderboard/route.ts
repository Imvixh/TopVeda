import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { SystemStateService } from "@/lib/services/system-state.service";

function getPrivilegedDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedBatchId = searchParams.get("batchId") || "ALL";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check user role
    let isPrivilegedUser = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isPrivilegedUser = profile?.role === "SUPER_ADMIN" || profile?.role === "ADMIN";
    }

    // Check leaderboard toggle state
    const leaderboardState = await SystemStateService.getLeaderboardState();
    if (!leaderboardState.isEnabled && !isPrivilegedUser) {
      return NextResponse.json({
        isEnabled: false,
        message: "The student leaderboard is currently paused by platform administrators.",
        leaderboard: [],
        top3: [],
        batches: [],
      });
    }

    const adminDb = getPrivilegedDb();

    // 1. Fetch available ongoing and published batches for filter dropdown
    const { data: batchesData } = await adminDb
      .from("cms_batches")
      .select("id, title, board_label, subtitle")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    const batches = (batchesData || []).map((b) => ({
      id: b.id,
      title: b.title,
      boardLabel: b.board_label || "Board",
    }));

    // 2. Fetch enrollments
    let enrollmentsQuery = adminDb
      .from("student_enrollments")
      .select(`
        student_id,
        batch_id,
        student:profiles!student_enrollments_student_id_fkey(
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role
        )
      `)
      .eq("status", "ACTIVE");

    if (selectedBatchId !== "ALL") {
      enrollmentsQuery = enrollmentsQuery.eq("batch_id", selectedBatchId);
    }

    const { data: enrollmentsRaw } = await enrollmentsQuery;

    // Distinct students map
    const studentsMap = new Map<string, {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      avatarUrl: string | null;
      batchIds: Set<string>;
    }>();

    (enrollmentsRaw || []).forEach((e: any) => {
      const s = Array.isArray(e.student) ? e.student[0] : e.student;
      if (!s || !s.id) return;

      if (!studentsMap.has(s.id)) {
        studentsMap.set(s.id, {
          id: s.id,
          fullName: s.full_name || "Student",
          email: s.email || "",
          phone: s.phone || "",
          avatarUrl: s.avatar_url || null,
          batchIds: new Set<string>(),
        });
      }
      if (e.batch_id) {
        studentsMap.get(s.id)!.batchIds.add(e.batch_id);
      }
    });

    const studentIds = Array.from(studentsMap.keys());

    // 3. Fetch Test Attempts for enrolled students
    let testAttemptsQuery = adminDb
      .from("student_test_attempts")
      .select("student_id, batch_id, score_obtained, max_score, percentage, passed, status")
      .in("status", ["EVALUATED", "SUBMITTED"]);

    if (studentIds.length > 0) {
      testAttemptsQuery = testAttemptsQuery.in("student_id", studentIds);
    }
    if (selectedBatchId !== "ALL") {
      testAttemptsQuery = testAttemptsQuery.eq("batch_id", selectedBatchId);
    }

    const { data: testAttempts } = await testAttemptsQuery;

    // 4. Fetch Lecture Progress for enrolled students
    let progressQuery = adminDb
      .from("student_lecture_progress")
      .select("student_id, watch_duration_seconds, is_completed");

    if (studentIds.length > 0) {
      progressQuery = progressQuery.in("student_id", studentIds);
    }

    const { data: progressRecords } = await progressQuery;

    // 5. Aggregate metrics per student
    const studentMetrics = new Map<string, {
      testsAttempted: number;
      totalPercentage: number;
      passedCount: number;
      lecturesCompleted: number;
      totalWatchMinutes: number;
    }>();

    studentIds.forEach((sid) => {
      studentMetrics.set(sid, {
        testsAttempted: 0,
        totalPercentage: 0,
        passedCount: 0,
        lecturesCompleted: 0,
        totalWatchMinutes: 0,
      });
    });

    (testAttempts || []).forEach((att) => {
      const m = studentMetrics.get(att.student_id);
      if (m) {
        m.testsAttempted += 1;
        m.totalPercentage += att.percentage || 0;
        if (att.passed) m.passedCount += 1;
      }
    });

    (progressRecords || []).forEach((prog) => {
      const m = studentMetrics.get(prog.student_id);
      if (m) {
        if (prog.is_completed) m.lecturesCompleted += 1;
        m.totalWatchMinutes += Math.round((prog.watch_duration_seconds || 0) / 60);
      }
    });

    // 6. Compute scores and ranks
    const rankedStudents = studentIds.map((sid) => {
      const info = studentsMap.get(sid)!;
      const m = studentMetrics.get(sid)!;

      const avgScore = m.testsAttempted > 0 ? Math.round(m.totalPercentage / m.testsAttempted) : 0;
      
      // Points algorithm:
      // - 20 pts per test attempted
      // - 40 bonus pts per passed test
      // - 2 pts per percentage point in average score
      // - 30 pts per completed lecture
      // - 1 pt per 2 minutes watched (max 150)
      const points =
        m.testsAttempted * 20 +
        m.passedCount * 40 +
        Math.round(avgScore * 2) +
        m.lecturesCompleted * 30 +
        Math.min(150, Math.round(m.totalWatchMinutes * 0.5));

      // Mask student email for standard student views (preserve for admin)
      let displayEmail = info.email;
      if (!isPrivilegedUser && info.email.includes("@")) {
        const parts = info.email.split("@");
        displayEmail = `${parts[0].slice(0, 2)}***@${parts[1]}`;
      }

      return {
        id: info.id,
        fullName: info.fullName,
        email: isPrivilegedUser ? info.email : displayEmail,
        phone: isPrivilegedUser ? info.phone : undefined,
        avatarUrl: info.avatarUrl,
        testsAttempted: m.testsAttempted,
        averageScore: avgScore,
        passedCount: m.passedCount,
        lecturesCompleted: m.lecturesCompleted,
        watchMinutes: m.totalWatchMinutes,
        points,
        rank: 0,
        isCurrentUser: user?.id === info.id,
      };
    });

    // Sort descending by points, tie-break by averageScore then testsAttempted
    rankedStudents.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return b.testsAttempted - a.testsAttempted;
    });

    // Assign 1-indexed ranks
    rankedStudents.forEach((st, idx) => {
      st.rank = idx + 1;
    });

    const top3 = rankedStudents.slice(0, 3);
    const currentUserRank = user ? rankedStudents.find((s) => s.id === user.id) || null : null;

    return NextResponse.json({
      success: true,
      isEnabled: leaderboardState.isEnabled,
      updatedAt: leaderboardState.updatedAt,
      batches,
      selectedBatchId,
      totalParticipants: rankedStudents.length,
      top3,
      leaderboard: rankedStudents.slice(0, 50),
      currentUserRank,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
