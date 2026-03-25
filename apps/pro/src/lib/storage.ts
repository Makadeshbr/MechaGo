import { MMKV } from "react-native-mmkv";

// Interface comum para storage — MMKV em builds standalone, fallback in-memory no Expo Go
interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

// Fallback in-memory para Expo Go (sem suporte a TurboModules/MMKV 3.x)
// Tokens não persistem entre reloads, mas permite testar o fluxo completo
class InMemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();
  getString(key: string) {
    return this.data.get(key);
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
  delete(key: string) {
    this.data.delete(key);
  }
}

function createStorage(): StorageAdapter {
  try {
    // ID diferente do app cliente para isolar os storages no mesmo dispositivo
    return new MMKV({ id: "mechago-pro" });
  } catch {
    // MMKV falha no Expo Go (sem TurboModules) — usar fallback in-memory
    console.warn("[storage] MMKV indisponível, usando storage in-memory (Expo Go)");
    return new InMemoryStorage();
  }
}

export const storage = createStorage();

// Helpers tipados para tokens
const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

export const tokenStorage = {
  getAccessToken: () => storage.getString(ACCESS_TOKEN_KEY) ?? null,
  getRefreshToken: () => storage.getString(REFRESH_TOKEN_KEY) ?? null,

  setTokens: (accessToken: string, refreshToken: string) => {
    storage.set(ACCESS_TOKEN_KEY, accessToken);
    storage.set(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: () => {
    storage.delete(ACCESS_TOKEN_KEY);
    storage.delete(REFRESH_TOKEN_KEY);
  },
};
