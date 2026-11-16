/** Error returned by our API (`{ error: { code, message, details? } }`). */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

/** Typed fetch for `/api/*`: sends/parses JSON and throws `ApiError` on failure. */
export async function apiFetch<T>(
  path: string,
  init: ApiInit = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      error?.code ?? "UNKNOWN_ERROR",
      response.status,
      error?.message ?? "Algo deu errado. Tente novamente.",
      error?.details,
    );
  }
  return body as T;
}

/** Builds a query string, skipping empty values. */
export function toQuery(
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
