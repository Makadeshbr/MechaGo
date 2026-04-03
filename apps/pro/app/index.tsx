import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth.store";
import { tokenStorage } from "@/lib/storage";
import { api } from "@/lib/api";
import { AmbientGlow, Button, LogoPin } from "@/components/ui";
import { colors, spacing } from "@mechago/shared";

// Estado do check de perfil — evita redirecionar para onboarding
// quando o profissional já tem cadastro (ex: reinstalação ou refresh de token)
// "error" = falha de rede/auth, diferente de "not-found" = perfil realmente não existe
type ProfileCheckState = "idle" | "checking" | "exists" | "not-found" | "error";

// Tela raiz do App Pro — Welcome screen para profissionais
// Se autenticado, redireciona para Home. Se não, mostra landing pro.
export default function WelcomeScreen() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [profileCheck, setProfileCheck] = useState<ProfileCheckState>("idle");

  // Quando autenticado mas a flag de onboarding não está setada,
  // verifica via API se o profissional já tem perfil cadastrado.
  // Isso evita que reinstalações ou expirações de token forçem o re-onboarding.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    
    if (tokenStorage.isOnboardingComplete()) {
      console.log("[Welcome] Onboarding ja concluido via storage.");
      return;
    }

    console.log("[Welcome] Verificando perfil profissional na API...");
    setProfileCheck("checking");
    
    api
      .get("professionals/me/stats")
      .json()
      .then((data) => {
        console.log("[Welcome] Perfil encontrado com sucesso:", data);
        tokenStorage.setOnboardingComplete();
        setProfileCheck("exists");
      })
      .catch((err) => {
        // Distingue entre "perfil não existe" (404) e erro de rede/auth
        const status = err?.response?.status;
        if (status === 404) {
          console.log("[Welcome] Perfil profissional nao encontrado (404).");
          setProfileCheck("not-found");
        } else {
          console.warn("[Welcome] Erro ao verificar perfil (rede/auth):", err.message);
          setProfileCheck("error");
        }
      });
  }, [isAuthenticated, isLoading]);

  if (isLoading || profileCheck === "checking") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "PlusJakartaSans_400Regular" }}>
          Carregando seu perfil...
        </Text>
      </View>
    );
  }
if (isAuthenticated) {
  // Redireciona para tabs se onboarding concluído (flag ou check de API)
  if (tokenStorage.isOnboardingComplete() || profileCheck === "exists") {
    console.log("[Welcome] Usuário logado e com perfil. Redirecionando para Dashboard.");
    return <Redirect href="/(tabs)" />;
  }

  // Só vai para onboarding se confirmado via 404 que não tem perfil
  if (profileCheck === "not-found") {
    console.log("[Welcome] Usuário logado sem perfil profissional. Redirecionando para Onboarding.");
    return <Redirect href="/(onboarding)/professional-type" />;
  }

  // Erro de rede/auth: NÃO redireciona para onboarding — oferece retry
  if (profileCheck === "error") {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", paddingHorizontal: 32 }}>
          Não foi possível verificar seu perfil.{"\n"}Verifique sua conexão.
        </Text>
        <Pressable
          onPress={() => {
            setProfileCheck("idle");
            // Re-dispara o useEffect ao resetar para idle — forçamos re-check
            // Definimos checking e chamamos a API diretamente
            setProfileCheck("checking");
            api.get("professionals/me/stats").json()
              .then(() => { tokenStorage.setOnboardingComplete(); setProfileCheck("exists"); })
              .catch((err: { response?: { status: number }; message?: string }) => {
                if (err?.response?.status === 404) setProfileCheck("not-found");
                else setProfileCheck("error");
              });
          }}
          style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12, minHeight: 44 }}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Text style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: colors.bg }}>
            TENTAR NOVAMENTE
          </Text>
        </Pressable>
      </View>
    );
  }

  // Enquanto checa ou se está em idle, mantém o loading
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "PlusJakartaSans_400Regular" }}>
        Sincronizando seu perfil...
      </Text>
    </View>
  );
}
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />

      {/* Conteúdo central */}
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.pinGlow}>
            <Ionicons name="construct" size={72} color={colors.primary} />
          </View>
          <LogoPin size="lg" />
          {/* Badge "Pro" para diferenciar visualmente do app cliente */}
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PROFISSIONAL</Text>
          </View>
        </View>

        <View style={styles.textSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Atenda onde o cliente precisar</Text>
          <Text style={styles.subtitle}>
            Cadastre-se como mecânico, defina sua área de atuação e comece a receber chamados.
          </Text>
        </View>
      </View>

      {/* Footer — botões CTA */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Button
          title="QUERO SER PARCEIRO"
          onPress={() => router.push("/(auth)/register")}
          style={styles.ctaButton}
        />

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [styles.loginLink, pressed && { opacity: 0.7 }]}
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  proBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: "rgba(253, 212, 4, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(253, 212, 4, 0.25)",
  },
  proBadgeText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
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
  dotActive: { width: 32, backgroundColor: colors.primary },
  ctaButton: {},
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
