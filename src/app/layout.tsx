import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
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
  metadataBase: new URL("https://topveda.in"),
  title: {
    default: "TopVeda | Learn Smart. Prepare Better. Achieve More.",
    template: "%s | TopVeda",
  },
  description:
    "TopVeda is an online learning platform helping students learn smarter, prepare better, and achieve more through interactive classes, courses, tests, study materials, doubt support, and structured learning resources.",
  applicationName: "TopVeda",
  authors: [{ name: "TopVeda" }],
  creator: "TopVeda",
  publisher: "TopVeda",
  alternates: {
    canonical: "https://topveda.in",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://topveda.in",
    siteName: "TopVeda",
    title: "TopVeda | Learn Smart. Prepare Better. Achieve More.",
    description:
      "TopVeda is an online learning platform helping students learn smarter, prepare better, and achieve more through interactive classes, courses, tests, study materials, doubt support, and structured learning resources.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TopVeda",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TopVeda | Learn Smart. Prepare Better. Achieve More.",
    description:
      "TopVeda is an online learning platform helping students learn smarter, prepare better, and achieve more through interactive classes, courses, tests, study materials, doubt support, and structured learning resources.",
    images: ["/og-image.png"],
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

