/**
 * TopVeda System State Service
 * Edge Runtime & Node.js compatible durable storage for platform operational state
 * (Maintenance Mode & Super Admin Lockout).
 * 
 * Storage Hierarchy:
 * 1. Cloudflare Workers KV binding (SYSTEM_KV / TOPVEDA_KV)
 * 2. Cloudflare KV REST API (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_KV_NAMESPACE_ID + CLOUDFLARE_API_TOKEN)
 * 3. In-memory & Node file fallback for local dev / test simulation
 */

export interface MaintenanceState {
  isEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
  message?: string;
}

export interface LockoutState {
  attempts: number;
  lockedUntil: number | null; // epoch timestamp in ms
  lastAttemptAt: number;
}

const MAINTENANCE_KEY = "topveda:maintenance_mode";
const LOCKOUT_PREFIX = "topveda:lockout:";

interface KVStorage {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

// Global in-memory cache shared across Edge/Node worker lifecycles
const globalStore = (globalThis as unknown as { __topveda_state_cache?: Record<string, string> });
if (!globalStore.__topveda_state_cache) {
  globalStore.__topveda_state_cache = {};
}
const memoryCache = globalStore.__topveda_state_cache;

export class SystemStateService {
  /**
   * Get value from Cloudflare KV or in-memory / REST fallback
   */
  private static async getRawValue(key: string): Promise<string | null> {
    // 1. Check Global/Runtime KV binding (Cloudflare Workers / Vinext)
    try {
      const globals = globalThis as unknown as Record<string, KVStorage | undefined>;
      const globalKV = globals.SYSTEM_KV || globals.TOPVEDA_KV;
      if (globalKV && typeof globalKV.get === "function") {
        const val = await globalKV.get(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // ignore
    }

    // 2. Check Cloudflare KV REST API if credentials configured
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfNamespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (cfAccountId && cfNamespaceId && cfApiToken) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/storage/kv/namespaces/${cfNamespaceId}/values/${encodeURIComponent(
            key
          )}`,
          {
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
            },
            cache: "no-store",
          }
        );
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // fallback
      }
    }

    // 3. In-memory cache fallback
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }

    return null;
  }

  /**
   * Put value to Cloudflare KV or in-memory / REST fallback
   */
  private static async setRawValue(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<void> {
    // 1. Update in-memory cache
    memoryCache[key] = value;

    // 2. Try Global/Runtime KV binding
    try {
      const globals = globalThis as unknown as Record<string, KVStorage | undefined>;
      const globalKV = globals.SYSTEM_KV || globals.TOPVEDA_KV;
      if (globalKV && typeof globalKV.put === "function") {
        await globalKV.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
        return;
      }
    } catch {
      // ignore
    }

    // 3. Try Cloudflare KV REST API
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfNamespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (cfAccountId && cfNamespaceId && cfApiToken) {
      try {
        let url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/storage/kv/namespaces/${cfNamespaceId}/values/${encodeURIComponent(
          key
        )}`;
        if (ttlSeconds) {
          url += `?expiration_ttl=${ttlSeconds}`;
        }
        await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "text/plain",
          },
          body: value,
        });
      } catch {
        // fallback
      }
    }
  }

  // --------------------------------------------------------------------------
  // MAINTENANCE MODE STATE
  // --------------------------------------------------------------------------

  public static async getMaintenanceState(): Promise<MaintenanceState> {
    try {
      const raw = await this.getRawValue(MAINTENANCE_KEY);
      if (!raw) {
        return { isEnabled: false };
      }
      return JSON.parse(raw);
    } catch {
      return { isEnabled: false };
    }
  }

  public static async setMaintenanceState(
    enabled: boolean,
    updatedBy?: string,
    message?: string
  ): Promise<MaintenanceState> {
    const state: MaintenanceState = {
      isEnabled: enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || "SUPER_ADMIN",
      message:
        message ||
        "TopVeda is currently undergoing scheduled platform upgrades. We will be back online shortly.",
    };

    await this.setRawValue(MAINTENANCE_KEY, JSON.stringify(state));
    return state;
  }

  // --------------------------------------------------------------------------
  // SUPER ADMIN 3-ATTEMPT / 1-HOUR LOCKOUT PROTECTION
  // --------------------------------------------------------------------------

  public static async getLockoutState(identifier: string): Promise<{
    isLocked: boolean;
    remainingLockMs: number;
    attempts: number;
  }> {
    const key = `${LOCKOUT_PREFIX}${identifier.toLowerCase().trim()}`;
    const raw = await this.getRawValue(key);

    if (!raw) {
      return { isLocked: false, remainingLockMs: 0, attempts: 0 };
    }

    try {
      const data: LockoutState = JSON.parse(raw);
      const now = Date.now();

      if (data.lockedUntil && data.lockedUntil > now) {
        return {
          isLocked: true,
          remainingLockMs: data.lockedUntil - now,
          attempts: data.attempts,
        };
      }

      // If lock has expired, reset
      if (data.lockedUntil && data.lockedUntil <= now) {
        await this.clearLockout(identifier);
        return { isLocked: false, remainingLockMs: 0, attempts: 0 };
      }

      return {
        isLocked: false,
        remainingLockMs: 0,
        attempts: data.attempts,
      };
    } catch {
      return { isLocked: false, remainingLockMs: 0, attempts: 0 };
    }
  }

  public static async recordFailedAttempt(identifier: string): Promise<{
    isLocked: boolean;
    attempts: number;
    remainingAttempts: number;
    lockedUntil?: number;
  }> {
    const key = `${LOCKOUT_PREFIX}${identifier.toLowerCase().trim()}`;
    const current = await this.getLockoutState(identifier);

    const newAttempts = current.attempts + 1;
    const now = Date.now();

    if (newAttempts >= 3) {
      // Lock for exactly 1 hour (3600000 ms)
      const lockedUntil = now + 3600 * 1000;
      const state: LockoutState = {
        attempts: newAttempts,
        lockedUntil,
        lastAttemptAt: now,
      };
      await this.setRawValue(key, JSON.stringify(state), 3600);
      return {
        isLocked: true,
        attempts: newAttempts,
        remainingAttempts: 0,
        lockedUntil,
      };
    }

    const state: LockoutState = {
      attempts: newAttempts,
      lockedUntil: null,
      lastAttemptAt: now,
    };
    // Persist failed attempt counter with 1 hour TTL
    await this.setRawValue(key, JSON.stringify(state), 3600);

    return {
      isLocked: false,
      attempts: newAttempts,
      remainingAttempts: 3 - newAttempts,
    };
  }

  public static async clearLockout(identifier: string): Promise<void> {
    const key = `${LOCKOUT_PREFIX}${identifier.toLowerCase().trim()}`;
    delete memoryCache[key];

    // Also try clearing from KV if supported
    try {
      const globals = globalThis as unknown as Record<string, KVStorage | undefined>;
      const globalKV = globals.SYSTEM_KV || globals.TOPVEDA_KV;
      if (globalKV && typeof globalKV.delete === "function") {
        await globalKV.delete(key);
      }
    } catch {
      // ignore
    }
  }
}
