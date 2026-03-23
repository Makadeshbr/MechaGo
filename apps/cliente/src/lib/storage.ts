import { MMKV } from "react-native-mmkv";

// Storage persistente via MMKV (mais rápido que AsyncStorage)
// Usado para tokens de auth e preferências do usuário
export const storage = new MMKV({ id: "mechago-cliente" });

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
