export interface HeroSlide {
  id: string;
  tagline: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  quote?: string;
  characterImage: string;
}

export interface FeaturedBatch {
  id: string;
  badge: {
    text: string;
    variant: "orange" | "pink" | "green" | "purple";
  };
  board: string;
  title: string;
  subtitle: string;
  educatorName: string;
  educatorAvatar: string;
  bgGradient: string;
  borderColor: string;
  iconType: "math" | "science" | "foundation" | "medical";
}

export interface OngoingBatch {
  id: string;
  badge: string;
  batchName: string;
  subject: string;
  status: "Live Now" | "Ongoing";
  statusType: "live" | "ongoing";
  ctaText: string;
  iconBg: string;
  iconColor: string;
  iconType: "target" | "atom" | "book" | "academy" | "medical";
}

export interface LiveClass {
  id: string;
  isLive: boolean;
  statusText: string;
  subject: string;
  topic: string;
  educatorName: string;
  educatorAvatar: string;
  time: string;
  ctaText: string;
  ctaVariant: "primary" | "reminder";
}

export interface Lecture {
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  duration: string;
  durationFormatted: string;
  thumbnailBg: string;
  categoryTag: string;
  educatorAvatar?: string;
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  iconColor: string;
  iconBg: string;
  iconType: "school" | "flask" | "book" | "atom" | "shield" | "briefcase" | "test-tube" | "stethoscope";
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badgeCount?: number;
  isActive?: boolean;
}

export interface HubItem {
  id: string;
  category: "announcement" | "material" | "live" | "tip";
  badgeText: string;
  badgeVariant: "orange" | "sky" | "purple" | "emerald";
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  iconType: "megaphone" | "book" | "target" | "lightbulb";
}

export interface ChatbotConfig {
  enabled: boolean;
  name: string;
  welcomeMessage: string;
  placeholderText: string;
  externalUrl?: string;
}

export interface DailyQuote {
  quote: string;
  author: string;
  active: boolean;
}
