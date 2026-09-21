import * as React from "react";
import { GalleryHorizontal } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function HeroBannersPage() {
  return (
    <CmsPlaceholderPage
      title="Hero Banners & Carousel"
      section="CONTENT"
      description="Manage the student portal home carousel banners, inspirational quotes, promotional badges, character art, and call-to-action redirect links."
      icon={GalleryHorizontal}
      targetTable="cms_hero_banners"
      capabilities={[
        "Carousel slide sequencing and reordering (display_order)",
        "Hero tagline, title, subtitle, and quote text management",
        "CTA button text and target navigation URL configuration",
        "Public Supabase Storage banner graphic and avatar integration",
        "Schedule window enforcement (starts_at and ends_at)",
        "Instant toggle for visibility and live status (PUBLISHED / DRAFT)",
      ]}
    />
  );
}
