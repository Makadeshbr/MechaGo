import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/useAuth";
import { AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

// Perfil do profissional — difere do cliente em:
// - badge de especialidades
// - status de verificação de docs
// - avaliação e contadores de atendimento
export default function ProfileScreen() {
  const { data: user, isLoading } = useUser();
  const { logout } = useAuth();
  const ratingLabel = user?.rating ? Number(user.rating).toFixed(1) : "--";
  const reviewsLabel = user?.totalReviews ?? 0;
  const levelLabel = user?.isVerified ? "Verificado" : "Pendente";

  const MENU_ITEMS: MenuItem[] = [
    { icon: "construct-outline", label: "Minhas especialidades" },
    { icon: "map-outline", label: "Área de atendimento" },
    { icon: "document-outline", label: "Documentos e verificação" },
    { icon: "card-outline", label: "Dados bancários para repasse" },
    { icon: "notifications-outline", label: "Notificações" },
    { icon: "shield-checkmark-outline", label: "Segurança" },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : user ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar e dados básicos */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={colors.textSecondary} />
              </View>
              {/* Badge de status de verificação */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {/* Avaliação e atendimentos */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{ratingLabel}</Text>
                <Text style={styles.statLabel}>Avaliação</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reviewsLabel}</Text>
                <Text style={styles.statLabel}>Atendimentos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{levelLabel}</Text>
                <Text style={styles.statLabel}>Nível</Text>
              </View>
            </View>
          </View>

          {/* Dados de conta */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>DADOS DA CONTA</Text>
            <View style={styles.infoCard}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{user.cpfCnpj}</Text>
            </View>
          </View>

          {/* Menu de configurações do profissional */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>CONFIGURAÇÕES</Text>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          {/* Logout */}
          <Pressable
            onPress={() => logout.mutate()}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Sair da conta"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      ) : null}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  avatarContainer: { alignItems: "center" },
  avatarWrap: { marginBottom: spacing.md, position: "relative" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.outline,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 1,
  },
  userName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: colors.outline },
  infoSection: { gap: spacing.md },
  menuSection: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  infoText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.text,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(253,212,4,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.15)",
  },
  logoutText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.error,
  },
});
