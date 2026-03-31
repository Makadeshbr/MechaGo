import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button } from "@/components/ui/Button";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";

const PROBLEM_LABELS: Record<string, string> = {
  tire: "Pneu furado",
  battery: "Bateria descarregada",
  electric: "Problema elétrico",
  overheat: "Superaquecimento",
  fuel: "Sem combustível",
  other: "Outro problema",
};

export default function CompletedScreen() {
  const { requestId, finalPrice } = useLocalSearchParams<{
    requestId: string;
    finalPrice?: string;
  }>();
  const router = useRouter();
  const { data: request } = useServiceRequest(requestId ?? "");

  const professional = request?.professional;
  const problemLabel = PROBLEM_LABELS[request?.problemType ?? ""] ?? "Serviço automotivo";
  const pricePaid = finalPrice
    ? Number(finalPrice)
    : request?.finalPrice ?? 0;

  const formattedPrice = Number(pricePaid).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const completedAt = request?.createdAt ? new Date(request.createdAt) : new Date();
  const formattedDate = completedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de sucesso */}
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Serviço{"\n"}Concluído!</Text>
        <Text style={styles.subtitle}>
          Obrigado por usar o MechaGo. Estamos sempre aqui quando você precisar.
        </Text>

        {/* Card resumo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RESUMO DO ATENDIMENTO</Text>

          <View style={styles.row}>
            <MaterialIcons name="build" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.rowText}>{problemLabel}</Text>
          </View>

          {professional && (
            <View style={styles.row}>
              <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.rowText}>
                Executado por{" "}
                <Text style={styles.rowHighlight}>{professional.name}</Text>
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <MaterialIcons name="calendar-today" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.rowText}>{formattedDate}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Valor pago</Text>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
          </View>
        </View>

        {/* Avaliação do profissional */}
        {professional && (
          <View style={styles.ratingBanner}>
            <MaterialIcons name="star" size={20} color={colors.primary} />
            <Text style={styles.ratingBannerText}>
              Como foi o atendimento de {professional.name}?
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botões fixos */}
      <View style={styles.footer}>
        {professional && requestId ? (
          <Button
            onPress={() =>
              router.push({
                pathname: "/(tabs)/history",
              })
            }
            title="VER HISTÓRICO"
            variant="outline"
          />
        ) : null}
        <Button
          onPress={() => router.replace("/(tabs)")}
          title="VOLTAR PARA HOME"
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  successIcon: {
    marginTop: spacing.xl,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}1F`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 36,
    color: colors.onSurface,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  cardLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  rowHighlight: {
    fontFamily: fonts.headline,
    color: colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: `${colors.outlineVariant}33`,
    marginVertical: spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  priceValue: {
    fontFamily: fonts.mono,
    fontSize: 22,
    color: colors.primary,
  },
  ratingBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}1F`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  ratingBannerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}1A`,
  },
});
