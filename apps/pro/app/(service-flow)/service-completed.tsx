import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button } from "@/components/ui/Button";
import { MechaGoModal } from "@/components/ui/Modal";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { useCreateReview } from "@/hooks/queries/useReviews";

const PRO_TO_CLIENT_TAGS = [
  { label: "Local acessível", value: "local_acessivel" },
  { label: "Comunicativo", value: "comunicativo" },
  { label: "Pagou rápido", value: "pagou_rapido" },
  { label: "Educado", value: "educado" },
  { label: "Objetivo", value: "objetivo" },
];

export default function ServiceCompletedScreen() {
  const { requestId, clientUserId } = useLocalSearchParams<{
    requestId: string;
    clientUserId: string;
  }>();
  const router = useRouter();
  const { data: request } = useServiceRequest(requestId ?? "");
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const finalPrice = request?.finalPrice ?? 0;
  const diagnosticFee = Number(request?.diagnosticFee ?? 0);

  const formattedFinal = Number(finalPrice).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const PROBLEM_LABELS: Record<string, string> = {
    tire: "Troca de Pneu",
    battery: "Reparo de Bateria",
    electric: "Problema Elétrico",
    overheat: "Superaquecimento",
    fuel: "Abastecimento",
    other: "Serviço automotivo",
  };

  const problemLabel = PROBLEM_LABELS[request?.problemType ?? ""] ?? "Serviço automotivo";
  const clientName = "Cliente"; // Sem nome do cliente por privacidade no MVP

  const handleTagToggle = (value: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const handleConfirmAndRate = async () => {
    if (!requestId || !clientUserId || rating === 0) {
      setShowModal(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await createReview.mutateAsync({
      serviceRequestId: requestId,
      toUserId: clientUserId,
      rating,
      tags: Array.from(selectedTags),
    });

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header status */}
      <View style={styles.statusBar}>
        <MaterialIcons name="check-circle" size={14} color={colors.primary} />
        <Text style={styles.statusText}>STATUS: CONCLUÍDO</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Serviço{"\n"}Concluído</Text>

        {/* Card valor final */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>VALOR FINAL</Text>
          <Text style={styles.priceValue}>{formattedFinal}</Text>
        </View>

        {/* Resumo */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RESUMO</Text>
          <View style={styles.summaryRow}>
            <MaterialIcons name="check-circle" size={18} color={colors.primary} />
            <Text style={styles.summaryText}>
              {problemLabel} — {clientName}
            </Text>
          </View>
          {diagnosticFee > 0 && (
            <View style={styles.summaryRow}>
              <MaterialIcons name="receipt" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.summaryText}>
                Taxa diagnóstico:{" "}
                {diagnosticFee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
          )}
        </View>

        {/* Registro de execução — avaliação do cliente */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingSectionHeader}>
            <Text style={styles.ratingSectionTitle}>REGISTRO DE EXECUÇÃO</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OBRIGATÓRIO</Text>
            </View>
          </View>

          <Text style={styles.ratingSubtitle}>
            Avalie o atendimento com este cliente
          </Text>

          {/* Estrelas */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text
                key={star}
                accessibilityLabel={`${star} estrela${star > 1 ? "s" : ""}`}
                accessibilityRole="button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRating(star);
                }}
                style={[styles.star, { color: rating >= star ? colors.primary : colors.outlineVariant }]}
              >
                ★
              </Text>
            ))}
          </View>

          {/* Tags */}
          {rating > 0 && (
            <View style={styles.tagsRow}>
              {PRO_TO_CLIENT_TAGS.map((tag) => {
                const selected = selectedTags.has(tag.value);
                return (
                  <Text
                    key={tag.value}
                    accessibilityLabel={`Tag ${tag.label}${selected ? ", selecionada" : ""}`}
                    accessibilityRole="button"
                    onPress={() => handleTagToggle(tag.value)}
                    style={[styles.tag, selected && styles.tagSelected]}
                  >
                    {tag.label}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          disabled={rating === 0}
          loading={createReview.isPending}
          onPress={handleConfirmAndRate}
          title="CONFIRMAR E AVALIAR +"
          variant="primary"
        />
        <Text style={styles.footerNote}>
          Avalie o cliente para encerrar o atendimento
        </Text>
      </View>

      {/* Modal: avaliação obrigatória */}
      <MechaGoModal
        confirmText="ENTENDIDO"
        description="Avalie o cliente com pelo menos 1 estrela para concluir o atendimento."
        hideCancel
        onClose={() => setShowModal(false)}
        onConfirm={() => setShowModal(false)}
        title="Avaliação obrigatória"
        type="info"
        visible={showModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}1A`,
  },
  statusText: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 36,
    color: colors.onSurface,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  priceCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    gap: spacing.xs,
  },
  priceLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  priceValue: {
    fontFamily: fonts.mono,
    fontSize: 40,
    color: colors.primary,
    letterSpacing: -1,
  },
  summaryCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  summaryLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  ratingSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  ratingSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingSectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.headline,
    fontSize: 9,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  ratingSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  starsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  star: {
    fontSize: 44,
    width: 48,
    textAlign: "center",
    lineHeight: 52,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    minHeight: 44,
    textAlignVertical: "center",
  },
  tagSelected: {
    backgroundColor: `${colors.primary}1F`,
    borderColor: colors.primary,
    color: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}1A`,
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
