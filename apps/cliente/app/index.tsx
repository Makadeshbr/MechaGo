import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth.store";
import { AmbientGlow, Button, LogoPin } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";
import { ActivityIndicator } from "react-native";

// Tela raiz — onboarding/welcome fiel ao design Stitch (splash_onboarding_mechago)
// Se autenticado, redireciona para Home. Se não, mostra onboarding.
export default function WelcomeScreen() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />

      {/* Conteúdo central */}
      <View style={styles.content}>
        {/* Logo grande com glow */}
        <View style={styles.logoSection}>
          <View style={styles.pinGlow}>
            <Ionicons
              name="location"
              size={72}
              color={colors.primary}
            />
          </View>
          <LogoPin size="lg" />
        </View>

        {/* Ícone circular + texto */}
        <View style={styles.textSection}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="location"
              size={32}
              color={colors.primary}
              style={{ marginLeft: 2 }}
            />
          </View>

          <Text style={styles.title}>
            Socorro na palma da mão
          </Text>
          <Text style={styles.subtitle}>
            Mecânicos certificados prontos para te atender onde quer que você
            esteja.
          </Text>
        </View>
      </View>

      {/* Footer — indicadores + botões */}
      <View style={styles.footer}>
        {/* Indicator dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Button
          title="COMEÇAR"
          onPress={() => router.push("/(auth)/register")}
          style={styles.ctaButton}
        />

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.loginLink,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel="Já tenho conta"
          accessibilityRole="link"
        >
          <Text style={styles.loginLinkText}>Já tenho conta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxxl + spacing.xl,
  },
  pinGlow: {
    marginBottom: spacing.lg,
    // Glow atrás do pin — simula o blur-2xl do design
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  textSection: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 6,
    width: 8,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primary,
  },
  ctaButton: {
    // O glow já está no Button component via shadow
  },
  loginLink: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: colors.primary,
  },
});
