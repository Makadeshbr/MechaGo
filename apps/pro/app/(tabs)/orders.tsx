import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { useActiveServiceRequest } from "@/hooks/queries/useServiceRequest";
import { useProfessionalHistory } from "@/hooks/queries/useProfessionalHistory";
import { nav } from "@/lib/navigation";
import { colors, spacing, borderRadius } from "@mechago/shared";

const FILTERS = ["Todos", "Ativos", "Pendentes", "Encerrados"] as const;
type Filter = (typeof FILTERS)[number];

type OrderStatus = "Ativo" | "Pendente" | "Encerrado";

interface OrderItem {
  id: string;
  requestId: string;
  type: string;
  client: string;
  address: string;
  dist: string;
  time: string;
  status: OrderStatus;
  value: string;
  isNavigable: boolean;
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  Ativo: colors.primary,
  Pendente: colors.warning,
  Encerrado: colors.textSecondary,
};

const PROBLEM_LABELS: Record<string, string> = {
  tire: "Pneu furado",
  battery: "Bateria",
  electric: "Pane eletrica",
  overheat: "Superaquecimento",
  fuel: "Pane seca",
  other: "Diagnostico",
};

function mapRequestStatus(status: string): OrderStatus {
  if (["matching", "waiting_queue"].includes(status)) {
    return "Pendente";
  }

  if (["completed", "cancelled_client", "cancelled_professional"].includes(status)) {
    return "Encerrado";
  }

  return "Ativo";
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const { data: activeRequest, isLoading: isLoadingActive, isError: isActiveError } = useActiveServiceRequest();
  const {
    data: historyResponse,
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    refetch,
  } = useProfessionalHistory();

  const orders = useMemo<OrderItem[]>(() => {
    const items: OrderItem[] = [];

    if (activeRequest) {
      items.push({
        id: `active-${activeRequest.id}`,
        requestId: activeRequest.id,
        type: PROBLEM_LABELS[activeRequest.problemType] ?? "Atendimento",
        client: activeRequest.clientId ? "Cliente em atendimento" : "Cliente MechaGo",
        address: activeRequest.address ?? "Endereco nao informado",
        dist: activeRequest.distanceKm ? `${activeRequest.distanceKm.toFixed(1)} km` : "--",
        time: formatDateTime(activeRequest.createdAt),
        status: mapRequestStatus(activeRequest.status),
        value: formatCurrency(activeRequest.finalPrice ?? activeRequest.estimatedPrice),
        isNavigable: true,
      });
    }

    for (const item of historyResponse?.history ?? []) {
      items.push({
        id: `history-${item.id}`,
        requestId: item.id,
        type: PROBLEM_LABELS[item.problemType] ?? "Atendimento",
        client: item.clientName ?? "Cliente MechaGo",
        address: "Atendimento concluido",
        dist: "--",
        time: formatDateTime(item.completedAt ?? item.createdAt),
        status: mapRequestStatus(item.status),
        value: formatCurrency(item.finalPrice),
        isNavigable: false,
      });
    }

    return items;
  }, [activeRequest, historyResponse?.history]);

  const filtered = useMemo(() => {
    if (activeFilter === "Todos") {
      return orders;
    }

    return orders.filter((item) => item.status === activeFilter.replace("s", ""));
  }, [activeFilter, orders]);

  const isLoading = isLoadingActive || isLoadingHistory;
  const isError = isActiveError || isHistoryError;

  function renderOrder({ item }: { item: OrderItem }) {
    return (
      <Pressable
        onPress={() => {
          if (!item.isNavigable) return;
          nav.toMapTracking(item.requestId);
        }}
        style={({ pressed }) => [styles.orderCard, pressed && item.isNavigable && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`Pedido ${item.type}, status ${item.status}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIconBox}>
            <Ionicons name="construct-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.orderType}>{item.type}</Text>
            <Text style={styles.orderClient}>{item.client}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}20` }]}>
            <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.address}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.dist}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.orderTime}>{item.time}</Text>
          <Text style={styles.orderValue}>{item.value}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <View style={styles.header}>
        <Text style={styles.title}>Pedidos</Text>
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;

          return (
            <Pressable
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={filter}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.feedbackState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.feedbackText}>Carregando pedidos reais...</Text>
        </View>
      ) : isError ? (
        <View style={styles.feedbackState}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.warning} />
          <Text style={styles.emptyTitle}>Nao foi possivel carregar</Text>
          <Text style={styles.emptyText}>Verifique a conexao com a API e tente novamente.</Text>
          <Pressable onPress={() => void refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>TENTAR NOVAMENTE</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Sem pedidos neste filtro</Text>
              <Text style={styles.emptyText}>
                Seus pedidos ativos e historico concluido aparecem aqui em tempo real.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTextActive: { color: colors.background },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  orderIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  orderInfo: { flex: 1 },
  orderType: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.text,
  },
  orderClient: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardMeta: { gap: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metaText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  orderTime: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxl + spacing.xl,
    gap: spacing.md,
  },
  feedbackState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  feedbackText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: colors.background,
    letterSpacing: 0.8,
  },
});
