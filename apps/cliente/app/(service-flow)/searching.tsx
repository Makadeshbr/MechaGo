import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { LogoPin } from "@/components/ui";
import { colors, spacing } from "@mechago/shared";

/**
 * Tela de busca de profissionais (C09).
 * Placeholder — será implementada na Task 05 (Matching Engine).
 */
export default function SearchingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <LogoPin size="md" />
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        <Text style={styles.title}>Buscando profissionais...</Text>
        <Text style={styles.subtitle}>
          Estamos encontrando o melhor profissional para você.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  spinner: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
