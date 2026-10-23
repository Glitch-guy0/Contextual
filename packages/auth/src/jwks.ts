import { importJWK, type JWK, type KeyLike } from "jose";

/**
 * Clerk JWKS In-Memory Key Cache & Fetcher
 * Implements 1-hour TTL with stale-while-revalidate strategy.
 * Reference: Architecture §3.6, AC-1.4.2
 */

export const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface JwksCacheEntry {
  keys: Map<string, KeyLike | Uint8Array>;
  rawKeys: JWK[];
  cachedAt: number;
  expiresAt: number;
}

let jwksCache: JwksCacheEntry | null = null;
let isRefreshing = false;

/**
 * Derives the Clerk JWKS endpoint URL from env or publishable key
 */
export function deriveClerkJwksUrl(customUrl?: string): string {
  if (customUrl) return customUrl;
  if (process.env.CLERK_JWKS_URL) return process.env.CLERK_JWKS_URL;

  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) {
    try {
      const b64 = pubKey.split("_")[2];
      if (b64) {
        // Clerk encodes frontend API host as base64 without padding (often ending with $)
        const cleanB64 = b64.replace(/\$$/, "");
        const decoded = Buffer.from(cleanB64, "base64").toString("utf-8");
        if (decoded.includes(".")) {
          return `https://${decoded}/.well-known/jwks.json`;
        }
      }
    } catch {
      // Fallback below
    }
  }

  return "https://api.clerk.com/v1/jwks";
}

/**
 * Registers local JWKs directly (useful for testing or pre-seeded keys)
 */
export async function registerLocalJwks(keys: JWK[]): Promise<void> {
  const keyMap = new Map<string, KeyLike | Uint8Array>();
  for (const jwk of keys) {
    if (jwk.kid) {
      const cryptoKey = await importJWK(jwk, "RS256");
      keyMap.set(jwk.kid, cryptoKey);
    }
  }

  jwksCache = {
    keys: keyMap,
    rawKeys: keys,
    cachedAt: Date.now(),
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
  };

  logJwksEvent("auth.jwks.refreshed", {
    source: "local",
    keyCount: keyMap.size,
  });
}

/**
 * Clears the JWKS cache
 */
export function clearJwksCache(): void {
  jwksCache = null;
  isRefreshing = false;
}

/**
 * Fetches and parses JWKS from remote URL
 */
async function fetchRemoteJwks(jwksUrl: string): Promise<JwksCacheEntry> {
  const response = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { keys?: JWK[] };
  const rawKeys = data.keys ?? [];
  const keyMap = new Map<string, KeyLike | Uint8Array>();

  for (const jwk of rawKeys) {
    if (jwk.kid) {
      try {
        const cryptoKey = await importJWK(jwk, jwk.alg ?? "RS256");
        keyMap.set(jwk.kid, cryptoKey);
      } catch (err) {
        // Skip unparseable keys without aborting
      }
    }
  }

  const entry: JwksCacheEntry = {
    keys: keyMap,
    rawKeys,
    cachedAt: Date.now(),
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
  };

  logJwksEvent("auth.jwks.refreshed", {
    source: "remote",
    url: jwksUrl,
    keyCount: keyMap.size,
  });

  return entry;
}

/**
 * Retrieves a public key by key ID (kid) from cache or remote JWKS
 */
export async function getKeyByKid(
  kid: string,
  options?: { jwksUrl?: string; forceRefresh?: boolean }
): Promise<KeyLike | Uint8Array | null> {
  const now = Date.now();
  const jwksUrl = deriveClerkJwksUrl(options?.jwksUrl);

  // 1. Check if cached and valid
  if (jwksCache && !options?.forceRefresh) {
    const key = jwksCache.keys.get(kid);
    if (key) {
      // If stale, trigger background refresh (stale-while-revalidate)
      if (now > jwksCache.expiresAt && !isRefreshing) {
        isRefreshing = true;
        fetchRemoteJwks(jwksUrl)
          .then((fresh) => {
            jwksCache = fresh;
          })
          .catch(() => {
            // Retain stale keys on background error
          })
          .finally(() => {
            isRefreshing = false;
          });
      }
      return key;
    }
  }

  // 2. Fetch fresh keys if missing or cache expired
  try {
    const fresh = await fetchRemoteJwks(jwksUrl);
    jwksCache = fresh;
    return fresh.keys.get(kid) ?? null;
  } catch (err) {
    // Stale fallback on network error
    if (jwksCache) {
      return jwksCache.keys.get(kid) ?? null;
    }
    throw err;
  }
}

/**
 * Returns currently cached JWKS metadata
 */
export function getJwksCacheStatus(): {
  cached: boolean;
  keyCount: number;
  expiresInMs: number;
} {
  if (!jwksCache) {
    return { cached: false, keyCount: 0, expiresInMs: 0 };
  }
  return {
    cached: true,
    keyCount: jwksCache.keys.size,
    expiresInMs: Math.max(0, jwksCache.expiresAt - Date.now()),
  };
}

function logJwksEvent(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event,
        ...payload,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
