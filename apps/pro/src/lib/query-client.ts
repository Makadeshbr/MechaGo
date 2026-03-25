import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry apenas 1 vez em falhas de rede
      retry: 1,
      // Dados ficam stale após 30 segundos
      staleTime: 30 * 1000,
      // Cache mantido por 5 minutos após unmount
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
