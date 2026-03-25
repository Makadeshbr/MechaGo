import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

// Histórico de atendimentos do profissional
const MOCK_HISTORY = [
  {
    id: "1",
    type: "Mecânica Geral",
    client: "Lucas Mendes",
    date: "20 jan • 14h30",
    value: "R$ 120,00",
    rating: 5,
  },
  {
    id: "2",
    type: "Pneu Furado",
    client: "Carla Souza",
    date: "18 jan • 09h15",
    value: "R$ 80,00",
    rating: 4,
  },
  {
    id: "3",
    type: "Bateria",
    client: "Pedro Alves",
    date: "15 jan • 17h45",
    value: "R$ 60,00",
    rating: 5,
  },
  {
    id: "4",
    type: "Ar Condicionado",
    client: "Mariana Lima",
    date: "12 jan • 11h00",
    value: "R$ 200,00",
    rating: 4,
  },
] as const;

type HistoryItem = (typeof MOCK_HISTORY)[number];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={12}
          color={colors.primary}
        />
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  function renderItem({ item }: { item: HistoryItem }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="construct-outline" size={20} color={colors.primary} />
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.serviceType}>{item.type}</Text>
          <Text style={styles.client}>{item.client}</Text>
          <Text style={styles.date}>{item.date}</Text>
          <StarRating rating={item.rating} />
        </View>
        <Text style={styles.value}>{item.value}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Seus atendimentos concluídos</Text>
      </View>

      {/* Resumo do mês */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>R$ 460</Text>
          <Text style={styles.summaryLabel}>Janeiro</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>4</Text>
          <Text style={styles.summaryLabel}>Atendimentos</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>4.7★</Text>
          <Text style={styles.summaryLabel}>Avaliação</Text>
        </View>
      </View>

      <FlatList
        data={MOCK_HISTORY as unknown as HistoryItem[]}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.listTitle}>ESTE MÊS</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sem histórico ainda</Text>
            <Text style={styles.emptyText}>
              Seus atendimentos concluídos aparecerão aqui.
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
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.primary,
  },
  summaryLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryDivider: { width: 1, backgroundColor: colors.outline },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  listTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: "center",
  },
  cardLeft: {},
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(253,212,4,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 3 },
  serviceType: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.text,
  },
  client: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  date: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxl + spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
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
