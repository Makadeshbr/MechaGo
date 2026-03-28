import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { useSocket } from "@/providers/SocketProvider";
import { Skeleton } from "@/components/ui";

export default function ServiceActiveScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);

  useEffect(() => {
    if (socket && requestId) {
      // Entra na sala para receber updates em tempo real
      socket.emit("join_request", { requestId });

      socket.on("status_update", (data: { status: string }) => {
        if (data.status === "resolved") {
          router.replace(`/(service-flow)/price-approval?requestId=${requestId}` as `/(service-flow)/price-approval?requestId=${string}`);
        }
      });
    }
    return () => {
      if (socket) {
        socket.off("status_update");
        if (requestId) {
          socket.emit("leave_request", { requestId });
        }
      }
    };
  }, [socket, requestId]);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Skeleton width={160} height={24} />
          <Skeleton width={120} height={28} style={{ borderRadius: radii.full }} />
        </View>
        <View style={styles.stepper}>
          <Skeleton width={40} height={40} style={{ borderRadius: 20 }} />
          <View style={styles.stepLine} />
          <Skeleton width={40} height={40} style={{ borderRadius: 20 }} />
          <View style={styles.stepLine} />
          <Skeleton width={40} height={40} style={{ borderRadius: 20 }} />
        </View>
        <View style={styles.content}>
          <Skeleton width={100} height={12} />
          <Skeleton height={72} style={{ borderRadius: radii.xl }} />
          <Skeleton width={100} height={12} />
          <Skeleton height={120} style={{ borderRadius: radii.xl }} />
          <Skeleton width={140} height={12} />
          <Skeleton height={100} style={{ borderRadius: radii.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "professional_arrived": return "Profissional no local";
      case "diagnosing": return "Realizando diagnóstico";
      case "resolved": return "Serviço concluído";
      case "escalated": return "Caso escalado";
      case "tow_requested": return "Aguardando guincho";
      default: return "Em andamento";
    }
  };

  const getStatusStep = (status: string) => {
    if (status === "professional_arrived") return 1;
    if (status === "diagnosing") return 2;
    if (status === "resolved" || status === "completed") return 3;
    return 1;
  };

  const currentStep = getStatusStep(request.status);

  const problemLabel =
    request.problemType === "battery"
      ? "Bateria"
      : request.problemType === "tire"
        ? "Pneu"
        : request.problemType === "electric"
          ? "Elétrica"
          : request.problemType === "overheat"
            ? "Superaquecimento"
            : request.problemType === "fuel"
              ? "Combustível"
              : "Outro";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Atendimento</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
          </View>
        </View>

        <View style={styles.stepper}>
          <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
            <MaterialIcons name="location-on" size={20} color={currentStep >= 1 ? colors.bg : colors.onSurfaceVariant} />
          </View>
          <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
            <MaterialIcons name="search" size={20} color={currentStep >= 2 ? colors.bg : colors.onSurfaceVariant} />
          </View>
          <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
            <MaterialIcons name="check" size={20} color={currentStep >= 3 ? colors.bg : colors.onSurfaceVariant} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>PROFISSIONAL</Text>
          <View style={styles.proCard}>
            {request.professional?.avatarUrl ? (
              <Image source={{ uri: request.professional.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <MaterialIcons name="build-circle" size={24} color={colors.primary} />
              </View>
            )}
            <View style={styles.proText}>
              <Text style={styles.proName}>{request.professional?.name || "Profissional"}</Text>
              <Text style={styles.proDetails}>Identidade verificada MechaGo</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>ETAPA ATUAL</Text>
          <View style={styles.infoCard}>
            {request.status === "diagnosing" ? (
              <>
                <Text style={styles.infoTitle}>Análise Técnica</Text>
                <Text style={styles.infoSubtitle}>
                  O profissional está avaliando seu veículo para identificar a causa raiz do problema.
                </Text>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
              </>
            ) : request.status === "professional_arrived" ? (
              <>
                <Text style={styles.infoTitle}>Chegada Confirmada</Text>
                <Text style={styles.infoSubtitle}>
                  O profissional já está com você. Acompanhe a análise dele por aqui.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.infoTitle}>Status: {getStatusLabel(request.status)}</Text>
                <Text style={styles.infoSubtitle}>Aguarde as próximas atualizações do profissional.</Text>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>RESUMO DO PEDIDO</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Problema relatado</Text>
              <Text style={styles.detailValue}>{problemLabel}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimativa inicial</Text>
              <Text style={styles.detailValue}>R$ {Number(request.estimatedPrice).toFixed(2).replace(".", ",")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  headerTitle: { fontFamily: fonts.headline, fontSize: 24, color: colors.onSurface },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { fontFamily: fonts.body, fontSize: 12, fontWeight: "700", color: colors.onSurface, textTransform: "uppercase" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  stepActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.outline, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginTop: spacing.md,
  },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.primary },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  proText: { flex: 1, marginLeft: spacing.md },
  proName: { fontFamily: fonts.headline, fontSize: 16, color: colors.onSurface },
  proDetails: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: "center",
  },
  infoTitle: { fontFamily: fonts.headline, fontSize: 18, color: colors.onSurface, textAlign: "center" },
  infoSubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", marginTop: 8, lineHeight: 20 },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md },
  detailLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceVariant },
  detailValue: { fontFamily: fonts.body, fontWeight: "700", fontSize: 14, color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.outline },
});
