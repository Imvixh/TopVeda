/**
 * TopVeda Site & Architecture Configuration
 */

export const siteConfig = {
  name: "TopVeda",
  description:
    "A modern, extensible e-learning platform delivering live interactive classes, tests, and comprehensive learning resources.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  brand: {
    name: "TOPVEDA",
    wordmarkPrefix: "TOP",
    wordmarkSuffix: "VEDA",
    colors: {
      primaryAccent: "#F4511E", // Warm Orange / Orange-Red
      secondary: "#121417",     // Deep Charcoal
      backgroundWarm: "#FAFAF7",// Warm Off-White / Cream
      backgroundPeach: "#FFF7F2",// Subtle Warm Peach
      surface: "#FFFFFF",        // Clean White
      textPrimary: "#121417",    // Deep Charcoal
      textMuted: "#6B7280",      // Neutral Warm Gray
      border: "#E5E7EB",         // Soft Neutral Gray
    },
  },
  links: {
    x: "https://x.com/topveda",
    youtube: "https://youtube.com/@topveda",
    instagram: "https://instagram.com/topveda",
    facebook: "https://facebook.com/topveda",
  },
} as const;

export type SiteConfig = typeof siteConfig;
