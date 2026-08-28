import { describe, expect, it } from "vitest";
import { classifyHttpError, classifyNetworkError, invalidPhoneError, malformedResponseError } from "./errors";

describe("classifyHttpError", () => {
  it("treats 5xx as retryable", () => {
    const err = classifyHttpError(500);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("META_SERVER_ERROR");
  });

  it("treats 429 as retryable", () => {
    const err = classifyHttpError(429);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("META_RATE_LIMITED");
  });

  it("treats a known transient Meta error code as retryable even on a 400 status", () => {
    const err = classifyHttpError(400, { message: "Rate limited", code: 130429 });
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("META_TRANSIENT_ERROR");
  });

  it("treats an invalid-template/invalid-recipient 400 as non-retryable", () => {
    const err = classifyHttpError(400, { message: "Invalid parameter", code: 100 });
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("META_PERMANENT_ERROR");
  });

  it("treats 401 (bad/expired token) as non-retryable", () => {
    const err = classifyHttpError(401, { message: "Invalid OAuth access token" });
    expect(err.retryable).toBe(false);
  });
});

describe("classifyNetworkError", () => {
  it("treats an AbortError (timeout) as retryable", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const err = classifyNetworkError(abort);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("TIMEOUT");
  });

  it("treats a generic network error as retryable", () => {
    const err = classifyNetworkError(new Error("fetch failed"));
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("NETWORK_ERROR");
  });
});

describe("invalidPhoneError / malformedResponseError", () => {
  it("invalid phone is never retryable", () => {
    expect(invalidPhoneError().retryable).toBe(false);
  });

  it("malformed response is never retryable", () => {
    expect(malformedResponseError("missing id").retryable).toBe(false);
  });
});
