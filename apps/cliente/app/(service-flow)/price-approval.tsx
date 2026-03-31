import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { useServiceRequest, useApprovePriceServiceRequest, useContestPriceServiceRequest } from "@/hooks/queries/useServiceRequest";
import { Skeleton } from "@/components/ui";
import { nav } from "@/lib/navigation";

export default function PriceApprovalScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { data: request, isLoading } = useServiceRequest(requestId as string, 10000);
  const approveMutation = useApprovePriceServiceRequest();
  const contestMutation = useContestPriceServiceRequest();

  const [contestReason, setContestReason] = useState("");
  const [isContesting, setIsContesting] = useState(false);

  const stats = useMemo(() => {
    if (!request) return null;
    const est = Number(request.estimatedPrice);
    const final = request.finalPrice ?? est;
    const diff = final - est;
    const percent = est > 0 ? (Math.abs(diff) / est) * 100 : 0;
    return { est, final, diff, percent, isHigher: diff > 0 };
  }, [request]);

  const handleApprove = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await approveMutation.mutateAsync(requestId as string);
      // Captura os dados antes do Alert para evitar race condition
      const professionalUserId = request?.professional?.userId ?? "";
      const professionalName = request?.professional?.name ?? "Profissional";
      const finalPrice = String(request?.finalPrice ?? request?.estimatedPrice ?? 0);
      Alert.alert("Sucesso", "Pagamento processado! Avalie o profissional.", [
        {
          text: "OK",
          onPress: () =>
            nav.toRating({ requestId: requestId as string, professionalUserId, professionalName, finalPrice }),
        },
      ]);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível processar a aprovação.");
    }
  };

  const handleContest = async () => {
    if (!contestReason || contestReason.length < 10) {
      Alert.alert("Atenção", "Por favor, explique o motivo da contestação (mínimo 10 caracteres).");
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await contestMutation.mutateAsync({ requestId: requestId as string, reason: contestReason });
      Alert.alert("Contestação Enviada", "Nossa equipe analisará seu caso em até 24h.");
      nav.toHome();
    } catch (err) {
      Alert.alert("Erro", "Não foi possível enviar a contestação.");
    }
  };

  if (isLoading || !request || !stats) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Skeleton width={200} height={24} />
          <Skeleton width={280} height={14} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.content}>
          <Skeleton height={100} style={{ borderRadius: radii.xl }} />
          <Skeleton width={220} height={12} />
          <Skeleton height={72} style={{ borderRadius: radii.lg }} />
          <Skeleton height={60} style={{ borderRadius: radii.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aprovação de Valor</Text>
          <Text style={styles.headerSubtitle}>Confirme o valor final para encerrar o serviço</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.priceComparison}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>ESTIMATIVA</Text>
              <Text style={styles.priceValueEst}>R$ {stats.est.toFixed(2).replace(".", ",")}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={colors.onSurfaceVariant} />
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>VALOR FINAL</Text>
              <Text style={[styles.priceValueFinal, stats.percent > 25 && styles.textError]}>
                R$ {stats.final.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          </View>

          {stats.percent > 25 && (
            <View style={styles.deviationCard}>
              <MaterialIcons name="warning" size={24} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deviationTitle}>Aumento de {stats.percent.toFixed(0)}% detectado</Text>
                <Text style={styles.deviationText}>
                  O valor final excedeu a margem de 25% prevista inicialmente.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>JUSTIFICATIVA DO PROFISSIONAL</Text>
          <View style={styles.justificationCard}>
            <Text style={styles.justificationText}>
              {request.priceJustification || "Serviço realizado conforme diagnóstico inicial."}
            </Text>
          </View>

          {request.completionPhotoUrl ? (
            <>
              <Text style={styles.sectionTitle}>EVIDÊNCIA DO SERVIÇO</Text>
              <View style={styles.photoCard}>
                <Image source={{ uri: request.completionPhotoUrl }} style={styles.photo} />
              </View>
            </>
          ) : null}

          {!isContesting ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.approveButton, approveMutation.isPending && { opacity: 0.6 }]}
                onPress={handleApprove}
                disabled={approveMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Aprovar valor e pagar"
              >
                {approveMutation.isPending ? (
                  <ActivityIndicator color={colors.bg} />
                ) : (
                  <>
                    <Text style={styles.approveButtonText}>APROVAR E PAGAR</Text>
                    <MaterialIcons name="check-circle" size={24} color={colors.bg} />
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contestLink} onPress={() => setIsContesting(true)}>
                <Text style={styles.contestLinkText}>Contestar valor cobrado</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contestForm}>
              <Text style={styles.sectionTitle}>MOTIVO DA CONTESTAÇÃO</Text>
              <TextInput
                style={styles.contestInput}
                placeholder="Explique por que você não concorda com este valor..."
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                numberOfLines={4}
                value={contestReason}
                onChangeText={setContestReason}
                textAlignVertical="top"
                accessibilityLabel="Motivo da contestação de preço"
              />
              <View style={styles.contestActions}>
                <TouchableOpacity style={styles.cancelContest} onPress={() => setIsContesting(false)}>
                  <Text style={styles.cancelContestText}>VOLTAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmContest} onPress={handleContest}>
                  <Text style={styles.confirmContestText}>ENVIAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  container: { flex: 1 },
  header: { padding: spacing.xl },
  headerTitle: { fontFamily: fonts.headline, fontSize: 24, color: colors.onSurface },
  headerSubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  priceComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  priceBox: { alignItems: "center", flex: 1 },
  priceLabel: { fontFamily: fonts.body, fontSize: 10, fontWeight: "700", color: colors.onSurfaceVariant, letterSpacing: 1 },
  priceValueEst: { fontFamily: fonts.headline, fontSize: 18, color: colors.onSurfaceVariant, marginTop: 4 },
  priceValueFinal: { fontFamily: fonts.headline, fontSize: 22, color: colors.primary, marginTop: 4 },
  textError: { color: colors.error },
  deviationCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 82, 82, 0.1)",
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.2)",
  },
  deviationTitle: { fontFamily: fonts.headline, fontSize: 14, color: colors.error },
  deviationText: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.headline, fontSize: 12, color: colors.onSurfaceVariant, letterSpacing: 1.5 },
  justificationCard: {
    backgroundColor: colors.surfaceHigh,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  justificationText: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  actions: { gap: spacing.lg, marginTop: spacing.md },
  approveButton: {
    backgroundColor: colors.primary,
    height: 60,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  approveButtonText: { fontFamily: fonts.headline, fontSize: 16, color: colors.bg, letterSpacing: 1.5 },
  contestLink: { alignSelf: "center", padding: spacing.md, minHeight: 44, justifyContent: "center" },
  contestLinkText: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceVariant, textDecorationLine: "underline" },
  contestForm: { gap: spacing.md },
  photoCard: {
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  photo: {
    width: "100%",
    height: 220,
  },
  contestInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 100,
  },
  contestActions: { flexDirection: "row", gap: spacing.md },
  cancelContest: { flex: 1, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.outline, justifyContent: "center", alignItems: "center" },
  cancelContestText: { fontFamily: fonts.headline, fontSize: 14, color: colors.onSurfaceVariant },
  confirmContest: { flex: 1, height: 48, borderRadius: radii.md, backgroundColor: colors.error, justifyContent: "center", alignItems: "center" },
  confirmContestText: { fontFamily: fonts.headline, fontSize: 14, color: colors.bg },
});
