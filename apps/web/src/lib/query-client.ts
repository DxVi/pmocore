import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api-client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Client errors (401/404/409...) are final; retry only transient failures.
        retry: (failureCount, error) =>
          !(error instanceof ApiClientError && error.status >= 400 && error.status < 500) &&
          failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
