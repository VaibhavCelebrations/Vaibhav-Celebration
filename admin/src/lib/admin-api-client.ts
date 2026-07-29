const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const ACCESS_TOKEN_KEY = "vbc_admin_access";

export type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as ApiSuccess<{ accessToken: string }>;
      if (!json.success) return null;
      setStoredAccessToken(json.data.accessToken);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

type FetchOptions = { method?: string; body?: unknown; auth?: boolean };

async function rawAdminFetch(path: string, options: FetchOptions = {}) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let token = options.auth === false ? null : getStoredAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const doFetch = () =>
    fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new AdminApiError(
      "NETWORK_ERROR",
      "Unable to reach the API. Please check that the backend is running.",
      0,
    );
  }

  if (res.status === 401 && options.auth !== false) {
    token = await tryRefresh();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      try {
        res = await doFetch();
      } catch {
        throw new AdminApiError(
          "NETWORK_ERROR",
          "Unable to reach the API. Please check that the backend is running.",
          0,
        );
      }
    }
  }

  let json: ApiSuccess<unknown> | ApiFailure;
  try {
    json = (await res.json()) as ApiSuccess<unknown> | ApiFailure;
  } catch {
    throw new AdminApiError("INVALID_RESPONSE", "Received an invalid response from the API.", res.status);
  }
  if (!res.ok || !json.success) {
    const failure = json as ApiFailure;
    const code = failure.error?.code ?? "REQUEST_FAILED";
    const message =
      res.status === 429
        ? "Rate limit reached — please wait a moment and retry."
        : (failure.error?.message ?? "Request failed");
    throw new AdminApiError(code, message, res.status);
  }
  return json as ApiSuccess<unknown>;
}

export async function adminFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const json = await rawAdminFetch(path, options);
  return json.data as T;
}

/** Normalizes both `{ items, total }` payloads and raw arrays (+ meta.pagination). */
export async function adminFetchList<T>(
  path: string,
  fallback: { page: number; pageSize: number },
): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
  const json = await rawAdminFetch(path);
  const data = json.data;
  const pagination = (json.meta?.pagination ?? {}) as {
    page?: number;
    pageSize?: number;
    total?: number;
  };

  if (Array.isArray(data)) {
    return {
      items: data as T[],
      total: pagination.total ?? data.length,
      page: pagination.page ?? fallback.page,
      pageSize: pagination.pageSize ?? fallback.pageSize,
    };
  }

  if (data && typeof data === "object") {
    const obj = data as {
      items?: T[];
      total?: number;
      page?: number;
      pageSize?: number;
    };
    const items = Array.isArray(obj.items) ? obj.items : [];
    return {
      items,
      total: obj.total ?? pagination.total ?? items.length,
      page: obj.page ?? pagination.page ?? fallback.page,
      pageSize: obj.pageSize ?? pagination.pageSize ?? fallback.pageSize,
    };
  }

  return { items: [], total: 0, page: fallback.page, pageSize: fallback.pageSize };
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "OPERATIONS" | "CONTENT_EDITOR";
};

export async function loginAdmin(email: string, password: string) {
  const data = await adminFetch<{ accessToken: string; admin: AdminUser }>("/auth/admin/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setStoredAccessToken(data.accessToken);
  return data;
}

export async function logoutAdmin() {
  try {
    await adminFetch("/auth/admin/logout", { method: "POST", auth: false });
  } finally {
    setStoredAccessToken(null);
  }
}

export async function fetchMe() {
  return adminFetch<AdminUser>("/auth/admin/me");
}
