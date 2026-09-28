/**
 * TopVeda Site & Architecture Configuration
 */

export const siteConfig = {
  name: "TopVeda",
  description:
    "TopVeda is an online learning platform helping students learn smarter, prepare better, and achieve more through interactive classes, courses, tests, study materials, doubt support, and structured learning resources.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://topveda.in",
  ogImage: "/og-image.png",
  brand: {
    name: "TOPVEDA",
    tagline: "Learn Smart. Prepare Better. Achieve More.",
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
    x: "",
    youtube: "",
    instagram: "",
    facebook: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
