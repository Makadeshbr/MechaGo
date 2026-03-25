import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  createdAt: string;
}

// Query key para invalidação após edição de perfil
export const userKeys = {
  me: ["user", "me"] as const,
};

// Busca dados do usuário autenticado (GET /users/me)
// Usado no dashboard para saudação e em telas de perfil
export function useUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const response = await api
        .get("users/me")
        .json<{ user: User }>();
      return response.user;
    },
  });
}
