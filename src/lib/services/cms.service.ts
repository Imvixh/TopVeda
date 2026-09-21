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
  ReviewDecisionRequest,
} from "@/types/cms.types";

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
      const { error } = await supabase
        .from(targetTable)
        .update({
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null,
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

  static async getLiveClasses(supabase: SupabaseClient): Promise<CmsLiveClass[]> {
    const { data } = await supabase
      .from("cms_live_classes")
      .select("*")
      .order("scheduled_start", { ascending: true });
    return (data as CmsLiveClass[]) || [];
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

  static async getDailyQuotes(supabase: SupabaseClient): Promise<CmsDailyQuote[]> {
    const { data } = await supabase
      .from("cms_daily_quotes")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as CmsDailyQuote[]) || [];
  }

  static async getHubItems(supabase: SupabaseClient): Promise<CmsHubItem[]> {
    const { data } = await supabase
      .from("cms_hub_items")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsHubItem[]) || [];
  }

  // --------------------------------------------------------------------------
  // 5. Chatbot Super Admin Management
  // --------------------------------------------------------------------------

  /**
   * Super Admin full chatbot settings (contains system instructions & model config)
   */
  static async getChatbotAdminSettings(
    supabase: SupabaseClient
  ): Promise<CmsChatbotSettings | null> {
    const { data } = await supabase
      .from("cms_chatbot_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    return (data as CmsChatbotSettings) || null;
  }

  static async updateChatbotSettings(
    supabase: SupabaseClient,
    settings: Partial<CmsChatbotSettings>
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      // If a settings row exists, update it. If not, insert initial singleton row.
      const { data: existing } = await supabase
        .from("cms_chatbot_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      let error;
      if (existing) {
        const res = await supabase
          .from("cms_chatbot_settings")
          .update(settings)
          .eq("id", existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from("cms_chatbot_settings")
          .insert(settings);
        error = res.error;
      }

      if (error) throw new Error(error.message);
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

  static async getChatbotFaqs(supabase: SupabaseClient): Promise<CmsChatbotFaq[]> {
    const { data } = await supabase
      .from("cms_chatbot_faqs")
      .select("*")
      .order("display_order", { ascending: true });
    return (data as CmsChatbotFaq[]) || [];
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
}
