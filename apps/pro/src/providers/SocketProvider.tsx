import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter, usePathname } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useProfessionalStats } from "@/hooks/queries/useProfessional";
import { tokenStorage } from "@/lib/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.2.100:3000";

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
  requestData: any | null; // Dados do chamado atual recebido globalmente
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
  const [requestData, setRequestData] = useState<any | null>(null);
  
  const { isAuthenticated } = useAuthStore();
  const { data: stats } = useProfessionalStats();
  const router = useRouter();
  const pathname = usePathname();

  const isOnline = stats?.isOnline ?? false;

  const clearRequest = useCallback(() => {
    setRequestData(null);
  }, []);

  useEffect(() => {
    // Só conecta se autenticado E online (conforme RULES.md - PostGIS matching)
    if (!isAuthenticated || !isOnline) {
      if (socket) {
        console.log("[Socket] Disconnecting due to offline/unauthenticated status");
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

    setSocket(newSocket);

    return () => {
      console.log("[Socket] Cleaning up global connection");
      newSocket.disconnect();
    };
  }, [isAuthenticated, isOnline]);

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
