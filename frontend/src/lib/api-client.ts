const API_BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1")
    : (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1");

export type ApiSuccess<T> = { success: true; data: T; meta?: unknown };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

/* ── Silent session refresh (browser only) ─────────────────────────────
   The access cookie lasts 15 minutes; the session cookie lasts weeks. When a
   call comes back 401 we rotate the session once and replay the call, so a
   signed-in customer never has to reload the page to keep working. */

/** Calls whose 401 means "wrong credentials" or that manage the session themselves. */
const NO_REFRESH_PATHS = [
  "/customer/auth/refresh",
  "/customer/auth/login",
  "/customer/auth/signup",
  "/customer/auth/logout",
];

export type RefreshOutcome = "refreshed" | "signed-out" | "unavailable";

const authLostListeners = new Set<() => void>();

/** Subscribe to "the session is really gone" (refresh was rejected). Returns an unsubscribe. */
export function onAuthLost(listener: () => void): () => void {
  authLostListeners.add(listener);
  return () => {
    authLostListeners.delete(listener);
  };
}

async function requestRefresh(): Promise<RefreshOutcome> {
  try {
    const res = await fetch(`${API_BASE}/customer/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (res.ok) return "refreshed";
    // 429 / 5xx: the session may well be fine — don't sign the customer out over it.
    if (res.status !== 401) return "unavailable";
    const json = (await res.json().catch(() => null)) as ApiFailure | null;
    if (json?.error?.code === "SESSION_REFRESH_RACE") {
      // Another request rotated the session a moment ago; give its cookies time to land.
      await new Promise((resolve) => setTimeout(resolve, 300));
      return "refreshed";
    }
    return "signed-out";
  } catch {
    return "unavailable";
  }
}

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** One refresh at a time per tab, and (via Web Locks) one at a time across tabs. */
export function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    const run: Promise<RefreshOutcome> = locks
      ? (async () => await locks.request("vc-session-refresh", requestRefresh))()
      : requestRefresh();
    refreshInFlight = run.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * For the rare call that can't go through `apiFetch` (multipart uploads): run it, and if the
 * access token has lapsed, refresh and run it once more.
 */
export async function fetchWithSessionRefresh(send: () => Promise<Response>): Promise<Response> {
  const res = await send();
  if (res.status !== 401 || typeof window === "undefined") return res;
  const outcome = await refreshSession();
  if (outcome === "refreshed") return send();
  if (outcome === "signed-out") authLostListeners.forEach((listener) => listener());
  return res;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookieString = cookieStore
        .getAll()
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join("; ");
      if (cookieString) {
        headers["Cookie"] = cookieString;
      }
    } catch {
      // cookies() throws if used outside of request context
    }
  }

  const send = () =>
    fetch(`${API_BASE}${normalizedPath}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: options.cache,
      next: options.next,
      credentials: "include",
    });

  let res: Response;
  try {
    res = NO_REFRESH_PATHS.some((p) => normalizedPath.startsWith(p))
      ? await send()
      : await fetchWithSessionRefresh(send);
  } catch {
    throw new ApiClientError(
      "NETWORK_ERROR",
      "Unable to reach the API. Please check that the backend is running.",
      0,
    );
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Received an invalid response from the API.",
      res.status,
    );
  }

  if (!res.ok || !json.success) {
    const failure = json as ApiFailure;
    const rawMessage = failure.error?.message;
    throw new ApiClientError(
      failure.error?.code ?? "REQUEST_FAILED",
      typeof rawMessage === "string" && rawMessage.trim() ? rawMessage : "Request failed",
      res.status,
      failure.error?.details,
    );
  }

  return json.data;
}

export function getApiBaseUrl() {
  return API_BASE;
}
