import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/auth.store";
import { router } from "expo-router";
import type {
  AuthResponse,
  LoginRequestInput,
  RegisterFormOutput,
} from "@mechago/shared";

type RegisterInput = Omit<RegisterFormOutput, "confirmPassword"> & {
  type: "client";
};

// Extrai mensagem de erro da resposta HTTP (ky lança HTTPError com body JSON)
async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const body = await (error as { response: Response }).response.json();
      return body?.error?.message ?? body?.message ?? "Erro inesperado";
    }
  } catch {
    // Body não é JSON — ignorar
  }
  return "Erro de conexão. Verifique sua internet.";
}

// Hook de autenticação — encapsula login, register e logout
// Persiste tokens no MMKV e atualiza o store de auth
export function useAuth() {
  const { setUser, logout: storeLogout } = useAuthStore();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (input: LoginRequestInput) => {
      try {
        return await api
          .post("auth/login", { json: input })
          .json<AuthResponse>();
      } catch (error) {
        const message = await extractErrorMessage(error);
        throw new Error(message);
      }
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken,
      );
      setUser(data.user);
      // Limpa cache de queries stale/com erro para que re-login
      // não mostre dados ou erros de sessões anteriores
      void queryClient.resetQueries();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      try {
        return await api
          .post("auth/register", { json: input })
          .json<AuthResponse>();
      } catch (error) {
        const message = await extractErrorMessage(error);
        throw new Error(message);
      }
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken,
      );
      setUser(data.user);
      void queryClient.resetQueries();
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
