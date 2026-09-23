/**
 * TopVeda Student Study Material Service (Phase 5E)
 * Strictly enforces server-side and database-level enrolled-only access to study materials,
 * manages batch material catalogs, filters, signed download URLs, and activity tracking.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentStudyMaterialItem,
  EnrolledBatchItem,
  StudyMaterialFilterParams,
  StudyMaterialDownloadResponse,
  MaterialType,
} from "@/types/study-material.types";

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getMaterialTypeLabel(type: string): string {
  switch (type) {
    case "formula_sheet":
      return "Formula Sheet";
    case "notes":
      return "Revision Notes";
    case "ncert_solution":
      return "NCERT Solution";
    case "pyq_paper":
      return "Solved PYQ Paper";
    case "worksheet":
      return "Practice Worksheet";
    case "question_bank":
      return "Question Bank";
    case "sample_paper":
      return "Sample Paper";
    case "revision":
      return "Quick Revision";
    default:
      return "Study Document";
  }
}

export class StudentStudyMaterialService {
  /**
   * Fetches all active batches in which the student is enrolled.
   * Used for the batch switcher tabs on /student/study-material.
   */
  public static async getEnrolledBatchesForMaterials(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<EnrolledBatchItem[]> {
    if (!studentId) return [];

    try {
      // Query active batch enrollments for this student
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_enrollments")
        .select(`
          id,
          batch_id,
          status
        `)
        .eq("student_id", studentId)
        .eq("status", "ACTIVE");

      if (enrollErr || !enrollments || enrollments.length === 0) {
        return [];
      }

      const enrolledBatchIds = enrollments
        .map((e) => e.batch_id)
        .filter((id): id is string => Boolean(id));

      if (enrolledBatchIds.length === 0) {
        return [];
      }

      // Fetch batch metadata strictly for enrolled batches
      const { data: batchesData, error: batchErr } = await supabase
        .from("cms_batches")
        .select(`
          id,
          title,
          board_label,
          board_id,
          class_id
        `)
        .in("id", enrolledBatchIds)
        .eq("status", "PUBLISHED");

      if (batchErr || !batchesData) {
        return [];
      }

      // Fetch board and class names
      const boardIds = [...new Set(batchesData.map((b) => b.board_id).filter(Boolean))];
      const classIds = [...new Set(batchesData.map((b) => b.class_id).filter(Boolean))];

      const { data: boards } = await supabase
        .from("cms_boards")
        .select("id, name")
        .in("id", boardIds);

      const { data: classes } = await supabase
        .from("cms_class_levels")
        .select("id, name")
        .in("id", classIds);

      const boardMap = new Map((boards || []).map((b) => [b.id, b.name]));
      const classMap = new Map((classes || []).map((c) => [c.id, c.name]));

      // Count materials in each batch
      const batchItems: EnrolledBatchItem[] = [];

      for (const b of batchesData) {
        const { count } = await supabase
          .from("cms_study_materials")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", b.id)
          .eq("status", "PUBLISHED")
          .eq("is_visible", true);

        batchItems.push({
          id: b.id,
          title: b.title || "Academic Batch",
          boardLabel: b.board_label || "CBSE",
          boardName: boardMap.get(b.board_id) || b.board_label || "Board",
          className: classMap.get(b.class_id) || "Class 10",
          materialsCount: count || 0,
        });
      }

      return batchItems;
    } catch (e) {
      console.error("[StudentStudyMaterialService] getEnrolledBatches error:", e);
      return [];
    }
  }

  /**
   * Verifies whether the student has an active enrollment for the specified batch.
   * Strict direct batch enrollment check.
   */
  public static async verifyStudentBatchEnrollment(
    supabase: SupabaseClient,
    studentId: string,
    batchId: string
  ): Promise<{ isEnrolled: boolean }> {
    if (!studentId || !batchId) return { isEnrolled: false };

    try {
      // Direct batch enrollment check
      const { data: directEnrollment } = await supabase
        .from("student_enrollments")
        .select("id, batch_id")
        .eq("student_id", studentId)
        .eq("batch_id", batchId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (directEnrollment) {
        return { isEnrolled: true };
      }

      return { isEnrolled: false };
    } catch (e) {
      console.error("[StudentStudyMaterialService] verifyEnrollment error:", e);
      return { isEnrolled: false };
    }
  }

  /**
   * Fetches published study materials for a specific enrolled batch.
   * STRICTLY rejects unauthorized access if the student is not enrolled.
   */
  public static async getMaterialsForBatch(
    supabase: SupabaseClient,
    studentId: string,
    params: StudyMaterialFilterParams
  ): Promise<{
    authorized: boolean;
    batchTitle?: string;
    materials: StudentStudyMaterialItem[];
    error?: string;
  }> {
    if (!studentId) {
      return { authorized: false, materials: [], error: "UNAUTHENTICATED" };
    }

    const { batchId, subjectName, materialType, chapterId, search } = params;

    if (!batchId) {
      return { authorized: false, materials: [], error: "BATCH_REQUIRED" };
    }

    // 1. Strict Server-Side Enrollment Check
    const { isEnrolled } = await this.verifyStudentBatchEnrollment(
      supabase,
      studentId,
      batchId
    );

    if (!isEnrolled) {
      return {
        authorized: false,
        materials: [],
        error: "NOT_ENROLLED_IN_BATCH",
      };
    }

    // 2. Query published study materials for this batch / course
    try {
      // Get batch details for display
      const { data: batchRow } = await supabase
        .from("cms_batches")
        .select("title")
        .eq("id", batchId)
        .maybeSingle();

      let query = supabase
        .from("cms_study_materials")
        .select(`
          id,
          batch_id,
          course_id,
          chapter_id,
          title,
          material_type,
          file_url,
          file_size_bytes,
          page_count,
          download_count,
          access_tier,
          display_order,
          created_at,
          cms_courses (
            id,
            title,
            subject_id,
            cms_subjects (
              id,
              name
            )
          ),
          cms_chapters (
            id,
            title,
            chapter_number
          )
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      // Match batch_id strictly
      query = query.eq("batch_id", batchId);

      if (materialType && materialType !== "all") {
        query = query.eq("material_type", materialType);
      }

      if (chapterId && chapterId !== "all") {
        query = query.eq("chapter_id", chapterId);
      }

      query = query.order("display_order", { ascending: true });

      const { data: rawMaterials, error: matErr } = await query;

      if (matErr || !rawMaterials) {
        console.error("[StudentStudyMaterialService] getMaterials error:", matErr?.message);
        return {
          authorized: true,
          batchTitle: batchRow?.title || "Batch Materials",
          materials: [],
        };
      }

      // Map and filter by search / subject if requested
      const items: StudentStudyMaterialItem[] = [];

      for (const m of rawMaterials as any[]) {
        const course = m.cms_courses;
        const subject = course?.cms_subjects?.name || "General";
        const chapter = m.cms_chapters?.title || null;

        // Subject filter
        if (subjectName && subjectName !== "all") {
          if (!subject.toLowerCase().includes(subjectName.toLowerCase())) {
            continue;
          }
        }

        // Search filter
        if (search && search.trim() !== "") {
          const q = search.toLowerCase();
          const matchTitle = m.title?.toLowerCase().includes(q);
          const matchSubject = subject.toLowerCase().includes(q);
          const matchChapter = chapter?.toLowerCase().includes(q);
          if (!matchTitle && !matchSubject && !matchChapter) {
            continue;
          }
        }

        items.push({
          id: m.id,
          batchId: m.batch_id || batchId,
          batchTitle: batchRow?.title || "Enrolled Batch",
          courseId: m.course_id || course?.id || "",
          courseTitle: course?.title || "Course",
          chapterId: m.chapter_id,
          chapterTitle: chapter,
          subjectName: subject,
          title: m.title,
          materialType: m.material_type as MaterialType,
          materialTypeLabel: getMaterialTypeLabel(m.material_type),
          fileUrl: m.file_url || "",
          fileSizeBytes: m.file_size_bytes || 2400000,
          fileSizeHuman: formatBytes(m.file_size_bytes || 2400000),
          pageCount: m.page_count || 4,
          downloadCount: m.download_count || 0,
          accessTier: m.access_tier || "FREE",
          isEnrolled: true,
          createdAt: m.created_at,
        });
      }

      return {
        authorized: true,
        batchTitle: batchRow?.title || "Batch Materials",
        materials: items,
      };
    } catch (e: any) {
      console.error("[StudentStudyMaterialService] query exception:", e);
      return { authorized: false, materials: [], error: e.message };
    }
  }

  /**
   * Generates a secure authorized download link and logs a learning activity record.
   * Strictly evaluates enrollment before granting download access.
   */
  public static async generateAuthorizedDownload(
    supabase: SupabaseClient,
    studentId: string,
    materialId: string
  ): Promise<StudyMaterialDownloadResponse> {
    if (!studentId || !materialId) {
      throw new Error("UNAUTHORIZED: Missing authentication or material identity.");
    }

    // 1. Fetch material record
    const { data: material, error: matErr } = await supabase
      .from("cms_study_materials")
      .select(`
        id,
        batch_id,
        course_id,
        title,
        material_type,
        file_url,
        file_size_bytes,
        page_count,
        download_count,
        status,
        is_visible
      `)
      .eq("id", materialId)
      .maybeSingle();

    if (matErr || !material || material.status !== "PUBLISHED" || !material.is_visible) {
      throw new Error("NOT_FOUND: Study material is unavailable or unpublished.");
    }

    // 2. Strict Batch Enrollment Verification
    let isEnrolled = false;

    if (material.batch_id) {
      const enrollCheck = await this.verifyStudentBatchEnrollment(
        supabase,
        studentId,
        material.batch_id
      );
      isEnrolled = enrollCheck.isEnrolled;
    } else if (material.course_id) {
      const { data: courseEnrollment } = await supabase
        .from("student_enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", material.course_id)
        .is("batch_id", null)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      isEnrolled = Boolean(courseEnrollment);
    }

    if (!isEnrolled) {
      throw new Error("FORBIDDEN: You must be actively enrolled in this batch to download its study materials.");
    }

    // 3. Increment download counter asynchronously
    try {
      await supabase
        .from("cms_study_materials")
        .update({ download_count: (material.download_count || 0) + 1 })
        .eq("id", materialId);
    } catch {
      // Non-blocking counter update
    }

    // 4. Log student_learning_activity (MATERIAL_DOWNLOAD)
    let recordedActivity = false;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error: actErr } = await supabase.from("student_learning_activity").insert({
        student_id: studentId,
        activity_type: "MATERIAL_DOWNLOAD",
        entity_type: "STUDY_MATERIAL",
        entity_id: materialId,
        duration_seconds: 0,
        activity_date: today,
        metadata: {
          title: material.title,
          material_type: material.material_type,
          batch_id: material.batch_id,
          course_id: material.course_id,
        },
      });

      if (!actErr) {
        recordedActivity = true;
      }
    } catch (e) {
      console.warn("[StudentStudyMaterialService] Failed to record learning activity:", e);
    }

    // 5. Generate secure signed URL or return verified file path
    let downloadUrl = material.file_url || "/assets/docs/TopVeda_Sample_Notes.pdf";

    // If file_url points to Supabase storage path (e.g. "study-materials/...")
    if (material.file_url && material.file_url.startsWith("study-materials/")) {
      const filePath = material.file_url.replace(/^study-materials\//, "");
      const { data: signedData, error: signErr } = await supabase.storage
        .from("study-materials")
        .createSignedUrl(filePath, 3600); // 1 hour validity

      if (signedData?.signedUrl) {
        downloadUrl = signedData.signedUrl;
      }
    }

    return {
      materialId: material.id,
      title: material.title,
      downloadUrl,
      fileSizeBytes: material.file_size_bytes || 2400000,
      pageCount: material.page_count || 4,
      recordedActivity,
    };
  }
}
