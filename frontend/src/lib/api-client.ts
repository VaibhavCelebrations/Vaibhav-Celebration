const API_BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? "http://localhost:4000/api/v1")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1");

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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: options.cache,
      next: options.next,
      credentials: "include",
    });
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
    throw new ApiClientError(
      failure.error?.code ?? "REQUEST_FAILED",
      failure.error?.message ?? "Request failed",
      res.status,
      failure.error?.details,
    );
  }

  return json.data;
}

export function getApiBaseUrl() {
  return API_BASE;
}
