import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "TopVeda — Learn Smarter. Prepare Better. Achieve More.",
    template: "%s | TopVeda",
  },
  description:
    "TopVeda is a modern, student-first education platform delivering daily live interactive classes, structured board exam test series, curated chapter notes, and 24×7 doubt resolution.",
  keywords: [
    "TopVeda",
    "e-learning platform",
    "live classes",
    "CBSE",
    "Bihar Board",
    "BSEB",
    "online coaching",
    "sample papers",
    "doubt solving",
    "board exams",
  ],
  authors: [{ name: "TopVeda" }],
  creator: "TopVeda",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://topveda.com",
    title: "TopVeda — Learn Smarter. Prepare Better. Achieve More.",
    description:
      "A modern education platform delivering live interactive classes, comprehensive test series, curated notes, and 24×7 doubt solving.",
    siteName: "TopVeda",
  },
  twitter: {
    card: "summary_large_image",
    title: "TopVeda — Learn Smarter. Prepare Better. Achieve More.",
    description:
      "A modern education platform delivering live interactive classes, comprehensive test series, curated notes, and 24×7 doubt solving.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} antialiased scroll-smooth`}
    >
      <body className="min-h-screen bg-brand-bg-warm text-brand-text-primary">
        {children}
      </body>
    </html>
  );
}
