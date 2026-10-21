export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_PREFIX = "/api/v1";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
export function resetCsrfToken() { csrfToken = null; csrfRequest = null; }
export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetch(`${API_PREFIX}/csrf-token`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new ApiError(response.status, "Failed to initialize CSRF token");
      const payload = await response.json() as { csrfToken: string };
      csrfToken = payload.csrfToken;
      return csrfToken;
    })().finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  skipCsrf?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}, csrfRetried = false): Promise<T> {
  const method = options.method ?? "GET";
  const hasBody = options.body !== undefined;
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !options.skipCsrf) {
    headers["x-csrf-token"] = await ensureCsrfToken();
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = null;
    }

    if (!csrfRetried && response.status === 403 && (details as any)?.code === "CSRF_INVALID" && !options.skipCsrf) {
      resetCsrfToken();
      return apiFetch<T>(path, options, true);
    }
    throw new ApiError(response.status, (details as any)?.message ?? "Request failed", details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

