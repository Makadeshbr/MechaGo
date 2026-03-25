import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, AmbientGlow } from "@/components/ui";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { colors, spacing, borderRadius } from "@mechago/shared";
import type { Specialty, VehicleTypeServed } from "@mechago/shared";

// Especialidades — espelham o enum do backend
const SPECIALTIES: { id: Specialty; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "car_general", label: "Mecânica Geral", icon: "construct-outline" },
  { id: "electronic_injection", label: "Injeção Eletrônica", icon: "flash-outline" },
  { id: "brakes", label: "Freios", icon: "disc-outline" },
  { id: "suspension", label: "Suspensão", icon: "swap-vertical-outline" },
  { id: "air_conditioning", label: "Ar Condicionado", icon: "snow-outline" },
  { id: "transmission", label: "Transmissão", icon: "cog-outline" },
  { id: "moto", label: "Motocicletas", icon: "bicycle-outline" },
  { id: "diesel_truck", label: "Diesel / Caminhão", icon: "bus-outline" },
];

// Tipos de veículo atendidos — espelham o enum do backend
const VEHICLE_TYPES: { id: VehicleTypeServed; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "car", label: "Passeio", icon: "car-outline" },
  { id: "suv", label: "SUVs / Rodes", icon: "car-sport-outline" },
  { id: "truck", label: "Carga", icon: "bus-outline" },
  { id: "moto", label: "Motos", icon: "bicycle-outline" },
];

// Passo 2/4 do onboarding: especialidades + tipos de veículo
// Fiel ao design: cadastro_pro_especialidades_3_4/screen.png
export default function SpecialtyScreen() {
  const setStep3 = useOnboardingStore((s) => s.setStep3);
  const currentStep3 = useOnboardingStore((s) => s.step3);

  const [selectedSpecs, setSelectedSpecs] = useState<Set<Specialty>>(
    new Set(currentStep3.specialties ?? []),
  );
  const [selectedVehicles, setSelectedVehicles] = useState<Set<VehicleTypeServed>>(
    new Set(currentStep3.vehicleTypesServed ?? []),
  );

  function toggleSpec(id: Specialty) {
    setSelectedSpecs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleVehicle(id: VehicleTypeServed) {
    setSelectedVehicles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const canProceed = selectedSpecs.size > 0 && selectedVehicles.size > 0;

  function onNext() {
    if (!canProceed) return;
    // Persiste no store — será consolidado no review/submit
    setStep3({
      specialties: Array.from(selectedSpecs),
      vehicleTypesServed: Array.from(selectedVehicles),
    });
    router.push("/(onboarding)/service-area");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />

      {/* Barra de progresso — 2 de 4 ativas */}
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>PASSO 2 DE 4</Text>
        <Text style={styles.title}>Suas especialidades</Text>
        <Text style={styles.subtitle}>
          Selecione os serviços que você oferece e os tipos de veículo que atende.
        </Text>

        {/* Seção: Especialidades (chips multi-select) */}
        <Text style={styles.sectionLabel}>ESPECIALIDADES</Text>
        <View style={styles.chipGrid}>
          {SPECIALTIES.map((spec) => {
            const isSelected = selectedSpecs.has(spec.id);
            return (
              <Pressable
                key={spec.id}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && !isSelected && { opacity: 0.7 },
                ]}
                onPress={() => toggleSpec(spec.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={spec.label}
              >
                <Ionicons
                  name={spec.icon}
                  size={16}
                  color={isSelected ? "#000000" : colors.textSecondary}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {spec.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Seção: Tipos de veículo (grid 2×2) */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>
          TIPOS DE VEÍCULO
        </Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((vt) => {
            const isSelected = selectedVehicles.has(vt.id);
            return (
              <Pressable
                key={vt.id}
                style={({ pressed }) => [
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardSelected,
                  pressed && !isSelected && { opacity: 0.7 },
                ]}
                onPress={() => toggleVehicle(vt.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={vt.label}
              >
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
                <Ionicons
                  name={vt.icon}
                  size={28}
                  color={isSelected ? "#000000" : colors.textSecondary}
                />
                <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelSelected]}>
                  {vt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="PRÓXIMO"
          onPress={onNext}
          disabled={!canProceed}
          accessibilityLabel="Ir para próximo passo"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressBar: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
  },
  progressActive: { backgroundColor: colors.primary },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  backButton: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  step: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: { color: "#000000" },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  vehicleCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
    minHeight: 100,
    justifyContent: "flex-end",
  },
  vehicleCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  vehicleLabelSelected: { color: "#000000" },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
});
