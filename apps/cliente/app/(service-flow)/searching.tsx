import React, { useEffect } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LogoPin, AmbientGlow } from "@/components/ui";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { useServiceRequest, useCancelServiceRequest } from "@/hooks/queries/useServiceRequest";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

function formatEta(minutes?: number | null): string {
  return minutes !== null && minutes !== undefined ? `~${minutes} min` : "--";
}

export default function SearchingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();

  // Polling a cada 3 segundos conforme Task 5.1
  const { data: request, isLoading, error } = useServiceRequest(requestId as string, 3000);
  const cancelMutation = useCancelServiceRequest();

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 2.5]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
  }));

  useEffect(() => {
    if (request?.status === "accepted" && request.professionalId) {
      router.replace(`/(service-flow)/professional-found?requestId=${request.id}` as `/(service-flow)/professional-found?requestId=${string}`);
    }
  }, [request?.status]);

  const handleCancel = () => {
    Alert.alert(
      "Cancelar solicitação?",
      "Tem certeza que deseja cancelar a busca por profissionais?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(requestId as string);
              router.back();
            } catch (err) {
              Alert.alert("Erro", "Não foi possível cancelar. Tente novamente.");
            }
          },
        },
      ]
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
           <MaterialIcons name="error-outline" size={48} color={colors.error} />
           <Text style={styles.loadingText}>Erro ao buscar status</Text>
           <Pressable
             style={({ pressed }) => [styles.cancelAction, pressed && styles.cancelActionPressed]}
             onPress={() => router.back()}
             accessibilityRole="button"
           >
             <Text style={styles.cancelActionText}>VOLTAR</Text>
           </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
           <LogoPin size="md" />
           <Text style={styles.loadingText}>Iniciando busca...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />

      {/* Header Focado (Sem Menu Hambúrguer) */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.brand}>MechaGo</Text>
        <View style={styles.headerSide}>
           <View style={styles.avatarShell} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.pulseArea}>
          <Animated.View style={[styles.pulseWave, pulseCircleStyle]} />
          <Animated.View style={[styles.pulseWaveSecondary, pulseCircleStyle]} />
          <LogoPin size="lg" />
        </View>

        <Text style={styles.title}>BUSCANDO PROFISSIONAIS...</Text>
        <Text style={styles.subtitle}>
          Nossa rede está com alta demanda {request.context === "highway" ? `na ${request.roadwayName || "Rodovia"}` : `em ${request.cityName || "sua região"}`}
        </Text>

        {/* Métricas de Fila - Layout Noir */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Posição</Text>
            <Text style={styles.metricValue}>
              {request.queueLabel ?? (request.queuePosition ? `${request.queuePosition}º` : "Buscando")}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Estimativa</Text>
            <Text style={styles.metricValue}>
               {formatEta(request.estimatedArrivalMinutes)}
             </Text>
          </View>
        </View>

        {/* Card de Suporte - Secundário */}
        <Pressable style={styles.supportCard} accessibilityRole="button">
          <View style={styles.supportIconWrap}>
            <MaterialIcons name="support-agent" size={22} color={colors.primary} />
          </View>
          <View style={styles.supportTextWrap}>
            <Text style={styles.supportTitle}>
              {request.context === "highway" && request.roadwayName ? request.roadwayName : "Central de Atendimento"}
            </Text>
            <Text style={styles.supportSubtitle}>
              {request.context === "highway" && request.roadwayPhone ? request.roadwayPhone : (request.supportPhone || "Falar com suporte")}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        {/* Ação de Cancelamento */}
        <Pressable
          style={({ pressed }) => [styles.cancelAction, pressed && styles.cancelActionPressed]}
          onPress={handleCancel}
          accessibilityRole="button"
        >
          <MaterialIcons name="close" size={18} color={colors.error} />
          <Text style={styles.cancelActionText}>CANCELAR BUSCA</Text>
        </Pressable>

        <Text style={styles.footerHint}>Sua solicitação está ativa e segura</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.lg },
  loadingText: { fontFamily: fonts.headline, color: colors.onSurface, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    height: 64,
  },
  headerSide: { width: 44 },
  brand: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.primary,
    textTransform: "uppercase",
    fontStyle: "italic",
  },
  avatarShell: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  pulseArea: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  pulseWave: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  pulseWaveSecondary: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 26,
    color: colors.onSurface,
    textAlign: "center",
    textTransform: "uppercase",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 260,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  metricLabel: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.primary,
  },
  supportCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: "rgba(253, 212, 4, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  supportTextWrap: { flex: 1 },
  supportTitle: { fontFamily: fonts.body, fontWeight: "700", fontSize: 14, color: colors.onSurface },
  supportSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  cancelAction: {
    width: "100%",
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  cancelActionPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  cancelActionText: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  footerHint: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.6,
  },
});
