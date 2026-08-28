/**
 * Normalized WhatsApp send failure. `retryable` drives the bounded retry in
 * whatsapp.service.ts — only transient failures (network/timeout/Meta 5xx/
 * rate limiting) are retried; permanent failures (bad template, bad
 * recipient, bad token, bad parameter) are not, to avoid infinite retry
 * loops and wasted sends.
 */
export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly code: string,
    public readonly metaErrorCode?: number,
  ) {
    super(message);
    this.name = "WhatsAppSendError";
  }
}

/** Meta error subcodes that are safe to retry even though the HTTP status itself is 4xx (e.g. transient rate limiting). */
const RETRYABLE_META_ERROR_CODES = new Set([
  4, // Application request limit reached
  80007, // Business account throughput/rate limited
  130429, // Rate limit hit
  131048, // Spam rate limit hit (transient)
  131056, // Pair rate limit
]);

/** Classifies an HTTP response status + optional Meta error payload into a retryable/non-retryable send failure. */
export function classifyHttpError(status: number, metaError?: { message?: string; code?: number }): WhatsAppSendError {
  const message = metaError?.message ?? `HTTP ${status}`;
  if (status >= 500) {
    return new WhatsAppSendError(message, true, "META_SERVER_ERROR", metaError?.code);
  }
  if (status === 429) {
    return new WhatsAppSendError(message, true, "META_RATE_LIMITED", metaError?.code);
  }
  if (metaError?.code && RETRYABLE_META_ERROR_CODES.has(metaError.code)) {
    return new WhatsAppSendError(message, true, "META_TRANSIENT_ERROR", metaError.code);
  }
  // 400/401/403/404 etc — invalid template, invalid recipient, invalid
  // parameter, invalid/expired access token, unknown phone number id, ...
  return new WhatsAppSendError(message, false, "META_PERMANENT_ERROR", metaError?.code);
}

/** Network-level failures (DNS, connection reset, abort/timeout) are always treated as retryable. */
export function classifyNetworkError(error: unknown): WhatsAppSendError {
  const isAbort = error instanceof Error && error.name === "AbortError";
  const message = error instanceof Error ? error.message : "Network error";
  return new WhatsAppSendError(isAbort ? "Request timed out" : message, true, isAbort ? "TIMEOUT" : "NETWORK_ERROR");
}

/** Invalid recipient phone numbers are a caller/data error — never worth retrying. */
export function invalidPhoneError(): WhatsAppSendError {
  return new WhatsAppSendError("Recipient phone number is invalid", false, "INVALID_PHONE");
}

/** Malformed/unexpected Meta response shape — treat as non-retryable since retrying won't fix a parsing mismatch. */
export function malformedResponseError(detail: string): WhatsAppSendError {
  return new WhatsAppSendError(`Malformed Meta response: ${detail}`, false, "MALFORMED_RESPONSE");
}
