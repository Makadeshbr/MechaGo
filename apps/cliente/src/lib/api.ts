import ky from "ky";
import { tokenStorage } from "./storage";
import { useAuthStore } from "@/stores/auth.store";
import { authEvents } from "./auth-events";

// EXPO_PUBLIC_API_URL vem do eas.json (preview/production) ou fallback para dev local
// 192.168.2.100 = IP da máquina na rede Wi-Fi (celular físico + Expo Go)
// 10.0.2.2 = alias do host no emulador Android
const DEV_API_URL = "http://192.168.2.100:3000/api/v1";

// Em prod/preview, EXPO_PUBLIC_API_URL vem do eas.json baked no build ou via env no eas update.
// Fallback explícito para Railway garante que OTAs publicadas sem o env var ainda funcionem.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
    : __DEV__
      ? DEV_API_URL
      : "https://api-production-f7a8.up.railway.app/api/v1";

// Header sentinel para evitar loop infinito de refresh:
// após refresh + retry, se o retry também retorna 401, faz logout direto
const RETRY_HEADER = "X-Retry-After-Refresh";

// Mutex: quando múltiplas requests recebem 401 simultâneo (ex: tela carrega 3 queries),
// apenas UM refresh é disparado. As demais aguardam o mesmo promise.
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const data = await ky
      .post(`${API_BASE_URL}/auth/refresh`, {
        json: { refreshToken },
      })
      .json<{ tokens: { accessToken: string; refreshToken: string } }>();

    tokenStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function forceLogout(): void {
  useAuthStore.getState().logout();
  authEvents.emitForceLogout();
}

// Cliente HTTP configurado com interceptors de auth, retry e refresh mutex
export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 15000,
  // Retry automático apenas para GET (idempotente) em erros de servidor/rede.
  // POST/PUT/DELETE nunca são retentados para evitar operações duplicadas.
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
    backoffLimit: 3000,
  },
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

        if (response.status !== 401) {
          return response;
        }

        // Guard: se este request já é um retry pós-refresh e ainda falhou 401,
        // o token novo também é inválido — forçar logout sem loop
        if (_request.headers.get(RETRY_HEADER)) {
          forceLogout();
          return response;
        }

        // Mutex: reutiliza refresh em andamento em vez de disparar concorrentes
        if (!refreshPromise) {
          refreshPromise = attemptTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        const success = await refreshPromise;

        if (!success) {
          forceLogout();
          return response;
        }

        // Retry da request original com novo token + sentinel anti-loop
        const newToken = tokenStorage.getAccessToken();
        _request.headers.set("Authorization", `Bearer ${newToken}`);
        _request.headers.set(RETRY_HEADER, "1");
        return ky(_request);
      },
    ],
  },
});
