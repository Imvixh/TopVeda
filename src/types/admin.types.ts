/**
 * Admin CMS & Dynamic Platform Settings Models
 * Allows admins to configure landing-page content, featured courses, highlights, FAQs, and social links.
 */

export interface FeaturedCourseConfig {
  id: string;
  courseId: string;
  badgeText?: string;
  priorityOrder: number;
  isActive: boolean;
}

export interface ExamCategoryConfig {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  boardCode?: string;
  classCode?: string;
  iconName?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface PlatformHighlightConfig {
  id: string;
  title: string;
  description: string;
  iconName: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FaqItemConfig {
  id: string;
  question: string;
  answer: string;
  category: "general" | "courses" | "tests" | "technical" | "admissions";
  displayOrder: number;
  isActive: boolean;
}

export interface TestimonialConfig {
  id: string;
  studentName: string;
  studentClass: string;
  examName: string;
  scoreOrRank?: string;
  quote: string;
  avatarUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export type SupportedSocialPlatform = "x" | "youtube" | "instagram" | "facebook" | "telegram" | "linkedin";

export interface SocialLinkConfig {
  platform: SupportedSocialPlatform;
  url: string;
  label: string;
  isActive: boolean;
}

export interface PlatformSettings {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  supportHours: string;
  socialLinks: SocialLinkConfig[];
  isRegistrationOpen: boolean;
  maintenanceMode: boolean;
  announcementBanner?: {
    enabled: boolean;
    text: string;
    linkUrl?: string;
  };
}
