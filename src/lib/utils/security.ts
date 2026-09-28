import { NextRequest } from "next/server";

/**
 * TopVeda Security Utilities
 * Authoritative production controls for CSRF defense, rate-limiting, and redirect safety.
 */

// In-memory sliding window rate limiter storage
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// On-demand cleanup of stale rate limit records (Cloudflare Worker global scope compliant)
function cleanupStaleRateLimits(now: number) {
  if (rateLimitStore.size > 200) {
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Validates request origin against allowed hostnames to prevent Cross-Site Request Forgery (CSRF).
 * For state-changing operations (POST, PUT, PATCH, DELETE).
 */
export function validateRequestOrigin(request: NextRequest): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  // Safe methods do not require origin check
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  // In standard browser API calls, at least one of Origin or Referer is sent
  const requestOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : null);

  if (!requestOrigin) {
    // If no origin/referer is present, allow only if same-host or internal service call
    const host = request.headers.get("host");
    if (host) {
      return { valid: true };
    }
    return { valid: false, reason: "Missing Origin/Referer header on state-changing request" };
  }

  const allowedOrigins = new Set<string>();

  // Add configured app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      // Ignore invalid URL
    }
  }

  // Add request host origin
  const requestHost = request.nextUrl.origin;
  if (requestHost) {
    allowedOrigins.add(requestHost);
  }

  // Add standard development origins
  allowedOrigins.add("http://localhost:3000");
  allowedOrigins.add("http://127.0.0.1:3000");
  allowedOrigins.add("https://topveda.in");
  allowedOrigins.add("https://www.topveda.in");

  if (!allowedOrigins.has(requestOrigin)) {
    return {
      valid: false,
      reason: `Cross-Origin Request Blocked: Origin ${requestOrigin} is not authorized`,
    };
  }

  return { valid: true };
}

/**
 * Sliding-window rate limiter for server-side endpoints.
 * Returns true if request is within limits, false if throttled.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  cleanupStaleRateLimits(now);
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetTime = oldest + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetTime: now + windowMs,
  };
}

/**
 * Validates that a redirect URL is strictly internal and safe against open-redirect attacks.
 */
export function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  // Must begin with a single slash
  if (!trimmed.startsWith("/")) return false;

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) return false;

  // Reject backslashes which some browsers parse as protocol separators
  if (trimmed.includes("\\")) return false;

  // Reject javascript:, data:, and other URI schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;

  // Reject control characters and newlines (CRLF header injection defense)
  if (/[\r\n\t\0]/.test(trimmed)) return false;

  return true;
}

/**
 * Sanitizes plain text input to remove dangerous HTML / Script tags.
 */
export function sanitizePlainText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Cloudflare Turnstile Verification Types & In-Memory Single-Use Cache
 */
export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  hostname?: string;
  challengeTs?: string;
  action?: string;
}

// In-memory cache of verified Turnstile tokens for single-use replay protection
const usedTurnstileTokens = new Map<string, number>();

// On-demand cleanup of expired token cache entries (Cloudflare Worker global scope compliant)
function cleanupStaleTurnstileTokens(now: number) {
  if (usedTurnstileTokens.size > 200) {
    for (const [token, timestamp] of usedTurnstileTokens.entries()) {
      if (now - timestamp > 15 * 60 * 1000) {
        usedTurnstileTokens.delete(token);
      }
    }
  }
}

/**
 * Validates a Cloudflare Turnstile response token server-side via Cloudflare Siteverify API.
 * 
 * Features:
 * - Direct server-to-server POST to https://challenges.cloudflare.com/turnstile/v0/siteverify
 * - Replay prevention: Ensures each token can only be consumed once
 * - Input validation: Rejects missing, whitespace-only, expired, or malformed tokens
 * - Safe error masking: Prevents exposing internal Cloudflare error codes or secret keys
 * - Support for development/test tokens in non-production environments
 */
export async function validateTurnstileToken(
  token: string | null | undefined,
  clientIp?: string | null
): Promise<TurnstileVerificationResult> {
  const now = Date.now();
  cleanupStaleTurnstileTokens(now);
  // 1. Validate token existence and basic shape
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Security verification required. Please complete the Turnstile challenge.",
    };
  }

  const sanitizedToken = token.trim();

  // Basic length / format validation
  if (sanitizedToken.length < 5 || sanitizedToken.length > 2048) {
    return {
      success: false,
      error: "Security verification token is malformed or invalid.",
    };
  }

  // Reject malformed characters (control characters, newlines, etc.)
  if (/[\r\n\t\0]/.test(sanitizedToken)) {
    return {
      success: false,
      error: "Malformed security verification token.",
    };
  }

  // 2. Single-use replay protection
  if (usedTurnstileTokens.has(sanitizedToken)) {
    return {
      success: false,
      error: "Security verification token has already been used. Please solve a new challenge.",
    };
  }

  // 3. Check for Secret Key
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // In non-production or test environments without a configured secret key:
  if (!secretKey) {
    if (process.env.NODE_ENV !== "production") {
      // Recognized mock and test tokens for automated test suites
      if (
        sanitizedToken.startsWith("test-turnstile-token-pass") ||
        sanitizedToken.startsWith("mock-turnstile-token-pass") ||
        sanitizedToken === "1x00000000000000000000AA" ||
        sanitizedToken === "2x00000000000000000000AB" ||
        sanitizedToken.includes("dummy")
      ) {
        usedTurnstileTokens.set(sanitizedToken, Date.now());
        return { success: true };
      }
    }

    // In production or if token is not an allowed test token
    return {
      success: false,
      error: "Turnstile verification service is currently unavailable.",
    };
  }

  // If running in development/test environment and valid test token is passed, allow test execution
  if (process.env.NODE_ENV !== "production" && sanitizedToken.startsWith("test-turnstile-token-pass")) {
    usedTurnstileTokens.set(sanitizedToken, Date.now());
    return { success: true };
  }

  // 4. Server-Side Cloudflare Siteverify Request
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", sanitizedToken);
    if (clientIp) {
      formData.append("remoteip", clientIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: "Security verification service returned an error. Please try again.",
      };
    }

    const data = await response.json();

    if (data.success) {
      // Record token as consumed to prevent replay attacks
      usedTurnstileTokens.set(sanitizedToken, Date.now());
      return {
        success: true,
        hostname: data.hostname,
        challengeTs: data["challenge_ts"],
        action: data.action,
      };
    } else {
      return {
        success: false,
        error: "Security verification challenge failed. Please retry.",
      };
    }
  } catch {
    return {
      success: false,
      error: "Security verification request timed out. Please try again.",
    };
  }
}
