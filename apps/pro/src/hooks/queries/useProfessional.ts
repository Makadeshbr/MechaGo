import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RegisterProfessionalFormInput } from "@mechago/shared";

// Tipo de retorno do GET /professionals/me/stats
// Definido localmente porque ainda não temos o tipo no shared
interface ProfessionalStats {
  totalEarnings: number;
  totalServices: number;
  averageRating: number;
  acceptanceRate: number;
  cancellationsThisMonth: number;
  isOnline: boolean;
}

// Chave de query para invalidação após mutações de online/offline
const STATS_QUERY_KEY = ["professional", "stats"] as const;

// ==================== STATS ====================
// Busca estatísticas do profissional autenticado (GET /professionals/me/stats)
export function useProfessionalStats() {
  return useQuery({
    queryKey: STATS_QUERY_KEY,
    queryFn: async () => {
      const response = await api
        .get("professionals/me/stats")
        .json<{ stats: ProfessionalStats }>();
      return response.stats;
    },
  });
}

// ==================== REGISTER ====================
// Registra perfil profissional com dados do onboarding (POST /professionals/register)
// Chamado na tela review.tsx com os dados consolidados do store
export function useRegisterProfessional() {
  return useMutation({
    mutationFn: async (input: RegisterProfessionalFormInput) => {
      return await api
        .post("professionals/register", { json: input })
        .json<{ professional: { id: string } }>();
    },
  });
}

// ==================== UPDATE ====================
// Atualiza dados do perfil profissional (PATCH /professionals/me)
// Suporta edição de especialidades, raio de atuação e tipo de agenda
export function useUpdateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<RegisterProfessionalFormInput>) => {
      const response = await api.patch("professionals/me", { json: input });
      return response.json<{ professional: { id: string } }>();
    },
    onSuccess: () => {
      // Invalida a query de usuário e estatísticas para refletir as mudanças
      void queryClient.invalidateQueries({ queryKey: ["user"] });
      void queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
}

// ==================== GO ONLINE ====================
// Envia localização GPS e seta isOnline=true (POST /professionals/me/online)
// latitude e longitude são obtidos via expo-location antes de chamar este hook
export function useGoOnline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      return await api
        .post("professionals/me/online", { json: coords })
        .json<{ professional: { isOnline: boolean } }>();
    },
    onSuccess: () => {
      // Invalida stats para refletir o novo status online
      void queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
}

// ==================== GO OFFLINE ====================
// Seta isOnline=false sem enviar coordenadas (POST /professionals/me/offline)
export function useGoOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await api
        .post("professionals/me/offline")
        .json<{ professional: { isOnline: boolean } }>();
    },
    onSuccess: () => {
      // Invalida stats para refletir o novo status offline
      void queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
}
