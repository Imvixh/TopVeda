# TopVeda

> **TopVeda** is a modern, extensible e-learning platform engineered with Next.js (App Router), TypeScript, and Tailwind CSS.

---

## 🌟 Technology Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with centralized CSS Variables design tokens
- **Component Primitives**: [Class Variance Authority (CVA)](https://cva.style/docs), `clsx`, `tailwind-merge`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database / Auth Direction (Upcoming)**: PostgreSQL / Supabase

---

## 📁 Repository Structure

```
TopVeda/
├── docs/                        # Architecture, database schema, design system, roadmap
│   ├── ARCHITECTURE.md          # Architectural decisions & system boundaries
│   ├── DATABASE_SCHEMA.md       # Conceptual DDL, tables & RLS strategy
│   ├── DESIGN_SYSTEM.md         # Tokens, typography scale, component principles
│   └── ROADMAP.md               # Multi-phase execution roadmap
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── globals.css          # Design system tokens and CSS variables
│   │   ├── layout.tsx           # Root layout with fonts & viewport metadata
│   │   └── page.tsx             # Phase 1 Foundation & Design System Showcase
│   ├── components/
│   │   ├── brand/               # TopVeda Wordmark and temporary brand glyph
│   │   └── ui/                  # Reusable UI primitives (Button, Card, Badge, Input, Modal, Container)
│   ├── config/                  # Site metadata and global constants
│   ├── constants/               # Roles and permissions mapping
│   ├── lib/                     # Core utilities (cn helper)
│   └── types/                   # TypeScript domain models (Education, Assessment, Student, Admin, Auth)
├── .env.example                 # Environment variables blueprint
├── next.config.ts               # Next.js config
├── package.json                 # Project dependencies and npm scripts
└── tsconfig.json                # TypeScript compiler config
```

---

## 🎨 Design System Quick Reference

- **Primary Brand Accent**: Warm Orange (`#F4511E`) / Hover (`#E64A19`) / Subtle (`#FFF0EB`)
- **Secondary Brand**: Deep Charcoal (`#121417`)
- **Backgrounds**: Warm Off-White (`#FAFAF7`) / Subtle Peach (`#FFF7F2`)
- **Surface**: Clean White (`#FFFFFF`)
- **Text**: Deep Charcoal (`#121417`) / Neutral Muted Gray (`#6B7280`)
- **Borders**: Soft Neutral Gray (`#E5E7EB`)
- **Fonts**: Plus Jakarta Sans (Headings/Display) & Inter (Body)

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the Phase 1 Foundation & Design System Showcase.

---

## 🧪 Validation & Quality Checks

Run all checks to ensure clean builds and zero type errors:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build
```

---

## 🔒 Git & Contribution Guidelines
- Do NOT commit or push to GitHub until explicit phase approval.
- Follow modular component boundaries.
