import React, { useEffect } from "react";
import { Stack } from "expo-router";
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
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      hydrate();
    }
  }, [fontsLoaded, hydrate]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(service-flow)" options={{ animation: "slide_from_bottom" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
