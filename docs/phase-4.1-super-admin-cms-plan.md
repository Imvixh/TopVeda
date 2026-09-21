# TopVeda — Phase 4.1 Super Admin Content Management System (CMS) Architecture & Implementation Plan

> **Status:** Architectural Design Document (Prepared for Phase 4.1)  
> **Target Audience:** Core Engineering Team, Super Admin, Lead Architect  
> **Strict Phase Boundary:** This document outlines the technical design for Phase 4.1. **No database tables, migrations, RLS policies, or backend CMS routes are implemented during Phase 4.**

---

## 1. Phase 4.1 Objective

The primary objective of **Phase 4.1** is to build the **Super Admin Content Management System (CMS)** that enables TopVeda Super Administrators to manage, curate, reorder, and publish discovery content across the TopVeda Student Portal Home page (`/student`).

The Student Home UI implemented in Phase 4 acts as the presentation layer. Phase 4.1 establishes the data persistence, content review queues, asset storage, and dynamic API endpoints that feed the existing React components.

```
┌─────────────────────────────────────────────────────────────┐
│                 SUPER ADMIN CMS (Phase 4.1)                 │
│  - Hero Banners       - Live Classes       - Daily Quotes   │
│  - Featured Batches   - Latest Lectures    - Portal Hub     │
│  - Ongoing Batches    - Explore Courses    - Content Review │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Publishes & Orders)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           DATABASE (Supabase) + STORAGE + VIDEO             │
│  - CMS Content Tables  - Storage Buckets   - Stream Video   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Dynamic Query API)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             STUDENT HOME UI (Phase 4 Components)            │
│  - StudentHeroBanner       - FeaturedBatchesSection         │
│  - OngoingBatchesSection   - LiveClassesSection             │
│  - LatestLecturesSection   - ExploreCoursesSection          │
│  - StudentPortalHub        - StudentSidebar                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Scope

The scope of Phase 4.1 covers:

1. **Super Admin CMS Workspace (`/admin/cms`)**: Dedicated management dashboard for authorized `SUPER_ADMIN` roles.
2. **Dynamic Section Management**:
   - **Hero Banners**: Add, edit, reorder, preview, toggle active state, upload background & character graphics.
   - **Featured Batches**: Manage featured badges (`New`, `Popular`), board tags, educator associations, custom gradients, and explore links.
   - **Ongoing Batches**: Configure batch title, board tag, subject, status (`Live Now` vs `Ongoing`), and CTA buttons.
   - **Live Classes (Today)**: Schedule daily classes, assign educator avatars, time slots, and toggle `LIVE` vs `UPCOMING` status.
   - **Latest Lectures**: Manage video metadata, chapter titles, duration chips, prominent lecture thumbnails, and subject categorization.
   - **Explore Courses**: Manage quick-select course categories, icons, and filter tags.
   - **Daily Motivational Quotes**: Add, edit, schedule, and activate the quote displayed in the student sidebar.
   - **Student Portal Hub ("What's Happening on TopVeda?")**: Curate announcements, study material alerts, and tips.
3. **Database Architecture & Migrations**: Normalized, indexed schema for CMS items with status flags (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
4. **Row-Level Security (RLS)**: Strict access policies granting Super Admins write privileges while public/student users retain read-only access to published items.
5. **Asset Storage & CDN Integration**: Supabase Storage buckets for images and lecture thumbnails.

---

## 3. Out of Scope

The following items are explicitly **OUT OF SCOPE** for Phase 4.1 and reserved for Phase 4.2+:

- **Phase 4.2 Admin/Teacher Submission Workflows**: Public teacher upload portals and granular teacher-assignment permissions.
- **Direct Real-Time Live Streaming Integration**: WebRTC/HLS broadcast ingest servers (will be connected in Phase 4.3).
- **Payment & Enrollment Transactions**: Payment gateways (Razorpay/Stripe) and subscription ledger tables.
- **Automated AI Question Generation**: Connecting external LLMs to automatic quiz builders.

---

## 4. Super Admin Capabilities

| Feature Area | Super Admin Capability |
| :--- | :--- |
| **Hero Carousel** | Upload 16:9 / 3:2 banners, set headline, subtitle, CTA text, CTA URL, active flag, and carousel order index. |
| **Batches** | Create new batch record, assign board (CBSE, BSEB, JEE, NEET), educator profile, category badge, and enrollment status. |
| **Lectures** | Upload lecture thumbnail, set title, subject, duration, teacher name, video reference, and featured home visibility. |
| **Live Classes** | Schedule session, set live broadcast time, assign teacher, toggle live status. |
| **Daily Motivation** | Write quote, author attribution, set activation date, or select active quote for sidebar. |
| **Portal Hub** | Publish platform announcements, link revision notes, and post daily study tips. |
| **Ordering & Pinning** | Drag-and-drop or numeric sequence sorting for home section priority. |
| **Instant Unpublish** | 1-click deactivation of any banner, batch, or lecture from student view. |

---

## 5. Content Types & Data Contracts

### 5.1 Hero Banner Item (`cms_hero_banners`)
- `id` (UUID, PK)
- `tagline` (TEXT)
- `title` (TEXT)
- `subtitle` (TEXT)
- `cta_text` (TEXT)
- `cta_link` (TEXT)
- `quote_text` (TEXT, nullable)
- `image_url` (TEXT)
- `display_order` (INT)
- `is_active` (BOOLEAN)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### 5.2 Featured & Ongoing Batches (`cms_batches`)
- `id` (UUID, PK)
- `is_featured` (BOOLEAN)
- `badge_text` (TEXT, e.g. "New", "Popular")
- `badge_variant` (TEXT, "orange" | "pink" | "green" | "purple")
- `board` (TEXT, e.g. "Class 10 CBSE", "Class 12 Science", "JEE 2027", "NEET 2027")
- `title` (TEXT, e.g. "Mathematics")
- `subtitle` (TEXT, e.g. "Complete Board Preparation")
- `educator_name` (TEXT)
- `educator_avatar_url` (TEXT)
- `status` (TEXT, "DRAFT" | "PUBLISHED" | "ARCHIVED")
- `status_type` (TEXT, "live" | "ongoing")
- `cta_text` (TEXT)
- `cta_link` (TEXT)
- `bg_gradient` (TEXT)
- `border_color` (TEXT)
- `display_order` (INT)

### 5.3 Latest Lectures (`cms_lectures`)
- `id` (UUID, PK)
- `title` (TEXT)
- `subject` (TEXT)
- `teacher_name` (TEXT)
- `duration_seconds` (INT)
- `duration_formatted` (TEXT, e.g. "45:00")
- `thumbnail_url` (TEXT)
- `video_stream_id` (TEXT, Cloudflare Stream ID or URL)
- `category_tag` (TEXT)
- `status` (TEXT, "DRAFT" | "PUBLISHED" | "ARCHIVED")
- `is_home_featured` (BOOLEAN)
- `display_order` (INT)

### 5.4 Live Classes Schedule (`cms_live_classes`)
- `id` (UUID, PK)
- `is_live` (BOOLEAN)
- `status_text` (TEXT, "LIVE" | "UPCOMING")
- `subject` (TEXT)
- `topic` (TEXT)
- `educator_name` (TEXT)
- `educator_avatar_url` (TEXT)
- `scheduled_start` (TIMESTAMPTZ)
- `scheduled_time_text` (TEXT, e.g. "6:00 PM")
- `cta_text` (TEXT)
- `stream_room_url` (TEXT)
- `status` (TEXT, "DRAFT" | "PUBLISHED" | "COMPLETED")
- `display_order` (INT)

### 5.5 Daily Motivational Quotes (`cms_daily_quotes`)
- `id` (UUID, PK)
- `quote` (TEXT)
- `author` (TEXT)
- `is_active` (BOOLEAN)
- `scheduled_for_date` (DATE, nullable)

### 5.6 Student Portal Hub Items (`cms_hub_items`)
- `id` (UUID, PK)
- `category` (TEXT, "announcement" | "material" | "live" | "tip")
- `badge_text` (TEXT, e.g. "NEW BATCH", "REVISION NOTES")
- `badge_variant` (TEXT, "orange" | "sky" | "purple" | "emerald")
- `title` (TEXT)
- `description` (TEXT)
- `cta_text` (TEXT)
- `cta_link` (TEXT)
- `is_published` (BOOLEAN)
- `display_order` (INT)

---

## 6. Content Lifecycle

```
   [ SUPER ADMIN CREATES CONTENT ]
                  │
                  ▼
              ┌───────┐
              │ DRAFT │ ◄── Editable, previewable, hidden from student portal
              └───┬───┘
                  │ Super Admin Clicks "Publish"
                  ▼
            ┌───────────┐
            │ PUBLISHED │ ◄── Live on Student Home (/student) & dynamic routes
            └─────┬─────┘
                  │ Super Admin Clicks "Archive" or "Delete"
                  ▼
            ┌───────────┐
            │ ARCHIVED  │ ◄── Removed from student view, retained in history
            └───────────┘
```

---

## 7. Storage Architecture

| Asset Type | Storage Location | Access Policy | CDN Delivery |
| :--- | :--- | :--- | :--- |
| **Hero Banners & Graphics** | Supabase Storage (`cms-banners` bucket) | Public Read, Super Admin Write | Cloudflare CDN Cached |
| **Educator & Student Avatars** | Supabase Storage (`avatars` bucket) | Public Read, Authenticated Write | Cloudflare CDN Cached |
| **Lecture Thumbnails & Posters**| Supabase Storage (`lecture-thumbnails` bucket) | Public Read, Super Admin Write | Cloudflare CDN Cached |
| **Study Notes & PDF Materials** | Supabase Storage (`study-materials` bucket) | Authenticated Student Read | Signed / CDN Verified |
| **Lecture Videos (HLS / DASH)** | **Cloudflare Stream** | Tokenized Video Playback | Cloudflare Edge Network |

> **Architecture Rationale:**  
> - Images, thumbnails, and PDFs belong in Supabase Storage with edge caching for optimal cost and simplicity.
> - Video files do **NOT** reside in Supabase database or SQL tables; they are ingested directly into **Cloudflare Stream** for adaptive bitrate streaming (HLS/DASH) across variable mobile bandwidths in India.

---

## 8. Row-Level Security (RLS) & Authorization Strategy

### 8.1 Authorization Matrix

| Role | Read Published CMS Content | Read Draft/Archived Content | Create / Edit / Delete CMS Content | Publish / Reorder Content |
| :--- | :---: | :---: | :---: | :---: |
| **Anonymous / Public** | ❌ (or Landing only) | ❌ | ❌ | ❌ |
| **STUDENT** | ✅ (Published only) | ❌ | ❌ | ❌ |
| **ADMIN / TEACHER** | ✅ (Published only) | ✅ (Own submissions) | ✅ (Drafts only) | ❌ |
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ |

### 8.2 Proposed SQL Policies Pattern
```sql
-- Students can only read published items
CREATE POLICY "student_read_published_cms" ON public.cms_batches
  FOR SELECT USING (status = 'PUBLISHED');

-- Super Admins have complete control
CREATE POLICY "super_admin_manage_cms" ON public.cms_batches
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'SUPER_ADMIN' OR
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE admin_roles.user_id = auth.uid() AND admin_roles.role = 'SUPER_ADMIN'
    )
  );
```

---

## 9. Super Admin CMS UI Structure (`/admin/cms`)

```
/admin/cms
│
├── /overview               ── Quick stats, active hero preview, quick status switches
├── /hero-banners           ── List, reorder, create & upload hero carousel slides
├── /batches                ── Filter by Class/Board, toggle Featured, edit details
├── /lectures               ── Upload thumbnail, set duration, assign teacher & batch
├── /live-classes           ── Schedule today's live streams, toggle LIVE status
├── /explore-courses        ── Configure course quick-select pills & subjects
├── /daily-motivation       ── Quote library, author attribution, active selector
├── /portal-hub             ── Manage platform alerts, study material notices, tips
└── /preview-student-home   ── Live iframe simulation of /student with draft overlay
```

---

## 10. Student Home Integration (Preserving Phase 4 UI)

When Phase 4.1 backend is connected:
1. Components in `src/components/student/` will receive typed props from Next.js server components or lightweight SWR/React Query hooks.
2. If zero database records are returned for any section, the component gracefully renders its typed default demo data or an intentional empty state.
3. Zero layout, styling, or CSS changes are required on the approved Phase 4 UI canvas.

---

## 11. Migration & Rollback Strategy

1. **Forward Migration**:
   - Create single migration file: `supabase/migrations/20260922000000_phase_4_1_cms.sql`.
   - Run in staging environment first, verify RLS policies.
2. **Rollback Plan**:
   - If CMS queries encounter an error, components fall back to static configuration in `src/config/student-home.config.ts`.
   - No breaking changes to existing Phase 3 tables (`users`, `profiles`, `admin_applications`, etc.).

---

## 12. Phase 4.1 Implementation Sequence (Next Steps)

```
Step 1: Create Supabase CMS tables & RLS migration
Step 2: Create Supabase Storage buckets (cms-banners, lecture-thumbnails)
Step 3: Build Super Admin CMS layout & navigation under src/app/admin/cms/
Step 4: Build Hero Banner Management UI & API handlers
Step 5: Build Batch & Course Management UI & API handlers
Step 6: Build Lecture & Thumbnail Management UI & API handlers
Step 7: Build Live Classes & Portal Hub Management UI
Step 8: Connect Student Home components (src/components/student/*) to dynamic CMS queries
Step 9: Test Super Admin publishing workflow end-to-end
```

---

*End of Phase 4.1 Architectural Plan.*
