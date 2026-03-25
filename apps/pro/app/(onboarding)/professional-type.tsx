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
import type { ProfessionalType } from "@mechago/shared";

// Tipos de profissional — fiel ao design Stitch (cadastro_pro_tipo_2_4)
// 4 cards com ícone, título e descrição curta
const PROFESSIONAL_TYPES: {
  id: ProfessionalType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: "mechanic_mobile",
    label: "Mecânico Móvel",
    description: "Atendo no local do cliente",
    icon: "car-outline",
  },
  {
    id: "mechanic_workshop",
    label: "Mecânico com Oficina",
    description: "Atendo na minha oficina",
    icon: "construct-outline",
  },
  {
    id: "tire_repair",
    label: "Borracheiro",
    description: "Pneus, rodas e calibragem",
    icon: "ellipse-outline",
  },
  {
    id: "tow_truck",
    label: "Guincho",
    description: "Reboque e transporte de veículos",
    icon: "bus-outline",
  },
];

// Passo 1/4 do onboarding: seleção do tipo de profissional (escolha única)
// Fiel ao design: cadastro_pro_tipo_2_4/screen.png
export default function ProfessionalTypeScreen() {
  const setStep2 = useOnboardingStore((s) => s.setStep2);
  const currentType = useOnboardingStore((s) => s.step2.type);
  const [selected, setSelected] = useState<ProfessionalType | null>(
    currentType ?? null,
  );

  function onNext() {
    if (!selected) return;
    // Persiste no store para consolidação no review
    setStep2({ type: selected });
    router.push("/(onboarding)/specialty");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />

      {/* Barra de progresso — 1 de 4 ativa */}
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>PASSO 1 DE 4</Text>
        <Text style={styles.title}>Qual seu tipo de serviço?</Text>
        <Text style={styles.subtitle}>
          Selecione o tipo que melhor descreve sua atuação profissional.
        </Text>

        <View style={styles.list}>
          {PROFESSIONAL_TYPES.map((type) => {
            const isSelected = selected === type.id;
            return (
              <Pressable
                key={type.id}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && !isSelected && { opacity: 0.7 },
                ]}
                onPress={() => setSelected(type.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${type.label}: ${type.description}`}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isSelected && styles.iconCircleSelected,
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={24}
                    color={isSelected ? "#000000" : colors.textSecondary}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.cardLabel,
                      isSelected && styles.cardLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      isSelected && styles.cardDescriptionSelected,
                    ]}
                  >
                    {type.description}
                  </Text>
                </View>
                {/* Radio indicator */}
                <View
                  style={[
                    styles.radio,
                    isSelected && styles.radioSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="PRÓXIMO"
          onPress={onNext}
          disabled={!selected}
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
    marginBottom: spacing.xxxl,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 80,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(253, 212, 4, 0.06)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: colors.text,
  },
  cardLabelSelected: {
    color: colors.text,
  },
  cardDescription: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDescriptionSelected: {
    color: colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
});
