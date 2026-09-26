import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import {
  DAILY_MOTIVATION_QUOTE,
  CHATBOT_CONFIG,
} from "@/config/student-home.config";
import {
  HeroSlide,
  FeaturedBatch,
  OngoingBatch,
  LiveClass,
  Lecture,
  CourseItem,
  HubItem,
  DailyQuote,
  ChatbotConfig,
} from "@/types/student-home.types";
import { formatLiveTimeDisplay } from "@/lib/utils/timezone";

export interface StudentHomeAggregatedData {
  heroSlides: HeroSlide[];
  featuredBatches: FeaturedBatch[];
  ongoingBatches: OngoingBatch[];
  liveClassesToday: LiveClass[];
  latestLectures: Lecture[];
  exploreCourses: CourseItem[];
  whatsHappening: HubItem[];
  dailyQuote: DailyQuote;
  chatbotConfig: ChatbotConfig;
}

function getDefaultClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * 1. Fetch Published Hero Carousel Banners
 */
export async function fetchPublishedHeroBanners(
  client?: SupabaseClient
): Promise<HeroSlide[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_hero_banners")
      .select("id, tagline, title, subtitle, cta_text, cta_link, quote_text, character_image_url, display_order")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch hero banners:", error.message);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      tagline: b.tagline,
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.cta_text,
      ctaLink: b.cta_link,
      quote: b.quote_text,
      characterImage: b.character_image_url,
    }));
  } catch {
    return [];
  }
}

/**
 * 2. Fetch Published Featured Batches (Section 1)
 */
export async function fetchPublishedFeaturedBatches(
  client?: SupabaseClient
): Promise<FeaturedBatch[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_batches")
      .select("id, title, subtitle, board_label, badge_text, badge_variant, educator_name, educator_avatar_url, bg_gradient, border_color, icon_type, display_order")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .eq("is_featured", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch featured batches:", error.message);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      badge: {
        text: b.badge_text || "Featured",
        variant: (b.badge_variant as "orange" | "pink" | "green" | "purple") || "orange",
      },
      board: b.board_label,
      title: b.title,
      subtitle: b.subtitle,
      educatorName: b.educator_name,
      educatorAvatar: b.educator_avatar_url,
      bgGradient: b.bg_gradient,
      borderColor: b.border_color,
      iconType: (b.icon_type as "math" | "science" | "foundation" | "medical") || "math",
    }));
  } catch {
    return [];
  }
}

/**
 * 3. Fetch Published Ongoing Batches (Section 2)
 */
export async function fetchPublishedOngoingBatches(
  client?: SupabaseClient
): Promise<OngoingBatch[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_batches")
      .select("id, title, board_label, badge_text, status_type, cta_text, icon_bg, icon_color, icon_type, display_order")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .eq("is_ongoing", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch ongoing batches:", error.message);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      badge: b.badge_text || b.board_label,
      batchName: b.title,
      subject: b.board_label,
      status: b.status_type === "live" ? "Live Now" : "Ongoing",
      statusType: (b.status_type as "live" | "ongoing") || "ongoing",
      ctaText: b.cta_text || "Explore →",
      iconBg: b.icon_bg || "bg-emerald-50 border-emerald-100 text-emerald-600",
      iconColor: b.icon_color || "text-emerald-600",
      iconType: (b.icon_type as "target" | "atom" | "book" | "academy" | "medical") || "book",
    }));
  } catch {
    return [];
  }
}

function formatAvatarUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || urlOrPath === "undefined" || urlOrPath === "null") return "";
  const clean = urlOrPath.trim();
  if (!clean || clean.startsWith("/avatars/default_teacher.jpg")) return "";
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/")) {
    return clean;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (supabaseUrl) {
    const normalizedPath = clean.startsWith("avatars/") ? clean.replace(/^avatars\//, "") : clean;
    return `${supabaseUrl}/storage/v1/object/public/avatars/${normalizedPath}`;
  }
  return clean;
}

/**
 * 4. Fetch Published Live Classes Today (Section 3)
 */
export async function fetchPublishedLiveClasses(
  client?: SupabaseClient
): Promise<LiveClass[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_live_classes")
      .select("id, is_live, status_text, live_status, subject, topic, educator_name, educator_avatar_url, thumbnail_url, time_display, cta_text, scheduled_start, display_order, educator_id, created_by, profiles:educator_id(avatar_url, full_name), creator_profile:created_by(avatar_url, full_name)")
      .eq("is_visible", true)
      .in("live_status", ["SCHEDULED", "LIVE"])
      .order("scheduled_start", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch live classes:", error.message);
      return [];
    }

    const nowMs = Date.now();
    return (data || []).map((l) => {
      const scheduledStartMs = l.scheduled_start ? new Date(l.scheduled_start).getTime() : 0;
      const isLiveActive = l.live_status === "LIVE" || l.is_live;
      const isLiveNow = isLiveActive && (scheduledStartMs === 0 || nowMs >= scheduledStartMs);

      // Resolve Teacher Profile: profiles.avatar_url > educator_avatar_url > thumbnail_url
      const profileData = (l.profiles || l.creator_profile) as { avatar_url?: string; full_name?: string } | null;
      const resolvedAvatar =
        formatAvatarUrl(profileData?.avatar_url) ||
        formatAvatarUrl(l.educator_avatar_url) ||
        formatAvatarUrl(l.thumbnail_url) ||
        "";

      return {
        id: l.id,
        isLive: isLiveNow,
        statusText: isLiveNow ? "LIVE" : "UPCOMING",
        subject: l.subject,
        topic: l.topic,
        educatorName: profileData?.full_name || l.educator_name || "Educator",
        educatorAvatar: resolvedAvatar,
        time: l.scheduled_start ? formatLiveTimeDisplay(l.scheduled_start) : l.time_display,
        ctaText: isLiveNow ? "Join Class" : (l.cta_text || "Reminder"),
        ctaVariant: isLiveNow ? "primary" : "reminder",
      };
    });
  } catch {
    return [];
  }
}

/**
 * 5. Fetch Published Latest Lectures (Section 4)
 */
export async function fetchPublishedLatestLectures(
  client?: SupabaseClient
): Promise<Lecture[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_lectures")
      .select("id, title, subject, teacher_name, duration_human, duration_formatted, thumbnail_bg, category_tag, display_order, is_home_featured, created_at")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .order("is_home_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch lectures:", error.message);
      return [];
    }

    return (data || []).map((l) => ({
      id: l.id,
      title: l.title,
      subject: l.subject,
      teacherName: l.teacher_name,
      duration: l.duration_human || "45 min",
      durationFormatted: l.duration_formatted || "45:00",
      thumbnailBg: l.thumbnail_bg || "from-[#0F2042] via-[#162D59] to-[#0A162B]",
      categoryTag: l.category_tag,
    }));
  } catch {
    return [];
  }
}

/**
 * 6. Fetch Published Explore Courses Catalog (Section 5)
 */
export async function fetchPublishedCourses(
  client?: SupabaseClient
): Promise<CourseItem[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_courses")
      .select("id, title, category, icon_color, icon_bg, icon_type, display_order")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch courses:", error.message);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      iconColor: c.icon_color || "text-brand-orange",
      iconBg: c.icon_bg || "bg-rose-50 border-rose-100",
      iconType: (c.icon_type as CourseItem["iconType"]) || "school",
    }));
  } catch {
    return [];
  }
}

/**
 * 7. Fetch Published Student Portal Hub Items (Section 6)
 */
export async function fetchPublishedHubItems(
  client?: SupabaseClient
): Promise<HubItem[]> {
  const supabase = client || getDefaultClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("cms_hub_items")
      .select("id, category, badge_text, badge_variant, title, description, cta_text, cta_link, icon_type, display_order")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch hub items:", error.message);
      return [];
    }

    return (data || []).map((h) => ({
      id: h.id,
      category: (h.category as HubItem["category"]) || "announcement",
      badgeText: h.badge_text,
      badgeVariant: (h.badge_variant as HubItem["badgeVariant"]) || "orange",
      title: h.title,
      description: h.description,
      ctaText: h.cta_text,
      ctaLink: h.cta_link,
      iconType: (h.icon_type as HubItem["iconType"]) || "megaphone",
    }));
  } catch {
    return [];
  }
}

/**
 * 8. Fetch Active Daily Motivation Quote (Sidebar)
 */
export async function fetchActiveDailyQuote(
  client?: SupabaseClient
): Promise<DailyQuote> {
  const supabase = client || getDefaultClient();
  if (!supabase) return DAILY_MOTIVATION_QUOTE;

  try {
    const { data, error } = await supabase
      .from("cms_daily_quotes")
      .select("quote, author, is_active")
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch daily quote:", error.message);
      return DAILY_MOTIVATION_QUOTE;
    }

    if (!data) {
      // Super Admin deactivated or archived all quotes -> do NOT resurrect static config
      return {
        quote: "",
        author: "",
        active: false,
      };
    }

    return {
      quote: data.quote,
      author: data.author || "TopVeda",
      active: data.is_active,
    };
  } catch {
    return DAILY_MOTIVATION_QUOTE;
  }
}

/**
 * 9. Fetch Public Chatbot Display Configuration
 */
export async function fetchPublicChatbotConfig(
  client?: SupabaseClient
): Promise<ChatbotConfig> {
  const supabase = client || getDefaultClient();
  if (!supabase) return CHATBOT_CONFIG;

  try {
    const { data, error } = await supabase
      .from("cms_chatbot_settings")
      .select("id, is_enabled, name, welcome_message, placeholder_text, external_url, maintenance_mode, maintenance_message")
      .eq("status", "PUBLISHED")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[StudentHomeService] Failed to fetch chatbot settings:", error.message);
      return CHATBOT_CONFIG;
    }

    if (!data) {
      // Super Admin disabled chatbot or archived settings -> do NOT resurrect enabled static config
      return {
        ...CHATBOT_CONFIG,
        enabled: false,
      };
    }

    return {
      enabled: data.is_enabled && !data.maintenance_mode,
      name: data.name || "TopVeda AI",
      welcomeMessage: data.maintenance_mode
        ? (data.maintenance_message || "TopVeda AI is undergoing scheduled maintenance.")
        : (data.welcome_message || CHATBOT_CONFIG.welcomeMessage),
      placeholderText: data.placeholder_text || CHATBOT_CONFIG.placeholderText,
      externalUrl: data.external_url || undefined,
    };
  } catch {
    return CHATBOT_CONFIG;
  }
}

/**
 * Aggregated Master Retrieval Function for Student Home discovery page.
 * Uses parallel domain queries to fetch live published CMS data.
 */
export async function getStudentHomeData(
  client?: SupabaseClient
): Promise<StudentHomeAggregatedData> {
  try {
    const [
      heroResult,
      featuredBatchesResult,
      ongoingBatchesResult,
      liveClassesResult,
      lecturesResult,
      coursesResult,
      hubResult,
      quoteResult,
      chatbotResult,
    ] = await Promise.allSettled([
      fetchPublishedHeroBanners(client),
      fetchPublishedFeaturedBatches(client),
      fetchPublishedOngoingBatches(client),
      fetchPublishedLiveClasses(client),
      fetchPublishedLatestLectures(client),
      fetchPublishedCourses(client),
      fetchPublishedHubItems(client),
      fetchActiveDailyQuote(client),
      fetchPublicChatbotConfig(client),
    ]);

    return {
      heroSlides: heroResult.status === "fulfilled" ? heroResult.value : [],
      featuredBatches: featuredBatchesResult.status === "fulfilled" ? featuredBatchesResult.value : [],
      ongoingBatches: ongoingBatchesResult.status === "fulfilled" ? ongoingBatchesResult.value : [],
      liveClassesToday: liveClassesResult.status === "fulfilled" ? liveClassesResult.value : [],
      latestLectures: lecturesResult.status === "fulfilled" ? lecturesResult.value : [],
      exploreCourses: coursesResult.status === "fulfilled" ? coursesResult.value : [],
      whatsHappening: hubResult.status === "fulfilled" ? hubResult.value : [],
      dailyQuote: quoteResult.status === "fulfilled" ? quoteResult.value : DAILY_MOTIVATION_QUOTE,
      chatbotConfig: chatbotResult.status === "fulfilled" ? chatbotResult.value : CHATBOT_CONFIG,
    };
  } catch (error) {
    console.error("[StudentHomeService] Aggregated retrieval failed:", error);
    return {
      heroSlides: [],
      featuredBatches: [],
      ongoingBatches: [],
      liveClassesToday: [],
      latestLectures: [],
      exploreCourses: [],
      whatsHappening: [],
      dailyQuote: DAILY_MOTIVATION_QUOTE,
      chatbotConfig: CHATBOT_CONFIG,
    };
  }
}
