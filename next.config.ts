import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com https://s.ytimg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://uxkvwuavidufnqliauuj.supabase.co https://img.youtube.com https://i.ytimg.com https://images.unsplash.com https://videodelivery.net;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://uxkvwuavidufnqliauuj.supabase.co wss://uxkvwuavidufnqliauuj.supabase.co https://challenges.cloudflare.com https://api.cloudflare.com https://*.cloudflarestream.com https://videodelivery.net;
  media-src 'self' blob: data: https://videodelivery.net https://*.cloudflarestream.com https://uxkvwuavidufnqliauuj.supabase.co;
  frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://iframe.videodelivery.net;
  frame-ancestors 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
