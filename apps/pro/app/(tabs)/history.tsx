import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProfessionalHistory } from "@/hooks/queries/useProfessionalHistory";

const PROBLEM_LABELS: Record<string, string> = {
  tire: "Troca de Pneu",
  battery: "Reparo de Bateria",
  electric: "Problema Elétrico",
  overheat: "Superaquecimento",
  fuel: "Abastecimento",
  other: "Serviço automotivo",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface HistoryItem {
  id: string;
  problemType: string;
  status: string;
  finalPrice: number;
  clientName?: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  cancelled_client: "Cancelado",
  cancelled_professional: "Cancelado (Pro)",
};

function HistoryCard({ item }: { item: HistoryItem }) {
  const statusColor = item.status === "completed" ? colors.success : colors.error;

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialIcons name="build" size={20} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.serviceType}>
            {PROBLEM_LABELS[item.problemType] ?? "Serviço automotivo"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.clientName}>Cliente: {item.clientName ?? "Não identificado"}</Text>
        <Text style={styles.date}>{formatDate(item.completedAt)}</Text>
      </View>
      <Text style={styles.value}>{formatCurrency(item.finalPrice)}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { data, isLoading, refetch, isRefetching } = useProfessionalHistory();

  const history = data?.history ?? [];
  const earnings = data?.earnings;

  const now = new Date();
  const monthName = now.toLocaleString("pt-BR", { month: "long" });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Seus atendimentos concluídos</Text>
      </View>

      {/* Resumo do mês */}
      {isLoading ? (
        <Skeleton height={80} style={styles.skeletonSummary} />
      ) : (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {earnings ? formatCurrency(earnings.month) : "R$ 0,00"}
            </Text>
            <Text style={styles.summaryLabel}>{monthName}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{history.length}</Text>
            <Text style={styles.summaryLabel}>Atendimentos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {earnings ? formatCurrency(earnings.today) : "R$ 0,00"}
            </Text>
            <Text style={styles.summaryLabel}>Hoje</Text>
          </View>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={({ item }) => <HistoryCard item={item} />}
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
        ListHeaderComponent={
          history.length > 0 ? (
            <Text style={styles.listTitle}>CONCLUÍDOS</Text>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.listContent}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={72} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={48} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>Sem histórico ainda</Text>
              <Text style={styles.emptyText}>
                Seus atendimentos concluídos aparecerão aqui.
              </Text>
            </View>
          )
        }
      />
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
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryValue: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.primary,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: "capitalize",
  },
  summaryDivider: { width: 1, backgroundColor: `${colors.outlineVariant}33` },
  skeletonSummary: {
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    gap: spacing.md,
  },
  listTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontFamily: fonts.headline,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clientName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurface,
  },
  serviceType: {
    fontFamily: fonts.headline,
    fontSize: 15,
    color: colors.onSurface,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.primary,
  },
  skeletonCard: { borderRadius: borderRadius.lg },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.headline,
    fontSize: 18,
    color: colors.onSurface,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 22,
  },
});
