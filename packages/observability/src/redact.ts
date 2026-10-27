/**
 * Deep Secret & PII Redactor
 * Adheres to NFR-026, BR-012
 */

// Regex patterns for sensitive values embedded in strings
const BEARER_JWT_REGEX = /Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/gi;
const CLERK_SECRET_REGEX = /sk_(?:live|test)_[A-Za-z0-9]+/g;
const DATABASE_URI_REGEX = /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi;
const GOOGLE_API_KEY_REGEX = /AIza[0-9A-Za-z-_]{30,45}/g;
const UPSTASH_TOKEN_REGEX = /(?:upstash_token|qstash_key|redis_token)=([A-Za-z0-9_-]+)/gi;

// Object keys that always have their values completely redacted
const SENSITIVE_KEY_REGEX = /^(?:password|secret|token|credential|authorization|cookie|apikey|api_key|client_secret|signing_key|signingkey|private_key|privatekey)$/i;
const SENSITIVE_KEY_SUBSTRING_REGEX = /(?:password|secret|credential|auth_token|signing_key)/i;

/**
 * Sanitize a string against known secret and credential regex patterns.
 */
export function redactString(str: string): string {
  let result = str;

  // Bearer tokens
  result = result.replace(BEARER_JWT_REGEX, "Bearer [REDACTED]");

  // Clerk keys
  result = result.replace(CLERK_SECRET_REGEX, "sk_[REDACTED]");

  // Postgres URIs
  result = result.replace(DATABASE_URI_REGEX, "postgresql://[REDACTED]@[REDACTED]");

  // Google API keys
  result = result.replace(GOOGLE_API_KEY_REGEX, "AIza[REDACTED]");

  // Upstash key params
  result = result.replace(UPSTASH_TOKEN_REGEX, "token=[REDACTED]");

  return result;
}

/**
 * Recursively redacts sensitive keys and string patterns from arbitrary data structures.
 * Protects against circular references and returns a clean, sanitized clone.
 */
export function redactSecrets<T = unknown>(input: T, seen = new WeakSet<object>()): T {
  if (input === null || input === undefined) {
    return input;
  }

  // Primitive strings
  if (typeof input === "string") {
    return redactString(input) as unknown as T;
  }

  // Other non-object primitives
  if (typeof input !== "object") {
    return input;
  }

  // Circular reference guard
  if (seen.has(input)) {
    return "[CIRCULAR]" as unknown as T;
  }
  seen.add(input);

  // Arrays
  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item, seen)) as unknown as T;
  }

  // Error objects
  if (input instanceof Error) {
    const sanitizedError: Record<string, unknown> = {
      name: input.name,
      message: redactString(input.message),
    };
    if (input.stack) {
      sanitizedError.stack = redactString(input.stack);
    }
    // Copy any custom properties on the error
    for (const [key, value] of Object.entries(input)) {
      if (key !== "name" && key !== "message" && key !== "stack") {
        if (SENSITIVE_KEY_REGEX.test(key) || SENSITIVE_KEY_SUBSTRING_REGEX.test(key)) {
          sanitizedError[key] = "[REDACTED]";
        } else {
          sanitizedError[key] = redactSecrets(value, seen);
        }
      }
    }
    return sanitizedError as unknown as T;
  }

  // Plain objects
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key) || SENSITIVE_KEY_SUBSTRING_REGEX.test(key)) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = redactSecrets(value, seen);
    }
  }

  return output as unknown as T;
}
