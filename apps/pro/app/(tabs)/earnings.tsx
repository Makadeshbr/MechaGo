import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProfessionalHistory } from "@/hooks/queries/useProfessionalHistory";

const PERIODS = [
  { label: "Hoje", value: "today" },
  { label: "Semana", value: "week" },
  { label: "Mês", value: "month" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EarningsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const { data, isLoading, refetch, isRefetching } = useProfessionalHistory();

  const earnings = data?.earnings;
  const history = data?.history ?? [];

  const displayValue = earnings ? earnings[selectedPeriod] : 0;
  
  // No MVP, usamos o histórico para listar os ganhos detalhados
  const filteredHistory = history.filter((item) => {
    if (!item.completedAt) return false;
    const date = new Date(item.completedAt);
    const now = new Date();
    
    if (selectedPeriod === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (selectedPeriod === "week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return date >= startOfWeek;
    }
    return true; // "month" (já vem filtrado pelo mês atual no backend ou total)
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <View style={styles.header}>
        <Text style={styles.title}>Ganhos</Text>
        <Text style={styles.subtitle}>Acompanhe seus rendimentos</Text>
      </View>

      {/* Seletor de período */}
      <View style={styles.periodSelector}>
        {PERIODS.map((period) => (
          <Pressable
            key={period.value}
            onPress={() => setSelectedPeriod(period.value)}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.periodButtonActive,
            ]}
          >
            <Text
              style={[
                styles.periodLabel,
                selectedPeriod === period.value && styles.periodLabelActive,
              ]}
            >
              {period.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card principal de ganhos */}
      <View style={styles.mainEarningsCard}>
        <Text style={styles.mainEarningsLabel}>TOTAL NO PERÍODO</Text>
        <Text style={styles.mainEarningsValue}>{formatCurrency(displayValue)}</Text>
        <View style={styles.earningsInfo}>
          <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.earningsInfoText}>
            Valores líquidos após comissão MechaGo
          </Text>
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>DETALHAMENTO</Text>
        
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.earningItem}>
              <View style={styles.earningIcon}>
                <MaterialIcons name="payments" size={20} color={colors.primary} />
              </View>
              <View style={styles.earningDetails}>
                <Text style={styles.earningClient}>{item.clientName}</Text>
                <Text style={styles.earningDate}>
                  {new Date(item.completedAt!).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <Text style={styles.earningValue}>+ {formatCurrency(item.finalPrice)}</Text>
            </View>
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.skeletonList}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={60} style={styles.skeletonItem} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="account-balance-wallet" size={48} color={colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>Nenhum ganho neste período</Text>
              </View>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceLowest },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 28,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  periodButton: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodLabel: {
    fontFamily: fonts.headline,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  periodLabelActive: {
    color: colors.onPrimary,
  },
  mainEarningsCard: {
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    gap: spacing.xs,
  },
  mainEarningsLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  mainEarningsValue: {
    fontFamily: fonts.mono,
    fontSize: 36,
    color: colors.primary,
    letterSpacing: -1,
  },
  earningsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  earningsInfoText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  listSection: {
    flex: 1,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  listTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  listContent: { paddingBottom: 100, gap: spacing.md },
  earningItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  earningDetails: { flex: 1, gap: 2 },
  earningClient: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onSurface,
  },
  earningDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  earningValue: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.success,
  },
  skeletonList: { gap: spacing.md },
  skeletonItem: { borderRadius: borderRadius.lg },
  emptyState: { alignItems: "center", paddingTop: 40, gap: spacing.md },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
});
