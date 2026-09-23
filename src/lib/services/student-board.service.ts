/**
 * TopVeda Student Boards Discovery Service (Phase 5F)
 * Provides dynamic hierarchy traversal: Board -> Class -> Batches (Enrolled/Available/Upcoming) -> Course Links.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentBoardItem,
  StudentBoardDetail,
  BoardClassLevel,
  BoardBatchCard,
  StudentBoardCourseCard,
} from "@/types/board.types";

export class StudentBoardService {
  /**
   * Fetches the dynamic catalog of published educational boards.
   */
  public static async getBoardsCatalog(
    supabase: SupabaseClient,
    studentId?: string
  ): Promise<StudentBoardItem[]> {
    try {
      // 1. Fetch all published & visible boards
      const { data: boardsData, error: boardErr } = await supabase
        .from("cms_boards")
        .select(`
          id,
          name,
          code,
          slug,
          description,
          icon_name,
          display_order
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (boardErr || !boardsData || boardsData.length === 0) {
        return [];
      }

      // 2. Fetch class levels
      const { data: classLevelsData } = await supabase
        .from("cms_class_levels")
        .select("id, name, code, slug, display_order")
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      const defaultClasses: BoardClassLevel[] = (classLevelsData || []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        slug: c.slug,
        displayOrder: c.display_order,
      }));

      // 3. Fetch all batches to calculate board counts
      const { data: batchesData } = await supabase
        .from("cms_batches")
        .select("id, board_id, status, is_visible")
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      // 4. Fetch student active enrollments if authenticated
      let studentEnrollments: { batch_id: string | null; course_id: string }[] = [];
      if (studentId) {
        const { data: enrollData } = await supabase
          .from("student_enrollments")
          .select("batch_id, course_id")
          .eq("student_id", studentId)
          .eq("status", "ACTIVE");
        studentEnrollments = enrollData || [];
      }

      const enrolledBatchIds = new Set(studentEnrollments.map((e) => e.batch_id).filter(Boolean));

      // Build board cards
      return boardsData.map((b) => {
        const boardBatches = (batchesData || []).filter((batch) => batch.board_id === b.id);
        const enrolledCount = boardBatches.filter((batch) => enrolledBatchIds.has(batch.id)).length;

        return {
          id: b.id,
          name: b.name,
          code: b.code,
          slug: b.slug,
          description: b.description || `Comprehensive board curriculum, syllabus breakdown, and targeted test preparation for ${b.name}.`,
          iconName: b.icon_name || "Award",
          displayOrder: b.display_order,
          classLevels: defaultClasses,
          activeBatchesCount: boardBatches.length,
          isEnrolled: enrolledCount > 0,
          enrolledBatchesCount: enrolledCount,
        };
      });
    } catch (e) {
      console.error("[StudentBoardService] getBoardsCatalog error:", e);
      return [];
    }
  }

  /**
   * Fetches detailed board information, class levels, enrolled batches, available batches, and upcoming batches.
   */
  public static async getBoardDetail(
    supabase: SupabaseClient,
    boardSlugOrId: string,
    studentId?: string
  ): Promise<StudentBoardDetail | null> {
    if (!boardSlugOrId) return null;

    try {
      // 1. Fetch Board Record (by slug or UUID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boardSlugOrId);

      let boardQuery = supabase
        .from("cms_boards")
        .select("id, name, code, slug, description, icon_name, display_order")
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      if (isUuid) {
        boardQuery = boardQuery.eq("id", boardSlugOrId);
      } else {
        boardQuery = boardQuery.eq("slug", boardSlugOrId);
      }

      const { data: boardRow, error: bErr } = await boardQuery.maybeSingle();

      if (bErr || !boardRow) {
        console.warn(`[StudentBoardService] Board not found: ${boardSlugOrId}`);
        return null;
      }

      // 2. Fetch Class Levels
      const { data: classLevelsData } = await supabase
        .from("cms_class_levels")
        .select("id, name, code, slug, display_order")
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      const classLevels: BoardClassLevel[] = (classLevelsData || []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        slug: c.slug,
        displayOrder: c.display_order,
      }));

      const classMap = new Map(classLevels.map((c) => [c.id, c.name]));

      // 3. Fetch Batches under this Board
      const { data: batchesData, error: batchErr } = await supabase
        .from("cms_batches")
        .select(`
          id,
          title,
          slug,
          subtitle,
          board_id,
          board_label,
          class_id,
          course_id,
          educator_name,
          educator_avatar_url,
          access_tier,
          is_ongoing,
          is_featured,
          badge_text,
          badge_variant,
          starts_at,
          status
        `)
        .eq("board_id", boardRow.id)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      // 4. Fetch Student Active Enrollments
      let enrolledBatchIds = new Set<string>();
      let enrolledCourseIds = new Set<string>();

      if (studentId) {
        const { data: enrollData } = await supabase
          .from("student_enrollments")
          .select("batch_id, course_id")
          .eq("student_id", studentId)
          .eq("status", "ACTIVE");

        (enrollData || []).forEach((e) => {
          if (e.batch_id) enrolledBatchIds.add(e.batch_id);
          if (e.course_id) enrolledCourseIds.add(e.course_id);
        });
      }

      // 5. Build Batch Cards with counts
      const allBatches: BoardBatchCard[] = [];
      const now = new Date();

      for (const b of batchesData || []) {
        const isEnrolled = enrolledBatchIds.has(b.id) || (b.course_id ? enrolledCourseIds.has(b.course_id) : false);

        // Fetch lectures count
        const { count: lecCount } = await supabase
          .from("cms_lectures")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", b.id)
          .eq("status", "PUBLISHED")
          .eq("is_visible", true);

        // Fetch materials count
        const { count: matCount } = await supabase
          .from("cms_study_materials")
          .select("*", { count: "exact", head: true })
          .or(`batch_id.eq.${b.id},course_id.eq.${b.course_id || b.id}`)
          .eq("status", "PUBLISHED")
          .eq("is_visible", true);

        // Fetch tests count
        const { count: testCount } = await supabase
          .from("student_tests")
          .select("*", { count: "exact", head: true })
          .eq("course_id", b.course_id || b.id)
          .eq("status", "PUBLISHED")
          .eq("is_visible", true);

        allBatches.push({
          id: b.id,
          title: b.title,
          slug: b.slug,
          subtitle: b.subtitle || "Target Board Batch",
          boardId: b.board_id,
          boardLabel: b.board_label || boardRow.code,
          classId: b.class_id,
          className: classMap.get(b.class_id) || "Class 10",
          courseId: b.course_id,
          educatorName: b.educator_name || "TopVeda Faculty",
          educatorAvatarUrl: b.educator_avatar_url || "/assets/student/teacher-male-1.jpg",
          accessTier: b.access_tier || "FREE",
          isEnrolled,
          isOngoing: b.is_ongoing ?? true,
          isFeatured: b.is_featured ?? false,
          startsAt: b.starts_at,
          badgeText: b.badge_text,
          badgeVariant: b.badge_variant,
          lecturesCount: lecCount || 0,
          materialsCount: matCount || 0,
          testsCount: testCount || 0,
        });
      }

      // Categorize into Enrolled, Available, and Upcoming
      const enrolledBatches = allBatches.filter((b) => b.isEnrolled);
      const availableBatches = allBatches.filter((b) => !b.isEnrolled);
      const upcomingBatches = allBatches.filter((b) => b.startsAt && new Date(b.startsAt) > now);

      // 6. Fetch Relevant Courses for curriculum navigation
      const { data: coursesData } = await supabase
        .from("cms_courses")
        .select(`
          id,
          title,
          category,
          slug,
          short_description,
          class_id,
          subject_id,
          cms_subjects (
            name
          )
        `)
        .eq("board_id", boardRow.id)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      const courses: StudentBoardCourseCard[] = (coursesData || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category || "Full Course",
        slug: c.slug,
        classLevel: classMap.get(c.class_id) || "Class 10",
        subjectName: c.cms_subjects?.name || "Academic Subject",
        shortDescription: c.short_description,
        isEnrolled: enrolledCourseIds.has(c.id),
      }));

      const boardItem: StudentBoardItem = {
        id: boardRow.id,
        name: boardRow.name,
        code: boardRow.code,
        slug: boardRow.slug,
        description: boardRow.description || `Comprehensive curriculum and batch preparation for ${boardRow.name}.`,
        iconName: boardRow.icon_name || "Award",
        displayOrder: boardRow.display_order,
        classLevels,
        activeBatchesCount: allBatches.length,
        isEnrolled: enrolledBatches.length > 0,
        enrolledBatchesCount: enrolledBatches.length,
      };

      return {
        board: boardItem,
        classLevels,
        enrolledBatches,
        availableBatches,
        upcomingBatches,
        courses,
      };
    } catch (e) {
      console.error("[StudentBoardService] getBoardDetail error:", e);
      return null;
    }
  }
}
