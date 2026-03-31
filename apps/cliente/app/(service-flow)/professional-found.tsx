import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { AmbientGlow } from "@/components/ui";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { useServiceRequest, useCancelServiceRequest } from "@/hooks/queries/useServiceRequest";
import { nav } from "@/lib/navigation";

function formatDistance(distanceKm?: number | null): string {
  return distanceKm !== null && distanceKm !== undefined
    ? `${distanceKm.toFixed(1)} km`
    : "--";
}

function formatEta(minutes?: number | null): string {
  return minutes !== null && minutes !== undefined ? `${minutes} min` : "--";
}

export default function ProfessionalFoundScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  // Polling a cada 5 segundos para acompanhar status
  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);
  const cancelMutation = useCancelServiceRequest();

  // Navega automaticamente quando o status muda
  useEffect(() => {
    if (!request) return;
    const { status, id } = request;
    if (status === "professional_enroute" || status === "professional_arrived") {
      nav.toTracking(id);
    } else if (status === "cancelled_client" || status === "cancelled_professional") {
      nav.toHome();
    }
  }, [request?.status, request?.id]);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
           <Text style={styles.loadingText}>Carregando dados do profissional...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const professional = request.professional;

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      
      {/* Header Focado */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.brand}>MechaGo</Text>
        <View style={styles.headerSide}>
           <View style={styles.avatarShell} />
        </View>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>PROFISSIONAL ENCONTRADO!</Text>
        <Text style={styles.subtitle}>Ele já aceitou sua solicitação e está a caminho.</Text>
        
        {/* Card Noir com Efeito Glassmorphism */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Image 
               source={{ uri: professional?.avatarUrl || "https://ui-avatars.com/api/?name=Pro&background=FDD404&color=0A0A0A&size=150" }} 
               style={styles.avatar} 
             />
             <View style={styles.ratingBadge}>
               <MaterialIcons name="star" size={12} color={colors.primary} />
               <Text style={styles.ratingText}>{professional?.rating ? professional.rating.toFixed(1) : "5.0"}</Text>
             </View>
          </View>

           <Text style={styles.profName}>{professional?.name || "Profissional"}</Text>
           <Text style={styles.profSpecialty}>
             {professional?.specialties?.[0] || "Mecânica Geral"}
           </Text>

           <View style={styles.infoRows}>
             <View style={styles.infoRow}>
               <View style={styles.infoLabelGroup}>
                 <MaterialIcons name="straighten" size={16} color={colors.onSurfaceVariant} />
                 <Text style={styles.infoLabel}>Distância</Text>
               </View>
                <Text style={styles.infoValue}>{formatDistance(request.distanceKm)}</Text>
             </View>

             <View style={styles.infoRow}>
               <View style={styles.infoLabelGroup}>
                 <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                 <Text style={styles.infoLabel}>Chegada estimada</Text>
               </View>
                <Text style={styles.infoEta}>{formatEta(request.estimatedArrivalMinutes)}</Text>
             </View>
           </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => nav.toTracking(request.id)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>ACOMPANHAR NO MAPA</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, cancelMutation.isPending && { opacity: 0.5 }]}
            accessibilityRole="button"
            disabled={cancelMutation.isPending}
            onPress={() =>
              Alert.alert(
                "Recusar Profissional",
                "Isso pode gerar cobrança de taxa de cancelamento dependendo do tempo decorrido. Deseja continuar?",
                [
                  { text: "Voltar", style: "cancel" },
                  {
                    text: "Confirmar",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await cancelMutation.mutateAsync(request.id);
                        nav.toHome();
                      } catch {
                        Alert.alert("Erro", "Não foi possível cancelar. Tente novamente.");
                      }
                    },
                  },
                ],
              )
            }
          >
            <Text style={styles.secondaryButtonText}>Recusar Profissional</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: fonts.body, color: colors.onSurfaceVariant },
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 28,
    color: colors.onSurface,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  card: {
    marginTop: spacing.xxxl,
    width: "100%",
    backgroundColor: colors.surfaceHigh,
    padding: spacing.xl,
    borderRadius: radii.xxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ratingBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.bg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: 2,
  },
  ratingText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.onSurface,
  },
  profName: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.onSurface,
  },
  profSpecialty: {
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoRows: {
    width: "100%",
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  infoLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 15,
    color: colors.onSurface,
  },
  infoEta: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.primary,
  },
  actions: {
    marginTop: "auto",
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  primaryButton: {
    width: "100%",
    minHeight: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.bg,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  secondaryButton: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.7,
  },
});
