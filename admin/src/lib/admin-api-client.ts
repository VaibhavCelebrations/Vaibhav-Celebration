const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const ACCESS_TOKEN_KEY = "vbc_admin_access";

export type ApiSuccess<T> = { success: true; data: T };
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

async function tryRefresh(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/auth/admin/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ApiSuccess<{ accessToken: string }>;
  if (!json.success) return null;
  setStoredAccessToken(json.data.accessToken);
  return json.data.accessToken;
}

export async function adminFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
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

  let res = await doFetch();

  if (res.status === 401 && options.auth !== false) {
    token = await tryRefresh();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      res = await doFetch();
    }
  }

  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!res.ok || !json.success) {
    const failure = json as ApiFailure;
    throw new AdminApiError(
      failure.error?.code ?? "REQUEST_FAILED",
      failure.error?.message ?? "Request failed",
      res.status,
    );
  }
  return json.data;
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
