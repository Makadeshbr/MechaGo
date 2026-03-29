import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { tokenStorage } from "@/lib/storage";

// Mesma lógica de fallback do api.ts — garante que OTAs sem o env var ainda conectem no Railway
const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? "http://192.168.2.100:3000" : "https://api-production-f7a8.up.railway.app");

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const newSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Client connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("[Socket] Client disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });

    setSocket(newSocket);

    // Reconectar quando o app volta do background
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
      subscription.remove();
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
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
