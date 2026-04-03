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
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Button, LogoPin, Input, AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

const TRIAGE_QUESTIONS: Record<
  string,
  { question: string; options?: string[]; placeholder?: string; required?: boolean }[]
> = {
  battery: [
    {
      question: "As luzes do painel acendem?",
      options: ["Sim", "Não", "Fracas"],
      required: true,
    },
    {
      question: "O motor faz algum barulho ao girar a chave?",
      options: ["Sim, tenta girar", "Não faz nada", "Estalos"],
      required: true,
    },
  ],
  tire: [
    {
      question: "Você possui estepe?",
      options: ["Sim", "Não", "Não sei"],
      required: true,
    },
    {
      question: "O estepe está calibrado?",
      options: ["Sim", "Não", "Não sei"],
    },
    {
      question: "Possui chave de roda e macaco?",
      options: ["Sim", "Não"],
    },
  ],
  fuel: [
    {
      question: "Qual o combustível do veículo?",
      options: ["Gasolina", "Etanol", "Diesel", "Flex"],
      required: true,
    },
  ],
  other: [
    {
      question: "Descreva brevemente o problema",
      placeholder: "Ex: Barulho estranho na suspensão",
      required: true,
    },
  ],
};

function buildTriageSchema(questions: typeof TRIAGE_QUESTIONS[string]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  questions.forEach((q, index) => {
    const key = `q${index}`;
    if (q.required) {
      shape[key] = z
        .string({ required_error: "Este campo é obrigatório" })
        .min(1, "Selecione ou preencha esta resposta");
    } else {
      shape[key] = z.string().optional();
    }
  });
  return z.object(shape);
}

export default function TriageScreen() {
  const { vehicleId, problemType } = useLocalSearchParams<{
    vehicleId: string;
    problemType: string;
  }>();
  const questions = TRIAGE_QUESTIONS[problemType] ?? TRIAGE_QUESTIONS.other;
  const triageSchema = buildTriageSchema(questions);
  type TriageForm = z.infer<typeof triageSchema>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TriageForm>({
    resolver: zodResolver(triageSchema),
    mode: "onChange",
  });

  function onSubmit(data: TriageForm) {
    router.push({
      pathname: "/(service-flow)/estimate",
      params: {
        vehicleId,
        problemType,
        triageAnswers: JSON.stringify(data),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Triagem rápida</Text>
        <Text style={styles.subtitle}>
          Responda para uma estimativa mais precisa.
        </Text>

        <View style={styles.form}>
          {questions.map((q, index) => {
            const fieldKey = `q${index}` as keyof TriageForm;
            const error = errors[fieldKey as string]?.message as string | undefined;

            return (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {q.question}
                  {q.required && (
                    <Text style={styles.required}> *</Text>
                  )}
                </Text>

                {q.options ? (
                  <Controller
                    control={control}
                    name={fieldKey}
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
                                !!error && styles.optionCardError,
                              ]}
                              accessibilityRole="radio"
                              accessibilityLabel={option}
                              accessibilityState={{ selected: isSelected }}
                            >
                              <Text
                                style={[
                                  styles.optionLabel,
                                  isSelected && styles.textInverted,
                                ]}
                              >
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
                    name={fieldKey}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="DESCRIÇÃO DO PROBLEMA"
                        placeholder={q.placeholder}
                        value={value as string ?? ""}
                        onChangeText={onChange}
                        multiline
                        numberOfLines={3}
                        error={error}
                        accessibilityLabel="Descrição do problema"
                      />
                    )}
                  />
                )}

                {error && q.options && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
              </View>
            );
          })}
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
  required: { color: colors.primary },
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
    minHeight: 44,
    justifyContent: "center",
  },
  optionCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionCardError: {
    borderColor: colors.error,
  },
  optionLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: colors.text,
  },
  textInverted: { color: colors.bg },
  errorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  submitButton: { marginTop: spacing.xxxl },
});
