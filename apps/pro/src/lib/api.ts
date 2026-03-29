import ky from "ky";
import { tokenStorage } from "./storage";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

// EXPO_PUBLIC_API_URL vem do eas.json (preview/production) ou fallback para dev local
// 192.168.2.100 = IP da máquina na rede Wi-Fi (celular físico + Expo Go)
const DEV_API_URL = "http://192.168.2.100:3000/api/v1";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
    : __DEV__
      ? DEV_API_URL
      : "https://api.mechago.com.br/api/v1";

// Cliente HTTP configurado com interceptors de auth
// Injeta Bearer token automaticamente e trata 401 (token expirado)
export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 15000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenStorage.getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Endpoints de auth retornam 401 para credenciais inválidas —
        // não interceptar, deixar o erro propagar para a tela tratar
        const url = new URL(_request.url);
        const isAuthEndpoint = url.pathname.includes("/auth/");
        if (response.status === 401 && isAuthEndpoint) {
          return response;
        }

        // Para demais endpoints, 401 = token expirado → tenta refresh
        if (response.status === 401) {
          const refreshToken = tokenStorage.getRefreshToken();
          if (!refreshToken) {
            // Logout limpa tokens E zera isAuthenticated no Zustand,
            // evitando que o guard de index.tsx redirecione de volta para tabs
            useAuthStore.getState().logout();
            router.replace("/(auth)/login");
            return response;
          }

          try {
            const refreshResponse = await ky
              .post(`${API_BASE_URL}/auth/refresh`, {
                json: { refreshToken },
              })
              .json<{
                tokens: { accessToken: string; refreshToken: string };
              }>();

            tokenStorage.setTokens(
              refreshResponse.tokens.accessToken,
              refreshResponse.tokens.refreshToken,
            );

            // Retry da request original com novo token
            _request.headers.set(
              "Authorization",
              `Bearer ${refreshResponse.tokens.accessToken}`,
            );
            return ky(_request);
          } catch {
            // Refresh falhou — forçar re-login
            useAuthStore.getState().logout();
            router.replace("/(auth)/login");
          }
        }
        return response;
      },
    ],
  },
});
