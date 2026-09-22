/**
 * TopVeda — Phase 4.1 Content Management System (CMS) & Chatbot Types
 * Standard TypeScript definitions for CMS entities, review queues, audit metadata, and API payloads.
 */

export type ContentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type BatchBadgeVariant = "orange" | "pink" | "green" | "purple";

export type LiveClassStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";

export type HubCategory = "announcement" | "material" | "live" | "tip";

export type ChatbotModelProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "cloudflare_workers_ai"
  | "custom";

export type ChatbotSourceType =
  | "COURSE"
  | "CHAPTER"
  | "STUDY_MATERIAL"
  | "FAQ"
  | "CURRICULUM_SPEC";

export type ChatbotSyncStatus = "PENDING" | "SYNCED" | "FAILED" | "EXCLUDED";

export interface CmsAuditMetadata {
  created_by?: string | null;
  updated_by?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  updated_at: string;
  display_order: number;
  is_visible: boolean;
  status: ContentStatus;
}

// 1. Boards
export interface CmsBoard extends CmsAuditMetadata {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  icon_name?: string | null;
}

// 2. Class Levels
export interface CmsClassLevel extends CmsAuditMetadata {
  id: string;
  name: string;
  code: string;
  slug: string;
}

// 3. Subjects
export interface CmsSubject extends CmsAuditMetadata {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  icon_name?: string | null;
  icon_color?: string | null;
  icon_bg?: string | null;
}

// 4. Courses
export interface CmsCourse extends CmsAuditMetadata {
  id: string;
  board_id: string;
  class_id: string;
  subject_id: string;
  title: string;
  category: string;
  slug: string;
  short_description?: string | null;
  thumbnail_url?: string | null;
  icon_type?: string | null;
  icon_color?: string | null;
  icon_bg?: string | null;
  is_featured: boolean;
  // Joined relation fields
  board?: CmsBoard;
  class_level?: CmsClassLevel;
  subject?: CmsSubject;
}

// 5. Batches
export interface CmsBatch extends CmsAuditMetadata {
  id: string;
  course_id?: string | null;
  board_id: string;
  class_id: string;
  title: string;
  slug: string;
  board_label: string;
  subtitle: string;
  description?: string | null;
  badge_text?: string | null;
  badge_variant: BatchBadgeVariant;
  is_featured: boolean;
  is_ongoing: boolean;
  status_type: "live" | "ongoing";
  educator_name: string;
  educator_avatar_url: string;
  lead_educator_id?: string | null;
  bg_gradient: string;
  border_color: string;
  icon_type: string;
  icon_bg: string;
  icon_color: string;
  cta_text: string;
  cta_link: string;
}

// 6. Chapters
export interface CmsChapter extends CmsAuditMetadata {
  id: string;
  course_id: string;
  batch_id?: string | null;
  title: string;
  slug: string;
  chapter_number: number;
  description?: string | null;
}

// 7. Lectures
export interface CmsLecture extends CmsAuditMetadata {
  id: string;
  chapter_id?: string | null;
  batch_id?: string | null;
  title: string;
  slug: string;
  subject: string;
  teacher_name: string;
  educator_id?: string | null;
  duration_seconds: number;
  duration_formatted: string;
  duration_human: string;
  thumbnail_url: string;
  thumbnail_bg: string;
  category_tag: string;
  video_stream_id?: string | null;
  video_playback_url?: string | null;
  video_upload_status: string;
  is_home_featured: boolean;
  is_free_preview: boolean;
}

// 8. Live Classes
export interface CmsLiveClass extends CmsAuditMetadata {
  id: string;
  batch_id?: string | null;
  subject: string;
  topic: string;
  educator_name: string;
  educator_avatar_url: string;
  educator_id?: string | null;
  scheduled_start: string;
  scheduled_end?: string | null;
  time_display: string;
  is_live: boolean;
  status_text: string;
  live_status: LiveClassStatus;
  cta_text: string;
  stream_room_url?: string | null;
}

// 9. Hero Banners
export interface CmsHeroBanner extends CmsAuditMetadata {
  id: string;
  tagline: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  quote_text: string;
  character_image_url: string;
  bg_gradient: string;
}

// 10. Daily Quotes
export interface CmsDailyQuote extends CmsAuditMetadata {
  id: string;
  quote: string;
  author: string;
  is_active: boolean;
  scheduled_for_date?: string | null;
}

// 11. Hub Items
export interface CmsHubItem extends CmsAuditMetadata {
  id: string;
  category: HubCategory;
  badge_text: string;
  badge_variant: string;
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
  icon_type: string;
}

// 12. Study Materials
export interface CmsStudyMaterial extends CmsAuditMetadata {
  id: string;
  course_id?: string | null;
  chapter_id?: string | null;
  title: string;
  material_type: "formula_sheet" | "notes" | "ncert_solution" | "pyq_paper";
  file_url: string;
  file_size_bytes?: number | null;
  page_count?: number | null;
  download_count: number;
}

// 13. Chatbot Settings
export interface CmsChatbotSettings extends CmsAuditMetadata {
  id: string;
  is_enabled: boolean;
  name: string;
  greeting: string;
  welcome_message: string;
  placeholder_text: string;
  external_url?: string | null;
  system_instructions: string;
  academic_scope: {
    boards?: string[];
    classes?: string[];
    subjects?: string[];
    [key: string]: unknown;
  };
  portal_visibility: {
    student_home?: boolean;
    batch_room?: boolean;
    doubt_section?: boolean;
    [key: string]: unknown;
  };
  maintenance_mode: boolean;
  maintenance_message: string;
  rate_limit_per_minute: number;
  max_daily_queries_per_student: number;
  model_provider: ChatbotModelProvider;
  model_name: string;
  temperature: number;
  max_tokens: number;
}

// 14. Chatbot Prompts
export interface CmsChatbotPrompt extends CmsAuditMetadata {
  id: string;
  prompt_text: string;
  category_tag: string;
  icon_name: string;
}

// 15. Chatbot FAQs
export interface CmsChatbotFaq extends CmsAuditMetadata {
  id: string;
  question: string;
  answer: string;
  category: string;
  search_tags: string[];
}

// 16. Chatbot Knowledge Sources
export interface CmsChatbotKnowledgeSource {
  id: string;
  source_type: ChatbotSourceType;
  source_id: string;
  title: string;
  description?: string | null;
  sync_status: ChatbotSyncStatus;
  last_synced_at?: string | null;
  sync_error_message?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at: string;
  updated_at: string;
}

// 17. Review Queue Item
export interface CmsPendingReviewItem {
  entity_type: "LECTURE" | "STUDY_MATERIAL" | "BATCH" | "CHAPTER" | "COURSE";
  entity_id: string;
  title: string;
  subject: string;
  author_name: string;
  media_preview_url?: string | null;
  video_stream_url?: string | null;
  status: ContentStatus;
  submitted_by?: string | null;
  submitted_at: string;
  updated_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_name?: string | null;
  review_note?: string | null;
}

// API DTOs
export interface ReviewDecisionRequest {
  entityType: "LECTURE" | "STUDY_MATERIAL" | "BATCH" | "CHAPTER" | "COURSE";
  entityId: string;
  decision: "APPROVED" | "REJECTED";
  reviewNote?: string;
}

export interface PublishContentRequest {
  entityType: "HERO" | "BATCH" | "LECTURE" | "LIVE_CLASS" | "COURSE" | "CHAPTER" | "STUDY_MATERIAL" | "QUOTE" | "HUB" | "CHATBOT_PROMPT" | "CHATBOT_FAQ";
  entityId: string;
  displayOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface SubmitForReviewRequest {
  entityType: "BATCH" | "CHAPTER" | "LECTURE" | "LIVE_CLASS" | "STUDY_MATERIAL";
  entityId: string;
}

export interface EducatorContentItem {
  id: string;
  entityType: "BATCH" | "CHAPTER" | "LECTURE" | "LIVE_CLASS" | "STUDY_MATERIAL";
  title: string;
  subtitle?: string | null;
  status: ContentStatus;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewer_name?: string | null;
  review_note?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  details?: Record<string, unknown>;
}

