import { fb } from "./firebase/client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls one of our own API routes with the signed-in user's ID token. */
export async function api<T = { ok: true }>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await fb().auth.currentUser?.getIdToken();
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(0, "No internet connection. Please try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
