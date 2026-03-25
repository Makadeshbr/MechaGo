import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

// Filtros de status dos pedidos
const FILTERS = ["Todos", "Ativos", "Pendentes", "Encerrados"] as const;
type Filter = (typeof FILTERS)[number];

interface Order {
  id: string;
  type: string;
  client: string;
  address: string;
  dist: string;
  time: string;
  status: "Ativo" | "Pendente" | "Encerrado";
  value: string;
}

// Mapa de cores por status
const STATUS_COLOR: Record<string, string> = {
  Ativo: colors.primary,
  Pendente: colors.warning,
  Encerrado: colors.textSecondary,
};

export default function OrdersScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const orders: Order[] = [];

  const filtered = orders.filter((o) => {
    if (activeFilter === "Todos") return true;
    return o.status === activeFilter.replace("s", "");
  });

  function renderOrder({ item }: { item: Order }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.orderCard,
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Pedido: ${item.type} de ${item.client}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIconBox}>
            <Ionicons name="construct-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderType}>{item.type}</Text>
            <Text style={styles.orderClient}>{item.client}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${STATUS_COLOR[item.status]}20` },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: STATUS_COLOR[item.status] },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.textSecondary}
            />
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pedidos</Text>
      </View>

      {/* Filtros */}
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
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sem pedidos aqui</Text>
            <Text style={styles.emptyText}>
              Quando o matching estiver conectado à API, seus chamados aparecerão aqui.
            </Text>
          </View>
        }
      />
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
  filterTextActive: { color: "#000" },
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
    backgroundColor: "rgba(253,212,4,0.1)",
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
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 22,
  },
});
