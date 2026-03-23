import ky from "ky";
import { tokenStorage } from "./storage";
import { router } from "expo-router";

const API_BASE_URL = __DEV__
  ? "http://10.0.2.2:3000/api/v1" // Android emulator → host machine
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
        // Se receber 401, tenta refresh automático
        if (response.status === 401) {
          const refreshToken = tokenStorage.getRefreshToken();
          if (!refreshToken) {
            tokenStorage.clearTokens();
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
            tokenStorage.clearTokens();
            router.replace("/(auth)/login");
          }
        }
        return response;
      },
    ],
  },
});
