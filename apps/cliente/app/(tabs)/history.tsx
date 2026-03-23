import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@mechago/shared";

// Placeholder — será implementado na task de service-requests
export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Nenhum atendimento realizado</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.textSecondary,
  },
});
