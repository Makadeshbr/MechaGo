import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { Button, LogoPin, Input, AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

interface TriageForm {
  [key: string]: string;
}

const TRIAGE_QUESTIONS: Record<string, { question: string; options?: string[]; placeholder?: string }[]> = {
  battery: [
    { question: "As luzes do painel acendem?", options: ["Sim", "Não", "Fracas"] },
    { question: "O motor faz algum barulho ao girar a chave?", options: ["Sim, tenta girar", "Não faz nada", "Estalos"] },
  ],
  tire: [
    { question: "Você possui estepe?", options: ["Sim", "Não", "Não sei"] },
    { question: "O estepe está calibrado?", options: ["Sim", "Não", "Não sei"] },
    { question: "Possui chave de roda e macaco?", options: ["Sim", "Não"] },
  ],
  fuel: [
    { question: "Qual o combustível do veículo?", options: ["Gasolina", "Etanol", "Diesel", "Flex"] },
  ],
  other: [
    { question: "Descreva brevemente o problema", placeholder: "Ex: Barulho estranho na suspensão" },
  ]
};

export default function TriageScreen() {
  const { vehicleId, problemType } = useLocalSearchParams<{ vehicleId: string; problemType: string }>();
  const questions = TRIAGE_QUESTIONS[problemType] || TRIAGE_QUESTIONS.other;

  const { control, handleSubmit } = useForm<TriageForm>();

  function onSubmit(data: TriageForm) {
    router.push({
      pathname: "/(service-flow)/estimate",
      params: { 
        vehicleId, 
        problemType,
        triageAnswers: JSON.stringify(data)
      },
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
        <Text style={styles.title}>Triagem rápida</Text>
        <Text style={styles.subtitle}>Responda para uma estimativa mais precisa.</Text>

        <View style={styles.form}>
          {questions.map((q, index) => (
            <View key={index} style={styles.questionContainer}>
              <Text style={styles.questionText}>{q.question}</Text>
              
              {q.options ? (
                <Controller
                  control={control}
                  name={`q${index}`}
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.optionsGrid}>
                      {q.options!.map((option) => {
                        const isSelected = value === option;
                        return (
                          <Pressable
                            key={option}
                            onPress={() => onChange(option)}
                            style={[
                              styles.optionCard,
                              isSelected && styles.optionCardSelected,
                            ]}
                          >
                            <Text style={[styles.optionLabel, isSelected && styles.textInverted]}>
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              ) : (
                <Controller
                  control={control}
                  name={`q${index}`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      placeholder={q.placeholder}
                      value={value}
                      onChangeText={onChange}
                      multiline
                      numberOfLines={3}
                    />
                  )}
                />
              )}
            </View>
          ))}
        </View>

        <Button
          title="VER ESTIMATIVA"
          onPress={handleSubmit(onSubmit)}
          style={styles.submitButton}
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
    marginBottom: spacing.xxl,
  },
  form: { gap: spacing.xxl },
  questionContainer: { gap: spacing.md },
  questionText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: colors.text,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  optionCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: colors.text,
  },
  textInverted: { color: colors.bg },
  submitButton: { marginTop: spacing.xxxl },
});
