# TopVeda Design System & UI Specification

## 1. Design Philosophy

TopVeda's visual language is:
- **Warm & Trustworthy**: Combining an energetic warm orange accent with calming cream/peach tones and grounded deep charcoal typography.
- **Academic & Focused**: Clean whitespace, clear typographical hierarchy, and distraction-free learning components.
- **Anti-Generic / Anti-AI Slop**: No excessive full-screen gradients, no gratuitous glassmorphism, no neon glows, and no cluttered animations.

---

## 2. Color Tokens

| Token | CSS Variable / Value | Role & Usage |
| :--- | :--- | :--- |
| **Brand Orange** | `--color-brand-orange` (`#F4511E`) | Primary interactive accent, key CTAs, wordmark highlight, active indicators |
| **Brand Orange Hover** | `--color-brand-orange-hover` (`#E64A19`) | Hover state for primary buttons and interactive accents |
| **Brand Orange Subtle**| `--color-brand-orange-subtle` (`#FFF0EB`) | Subtle background tints for active tabs, highlight cards, and badges |
| **Brand Charcoal** | `--color-brand-charcoal` (`#121417`) | Deep primary text, dark buttons, wordmark base, deep footers |
| **Charcoal Light** | `--color-brand-charcoal-light` (`#1E2022`) | Hover state for secondary dark buttons and high-contrast surfaces |
| **Background Warm** | `--color-brand-bg-warm` (`#FAFAF7`) | Default page background (warm off-white/light cream) |
| **Background Peach**| `--color-brand-bg-peach` (`#FFF7F2`) | Secondary section backgrounds and subtle card surfaces |
| **Surface Clean** | `--color-brand-surface` (`#FFFFFF`) | Cards, dialogs, inputs, interactive widgets |
| **Text Primary** | `--color-brand-text-primary` (`#121417`) | Primary headings and body copy |
| **Text Muted** | `--color-brand-text-muted` (`#6B7280`) | Captions, metadata, subheadings, labels |
| **Border Neutral** | `--color-brand-border` (`#E5E7EB`) | Standard card and container borders |
| **Border Subtle** | `--color-brand-border-subtle` (`#F3F4F6`) | Table dividers, inner card borders |

> [!IMPORTANT]
> Orange is an **accent color**, never the full website background.

---

## 3. Typography Scale

- **Primary Font**: `Plus Jakarta Sans` (weights 400, 500, 600, 700, 800)
- **Secondary / Body Font**: `Inter` (weights 400, 500, 600)

| Level | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `2.5rem (40px)` | 800 (ExtraBold) | 1.1 | `-0.025em` | Hero titles |
| **H1** | `2rem (32px)` | 700 (Bold) | 1.2 | `-0.02em` | Section headings |
| **H2** | `1.5rem (24px)` | 700 (Bold) | 1.3 | `-0.015em` | Card groups, page subtitles |
| **H3** | `1.25rem (20px)` | 600 (SemiBold) | 1.4 | `-0.01em` | Card titles, modal headers |
| **Body Large** | `1.125rem (18px)` | 400 / 500 | 1.6 | `0` | Lead paragraphs |
| **Body Default** | `1rem (16px)` | 400 / 500 | 1.5 | `0` | Standard body copy |
| **Body Small** | `0.875rem (14px)` | 400 / 500 | 1.4 | `0` | Secondary copy, inputs, buttons |
| **Caption / Tag**| `0.75rem (12px)` | 600 (SemiBold) | 1.3 | `0.02em` | Badges, timestamps, chips |

---

## 4. Spacing & Elevation Tokens

### Radii
- `rounded-md`: 6px (buttons sm, badges)
- `rounded-lg`: 8px (buttons md, inputs)
- `rounded-xl`: 12px (cards, buttons lg)
- `rounded-2xl`: 16px (modals, featured containers)
- `rounded-full`: 9999px (pills, avatars)

### Elevation Shadows
- `shadow-subtle`: `0 1px 2px 0 rgba(18, 20, 23, 0.04)`
- `shadow-card`: `0 2px 8px -2px rgba(18, 20, 23, 0.05), 0 1px 4px -1px rgba(18, 20, 23, 0.03)`
- `shadow-card-hover`: `0 12px 24px -4px rgba(18, 20, 23, 0.08), 0 4px 8px -2px rgba(18, 20, 23, 0.04)`
- `shadow-modal`: `0 24px 48px -12px rgba(18, 20, 23, 0.18), 0 8px 16px -4px rgba(18, 20, 23, 0.08)`

---

## 5. Micro-Interactions & Reduced-Motion

- **Interactive Hover**: Cards support subtle translation (`hover:-translate-y-1`) and soft shadow growth (`hover:shadow-card-hover`) with a 200ms ease transition.
- **Button Feedback**: Active button click provides a slight tactile scaling down (`active:scale-[0.98]`).
- **Focus Rings**: Accessible focus indicators (`focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2`).
- **Reduced Motion**: All animations and transforms are automatically suppressed when `@media (prefers-reduced-motion: reduce)` is enabled.
