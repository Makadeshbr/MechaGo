import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/auth.store";
import { router } from "expo-router";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  cpfCnpj: string;
  type: "client";
}

interface AuthResponse {
  user: { id: string; name: string; email: string; type: string };
  tokens: { accessToken: string; refreshToken: string };
}

// Hook de autenticação — encapsula login, register e logout
// Persiste tokens no MMKV e atualiza o store de auth
export function useAuth() {
  const { setUser, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      return api.post("auth/login", { json: input }).json<AuthResponse>();
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken,
      );
      setUser(data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      return api.post("auth/register", { json: input }).json<AuthResponse>();
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken,
      );
      setUser(data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.post("auth/logout");
      } catch {
        // Mesmo que falhe no servidor, limpa localmente
      }
    },
    onSettled: () => {
      storeLogout();
      router.replace("/(auth)/login");
    },
  });

  return {
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
