import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useUser } from "@/hooks/queries/useUser";
import {
  useProfessionalStats,
  useGoOnline,
  useGoOffline,
} from "@/hooks/queries/useProfessional";
import { useActiveServiceRequest } from "@/hooks/queries/useServiceRequest";
import { AmbientGlow, LogoPin, MechaGoModal } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";
import { nav } from "@/lib/navigation";

// Dashboard principal do profissional — fiel ao design dashboard_mechago_pro
interface DashboardModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
}

// Exibe: status online/offline via API, estatísticas reais, seção de chamados
export default function DashboardScreen() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useProfessionalStats();
  const { data: activeRequest, isLoading: activeLoading } = useActiveServiceRequest();
  const goOnline = useGoOnline();
  const goOffline = useGoOffline();
  const [modal, setModal] = React.useState<DashboardModalState>({
    visible: false,
    title: "",
    description: "",
    type: "info",
  });

  const isOnline = stats?.isOnline ?? false;
  const isToggling = goOnline.isPending || goOffline.isPending;

  // 1. Redirecionamento Automático (Auto-Recover)
  // Se houver um chamado ativo atribuído a este pro, pula para a tela correta.
  useEffect(() => {
    if (activeLoading || !activeRequest) return;

    const { status, id } = activeRequest;
    
    switch (status) {
      case "accepted":
      case "professional_enroute":
        nav.toMapTracking(id);
        break;
      case "professional_arrived":
        nav.toDiagnosis(id);
        break;
      case "diagnosing":
        nav.toServiceResolved(id);
        break;
      case "resolved":
      case "price_contested":
        // Aguardando cliente aprovar
        nav.toServiceCompleted({ 
          requestId: id, 
          clientUserId: activeRequest.clientId ?? "" 
        });
        break;
      default:
        break;
    }
  }, [activeRequest, activeLoading]);

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, visible: false }));
  }, []);

  const openModal = useCallback(
    (title: string, description: string, type: DashboardModalState["type"] = "info") => {
      setModal({ visible: true, title, description, type });
    },
    [],
  );

  // Toggle online/offline via API — requer GPS para ficar online
  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          openModal(
            "Permissão necessária",
            "Para ficar online e receber chamados, precisamos acessar sua localização.",
          );
          return;
        }

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          goOnline.mutate(
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            {
              onError: () => {
                openModal(
                  "Nao foi possivel ficar online",
                  "Tivemos um problema ao atualizar sua disponibilidade. Tente novamente.",
                  "danger",
                );
              },
            },
          );
        } catch {
          openModal(
            "Localizacao indisponivel",
            "Nao foi possivel obter sua localizacao atual. Verifique o GPS do aparelho e tente novamente.",
            "danger",
          );
        }
        return;
      }

      goOffline.mutate(undefined, {
        onError: () => {
          openModal(
            "Nao foi possivel ficar offline",
            "Tivemos um problema ao atualizar sua disponibilidade. Tente novamente.",
            "danger",
          );
        },
      });
    },
    [goOffline, goOnline, openModal],
  );

  // Formata valores para exibição em PT-BR — Blindagem contra undefined/null
  const formatCurrency = (value: any) => {
    const num = Number(value ?? 0);
    return `R$ ${num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  // Cards de estatísticas — dados reais da API com fallbacks robustos
  const statCards = [
    {
      label: "Ganhos (mês)",
      value: statsLoading ? "..." : formatCurrency(stats?.totalEarnings),
      icon: "wallet-outline" as const,
    },
    {
      label: "Serviços",
      value: statsLoading ? "..." : String(stats?.totalServices ?? 0),
      icon: "construct-outline" as const,
    },
    {
      label: "Avaliação",
      value: statsLoading ? "..." : `${Number(stats?.averageRating ?? 0).toFixed(1)}`,
      icon: "star-outline" as const,
    },
    {
      label: "Taxa aceite",
      value: statsLoading ? "..." : `${Number(stats?.acceptanceRate ?? 100).toFixed(0)}%`,
      icon: "checkmark-circle-outline" as const,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />
      <MechaGoModal
        visible={modal.visible}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText="ENTENDI"
        hideCancel
        onClose={closeModal}
        onConfirm={closeModal}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* TopBar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.menuButton}
            hitSlop={8}
            accessibilityLabel="Menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </Pressable>
          <LogoPin size="sm" />
          <Pressable
            style={styles.avatarButton}
            hitSlop={8}
            accessibilityLabel="Perfil"
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Saudação + toggle online */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>
              {userLoading
                ? "Olá!"
                : `Olá, ${user?.name?.split(" ")[0] ?? ""}!`}
            </Text>
            <Text style={styles.greetingSub}>Seu painel de hoje</Text>
          </View>
          {/* Toggle online/offline — conectado à API */}
          <View style={styles.onlineToggle}>
            <Text
              style={[
                styles.onlineLabel,
                !isOnline && styles.onlineLabelOff,
              ]}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </Text>
            {isToggling ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={handleToggle}
                trackColor={{
                  false: colors.surfaceLight,
                  true: "rgba(253, 212, 4, 0.3)",
                }}
                thumbColor={isOnline ? colors.primary : colors.textSecondary}
                accessibilityLabel="Alternar disponibilidade"
              />
            )}
          </View>
        </View>

        {/* Status banner */}
        <View
          style={[styles.statusBanner, !isOnline && styles.statusBannerOff]}
        >
          <View
            style={[styles.statusDot, !isOnline && styles.statusDotOff]}
          />
          <Text style={[styles.statusText, !isOnline && styles.statusTextOff]}>
            {isOnline
              ? "Você está disponível para receber chamados"
              : "Você está offline — chamados pausados"}
          </Text>
        </View>

        {/* Stats grid — dados reais da API */}
        <View style={styles.statsGrid}>
          {statCards.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons
                name={stat.icon}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Seção "Aguardando chamados" — sem dados mock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AGUARDANDO CHAMADOS</Text>
          {isOnline ? (
            <View style={styles.waitingCard}>
              <View style={styles.waitingIconGlow}>
                <Ionicons name="radio-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.waitingTitle}>Escutando...</Text>
              <Text style={styles.waitingText}>
                Novos chamados aparecerão aqui automaticamente quando estiverem
                dentro do seu raio de atendimento.
              </Text>
            </View>
          ) : (
            <View style={styles.offlineCard}>
              <Ionicons name="moon-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.offlineText}>
                Fique online para começar a receber chamados.
              </Text>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ver agenda"
          >
            <Ionicons name="calendar-outline" size={24} color={colors.text} />
            <Text style={styles.actionText}>Agenda</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Suporte"
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={colors.text}
            />
            <Text style={styles.actionText}>Suporte</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ganhos"
          >
            <Ionicons name="wallet-outline" size={24} color={colors.text} />
            <Text style={styles.actionText}>Ganhos</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  menuButton: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  avatarButton: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  greetingText: { flex: 1 },
  greeting: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  greetingSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
  },
  onlineToggle: { alignItems: "center", gap: 4 },
  onlineLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
  },
  onlineLabelOff: { color: colors.textSecondary },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(76, 217, 100, 0.08)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(76, 217, 100, 0.15)",
  },
  statusBannerOff: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  statusDotOff: { backgroundColor: colors.textSecondary },
  statusText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.success,
    flex: 1,
  },
  statusTextOff: { color: colors.textSecondary },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.text,
  },
  statLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: { marginBottom: spacing.xxl },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  waitingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  waitingIconGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  waitingTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.text,
  },
  waitingText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  offlineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  offlineText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 90,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  actionText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: colors.text,
    textAlign: "center",
  },
});
