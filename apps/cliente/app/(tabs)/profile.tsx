import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, borderRadius } from "@mechago/shared";

// Tela básica de perfil — mostra dados do usuário e botão de logout
export default function ProfileScreen() {
  const { data: user, isLoading } = useUser();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : user ? (
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          {/* Info cards */}
          <View style={styles.infoCard}>
            <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{user.cpfCnpj}</Text>
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
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  userName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.text,
  },
  userEmail: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.xxl,
    minHeight: 52,
  },
  logoutText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.error,
  },
});
