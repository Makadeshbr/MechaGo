import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { tokenStorage } from "@/lib/storage";

// Mesma lógica de fallback do api.ts — garante que OTAs sem o env var ainda conectem no Railway
const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? "http://192.168.2.100:3000" : "https://api-production-f7a8.up.railway.app");

interface SocketRequestVehicle {
  brand: string;
  model: string;
  year: number;
  plate: string;
  type: string;
}

interface SocketRequestData {
  requestId: string;
  problemType: string;
  clientLatitude: string;
  clientLongitude: string;
  distanceMeters: number;
  estimatedPrice: string | null;
  createdAt: string;
  vehicle: SocketRequestVehicle;
  isCancelled?: boolean;
  isClaimed?: boolean;
  claimedBy?: string;
}

interface RequestClaimedPayload {
  requestId: string;
  claimedBy?: string;
}

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
  requestData: SocketRequestData | null;
  clearRequest: () => void;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

/**
 * SocketProvider Enterprise
 * 
 * - Mantém conexão estável (ciclo de vida global)
 * - Escuta novos chamados em qualquer tela do app
 * - Gerencia redirecionamento inteligente para a tela de aceitação
 * - Conecta apenas se autenticado E com status 'online' na API
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [requestData, setRequestData] = useState<SocketRequestData | null>(null);
  const appState = useRef(AppState.currentState);

  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const clearRequest = useCallback(() => {
    setRequestData(null);
  }, []);

  useEffect(() => {
    // Socket conecta sempre que autenticado — desconecta apenas ao fazer logout.
    // O servidor filtra profissionais offline na query de matching (PostGIS).
    if (!isAuthenticated) {
      if (socket) {
        console.log("[Socket] Disconnecting due to unauthenticated status");
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) return;

    // Configuração sênior: WebSockets prioritários e reconexão automática
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected to MechaGo API:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("[Socket] Connection Error:", error.message);
    });

    // Listener global para novos chamados — O coração do MechaGo Pro
    newSocket.on("new_request", (data) => {
      console.log("[Socket] Global: New request incoming!", data.requestId);
      setRequestData(data);

      // Redirecionamento inteligente: só navega se não estiver na tela de chamado ou onboarding
      if (pathname !== "/new-request") {
        router.push("/new-request");
      }
    });

    // Listener para cancelamento pelo cliente
    newSocket.on("request_cancelled", (data) => {
      console.log("[Socket] Global: Request was cancelled by client", data.requestId);
      // Se estivermos na tela de novo chamado deste ID, limpamos e avisamos
      setRequestData((current) => {
        if (current?.requestId === data.requestId) {
          return { ...current, isCancelled: true } as SocketRequestData;
        }
        return current;
      });
    });

    // Listener para quando outro profissional aceita (Limpeza de Tela)
    newSocket.on("request_claimed", (data: RequestClaimedPayload) => {
      console.log("[Socket] Global: Request claimed by another pro", data.requestId);

      if (data.claimedBy && data.claimedBy === user?.id) {
        return;
      }

      setRequestData((current) => {
        if (current?.requestId === data.requestId) {
          return {
            ...current,
            isClaimed: true,
            claimedBy: typeof data.claimedBy === "string" ? data.claimedBy : undefined,
          } as SocketRequestData;
        }
        return current;
      });
    });

    setSocket(newSocket);

    // Reconectar com token fresco quando o app volta do background
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        if (newSocket && !newSocket.connected) {
          const freshToken = tokenStorage.getAccessToken();
          if (freshToken) {
            newSocket.auth = { token: freshToken };
            newSocket.connect();
          }
        }
      }
      appState.current = nextState;
    });

    return () => {
      console.log("[Socket] Cleaning up global connection");
      subscription.remove();
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, requestData, clearRequest }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
