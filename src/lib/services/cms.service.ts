import { SupabaseClient } from "@supabase/supabase-js";
import {
  CmsBoard,
  CmsClassLevel,
  CmsSubject,
  CmsCourse,
  CmsBatch,
  CmsChapter,
  CmsLecture,
  CmsLiveClass,
  CmsHeroBanner,
  CmsDailyQuote,
  CmsHubItem,
  CmsStudyMaterial,
  CmsChatbotSettings,
  CmsChatbotPrompt,
  CmsChatbotFaq,
  CmsChatbotKnowledgeSource,
  CmsPendingReviewItem,
  ContentStatus,
  ReviewDecisionRequest,
  EducatorContentItem,
} from "@/types/cms.types";
import {
  TeacherStatistics,
  SuperAdminLiveControlData,
  LiveControlSessionItem,
  TeacherSummaryStats,
} from "@/types/teacher.types";
import { NotificationService } from "@/lib/services/notification.service";

/**
 * Super Admin & Admin CMS Domain Services
 * All server-side operations utilize the caller's SupabaseClient (respecting RLS)
 */

export class CmsService {
  // --------------------------------------------------------------------------
  // 1. Review Queue & Governance
  // --------------------------------------------------------------------------

  /**
   * Fetch all pending submissions awaiting Super Admin review from the consolidated view.
   */
  static async getPendingReviews(
    supabase: SupabaseClient
  ): Promise<{ data: CmsPendingReviewItem[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("cms_pending_reviews_view")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw new Error(error.message);
      return { data: (data as CmsPendingReviewItem[]) || [], error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  /**
   * Fetch review items filtered by status ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ALL').
   */
  static async getReviewQueueItems(
    supabase: SupabaseClient,
    statusFilter: ContentStatus | "ALL" = "PENDING_REVIEW"
  ): Promise<{ data: CmsPendingReviewItem[] | null; error: Error | null }> {
    try {
      if (statusFilter === "PENDING_REVIEW") {
        return await this.getPendingReviews(supabase);
      }

      const statusList =
        statusFilter === "ALL"
          ? ["PENDING_REVIEW", "APPROVED", "REJECTED"]
          : [statusFilter];

      const [lecturesRes, materialsRes, batchesRes] = await Promise.all([
        supabase
          .from("cms_lectures")
          .select("id, title, subject, teacher_name, thumbnail_url, video_playback_url, status, submitted_by, reviewed_by, reviewed_at, review_note, created_at, updated_at")
          .in("status", statusList)
          .order("created_at", { ascending: false }),
        supabase
          .from("cms_study_materials")
          .select("id, title, material_type, file_url, status, submitted_by, reviewed_by, reviewed_at, review_note, created_at, updated_at")
          .in("status", statusList)
          .order("created_at", { ascending: false }),
        supabase
          .from("cms_batches")
          .select("id, title, board_label, educator_name, educator_avatar_url, status, submitted_by, reviewed_by, reviewed_at, review_note, created_at, updated_at")
          .in("status", statusList)
          .order("created_at", { ascending: false }),
      ]);

      const items: CmsPendingReviewItem[] = [];

      if (lecturesRes.data) {
        for (const l of lecturesRes.data) {
          items.push({
            entity_type: "LECTURE",
            entity_id: l.id,
            title: l.title,
            subject: l.subject,
            author_name: l.teacher_name || "Educator",
            media_preview_url: l.thumbnail_url,
            video_stream_url: l.video_playback_url,
            status: l.status,
            submitted_by: l.submitted_by,
            submitted_at: l.created_at,
            updated_at: l.updated_at,
            reviewed_by: l.reviewed_by,
            reviewed_at: l.reviewed_at,
            review_note: l.review_note,
          });
        }
      }

      if (materialsRes.data) {
        for (const m of materialsRes.data) {
          items.push({
            entity_type: "STUDY_MATERIAL",
            entity_id: m.id,
            title: m.title,
            subject: m.material_type,
            author_name: "Content Author",
            media_preview_url: m.file_url,
            status: m.status,
            submitted_by: m.submitted_by,
            submitted_at: m.created_at,
            updated_at: m.updated_at,
            reviewed_by: m.reviewed_by,
            reviewed_at: m.reviewed_at,
            review_note: m.review_note,
          });
        }
      }

      if (batchesRes.data) {
        for (const b of batchesRes.data) {
          items.push({
            entity_type: "BATCH",
            entity_id: b.id,
            title: b.title,
            subject: b.board_label,
            author_name: b.educator_name || "Lead Educator",
            media_preview_url: b.educator_avatar_url,
            status: b.status,
            submitted_by: b.submitted_by,
            submitted_at: b.created_at,
            updated_at: b.updated_at,
            reviewed_by: b.reviewed_by,
            reviewed_at: b.reviewed_at,
            review_note: b.review_note,
          });
        }
      }

      items.sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );

      return { data: items, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  /**
   * Super Admin review decision (APPROVE or REJECT) on submitted content.
   */
  static async reviewContentSubmission(
    supabase: SupabaseClient,
    payload: ReviewDecisionRequest,
    reviewerId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    const { entityType, entityId, decision, reviewNote } = payload;

    if (!entityId || !decision) {
      return { success: false, error: new Error("Missing required parameters") };
    }

    if (decision === "REJECTED" && (!reviewNote || reviewNote.trim() === "")) {
      return {
        success: false,
        error: new Error("Rejection reason is required when rejecting a submission"),
      };
    }

    const tableMap: Record<string, string> = {
      LECTURE: "cms_lectures",
      STUDY_MATERIAL: "cms_study_materials",
      BATCH: "cms_batches",
      CHAPTER: "cms_chapters",
      COURSE: "cms_courses",
    };

    const targetTable = tableMap[entityType];
    if (!targetTable) {
      return { success: false, error: new Error(`Invalid entity type: ${entityType}`) };
    }

    try {
      const { data, error } = await supabase
        .from(targetTable)
        .update({
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null,
        })
        .eq("id", entityId)
        .eq("status", "PENDING_REVIEW")
        .select("id, title, submitted_by, educator_id, created_by")
        .single();

      if (error) throw new Error(error.message);

      if (!data) {
        return {
          success: false,
          error: new Error(
            "Invalid transition: Only content in PENDING_REVIEW status can be approved or rejected."
          ),
        };
      }

      // Dispatch notification to educator
      const authorId = data.submitted_by || data.educator_id || data.created_by;
      if (authorId) {
        const { data: reviewer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", reviewerId)
          .single();

        const reviewerName = reviewer?.full_name || "Super Admin";

        if (decision === "REJECTED") {
          await NotificationService.notifyTeacherRevisionRequested(supabase, {
            teacherId: authorId,
            lectureId: entityId,
            title: data.title || "Content Submission",
            reviewerName,
            reviewNote: reviewNote || "Revisions requested by reviewer.",
          });
        } else if (decision === "APPROVED") {
          await NotificationService.notifyTeacherLectureApproved(supabase, {
            teacherId: authorId,
            lectureId: entityId,
            title: data.title || "Content Submission",
            status: "APPROVED",
          });
        }
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  /**
   * Super Admin publishing action: Transitions APPROVED/DRAFT content to PUBLISHED.
   */
  static async publishContent(
    supabase: SupabaseClient,
    entityType: "HERO" | "BATCH" | "LECTURE" | "LIVE_CLASS" | "COURSE" | "CHAPTER" | "STUDY_MATERIAL" | "QUOTE" | "HUB" | "CHATBOT_PROMPT" | "CHATBOT_FAQ",
    entityId: string,
    options?: { displayOrder?: number; startsAt?: string | null; endsAt?: string | null }
  ): Promise<{ success: boolean; error: Error | null }> {
    const tableMap: Record<string, string> = {
      HERO: "cms_hero_banners",
      BATCH: "cms_batches",
      LECTURE: "cms_lectures",
      LIVE_CLASS: "cms_live_classes",
      COURSE: "cms_courses",
      CHAPTER: "cms_chapters",
      STUDY_MATERIAL: "cms_study_materials",
      QUOTE: "cms_daily_quotes",
      HUB: "cms_hub_items",
      CHATBOT_PROMPT: "cms_chatbot_prompts",
      CHATBOT_FAQ: "cms_chatbot_faqs",
    };

    const targetTable = tableMap[entityType];
    if (!targetTable) {
      return { success: false, error: new Error(`Invalid entity type: ${entityType}`) };
    }

    try {
      const updatePayload: Record<string, unknown> = {
        status: "PUBLISHED",
        is_visible: true,
      };

      if (options?.displayOrder !== undefined) updatePayload.display_order = options.displayOrder;
      if (options?.startsAt !== undefined) updatePayload.starts_at = options.startsAt;
      if (options?.endsAt !== undefined) updatePayload.ends_at = options.endsAt;

      const { error } = await supabase
        .from(targetTable)
        .update(updatePayload)
        .eq("id", entityId);

      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  /**
   * Super Admin archive action: Retires content from live discovery.
   */
  static async archiveContent(
    supabase: SupabaseClient,
    table: string,
    entityId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from(table)
        .update({
          status: "ARCHIVED",
          is_visible: false,
        })
        .eq("id", entityId);

      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  /**
   * Super Admin unpublish action: Transitions PUBLISHED content back to DRAFT or APPROVED.
   */
  static async unpublishContent(
    supabase: SupabaseClient,
    entityType: "HERO" | "BATCH" | "LECTURE" | "LIVE_CLASS" | "COURSE" | "CHAPTER" | "STUDY_MATERIAL" | "QUOTE" | "HUB" | "CHATBOT_PROMPT" | "CHATBOT_FAQ",
    entityId: string,
    targetStatus: "DRAFT" | "APPROVED" = "DRAFT"
  ): Promise<{ success: boolean; error: Error | null }> {
    const tableMap: Record<string, string> = {
      HERO: "cms_hero_banners",
      BATCH: "cms_batches",
      LECTURE: "cms_lectures",
      LIVE_CLASS: "cms_live_classes",
      COURSE: "cms_courses",
      CHAPTER: "cms_chapters",
      STUDY_MATERIAL: "cms_study_materials",
      QUOTE: "cms_daily_quotes",
      HUB: "cms_hub_items",
      CHATBOT_PROMPT: "cms_chatbot_prompts",
      CHATBOT_FAQ: "cms_chatbot_faqs",
    };

    const targetTable = tableMap[entityType];
    if (!targetTable) {
      return { success: false, error: new Error(`Invalid entity type: ${entityType}`) };
    }

    try {
      const { error } = await supabase
        .from(targetTable)
        .update({
          status: targetStatus,
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);

      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  /**
   * Quick toggle visibility for any CMS content item.
   */
  static async toggleVisibility(
    supabase: SupabaseClient,
    table: string,
    entityId: string,
    isVisible: boolean
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from(table)
        .update({
          is_visible: isVisible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);

      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  // --------------------------------------------------------------------------
  // 2. Taxonomies & Courses
  // --------------------------------------------------------------------------

  static async getBoards(supabase: SupabaseClient): Promise<CmsBoard[]> {
    const { data } = await supabase
      .from("cms_boards")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsBoard[]) || [];
  }

  static async upsertBoard(
    supabase: SupabaseClient,
    board: Partial<CmsBoard>
  ): Promise<{ data: CmsBoard | null; error: Error | null }> {
    try {
      const payload = {
        ...board,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (board.id) {
        res = await supabase.from("cms_boards").update(payload).eq("id", board.id).select().single();
      } else {
        res = await supabase.from("cms_boards").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsBoard, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getClassLevels(supabase: SupabaseClient): Promise<CmsClassLevel[]> {
    const { data } = await supabase
      .from("cms_class_levels")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsClassLevel[]) || [];
  }

  static async upsertClassLevel(
    supabase: SupabaseClient,
    classLevel: Partial<CmsClassLevel>
  ): Promise<{ data: CmsClassLevel | null; error: Error | null }> {
    try {
      const payload = {
        ...classLevel,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (classLevel.id) {
        res = await supabase.from("cms_class_levels").update(payload).eq("id", classLevel.id).select().single();
      } else {
        res = await supabase.from("cms_class_levels").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsClassLevel, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getSubjects(supabase: SupabaseClient): Promise<CmsSubject[]> {
    const { data } = await supabase
      .from("cms_subjects")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsSubject[]) || [];
  }

  static async upsertSubject(
    supabase: SupabaseClient,
    subject: Partial<CmsSubject>
  ): Promise<{ data: CmsSubject | null; error: Error | null }> {
    try {
      const payload = {
        ...subject,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (subject.id) {
        res = await supabase.from("cms_subjects").update(payload).eq("id", subject.id).select().single();
      } else {
        res = await supabase.from("cms_subjects").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsSubject, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getCourses(
    supabase: SupabaseClient,
    filters?: { boardId?: string; classId?: string; status?: string }
  ): Promise<CmsCourse[]> {
    let query = supabase.from("cms_courses").select("*, board:cms_boards(*), class_level:cms_class_levels(*), subject:cms_subjects(*)");

    if (filters?.boardId) query = query.eq("board_id", filters.boardId);
    if (filters?.classId) query = query.eq("class_id", filters.classId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data } = await query.order("display_order", { ascending: true });
    return (data as CmsCourse[]) || [];
  }

  static async upsertCourse(
    supabase: SupabaseClient,
    course: Partial<CmsCourse>
  ): Promise<{ data: CmsCourse | null; error: Error | null }> {
    try {
      // Remove relation objects before persisting to DB
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { board, class_level, subject, ...cleanCourse } = course;
      const payload = {
        ...cleanCourse,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (cleanCourse.id) {
        res = await supabase.from("cms_courses").update(payload).eq("id", cleanCourse.id).select().single();
      } else {
        res = await supabase.from("cms_courses").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsCourse, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getChapters(
    supabase: SupabaseClient,
    courseId?: string
  ): Promise<CmsChapter[]> {
    let query = supabase.from("cms_chapters").select("*");
    if (courseId) query = query.eq("course_id", courseId);

    const { data } = await query.order("chapter_number", { ascending: true });
    return (data as CmsChapter[]) || [];
  }

  static async upsertChapter(
    supabase: SupabaseClient,
    chapter: Partial<CmsChapter>
  ): Promise<{ data: CmsChapter | null; error: Error | null }> {
    try {
      const payload = {
        ...chapter,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (chapter.id) {
        res = await supabase.from("cms_chapters").update(payload).eq("id", chapter.id).select().single();
      } else {
        res = await supabase.from("cms_chapters").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsChapter, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  // --------------------------------------------------------------------------
  // 3. Batches & Lectures
  // --------------------------------------------------------------------------

  static async getBatches(
    supabase: SupabaseClient,
    filters?: { isFeatured?: boolean; isOngoing?: boolean; status?: string }
  ): Promise<CmsBatch[]> {
    let query = supabase.from("cms_batches").select("*");

    if (filters?.isFeatured !== undefined) query = query.eq("is_featured", filters.isFeatured);
    if (filters?.isOngoing !== undefined) query = query.eq("is_ongoing", filters.isOngoing);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data } = await query.order("display_order", { ascending: true });
    return (data as CmsBatch[]) || [];
  }

  static async upsertBatch(
    supabase: SupabaseClient,
    batch: Partial<CmsBatch>
  ): Promise<{ data: CmsBatch | null; error: Error | null }> {
    try {
      const payload = {
        ...batch,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (batch.id) {
        res = await supabase.from("cms_batches").update(payload).eq("id", batch.id).select().single();
      } else {
        res = await supabase.from("cms_batches").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsBatch, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getLectures(
    supabase: SupabaseClient,
    filters?: { batchId?: string; chapterId?: string; status?: string }
  ): Promise<CmsLecture[]> {
    let query = supabase.from("cms_lectures").select("*");

    if (filters?.batchId) query = query.eq("batch_id", filters.batchId);
    if (filters?.chapterId) query = query.eq("chapter_id", filters.chapterId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data } = await query.order("display_order", { ascending: true });
    return (data as CmsLecture[]) || [];
  }

  static async upsertLecture(
    supabase: SupabaseClient,
    lecture: Partial<CmsLecture>
  ): Promise<{ data: CmsLecture | null; error: Error | null }> {
    try {
      const payload = {
        ...lecture,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (lecture.id) {
        res = await supabase.from("cms_lectures").update(payload).eq("id", lecture.id).select().single();
      } else {
        res = await supabase.from("cms_lectures").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsLecture, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getLiveClasses(supabase: SupabaseClient): Promise<CmsLiveClass[]> {
    const { data } = await supabase
      .from("cms_live_classes")
      .select("*")
      .order("scheduled_start", { ascending: true });
    return (data as CmsLiveClass[]) || [];
  }

  static async upsertLiveClass(
    supabase: SupabaseClient,
    liveClass: Partial<CmsLiveClass>
  ): Promise<{ data: CmsLiveClass | null; error: Error | null }> {
    try {
      const payload = {
        ...liveClass,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (liveClass.id) {
        res = await supabase.from("cms_live_classes").update(payload).eq("id", liveClass.id).select().single();
      } else {
        res = await supabase.from("cms_live_classes").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsLiveClass, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async getStudyMaterials(
    supabase: SupabaseClient,
    filters?: { courseId?: string; chapterId?: string; status?: string }
  ): Promise<CmsStudyMaterial[]> {
    let query = supabase.from("cms_study_materials").select("*");

    if (filters?.courseId) query = query.eq("course_id", filters.courseId);
    if (filters?.chapterId) query = query.eq("chapter_id", filters.chapterId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data } = await query.order("display_order", { ascending: true });
    return (data as CmsStudyMaterial[]) || [];
  }

  static async upsertStudyMaterial(
    supabase: SupabaseClient,
    material: Partial<CmsStudyMaterial>
  ): Promise<{ data: CmsStudyMaterial | null; error: Error | null }> {
    try {
      const payload = {
        ...material,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (material.id) {
        res = await supabase.from("cms_study_materials").update(payload).eq("id", material.id).select().single();
      } else {
        res = await supabase.from("cms_study_materials").insert(payload).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data as CmsStudyMaterial, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  // --------------------------------------------------------------------------
  // 4. Marketing & Portal Widgets
  // --------------------------------------------------------------------------

  static async getHeroBanners(supabase: SupabaseClient): Promise<CmsHeroBanner[]> {
    const { data } = await supabase
      .from("cms_hero_banners")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsHeroBanner[]) || [];
  }

  static async upsertHeroBanner(
    supabase: SupabaseClient,
    banner: Partial<CmsHeroBanner>
  ): Promise<{ data: CmsHeroBanner | null; error: Error | null }> {
    try {
      if (banner.id) {
        const { data, error } = await supabase
          .from("cms_hero_banners")
          .update(banner)
          .eq("id", banner.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsHeroBanner, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_hero_banners")
          .insert(banner)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsHeroBanner, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async deleteHeroBanner(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from("cms_hero_banners").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async getDailyQuotes(supabase: SupabaseClient): Promise<CmsDailyQuote[]> {
    const { data } = await supabase
      .from("cms_daily_quotes")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data as CmsDailyQuote[]) || [];
  }

  static async upsertDailyQuote(
    supabase: SupabaseClient,
    quote: Partial<CmsDailyQuote>
  ): Promise<{ data: CmsDailyQuote | null; error: Error | null }> {
    try {
      if (quote.id) {
        const { data, error } = await supabase
          .from("cms_daily_quotes")
          .update(quote)
          .eq("id", quote.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsDailyQuote, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_daily_quotes")
          .insert(quote)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsDailyQuote, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async toggleActiveDailyQuote(
    supabase: SupabaseClient,
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("cms_daily_quotes")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async deleteDailyQuote(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from("cms_daily_quotes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async getHubItems(supabase: SupabaseClient): Promise<CmsHubItem[]> {
    const { data } = await supabase
      .from("cms_hub_items")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data as CmsHubItem[]) || [];
  }

  static async upsertHubItem(
    supabase: SupabaseClient,
    item: Partial<CmsHubItem>
  ): Promise<{ data: CmsHubItem | null; error: Error | null }> {
    try {
      if (item.id) {
        const { data, error } = await supabase
          .from("cms_hub_items")
          .update(item)
          .eq("id", item.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsHubItem, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_hub_items")
          .insert(item)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsHubItem, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async deleteHubItem(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from("cms_hub_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  // --------------------------------------------------------------------------
  // 5. Chatbot Super Admin Management
  // --------------------------------------------------------------------------

  /**
   * Super Admin full chatbot settings (contains system instructions & model config)
   * Fetched via server-side API proxy to respect column-level database security.
   */
  static async getChatbotAdminSettings(): Promise<CmsChatbotSettings | null> {
    try {
      const res = await fetch("/api/admin/cms/chatbot/settings", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      return (json.data as CmsChatbotSettings) || null;
    } catch {
      return null;
    }
  }

  static async updateChatbotSettings(
    settings: Partial<CmsChatbotSettings>
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const res = await fetch("/api/admin/cms/chatbot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to update chatbot settings.");
      }
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async getChatbotPrompts(supabase: SupabaseClient): Promise<CmsChatbotPrompt[]> {
    const { data } = await supabase
      .from("cms_chatbot_prompts")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsChatbotPrompt[]) || [];
  }

  static async upsertChatbotPrompt(
    supabase: SupabaseClient,
    prompt: Partial<CmsChatbotPrompt>
  ): Promise<{ data: CmsChatbotPrompt | null; error: Error | null }> {
    try {
      if (prompt.id) {
        const { data, error } = await supabase
          .from("cms_chatbot_prompts")
          .update(prompt)
          .eq("id", prompt.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotPrompt, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_chatbot_prompts")
          .insert(prompt)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotPrompt, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async deleteChatbotPrompt(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from("cms_chatbot_prompts").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async getChatbotFaqs(supabase: SupabaseClient): Promise<CmsChatbotFaq[]> {
    const { data } = await supabase
      .from("cms_chatbot_faqs")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsChatbotFaq[]) || [];
  }

  static async upsertChatbotFaq(
    supabase: SupabaseClient,
    faq: Partial<CmsChatbotFaq>
  ): Promise<{ data: CmsChatbotFaq | null; error: Error | null }> {
    try {
      if (faq.id) {
        const { data, error } = await supabase
          .from("cms_chatbot_faqs")
          .update(faq)
          .eq("id", faq.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotFaq, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_chatbot_faqs")
          .insert(faq)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotFaq, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async deleteChatbotFaq(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from("cms_chatbot_faqs").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async getChatbotKnowledgeSources(
    supabase: SupabaseClient
  ): Promise<CmsChatbotKnowledgeSource[]> {
    const { data } = await supabase
      .from("cms_chatbot_knowledge_sources")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as CmsChatbotKnowledgeSource[]) || [];
  }

  static async upsertChatbotKnowledgeSource(
    supabase: SupabaseClient,
    source: Partial<CmsChatbotKnowledgeSource>
  ): Promise<{ data: CmsChatbotKnowledgeSource | null; error: Error | null }> {
    try {
      if (source.id) {
        const { data, error } = await supabase
          .from("cms_chatbot_knowledge_sources")
          .update(source)
          .eq("id", source.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotKnowledgeSource, error: null };
      } else {
        const { data, error } = await supabase
          .from("cms_chatbot_knowledge_sources")
          .insert(source)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { data: data as CmsChatbotKnowledgeSource, error: null };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  static async toggleKnowledgeSourceActive(
    supabase: SupabaseClient,
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("cms_chatbot_knowledge_sources")
        .update({
          is_active: isActive,
          sync_status: isActive ? "PENDING" : "EXCLUDED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async retryKnowledgeSync(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("cms_chatbot_knowledge_sources")
        .update({
          sync_status: "PENDING",
          sync_error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  static async deleteChatbotKnowledgeSource(
    supabase: SupabaseClient,
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("cms_chatbot_knowledge_sources")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error };
    }
  }

  // --------------------------------------------------------------------------
  // 6. Admin / Teacher Educator Content Studio & Submissions
  // --------------------------------------------------------------------------

  static async getEducatorContent(
    supabase: SupabaseClient,
    userId: string
  ): Promise<{ data: EducatorContentItem[]; error: Error | null }> {
    try {
      const items: EducatorContentItem[] = [];

      // 1. Batches
      const { data: batches } = await supabase
        .from("cms_batches")
        .select("*")
        .or(`created_by.eq.${userId},submitted_by.eq.${userId},lead_educator_id.eq.${userId}`);
      if (batches) {
        for (const b of batches) {
          items.push({
            id: b.id,
            entityType: "BATCH",
            title: b.title,
            subtitle: b.subtitle,
            status: b.status,
            is_visible: b.is_visible,
            display_order: b.display_order,
            created_at: b.created_at,
            updated_at: b.updated_at,
            submitted_at: b.created_at,
            reviewed_at: b.reviewed_at,
            reviewed_by: b.reviewed_by,
            review_note: b.review_note,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            details: b,
          });
        }
      }

      // 2. Chapters
      const { data: chapters } = await supabase
        .from("cms_chapters")
        .select("*")
        .or(`created_by.eq.${userId},submitted_by.eq.${userId}`);
      if (chapters) {
        for (const c of chapters) {
          items.push({
            id: c.id,
            entityType: "CHAPTER",
            title: c.title,
            subtitle: `Chapter ${c.chapter_number}`,
            status: c.status,
            is_visible: c.is_visible,
            display_order: c.display_order,
            created_at: c.created_at,
            updated_at: c.updated_at,
            submitted_at: c.created_at,
            reviewed_at: c.reviewed_at,
            reviewed_by: c.reviewed_by,
            review_note: c.review_note,
            starts_at: c.starts_at,
            ends_at: c.ends_at,
            details: c,
          });
        }
      }

      // 3. Lectures
      const { data: lectures } = await supabase
        .from("cms_lectures")
        .select("*")
        .or(`created_by.eq.${userId},submitted_by.eq.${userId},educator_id.eq.${userId}`);
      if (lectures) {
        for (const l of lectures) {
          items.push({
            id: l.id,
            entityType: "LECTURE",
            title: l.title,
            subtitle: `${l.subject} • ${l.duration_human || l.duration_formatted}`,
            status: l.status,
            is_visible: l.is_visible,
            display_order: l.display_order,
            created_at: l.created_at,
            updated_at: l.updated_at,
            submitted_at: l.created_at,
            reviewed_at: l.reviewed_at,
            reviewed_by: l.reviewed_by,
            review_note: l.review_note,
            starts_at: l.starts_at,
            ends_at: l.ends_at,
            details: l,
          });
        }
      }

      // 4. Live Classes
      const { data: liveClasses } = await supabase
        .from("cms_live_classes")
        .select("*")
        .or(`created_by.eq.${userId},submitted_by.eq.${userId},educator_id.eq.${userId}`);
      if (liveClasses) {
        for (const lc of liveClasses) {
          items.push({
            id: lc.id,
            entityType: "LIVE_CLASS",
            title: lc.topic,
            subtitle: `${lc.subject} • ${lc.time_display}`,
            status: lc.status,
            is_visible: lc.is_visible,
            display_order: lc.display_order,
            created_at: lc.created_at,
            updated_at: lc.updated_at,
            submitted_at: lc.created_at,
            reviewed_at: lc.reviewed_at,
            reviewed_by: lc.reviewed_by,
            review_note: lc.review_note,
            starts_at: lc.starts_at,
            ends_at: lc.ends_at,
            details: lc,
          });
        }
      }

      // 5. Study Materials
      const { data: materials } = await supabase
        .from("cms_study_materials")
        .select("*")
        .or(`created_by.eq.${userId},submitted_by.eq.${userId}`);
      if (materials) {
        for (const m of materials) {
          items.push({
            id: m.id,
            entityType: "STUDY_MATERIAL",
            title: m.title,
            subtitle: `Material Type: ${m.material_type.replace(/_/g, " ")}`,
            status: m.status,
            is_visible: m.is_visible,
            display_order: m.display_order,
            created_at: m.created_at,
            updated_at: m.updated_at,
            submitted_at: m.created_at,
            reviewed_at: m.reviewed_at,
            reviewed_by: m.reviewed_by,
            review_note: m.review_note,
            starts_at: m.starts_at,
            ends_at: m.ends_at,
            details: m,
          });
        }
      }

      // Sort by updated_at desc
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { data: items, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: [], error };
    }
  }

  // --------------------------------------------------------------------------
  // 7. Teacher Live & Recorded Lecture Workspace Domain Methods (Phase 4.1 Step 5J)
  // --------------------------------------------------------------------------

  /**
   * Fetches aggregate real database statistics for a specific teacher.
   */
  static async getTeacherStatistics(
    supabase: SupabaseClient,
    teacherId: string
  ): Promise<TeacherStatistics> {
    try {
      const [liveRes, lecturesRes] = await Promise.all([
        supabase
          .from("cms_live_classes")
          .select("id, live_status, scheduled_start")
          .or(`educator_id.eq.${teacherId},created_by.eq.${teacherId}`),
        supabase
          .from("cms_lectures")
          .select("id, status")
          .or(`educator_id.eq.${teacherId},created_by.eq.${teacherId},submitted_by.eq.${teacherId}`),
      ]);

      const liveClasses = liveRes.data || [];
      const lectures = lecturesRes.data || [];

      const stats: TeacherStatistics = {
        totalLiveClasses: liveClasses.length,
        upcomingLiveClasses: liveClasses.filter((c) => c.live_status === "SCHEDULED").length,
        liveNowClasses: liveClasses.filter((c) => c.live_status === "LIVE").length,
        completedLiveClasses: liveClasses.filter((c) => c.live_status === "COMPLETED").length,
        terminatedLiveClasses: liveClasses.filter((c) => c.live_status === "TERMINATED").length,
        totalLecturesSubmitted: lectures.length,
        draftLectures: lectures.filter((l) => l.status === "DRAFT").length,
        pendingReviewLectures: lectures.filter((l) => l.status === "PENDING_REVIEW").length,
        revisionRequestedLectures: lectures.filter((l) => l.status === "REJECTED").length,
        approvedLectures: lectures.filter((l) => l.status === "APPROVED").length,
        publishedLectures: lectures.filter((l) => l.status === "PUBLISHED").length,
      };

      return stats;
    } catch {
      return {
        totalLiveClasses: 0,
        upcomingLiveClasses: 0,
        liveNowClasses: 0,
        completedLiveClasses: 0,
        terminatedLiveClasses: 0,
        totalLecturesSubmitted: 0,
        draftLectures: 0,
        pendingReviewLectures: 0,
        revisionRequestedLectures: 0,
        approvedLectures: 0,
        publishedLectures: 0,
      };
    }
  }

  /**
   * Fetches all live classes for a specific teacher with joined taxonomy details.
   */
  static async getTeacherLiveClasses(
    supabase: SupabaseClient,
    teacherId: string
  ): Promise<CmsLiveClass[]> {
    try {
      const { data, error } = await supabase
        .from("cms_live_classes")
        .select("*, cms_boards(name), cms_class_levels(name), cms_subjects(name), cms_courses(title)")
        .or(`educator_id.eq.${teacherId},created_by.eq.${teacherId}`)
        .order("scheduled_start", { ascending: true });

      if (error) throw new Error(error.message);
      return (data as CmsLiveClass[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetches all recorded lectures for a specific teacher with joined taxonomy details.
   */
  static async getTeacherLectures(
    supabase: SupabaseClient,
    teacherId: string
  ): Promise<CmsLecture[]> {
    try {
      const { data, error } = await supabase
        .from("cms_lectures")
        .select("*, cms_boards(name), cms_class_levels(name), cms_subjects(name), cms_courses(title)")
        .or(`educator_id.eq.${teacherId},created_by.eq.${teacherId},submitted_by.eq.${teacherId}`)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data as CmsLecture[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Generates a recorded lecture draft inheriting Live Class metadata after normal completion.
   */
  static async inheritLiveClassToLectureDraft(
    supabase: SupabaseClient,
    liveClassId: string,
    recordingUrl?: string
  ): Promise<{ data: CmsLecture | null; error: Error | null }> {
    try {
      const { data: liveClass, error: fetchErr } = await supabase
        .from("cms_live_classes")
        .select("*")
        .eq("id", liveClassId)
        .single();

      if (fetchErr || !liveClass) {
        throw new Error(fetchErr?.message || "Live class not found for recording inheritance.");
      }

      const cleanSlug = `${liveClass.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;

      const lecturePayload = {
        title: liveClass.topic,
        slug: cleanSlug,
        subject: liveClass.subject,
        teacher_name: liveClass.educator_name,
        educator_id: liveClass.educator_id || liveClass.created_by,
        board_id: liveClass.board_id,
        class_id: liveClass.class_id,
        subject_id: liveClass.subject_id,
        course_id: liveClass.course_id,
        chapter_id: liveClass.chapter_id,
        batch_id: liveClass.batch_id,
        original_live_class_id: liveClass.id,
        lecture_number: 1,
        description: liveClass.description || `Live recorded lecture from session on ${liveClass.time_display}`,
        duration_formatted: "45:00",
        duration_human: "45 min",
        duration_seconds: 2700,
        thumbnail_url: liveClass.thumbnail_url || liveClass.educator_avatar_url,
        thumbnail_bg: "from-[#0F2042] via-[#162D59] to-[#0A162B]",
        category_tag: "Recorded Live",
        video_stream_id: liveClass.provider_session_id || `rec_${liveClass.id}`,
        video_playback_url: recordingUrl || liveClass.recording_url || liveClass.stream_room_url,
        video_upload_status: "ready",
        status: "DRAFT" as ContentStatus,
        is_visible: true,
        is_home_featured: false,
        is_free_preview: true,
        created_by: liveClass.educator_id || liveClass.created_by,
        submitted_by: liveClass.educator_id || liveClass.created_by,
      };

      const { data, error } = await supabase
        .from("cms_lectures")
        .insert(lecturePayload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as CmsLecture, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  /**
   * Fetches aggregate Live Control Center monitoring data for Super Admin.
   */
  static async getSuperAdminLiveControlData(
    supabase: SupabaseClient
  ): Promise<SuperAdminLiveControlData> {
    try {
      const now = new Date().getTime();
      const tenMinutesMs = 10 * 60 * 1000;

      const [liveRes, teachersRes, lecturesRes] = await Promise.all([
        supabase
          .from("cms_live_classes")
          .select("*, profiles:educator_id(email, full_name, avatar_url)")
          .order("scheduled_start", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("role", ["ADMIN", "SUPER_ADMIN"]),
        supabase
          .from("cms_lectures")
          .select("id, educator_id, created_by, submitted_by, status"),
      ]);

      const rawLive = liveRes.data || [];
      const teachers = teachersRes.data || [];
      const lectures = lecturesRes.data || [];

      const liveControlItems: LiveControlSessionItem[] = rawLive.map((lc) => {
        const startMs = new Date(lc.scheduled_start).getTime();
        return {
          ...lc,
          teacherEmail: lc.profiles?.email,
          canStartEarly: now >= startMs - tenMinutesMs,
          canStudentJoin: lc.live_status === "LIVE" || now >= startMs,
        };
      });

      const liveNow = liveControlItems.filter((i) => i.live_status === "LIVE");
      const upcoming = liveControlItems.filter((i) => i.live_status === "SCHEDULED");
      const completed = liveControlItems.filter((i) => i.live_status === "COMPLETED");
      const terminated = liveControlItems.filter((i) => i.live_status === "TERMINATED");
      const recordingsProcessing = liveControlItems.filter(
        (i) => i.live_status === "COMPLETED" && i.recording_status === "PROCESSING"
      );
      const recordingsAwaitingReview = liveControlItems.filter(
        (i) => i.live_status === "COMPLETED" && (i.recording_status === "READY" || i.recording_status === "NONE")
      );

      // Aggregate stats per teacher
      const teacherStats: TeacherSummaryStats[] = teachers.map((t) => {
        const tLive = rawLive.filter((l) => l.educator_id === t.id || l.created_by === t.id);
        const tLectures = lectures.filter((lec) => lec.educator_id === t.id || lec.created_by === t.id || lec.submitted_by === t.id);

        return {
          teacherId: t.id,
          teacherName: t.full_name || "Educator",
          teacherAvatarUrl: t.avatar_url,
          teacherEmail: t.email,
          liveClassesConducted: tLive.filter((l) => l.live_status === "LIVE" || l.live_status === "COMPLETED").length,
          upcomingLiveClasses: tLive.filter((l) => l.live_status === "SCHEDULED").length,
          completedLiveClasses: tLive.filter((l) => l.live_status === "COMPLETED").length,
          terminatedLiveClasses: tLive.filter((l) => l.live_status === "TERMINATED").length,
          recordedLecturesSubmitted: tLectures.length,
          pendingReviewLectures: tLectures.filter((l) => l.status === "PENDING_REVIEW").length,
          approvedLectures: tLectures.filter((l) => l.status === "APPROVED").length,
          publishedLectures: tLectures.filter((l) => l.status === "PUBLISHED").length,
          revisionRequestedLectures: tLectures.filter((l) => l.status === "REJECTED").length,
        };
      });

      return {
        liveNow,
        upcoming,
        completed,
        terminated,
        recordingsProcessing,
        recordingsAwaitingReview,
        teacherStats,
      };
    } catch {
      return {
        liveNow: [],
        upcoming: [],
        completed: [],
        terminated: [],
        recordingsProcessing: [],
        recordingsAwaitingReview: [],
        teacherStats: [],
      };
    }
  }
}

