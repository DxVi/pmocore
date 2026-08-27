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

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json()) as ApiSuccessPayload<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    const error = payload.success
      ? { code: 'HTTP_ERROR', message: response.statusText }
      : payload.error;

    throw new ApiClientError(error.message, response.status, error.code, error.details);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
