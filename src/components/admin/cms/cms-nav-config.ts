import {
  LayoutDashboard,
  GalleryHorizontal,
  GraduationCap,
  Layers,
  Video,
  Radio,
  FileText,
  Landmark,
  School,
  BookOpen,
  ListOrdered,
  Megaphone,
  Sparkles,
  FileCheck2,
  Bot,
  Terminal,
  HelpCircle,
  Database,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { YoutubeIcon } from "@/components/brand/youtube-icon";

export interface CmsNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "primary" | "peach" | "outline" | "neutral" | "success";
}

export interface CmsNavSection {
  section: string;
  items: CmsNavItem[];
}

export const CMS_NAV_SECTIONS: CmsNavSection[] = [
  {
    section: "CONTENT",
    items: [
      {
        title: "Dashboard",
        href: "/admin/cms",
        icon: LayoutDashboard,
        description: "CMS overview, metrics, and quick governance shortcuts.",
      },
      {
        title: "Hero Banners",
        href: "/admin/cms/hero",
        icon: GalleryHorizontal,
        description: "Homepage hero carousel slides, taglines, quotes, and CTA links.",
      },
      {
        title: "Courses",
        href: "/admin/cms/courses",
        icon: GraduationCap,
        description: "Course master catalog linked to boards, classes, and subjects.",
      },
      {
        title: "Batches",
        href: "/admin/cms/batches",
        icon: Layers,
        description: "Featured and ongoing batch offerings, educators, and enrollment CTAs.",
      },
      {
        title: "Lectures",
        href: "/admin/cms/lectures",
        icon: Video,
        description: "Recorded video lectures, durations, thumbnails, and preview access.",
      },
      {
        title: "Live Classes",
        href: "/admin/cms/live-classes",
        icon: Radio,
        description: "Scheduled and active live interactive classroom sessions.",
      },
      {
        title: "Study Materials",
        href: "/admin/cms/study-materials",
        icon: FileText,
        description: "Formula sheets, revision notes, NCERT solutions, and PYQ papers.",
      },
    ],
  },
  {
    section: "ACADEMIC",
    items: [
      {
        title: "Boards",
        href: "/admin/cms/boards",
        icon: Landmark,
        description: "Educational boards taxonomy (CBSE, ICSE, State Boards).",
      },
      {
        title: "Classes",
        href: "/admin/cms/classes",
        icon: School,
        description: "Academic class levels (Class 9, 10, 11, 12, Dropper).",
      },
      {
        title: "Subjects",
        href: "/admin/cms/subjects",
        icon: BookOpen,
        description: "Core subjects catalog (Mathematics, Physics, Chemistry, Biology).",
      },
      {
        title: "Chapters",
        href: "/admin/cms/chapters",
        icon: ListOrdered,
        description: "Chapter hierarchy, syllabus sequences, and curriculum mapping.",
      },
    ],
  },
  {
    section: "ENGAGEMENT",
    items: [
      {
        title: "Hub / Announcements",
        href: "/admin/cms/hub",
        icon: Megaphone,
        description: "Student portal announcements, exam updates, and learning tips.",
      },
      {
        title: "Daily Motivation",
        href: "/admin/cms/quotes",
        icon: Sparkles,
        description: "Daily motivational quotes and inspirational messages.",
      },
    ],
  },
  {
    section: "REVIEW",
    items: [
      {
        title: "Pending Reviews",
        href: "/admin/cms/reviews",
        icon: FileCheck2,
        description: "Teacher submissions awaiting Super Admin verification and approval.",
      },
    ],
  },
  {
    section: "AI CHATBOT",
    items: [
      {
        title: "Overview & Settings",
        href: "/admin/cms/chatbot",
        icon: Bot,
        description: "Bot personality, model configuration, rate limits, and scopes.",
      },
      {
        title: "Prompts",
        href: "/admin/cms/chatbot/prompts",
        icon: Terminal,
        description: "Preset student query prompt starters and academic templates.",
      },
      {
        title: "FAQs",
        href: "/admin/cms/chatbot/faqs",
        icon: HelpCircle,
        description: "Academic and platform frequently asked questions.",
      },
      {
        title: "Knowledge Sources",
        href: "/admin/cms/chatbot/knowledge",
        icon: Database,
        description: "Curriculum specifications, courses, and verified knowledge sync.",
      },
    ],
  },
  {
    section: "INTEGRATIONS",
    items: [
      {
        title: "YouTube Integration",
        href: "/admin/cms/integrations/youtube",
        icon: YoutubeIcon as unknown as LucideIcon,
        description: "Google OAuth connection, YouTube channel status, and live broadcast identity.",
        badge: "Phase 6A",
        badgeVariant: "primary",
      },
    ],
  },
  {
    section: "ADMINISTRATION",
    items: [
      {
        title: "Admin Applications",
        href: "/admin/applications",
        icon: ClipboardCheck,
        description: "Review educator verification credentials and grant admin privileges.",
      },
    ],
  },
];
