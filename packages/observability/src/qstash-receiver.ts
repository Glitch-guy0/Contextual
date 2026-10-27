import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { HEADER_UPSTASH_SIGNATURE } from "@repo/contracts";

export interface QStashReceiverConfig {
  currentSigningKey: string;
  nextSigningKey?: string;
  clockToleranceSeconds?: number;
}

/**
 * Helper to generate a test or client signature for QStash webhooks.
 * Encodes header, claims, and HMAC SHA-256 signature into standard JWT format.
 */
export function generateQStashSignature(
  rawBody: string,
  signingKey: string,
  options: { timestamp?: number; issuer?: string; subject?: string } = {}
): string {
  const now = options.timestamp ?? Math.floor(Date.now() / 1000);
  const bodySha256 = createHash("sha256").update(rawBody).digest("base64url");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: options.issuer ?? "Upstash",
      sub: options.subject ?? "https://contextual.ai",
      exp: now + 300,
      nbf: now - 5,
      body: bodySha256,
    })
  ).toString("base64url");

  const message = `${header}.${payload}`;
  const signature = createHmac("sha256", signingKey).update(message).digest("base64url");

  return `${message}.${signature}`;
}

/**
 * Cryptographic QStash Webhook Signature Verifier
 * Verifies Upstash-Signature header using HMAC SHA-256 against current and next signing keys.
 */
export class QStashSignatureVerifier {
  readonly currentSigningKey: string;
  readonly nextSigningKey?: string;
  readonly clockToleranceSeconds: number;

  constructor(config: QStashReceiverConfig) {
    this.currentSigningKey = config.currentSigningKey;
    this.nextSigningKey = config.nextSigningKey;
    this.clockToleranceSeconds = config.clockToleranceSeconds ?? 300;
  }

  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  private verifyWithKey(signatureHeader: string, rawBody: string, key: string): boolean {
    if (!signatureHeader || !key) return false;

    // Direct HMAC comparison (hex or base64)
    const directHex = createHmac("sha256", key).update(rawBody).digest("hex");
    const directBase64 = createHmac("sha256", key).update(rawBody).digest("base64");
    const directBase64Url = createHmac("sha256", key).update(rawBody).digest("base64url");

    if (
      this.safeCompare(signatureHeader, directHex) ||
      this.safeCompare(signatureHeader, directBase64) ||
      this.safeCompare(signatureHeader, directBase64Url)
    ) {
      return true;
    }

    // JWT format: header.payload.signature
    const parts = signatureHeader.split(".");
    if (parts.length === 3) {
      const [headerB64, payloadB64, sigB64] = parts;
      if (!headerB64 || !payloadB64 || !sigB64) return false;

      // Verify HMAC over header.payload
      const expectedSig = createHmac("sha256", key).update(`${headerB64}.${payloadB64}`).digest("base64url");
      if (!this.safeCompare(sigB64, expectedSig)) {
        return false;
      }

      // Verify payload claims
      try {
        const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
        const payload = JSON.parse(payloadJson);

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && typeof payload.exp === "number") {
          if (now > payload.exp + this.clockToleranceSeconds) {
            return false;
          }
        }
        if (payload.nbf && typeof payload.nbf === "number") {
          if (now < payload.nbf - this.clockToleranceSeconds) {
            return false;
          }
        }

        // Verify body hash if present
        if (payload.body && typeof payload.body === "string") {
          const bodySha = createHash("sha256").update(rawBody).digest("base64url");
          const bodyHex = createHash("sha256").update(rawBody).digest("hex");
          if (!this.safeCompare(payload.body, bodySha) && !this.safeCompare(payload.body, bodyHex)) {
            return false;
          }
        }

        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Verify signature against raw body using current key, falling back to next key.
   */
  async verify(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<boolean> {
    let sig: string | undefined;

    const rawSig =
      headers["signature"] ??
      headers[HEADER_UPSTASH_SIGNATURE.toLowerCase()] ??
      headers[HEADER_UPSTASH_SIGNATURE] ??
      headers["upstash-signature"] ??
      headers["x-signature"];

    if (Array.isArray(rawSig)) {
      sig = rawSig[0];
    } else if (typeof rawSig === "string") {
      sig = rawSig;
    }

    if (!sig) {
      return false;
    }

    // Try current key
    if (this.verifyWithKey(sig, rawBody, this.currentSigningKey)) {
      return true;
    }

    // Try next key for zero-downtime key rotation
    if (this.nextSigningKey && this.verifyWithKey(sig, rawBody, this.nextSigningKey)) {
      return true;
    }

    return false;
  }
}
