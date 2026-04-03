/**
 * Tela de Histórico de Atendimentos — App Cliente MechaGo
 *
 * Design: Kinetic Noir DS V4
 * · Background: #0A0A0A (obsidian depth)
 * · Accent: #FDD404 (amarelo primário)
 * · Cards: surface elevation via color shift (SEM bordas 1px — regra No-Line)
 * · Tipografia: Space Grotesk (headlines) + Plus Jakarta Sans (body)
 * · Badges: tonal muted — nunca compete com o amarelo primário
 * · Animações: react-native-reanimated (UI thread) + spring mechanics
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius, fonts } from "@mechago/shared";

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

type ServiceStatus =
  | "pending"
  | "matched"
  | "in_transit"
  | "arrived"
  | "diagnosing"
  | "negotiating"
  | "in_progress"
  | "completed"
  | "cancelled";

interface HistoryItem {
  id: string;
  status: ServiceStatus;
  problemType: string;
  finalPrice: string | null;
  estimatedPrice: string | null;
  createdAt: string;
  completedAt: string | null;
  professional?: { name: string } | null;
}

// ------------------------------------------------------------------
// Constantes de domínio
// ------------------------------------------------------------------

const STATUS_LABEL: Record<ServiceStatus, string> = {
  pending:     "Aguardando",
  matched:     "A caminho",
  in_transit:  "Em trânsito",
  arrived:     "Chegou",
  diagnosing:  "Diagnosticando",
  negotiating: "Orçamento",
  in_progress: "Em serviço",
  completed:   "Concluído",
  cancelled:   "Cancelado",
};

/**
 * Badges seguem "Semantic Mutedness":
 * tons escuros que não competem com o primário amarelo.
 * Apenas ativos usam amarelo; concluído usa verde muted; cancelado usa vermelho muted.
 */
const STATUS_BADGE: Record<ServiceStatus, { bg: string; text: string; dot: string }> = {
  pending:     { bg: "#1e1e1e", text: "#8A8A8A", dot: "#494847" },
  matched:     { bg: "#0d1f0d", text: "#A8D5A8", dot: "#4CAF50" },
  in_transit:  { bg: "#0d1f0d", text: "#A8D5A8", dot: "#4CAF50" },
  arrived:     { bg: "#0d1f0d", text: "#A8D5A8", dot: "#81C784" },
  diagnosing:  { bg: "#1f1a00", text: "#E8C200", dot: "#FDD404" },
  negotiating: { bg: "#1f1200", text: "#E0A030", dot: "#F59E0B" },
  in_progress: { bg: "#1f1a00", text: "#E8C200", dot: "#FDD404" },
  completed:   { bg: "#0d1f10", text: "#C8E6C9", dot: "#81C784" },
  cancelled:   { bg: "#1f0d0d", text: "#FFCDD2", dot: "#EF5350" },
};

const PROBLEM_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tire:     "car-tire-alert",
  battery:  "car-battery",
  electric: "flash-outline",
  overheat: "thermometer-alert",
  fuel:     "gas-station-outline",
  other:    "wrench-outline",
};

const PROBLEM_LABELS: Record<string, string> = {
  tire:     "Pneu furado",
  battery:  "Bateria descarregada",
  electric: "Problema elétrico",
  overheat: "Superaquecimento",
  fuel:     "Sem combustível",
  other:    "Outro problema",
};

const IS_ACTIVE: Record<ServiceStatus, boolean> = {
  pending: true, matched: true, in_transit: true, arrived: true,
  diagnosing: true, negotiating: true, in_progress: true,
  completed: false, cancelled: false,
};

// ------------------------------------------------------------------
// Hook de dados
// ------------------------------------------------------------------

function useClientHistory() {
  return useQuery({
    queryKey: ["client", "history"],
    queryFn: async (): Promise<HistoryItem[]> => {
      const res = await api
        .get("service-requests?role=client")
        .json<{ requests: HistoryItem[] }>();
      return res.requests;
    },
    staleTime: 30_000,
  });
}

// ------------------------------------------------------------------
// Pulse — Skeleton com Reanimated (UI thread)
// ------------------------------------------------------------------

function SkeletonPulse({ width, height, style }: {
  width: string | number;
  height: number;
  style?: object;
}) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.surfaceContainerHigh,
        },
        animStyle,
        style,
      ]}
    />
  );
}

function CardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <SkeletonPulse width={40} height={40} style={{ borderRadius: borderRadius.md }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonPulse width="55%" height={14} />
          <SkeletonPulse width="38%" height={11} />
        </View>
        <SkeletonPulse width={72} height={22} style={{ borderRadius: borderRadius.full }} />
      </View>
      <View style={[styles.skeletonRow, { marginTop: 16, paddingLeft: 52 }]}>
        <SkeletonPulse width="30%" height={11} />
        <SkeletonPulse width="22%" height={11} />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Empty State
// ------------------------------------------------------------------

function EmptyState() {
  return (
    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.emptyContainer}>
      {/* Ambient glow — halo sutil amarelo */}
      <View style={styles.emptyGlow} />

      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons
          name="car-clock"
          size={38}
          color={colors.primaryDark}
        />
      </View>

      <Text style={styles.emptyTitle}>Nenhum atendimento</Text>
      <Text style={styles.emptyBody}>
        Seus atendimentos aparecerão aqui{"\n"}após a primeira solicitação SOS.
      </Text>
    </Animated.View>
  );
}

// ------------------------------------------------------------------
// Card individual com spring press (Kinetic Engine)
// ------------------------------------------------------------------

function HistoryCard({ item, onPress, index }: {
  item: HistoryItem;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const badge = STATUS_BADGE[item.status];
  const label = STATUS_LABEL[item.status] ?? item.status;
  const problemLabel = PROBLEM_LABELS[item.problemType] ?? "Atendimento";
  const iconName = PROBLEM_ICONS[item.problemType] ?? "wrench-outline";
  const isActive = IS_ACTIVE[item.status];

  const price = item.finalPrice ?? item.estimatedPrice;
  const formattedPrice = price
    ? Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  const formattedDate = new Date(item.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const animCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.975, { stiffness: 200, damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 200, damping: 20 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Atendimento ${problemLabel}, status ${label}`}
    >
      <Animated.View
        entering={FadeInUp.delay(index * 60).duration(350)}
        style={[styles.card, animCardStyle]}
      >
        {/* Acento lateral colorido — indicador de atividade */}
        {isActive && (
          <View
            style={[styles.activeAccent, { backgroundColor: badge.dot }]}
          />
        )}

        {/* Topo: ícone + descrição + badge de status */}
        <View style={styles.cardTop}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isActive
                  ? `${badge.dot}18`
                  : colors.surfaceContainerHigh,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={20}
              color={isActive ? badge.dot : colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.cardTitleArea}>
            <Text style={styles.problemTitle} numberOfLines={1}>
              {problemLabel}
            </Text>
            {item.professional?.name ? (
              <Text style={styles.professionalName} numberOfLines={1}>
                {item.professional.name}
              </Text>
            ) : (
              <Text style={styles.professionalName}>Buscando profissional…</Text>
            )}
          </View>

          {/* Badge tonal muted */}
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{label}</Text>
          </View>
        </View>

        {/* Separador via surface shift — SEM borda 1px */}
        <View style={styles.cardDivider} />

        {/* Rodapé: data + preço ou indicador ativo */}
        <View style={styles.cardFooter}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>

          {formattedPrice ? (
            <View style={styles.metaChip}>
              <Ionicons
                name="cash-outline"
                size={12}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.metaText,
                  isActive && { color: colors.primary, fontFamily: fonts.headline },
                ]}
              >
                {formattedPrice}
              </Text>
            </View>
          ) : isActive ? (
            <View style={styles.metaChip}>
              <View style={styles.liveDot} />
              <Text style={[styles.metaText, { color: badge.dot }]}>Ao vivo</Text>
            </View>
          ) : null}

          {/* Chevron — apenas ativos são navegáveis */}
          {isActive && (
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ------------------------------------------------------------------
// Tela principal
// ------------------------------------------------------------------

export default function HistoryScreen() {
  const router = useRouter();
  const { data: requests, isLoading, refetch, isRefetching } = useClientHistory();

  const activeCount = requests?.filter((r) => IS_ACTIVE[r.status]).length ?? 0;

  const handlePress = useCallback(
    (item: HistoryItem) => {
      if (IS_ACTIVE[item.status]) {
        router.push({
          pathname: "/(service-flow)/tracking" as any,
          params: { requestId: item.id },
        });
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HistoryItem; index: number }) => (
      <HistoryCard
        item={item}
        onPress={() => handlePress(item)}
        index={index}
      />
    ),
    [handlePress],
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header editorial ───────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          {/* Eyebrow: uppercase muted — identifica o app */}
          <Text style={styles.eyebrow}>MechaGo</Text>
          {/* Headline: Space Grotesk bold, tight tracking */}
          <Text style={styles.title}>Histórico</Text>
        </View>

        {/* Pill de atendimentos ativos — só aparece se houver */}
        {activeCount > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.activePill}>
            <View style={styles.liveDot} />
            <Text style={styles.activePillText}>
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </Text>
          </Animated.View>
        )}
      </View>

      {/*
       * Separador via color shift — regra "No-Line" do DS:
       * Nunca usar borda 1px. Em vez disso, elevar a surface da próxima área.
       */}
      <View style={styles.headerDivider} />

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={[
            styles.list,
            (!requests || requests.length === 0) && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Estilos — Kinetic Noir DS V4
// Regras obrigatórias:
// · Sem bordas 1px → separação via backgroundColor shift
// · Cards: surfaceContainer (#1A1919) em cima de background (#0A0A0A)
// · Typography ratio: headline 34pt / eyebrow 11pt / body 14pt / meta 12pt
// · Espaçamento via tokens definidos em @mechago/shared
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 34,
    letterSpacing: -0.8,
    color: colors.onSurface,
    lineHeight: 38,
  },

  // Pill de status vivo no topo
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}14`,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  activePillText: {
    fontFamily: fonts.headline,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.4,
  },

  // Separador via color shift — SEM borda
  headerDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerLow,
  },

  // ── Lista ──────────────────────────────────────────────────────
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  listEmpty: {
    flexGrow: 1,
  },

  // ── Card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  // Acento lateral colorido (3px) — marcador de status ativo
  activeAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: 6, // compensa o acento lateral visualmente
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardTitleArea: {
    flex: 1,
    gap: 3,
  },
  problemTitle: {
    fontFamily: fonts.headline,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  professionalName: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // Badge tonal muted
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fonts.headline,
    fontSize: 10,
    letterSpacing: 0.4,
  },

  // Separador interno no card — via color shift (SEM borda 1px)
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: 0,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Rodapé do card com meta-informações
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // Dot vivo (atendimento ativo)
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // Chevron de navegação (direita do footer)
  chevronWrap: {
    marginLeft: "auto",
  },

  // ── Skeleton ───────────────────────────────────────────────────
  skeletonList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  skeletonCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // ── Empty State ─────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
    position: "relative",
  },
  emptyGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${colors.primary}07`,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.headline,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.onSurface,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 22,
  },
});
