import React, { useEffect, useRef, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth.store";
import { authEvents } from "@/lib/auth-events";
import { SocketProvider } from "@/providers/SocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { colors } from "@mechago/shared";

// Timeout máximo para carregamento de fontes (ms).
// Previne splash presa em redes lentas ou CDN indisponível após EAS update.
const FONT_LOAD_TIMEOUT_MS = 5000;

// Manter splash visível até fontes carregarem (ou timeout)
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [appReady, setAppReady] = useState(false);
  const splashHidden = useRef(false);

  const [fontsLoaded, fontsError] = useFonts({
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Esconde splash quando fontes carregam OU quando há erro/timeout
  useEffect(() => {
    if (splashHidden.current) return;

    if (fontsLoaded || fontsError) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
      hydrate();
      setAppReady(true);
      return;
    }

    // Timeout de segurança: se fontes não carregarem, continua mesmo assim
    const timer = setTimeout(() => {
      if (splashHidden.current) return;
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
      hydrate();
      setAppReady(true);
    }, FONT_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fontsLoaded, fontsError, hydrate]);

  // Escuta eventos de force-logout do interceptor HTTP (api.ts)
  useEffect(() => {
    return authEvents.onForceLogout(() => {
      router.replace("/(auth)/login");
    });
  }, []);

  // Registra push notifications após conexão do app
  usePushNotifications();

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(service-flow)" options={{ animation: "slide_from_bottom" }} />
          </Stack>
        </SocketProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
