/**
 * TopVeda Phase 6A: YouTube OAuth 2.0 & Token Security Service
 * Implements server-authoritative Google OAuth 2.0 authorization,
 * cryptographically secure state generation/validation, token exchange,
 * and AES-256-GCM application-level encryption for refresh tokens.
 * 
 * SECURITY RULES:
 * 1. Client secrets and tokens are SERVER-ONLY and NEVER exposed to clients or logs.
 * 2. OAuth state is cryptographically random, short-lived, and single-use to prevent CSRF.
 * 3. Refresh tokens are strictly encrypted before database persistence.
 */

import crypto from "crypto";
import {
  YouTubeOAuthConfig,
  GoogleOAuthTokenResponse,
  GoogleOAuthErrorResponse,
} from "@/types/youtube.types";

// ------------------------------------------------------------------------------
// Custom YouTube OAuth Errors (Sanitized & Safe)
// ------------------------------------------------------------------------------

export class YouTubeOAuthError extends Error {
  public readonly status?: number;
  public readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    // Sanitize any accidental bearer token or secrets
    const sanitized = message
      .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]")
      .replace(/client_secret=[^&\s]+/gi, "client_secret=[REDACTED]")
      .replace(/code=[^&\s]+/gi, "code=[REDACTED]");
    super(sanitized);
    this.name = "YouTubeOAuthError";
    this.status = status;
    this.code = code;
  }
}

export class YouTubeConfigError extends YouTubeOAuthError {
  constructor(message: string) {
    super(message, 500, "CONFIG_ERROR");
    this.name = "YouTubeConfigError";
  }
}

export class YouTubeAuthError extends YouTubeOAuthError {
  constructor(message: string = "Unauthorized or invalid Google OAuth credentials.") {
    super(message, 401, "AUTH_ERROR");
    this.name = "YouTubeAuthError";
  }
}

export class YouTubeStateError extends YouTubeOAuthError {
  constructor(message: string = "Invalid or expired OAuth state parameter.") {
    super(message, 400, "INVALID_STATE");
    this.name = "YouTubeStateError";
  }
}

// ------------------------------------------------------------------------------
// YouTube OAuth Service Implementation
// ------------------------------------------------------------------------------

export class YouTubeOAuthService {
  private static readonly GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
  private static readonly GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
  private static readonly YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
  private static readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Resolves server-side YouTube OAuth configuration.
   * Never exposes secrets to browser or client contexts.
   */
  public static getConfig(): YouTubeOAuthConfig {
    const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET?.trim();
    const redirectUri =
      process.env.GOOGLE_YOUTUBE_REDIRECT_URI?.trim() ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/oauth/callback`
        : "http://localhost:3000/api/youtube/oauth/callback");

    const encryptionKey = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim();

    if (!clientId) {
      throw new YouTubeConfigError(
        "Missing Google YouTube Client ID. Set GOOGLE_YOUTUBE_CLIENT_ID in your server environment."
      );
    }

    if (!clientSecret) {
      throw new YouTubeConfigError(
        "Missing Google YouTube Client Secret. Set GOOGLE_YOUTUBE_CLIENT_SECRET in your server environment."
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      encryptionKey,
    };
  }

  /**
   * Checks whether YouTube OAuth environment credentials are fully configured.
   */
  public static isConfigured(): boolean {
    try {
      this.getConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Derives a consistent 32-byte key for AES-256-GCM encryption.
   */
  private static getEncryptionKey(): Buffer {
    const config = this.getConfig();
    const secretSeed = config.encryptionKey || config.clientSecret;
    return crypto.createHash("sha256").update(secretSeed).digest();
  }

  /**
   * Encrypts a plain-text refresh token using authenticated AES-256-GCM.
   * Output format: `ivHex:authTagHex:encryptedHex`
   */
  public static encryptToken(plainText: string): string {
    if (!plainText) {
      throw new YouTubeOAuthError("Cannot encrypt empty token data.", 400, "ENCRYPTION_ERROR");
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts an AES-256-GCM encrypted token.
   * Expects format: `ivHex:authTagHex:encryptedHex`
   */
  public static decryptToken(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(":")) {
      throw new YouTubeOAuthError("Malformed encrypted token payload.", 400, "DECRYPTION_ERROR");
    }

    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new YouTubeOAuthError("Invalid encrypted token format.", 400, "DECRYPTION_ERROR");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    try {
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      throw new YouTubeOAuthError(
        "Failed to decrypt token: authentication tag verification failed.",
        500,
        "DECRYPTION_FAILED"
      );
    }
  }

  /**
   * Generates a cryptographically secure, signed OAuth state parameter.
   * State format: `randomHex.timestamp.signature`
   */
  public static generateState(userId: string): { state: string; cookieValue: string } {
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const timestamp = Date.now().toString();
    const config = this.getConfig();

    const payload = `${randomBytes}.${timestamp}.${userId}`;
    const hmac = crypto
      .createHmac("sha256", config.clientSecret)
      .update(payload)
      .digest("hex");

    const state = `${randomBytes}.${timestamp}.${hmac}`;
    return {
      state,
      cookieValue: payload,
    };
  }

  /**
   * Validates received OAuth state against the stored cookie value and HMAC signature.
   */
  public static validateState(
    receivedState: string | null | undefined,
    storedCookieValue: string | null | undefined
  ): { valid: boolean; userId?: string; error?: string } {
    if (!receivedState || !storedCookieValue) {
      return { valid: false, error: "Missing state parameter or state verification cookie." };
    }

    const stateParts = receivedState.split(".");
    if (stateParts.length !== 3) {
      return { valid: false, error: "Malformed OAuth state parameter format." };
    }

    const [randomBytes, timestampStr, hmacSig] = stateParts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp) || Date.now() - timestamp > this.STATE_EXPIRY_MS) {
      return { valid: false, error: "OAuth state parameter has expired." };
    }

    const cookieParts = storedCookieValue.split(".");
    if (cookieParts.length !== 3) {
      return { valid: false, error: "Malformed state cookie." };
    }

    const [cookieRandom, cookieTimestamp, userId] = cookieParts;

    if (randomBytes !== cookieRandom || timestampStr !== cookieTimestamp) {
      return { valid: false, error: "OAuth state does not match session verification cookie." };
    }

    const config = this.getConfig();
    const expectedPayload = `${randomBytes}.${timestampStr}.${userId}`;
    const expectedHmac = crypto
      .createHmac("sha256", config.clientSecret)
      .update(expectedPayload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmacSig, "hex"), Buffer.from(expectedHmac, "hex"))) {
      return { valid: false, error: "Invalid OAuth state cryptographic signature." };
    }

    return { valid: true, userId };
  }

  /**
   * Builds Google's OAuth 2.0 authorization URL.
   */
  public static buildAuthorizationUrl(state: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: this.YOUTUBE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      include_granted_scopes: "true",
    });

    return `${this.GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for Google access and refresh tokens.
   */
  public static async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokenResponse> {
    if (!code?.trim()) {
      throw new YouTubeOAuthError("Missing authorization code for token exchange.", 400, "MISSING_CODE");
    }

    const config = this.getConfig();
    const body = new URLSearchParams({
      code: code.trim(),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    let response: Response;
    try {
      response = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network failure";
      throw new YouTubeOAuthError(`Network failure during Google OAuth token exchange: ${msg}`, 503, "NETWORK_ERROR");
    }

    let data: GoogleOAuthTokenResponse | GoogleOAuthErrorResponse;
    try {
      data = await response.json();
    } catch {
      throw new YouTubeOAuthError(
        `Google token endpoint returned an unparseable response (HTTP ${response.status}).`,
        response.status,
        "MALFORMED_RESPONSE"
      );
    }

    if (!response.ok || "error" in data) {
      const errData = data as GoogleOAuthErrorResponse;
      const errorDescription = errData.error_description || errData.error || `HTTP ${response.status}`;
      throw new YouTubeAuthError(`Google token exchange failed: ${errorDescription}`);
    }

    return data as GoogleOAuthTokenResponse;
  }

  /**
   * Refreshes an expired Google access token using an encrypted refresh token.
   */
  public static async refreshAccessToken(encryptedRefreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const plainRefreshToken = this.decryptToken(encryptedRefreshToken);
    const config = this.getConfig();

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: plainRefreshToken,
      grant_type: "refresh_token",
    });

    let response: Response;
    try {
      response = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network failure";
      throw new YouTubeOAuthError(`Network failure during Google token refresh: ${msg}`, 503, "NETWORK_ERROR");
    }

    let data: GoogleOAuthTokenResponse | GoogleOAuthErrorResponse;
    try {
      data = await response.json();
    } catch {
      throw new YouTubeOAuthError("Failed to parse Google token refresh response.", response.status, "MALFORMED_RESPONSE");
    }

    if (!response.ok || "error" in data) {
      const errData = data as GoogleOAuthErrorResponse;
      throw new YouTubeAuthError(`Google access token refresh failed: ${errData.error_description || errData.error}`);
    }

    const tokenRes = data as GoogleOAuthTokenResponse;
    return {
      accessToken: tokenRes.access_token,
      expiresIn: tokenRes.expires_in,
    };
  }
}
