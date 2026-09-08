# TopVeda Multi-Phase Implementation Roadmap

---

## Phase 1: Project Foundation, Architecture & Design System (Current Phase)
- [x] Clean Next.js 15+ (App Router) + TypeScript + Tailwind CSS setup.
- [x] Centralized TopVeda Design System tokens (brand colors, typography, elevations, radiuses).
- [x] Reusable primitive components (`Button`, `Card`, `Badge`, `Input`, `Modal`, `Container`).
- [x] Official TopVeda Wordmark (`TOP` in warm orange, `VEDA` in deep charcoal) and temporary geometric glyph.
- [x] Non-hardcoded database architecture and TypeScript domain contracts (`education`, `assessment`, `student`, `admin`, `auth`).
- [x] Role-based access control blueprint (`STUDENT`, `ADMIN`).
- [x] Environment variable blueprint (`.env.example`).
- [x] Developer documentation and local verification checks.

---

## Phase 2: Public Landing Page & Course Discovery
- Implement modular public landing page sections:
  - Header & Navigation with brand wordmark and responsive mobile drawer
  - Hero Section (Warm, focused, student-oriented)
  - Platform Highlights (Daily Live Classes, 100+ Tests & Notes, 24×7 Doubt Solving)
  - "What Are You Looking For?" Category Navigation
  - Exam Categories & Boards Grid
  - Featured Courses Carousel/Grid
  - "Why TopVeda?" Trust & Feature Cards
  - "How It Works" 3-step learning pathway
  - Learning Experience & Student Dashboard Preview
  - Student Success & Testimonials
  - Interactive FAQ Accordion
  - Final Call to Action
  - Footer with dynamic social links (X, YouTube, Instagram, Facebook) and legal links
- Modal-based Auth triggers (Login & Register modals with backdrop blur).

---

## Phase 3: Supabase Authentication & Role-Based Access Control
- Supabase client integration (`@supabase/ssr` / `@supabase/supabase-js`).
- Email & Phone authentication flows inside the reusable modal dialog.
- Registration with full name, email/phone, password, and terms acceptance.
- Server-side middleware session verification and RBAC route protection (`/student/*` and `/admin/*`).

---

## Phase 4: Student Learning Dashboard & Course Player
- Student Dashboard overview (enrolled courses, ongoing progress, upcoming live sessions, recent test results).
- Course details & curriculum viewer (chapters, lessons, PDF notes, sample papers).
- Interactive video player with progress tracking.
- Doubt solving submission and history interface.

---

## Phase 5: Admin CMS & Curriculum Management Panel
- Admin dashboard overview (platform statistics, active students, enrollment metrics).
- Curriculum CRUD management:
  - Boards, Class Levels, Subjects, Courses, Chapters, Lessons, Resources.
- CMS Management:
  - Featured courses, exam categories, platform highlight metrics, FAQ entries, testimonials, social media links.
- Student account and enrollment management.

---

## Phase 6: Assessment & Test Engine
- Online test taking interface with timer, question navigation grid, and mark-for-review.
- Instant automated evaluation for objective questions.
- Detailed performance reports (score, percentile, section-wise analysis, explanations).
