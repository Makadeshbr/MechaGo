/**
 * Hook para registrar push notifications (FCM/APNs) no startup do app Cliente.
 *
 * Fluxo idêntico ao app Pro:
 * 1. Solicita permissão de notificações ao SO.
 * 2. Obtém o device push token (Expo).
 * 3. Envia o token para PATCH /api/v1/users/me/fcm-token no backend.
 *
 * Idempotente: pode ser chamado múltiplas vezes sem duplicar o token.
 */

import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "@/lib/api";

// Configuração global: notificações em foreground aparecem com alerta + som + badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  // Push não funciona em emuladores sem Google Play Services
  if (!Device.isDevice) {
    console.log("[Push] Ignorando — executando em simulador/emulador");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permissão de notificações negada pelo usuário");
    return null;
  }

  // Canal de notificação obrigatório no Android 8+
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("mechago_default", {
      name: "MechaGo",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
      sound: "default",
    });
  }

  // Obtém o Expo Push Token — projectId obrigatório no SDK 50+ para funcionar corretamente
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenData.data;

  // Registra o token no backend — falha silenciosa para não interromper o startup
  try {
    await api.patch("users/me/fcm-token", { json: { fcmToken: token } }).json();
    console.log("[Push] Token FCM do cliente registrado com sucesso");
  } catch (err) {
    console.warn("[Push] Falha ao registrar token FCM do cliente:", err);
  }

  return token;
}

/**
 * Integrar no layout raiz (_layout.tsx) do app Cliente após o usuario estar autenticado.
 */
export function usePushNotifications() {
  useEffect(() => {
    registerForPushNotifications().catch((err) => {
      console.warn("[Push] Erro na inicialização de push:", err);
    });
  }, []);
}
