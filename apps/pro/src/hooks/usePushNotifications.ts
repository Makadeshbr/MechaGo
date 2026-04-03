/**
 * Hook para registrar push notifications (FCM/APNs) no startup do app.
 *
 * Fluxo:
 * 1. Solicita permissão de notificações ao sistema operacional.
 * 2. Se concedida, obtém o device push token (Expo ou FCM puro).
 * 3. Envia o token para PATCH /api/v1/users/me/fcm-token no backend.
 *
 * Idempotente: pode ser chamado múltiplas vezes sem duplicar o token.
 * O hook deve ser intregrado no layout raiz (_layout.tsx) após o login.
 */

import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "@/lib/api";

// Configuração global do handler de notificações (deve ficar no topo do módulo)
// Define como exibir notificações quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra o device push token no backend após obter permissão do SO.
 * Retorna o token registrado, ou null se o usuário negou permissão.
 */
async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications não funcionam em emuladores sem Google Play Services
  if (!Device.isDevice) {
    console.log("[Push] Ignorando — executando em simulador/emulador");
    return null;
  }

  // Verifica permissões atuais antes de solicitar
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

  // Android requer canal de notificação para Android 8+
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

  // Envia o token para o backend — falha silenciosa (não bloqueia o startup)
  try {
    await api.patch("users/me/fcm-token", { json: { fcmToken: token } }).json();
    console.log("[Push] Token FCM registrado no backend com sucesso");
  } catch (err) {
    console.warn("[Push] Falha ao registrar token FCM no backend:", err);
  }

  return token;
}

/**
 * Hook que deve ser chamado no layout raiz após o usuário estar autenticado.
 * Registra push notifications automaticamente.
 */
export function usePushNotifications() {
  useEffect(() => {
    registerForPushNotifications().catch((err) => {
      // Erro não deve quebrar o app — push é feature aditiva
      console.warn("[Push] Erro na inicialização de push:", err);
    });
  }, []);
}
