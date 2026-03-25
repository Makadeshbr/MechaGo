import { create } from "zustand";
import { tokenStorage } from "@/lib/storage";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  type: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hydrate: () => void;
}

// Store de auth — apenas estado local (client state)
// Dados do servidor (perfil completo) ficam no TanStack Query
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  // Verifica se há tokens salvos no MMKV ao abrir o app
  hydrate: () => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      // Tokens existem — usuário será validado no layout com GET /users/me
      set({ isAuthenticated: true, isLoading: false });
    } else {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
