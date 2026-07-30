import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 15, // 15 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Limpa todo o cache do TanStack Query em memória durante o logout
 */
export function clearQueryCache(): void {
  queryClient.clear();
}
