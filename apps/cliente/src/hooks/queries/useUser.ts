import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  avatarUrl: string | null;
  cpfCnpj: string;
  rating: string | null;
  totalReviews: number | null;
  isVerified: boolean;
  createdAt: string;
}

// Query keys organizadas por domínio
export const userKeys = {
  me: ["users", "me"] as const,
};

// Hook para buscar perfil do usuário logado
export function useUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const response = await api.get("users/me").json<{ user: UserProfile }>();
      return response.user;
    },
  });
}
