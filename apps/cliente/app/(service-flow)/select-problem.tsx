import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, LogoPin, AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

type ProblemOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PROBLEMS: ProblemOption[] = [
  { id: "tire", label: "Pneu furado", icon: "construct-outline" },
  { id: "battery", label: "Bateria / Não liga", icon: "flash-outline" },
  { id: "electric", label: "Pane elétrica", icon: "hardware-chip-outline" },
  { id: "overheat", label: "Superaquecimento", icon: "thermometer-outline" },
  { id: "fuel", label: "Pane seca (Combustível)", icon: "speedometer-outline" },
  { id: "other", label: "Outro problema", icon: "help-circle-outline" },
];

export default function SelectProblemScreen() {
  const { vehicleId } = useLocalSearchParams();
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  function handleContinue() {
    if (!selectedProblem) return;
    router.push({
      pathname: "/(service-flow)/triage",
      params: { vehicleId, problemType: selectedProblem },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>O que aconteceu?</Text>
        <Text style={styles.subtitle}>Selecione o problema principal para triagem.</Text>

        <View style={styles.grid}>
          {PROBLEMS.map((item) => {
            const isSelected = selectedProblem === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedProblem(item.id)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                ]}
                accessibilityLabel={`Problema: ${item.label}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                  <Ionicons
                    name={item.icon}
                    size={28}
                    color={isSelected ? colors.bg : colors.primary}
                  />
                </View>
                <Text style={[styles.cardLabel, isSelected && styles.textInverted]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="CONTINUAR"
          onPress={handleContinue}
          disabled={!selectedProblem}
          style={styles.continueButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerSpacer: { width: 44 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.sm,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(253, 212, 4, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  iconBoxSelected: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  cardLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
  },
  textInverted: { color: colors.bg },
  continueButton: { marginTop: spacing.md },
});
