/**
 * TopVeda Phase 6A: Cloudflare Stream REST API Service
 * Implements server-authoritative live input provisioning, retrieval,
 * and lifecycle management via Cloudflare Stream REST API.
 * 
 * SECURITY RULES:
 * 1. CLOUDFLARE_STREAM_API_TOKEN is server-only and NEVER exposed to the client.
 * 2. Tokens are never logged, formatted into error messages, or returned in API responses.
 * 3. Idempotency keys are supported for resilient network retries.
 */

import {
  CloudflareLiveInput,
  CloudflareApiResponse,
  CloudflareStreamConfig,
  CreateLiveInputOptions,
} from "@/types/streaming.types";

// ------------------------------------------------------------------------------
// Custom Cloudflare Stream Errors (Sanitized & Safe)
// ------------------------------------------------------------------------------

export class CloudflareStreamError extends Error {
  public readonly status?: number;
  public readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    // Sanitize any accidental bearer token or authorization header in message
    const sanitized = message.replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]");
    super(sanitized);
    this.name = "CloudflareStreamError";
    this.status = status;
    this.code = code;
  }
}

export class CloudflareStreamConfigError extends CloudflareStreamError {
  constructor(message: string) {
    super(message, 500, "CONFIG_ERROR");
    this.name = "CloudflareStreamConfigError";
  }
}

export class CloudflareStreamAuthError extends CloudflareStreamError {
  constructor(message: string = "Unauthorized: Invalid or expired Cloudflare Stream API credentials.") {
    super(message, 401, "AUTH_ERROR");
    this.name = "CloudflareStreamAuthError";
  }
}

export class CloudflareStreamNotFoundError extends CloudflareStreamError {
  constructor(resourceId: string) {
    super(`Cloudflare Stream Live Input "${resourceId}" not found.`, 404, "NOT_FOUND");
    this.name = "CloudflareStreamNotFoundError";
  }
}

// ------------------------------------------------------------------------------
// Cloudflare Stream Service Implementation
// ------------------------------------------------------------------------------

export class CloudflareStreamService {
  private static readonly CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

  /**
   * Resolves server-side Cloudflare Stream configuration.
   * Never exposes secrets to browser or unauthenticated contexts.
   */
  public static getConfig(): CloudflareStreamConfig {
    const accountId =
      process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim() ||
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

    const apiToken =
      process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ||
      process.env.CLOUDFLARE_API_TOKEN?.trim();

    const customerSubdomain =
      process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || undefined;

    if (!accountId) {
      throw new CloudflareStreamConfigError(
        "Missing Cloudflare Stream Account ID. Set CLOUDFLARE_STREAM_ACCOUNT_ID in your server environment."
      );
    }

    if (!apiToken) {
      throw new CloudflareStreamConfigError(
        "Missing Cloudflare Stream API Token. Set CLOUDFLARE_STREAM_API_TOKEN in your server environment."
      );
    }

    return {
      accountId,
      apiToken,
      customerSubdomain,
    };
  }

  /**
   * Checks whether Cloudflare Stream environment credentials are configured.
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
   * Internal authenticated fetch helper for Cloudflare Stream API.
   * Strips all authorization secrets from error traces and exceptions.
   */
  private static async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
      body?: unknown;
      idempotencyKey?: string;
    } = {}
  ): Promise<T> {
    const config = this.getConfig();
    const url = `${this.CLOUDFLARE_API_BASE}/accounts/${config.accountId}/stream${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network failure connecting to Cloudflare Stream API.";
      throw new CloudflareStreamError(`Cloudflare Stream Network Error: ${msg}`, 503, "NETWORK_ERROR");
    }

    if (response.status === 401 || response.status === 403) {
      throw new CloudflareStreamAuthError(
        `Cloudflare Stream API authentication failed (HTTP ${response.status}). Verify your CLOUDFLARE_STREAM_API_TOKEN permissions.`
      );
    }

    let data: CloudflareApiResponse<T>;
    try {
      data = (await response.json()) as CloudflareApiResponse<T>;
    } catch {
      throw new CloudflareStreamError(
        `Cloudflare Stream returned an unexpected malformed response (HTTP ${response.status}).`,
        response.status,
        "MALFORMED_RESPONSE"
      );
    }

    if (!response.ok || !data.success) {
      const errorMsg =
        data.errors && data.errors.length > 0
          ? data.errors.map((e) => `[${e.code}] ${e.message}`).join(", ")
          : `HTTP ${response.status}`;

      if (response.status === 404) {
        throw new CloudflareStreamNotFoundError(endpoint);
      }

      throw new CloudflareStreamError(
        `Cloudflare Stream API Error: ${errorMsg}`,
        response.status,
        data.errors?.[0]?.code ? String(data.errors[0].code) : "API_ERROR"
      );
    }

    return data.result;
  }

  /**
   * Creates a real Cloudflare Stream Live Input.
   * Configures automatic recording and returns live streaming ingest credentials.
   * 
   * Endpoint: POST /accounts/{account_id}/stream/live_inputs
   */
  public static async createLiveInput(
    options: CreateLiveInputOptions = {}
  ): Promise<CloudflareLiveInput> {
    const payload = {
      meta: {
        name: options.name || "TopVeda Live Class",
        liveClassId: options.liveClassId || undefined,
        platform: "TopVeda",
        ...(options.meta || {}),
      },
      recording: {
        mode: options.recordingMode || "automatic",
        timeoutSeconds: options.timeoutSeconds ?? 300,
        requireSignedURLs: options.requireSignedURLs ?? false,
      },
    };

    return this.request<CloudflareLiveInput>("/live_inputs", {
      method: "POST",
      body: payload,
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Retrieves a Cloudflare Stream Live Input by its unique UID.
   * Returns null if the live input does not exist (404).
   * 
   * Endpoint: GET /accounts/{account_id}/stream/live_inputs/{live_input_identifier}
   */
  public static async getLiveInput(
    liveInputUid: string
  ): Promise<CloudflareLiveInput | null> {
    if (!liveInputUid?.trim()) {
      throw new CloudflareStreamError("Invalid Live Input UID provided.", 400, "INVALID_PARAM");
    }

    try {
      return await this.request<CloudflareLiveInput>(
        `/live_inputs/${encodeURIComponent(liveInputUid.trim())}`,
        { method: "GET" }
      );
    } catch (err) {
      if (err instanceof CloudflareStreamNotFoundError) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Deletes a Cloudflare Stream Live Input.
   * Idempotent: returns true if deleted successfully or if already not found.
   * 
   * Endpoint: DELETE /accounts/{account_id}/stream/live_inputs/{live_input_identifier}
   */
  public static async deleteLiveInput(
    liveInputUid: string
  ): Promise<boolean> {
    if (!liveInputUid?.trim()) {
      throw new CloudflareStreamError("Invalid Live Input UID provided for deletion.", 400, "INVALID_PARAM");
    }

    try {
      await this.request<null>(
        `/live_inputs/${encodeURIComponent(liveInputUid.trim())}`,
        { method: "DELETE" }
      );
      return true;
    } catch (err) {
      if (err instanceof CloudflareStreamNotFoundError) {
        return true; // Already deleted
      }
      throw err;
    }
  }

  /**
   * Lists existing Cloudflare Stream Live Inputs for the account.
   * 
   * Endpoint: GET /accounts/{account_id}/stream/live_inputs
   */
  public static async listLiveInputs(
    options: { limit?: number; ascending?: boolean } = {}
  ): Promise<CloudflareLiveInput[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.ascending !== undefined) params.set("asc", String(options.ascending));

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return this.request<CloudflareLiveInput[]>(`/live_inputs${queryString}`, {
      method: "GET",
    });
  }
}
