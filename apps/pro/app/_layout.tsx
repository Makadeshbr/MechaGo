import React, { useEffect } from "react";
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
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth.store";
import { authEvents } from "@/lib/auth-events";
import { SocketProvider } from "@/providers/SocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { colors } from "@mechago/shared";

// Manter splash visível até fontes carregarem
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      hydrate();
    }
  }, [fontsLoaded, hydrate]);

  // Escuta eventos de force-logout do interceptor HTTP (api.ts)
  // para navegar dentro do React tree em vez de chamar router fora do lifecycle
  useEffect(() => {
    return authEvents.onForceLogout(() => {
      router.replace("/(auth)/login");
    });
  }, []);

  // Registra push notifications após conexão do app
  // O hook opera em modo fire-and-forget — nunca bloqueante
  usePushNotifications();

  if (!fontsLoaded) {
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
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new-request" />
            <Stack.Screen name="(service-flow)" options={{ animation: "slide_from_bottom" }} />
          </Stack>
        </SocketProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
