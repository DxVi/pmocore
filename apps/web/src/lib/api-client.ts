import type { ApiErrorResponse, PaginationMeta } from '@pmocore/shared';

type ApiSuccessPayload<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ListResult<T> = { items: T[]; meta: PaginationMeta };

const SAFE_METHODS = new Set(['GET', 'HEAD']);
// The API's CSRF guard requires this header on every state-changing request.
export const CSRF_HEADER = 'X-PMO-Request';

let unauthorizedHandler: (() => void) | undefined;

/** Registers the handler invoked when an authenticated request returns 401. */
export function onUnauthorized(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

async function send<T>(path: string, init: RequestInit): Promise<ApiSuccessPayload<T>> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!SAFE_METHODS.has(method)) headers.set(CSRF_HEADER, '1');

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, method, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiClientError(
      'Unable to reach the server. Check your connection.',
      0,
      'NETWORK_ERROR',
    );
  }

  let payload: ApiSuccessPayload<T> | ApiErrorResponse | undefined;
  try {
    payload = (await response.json()) as ApiSuccessPayload<T> | ApiErrorResponse;
  } catch {
    payload = undefined;
  }

  if (!response.ok || !payload || !payload.success) {
    const error =
      payload && !payload.success
        ? payload.error
        : { code: 'HTTP_ERROR', message: 'The server returned an unexpected response.' };

    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      unauthorizedHandler?.();
    }
    throw new ApiClientError(error.message, response.status, error.code, error.details);
  }

  return payload;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const init: RequestInit = { ...rest, headers: new Headers(headers) };
  if (body !== undefined) {
    (init.headers as Headers).set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }
  return (await send<T>(path, init)).data;
}

async function list<T>(path: string): Promise<ListResult<T>> {
  const payload = await send<T[]>(path, { method: 'GET' });
  const items = payload.data;
  return {
    items,
    meta: payload.meta ?? {
      page: 1,
      pageSize: items.length,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  list,
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Multipart upload; the browser sets the multipart boundary header. */
  upload: async <T>(path: string, formData: FormData) =>
    (await send<T>(path, { method: 'POST', body: formData })).data,
};

/** Builds a query string from defined, non-empty values. */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
