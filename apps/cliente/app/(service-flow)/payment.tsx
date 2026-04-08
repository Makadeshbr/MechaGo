import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button, LogoPin, AmbientGlow } from "@/components/ui";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";
import {
  usePayment,
  useConfirmSandboxPayment,
} from "@/hooks/queries/usePayments";
import { nav } from "@/lib/navigation";

export default function PaymentScreen() {
  const { paymentId, requestId, nextScreen } = useLocalSearchParams<{
    paymentId: string;
    requestId: string;
    nextScreen: string;
  }>();
  const router = useRouter();
  const { data: request } = useServiceRequest(requestId ?? "");
  const hasNavigated = useRef(false);

  // TanStack Query com refetchInterval — para quando capturado
  const { data: payment, isLoading } = usePayment(paymentId);

  // Confirmação sandbox — simula o webhook do MP em ambiente de teste
  const confirmSandbox = useConfirmSandboxPayment(paymentId);

  // Navega automaticamente quando o pagamento é capturado
  useEffect(() => {
    if (!payment || payment.status !== "captured" || hasNavigated.current) return;
    hasNavigated.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timer = setTimeout(() => {
      if (nextScreen === "searching") {
        // Usa cast via nav helper para evitar erro de tipo com rotas dinâmicas
        const r = router as unknown as { replace: (href: unknown) => void };
        r.replace({ pathname: "/(service-flow)/searching", params: { requestId } });
      } else if (nextScreen === "rating") {
        nav.toRating({
          requestId: requestId ?? "",
          professionalUserId: request?.professional?.userId ?? "",
          professionalName: request?.professional?.name ?? "",
          finalPrice: String(request?.finalPrice ?? ""),
        });
      } else {
        nav.toHome();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [payment?.status]);

  const copyToClipboard = () => {
    if (!payment?.pixQrCode) return;
    void Clipboard.setStringAsync(payment.pixQrCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copiado!", "Código Pix copiado para a área de transferência.");
  };

  const handleSandboxConfirm = () => {
    Alert.alert(
      "Simular Pagamento",
      "Isto vai confirmar o pagamento automaticamente (apenas em ambiente de teste). Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () =>
            confirmSandbox.mutate(undefined, {
              onSuccess: () => {
                // Navegação imediata após sucesso da mutação sandbox
                // Isso evita esperar o refetch interval de 5s do usePayment
                if (hasNavigated.current) return;
                hasNavigated.current = true;

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (nextScreen === "searching") {
                  const r = router as unknown as { replace: (href: unknown) => void };
                  r.replace({ pathname: "/(service-flow)/searching", params: { requestId } });
                } else if (nextScreen === "rating") {
                  nav.toRating({
                    requestId: requestId ?? "",
                    professionalUserId: request?.professional?.userId ?? "",
                    professionalName: request?.professional?.name ?? "",
                    finalPrice: String(request?.finalPrice ?? ""),
                  });
                } else {
                  nav.toHome();
                }
              },
              onError: (err) => {
                // Exibe mensagem clara de erro — antes era silencioso
                const message =
                  err instanceof Error ? err.message : "Erro desconhecido ao confirmar pagamento.";
                Alert.alert(
                  "Erro ao simular pagamento",
                  `Não foi possível confirmar o pagamento.\n\n${message}\n\nVerifique se a variável MERCADOPAGO_ACCESS_TOKEN começa com TEST- no servidor.`,
                );
              },
            }),
        },
      ],
    );
  };

  if (isLoading || !payment) {
    return (
      <SafeAreaView style={styles.safe}>
        <AmbientGlow />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparando seu Pix...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCaptured = payment.status === "captured";

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusBox}>
          <View style={[styles.iconCircle, isCaptured && styles.iconCircleSuccess]}>
            <MaterialIcons
              name={isCaptured ? "check-circle" : "qr-code-2"}
              size={40}
              color={isCaptured ? colors.success : colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {isCaptured ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
          </Text>
          <Text style={styles.subtitle}>
            {isCaptured
              ? "Tudo certo! Redirecionando você..."
              : "Use o código abaixo para pagar via Pix no seu banco."}
          </Text>
        </View>

        {!isCaptured && (
          <>
            <View style={styles.qrCard}>
              <Text style={styles.priceLabel}>VALOR A PAGAR</Text>
              <Text style={styles.priceValue}>
                {payment.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>

              {payment.pixQrCode ? (
                <>
                  <View style={styles.pixCodeContainer}>
                    <Text numberOfLines={1} style={styles.pixCodeText}>
                      {payment.pixQrCode}
                    </Text>
                  </View>

                  <Button
                    onPress={copyToClipboard}
                    title="COPIAR CÓDIGO PIX"
                    variant="primary"
                    style={styles.copyButton}
                  />
                </>
              ) : (
                <View style={styles.noQrContainer}>
                  <MaterialIcons
                    name="info-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noQrText}>
                    Código Pix não disponível. Use o botão de teste abaixo.
                  </Text>
                </View>
              )}
            </View>

            {/* Botão de simulação — apenas em ambiente de desenvolvimento/teste */}
            <Pressable
              onPress={handleSandboxConfirm}
              style={styles.sandboxButton}
              disabled={confirmSandbox.isPending}
              accessibilityLabel="Simular pagamento aprovado (sandbox)"
              accessibilityRole="button"
            >
              {confirmSandbox.isPending ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <MaterialIcons
                    name="science"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.sandboxText}>
                    Simular Pagamento Aprovado (Sandbox)
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.infoBox}>
              <MaterialIcons
                name="info-outline"
                size={20}
                color={colors.onSurfaceVariant}
              />
              <Text style={styles.infoText}>
                Após o pagamento, esta tela será atualizada automaticamente.
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceLowest },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: { fontFamily: fonts.body, color: colors.onSurfaceVariant },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerSpacer: { width: 44 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  statusBox: { alignItems: "center", gap: spacing.md },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSuccess: { backgroundColor: `${colors.success}1A` },
  title: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.onSurface,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 22,
  },
  qrCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    gap: spacing.md,
  },
  priceLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  priceValue: {
    fontFamily: fonts.mono,
    fontSize: 32,
    color: colors.primary,
    letterSpacing: -1,
  },
  pixCodeContainer: {
    backgroundColor: colors.surfaceLowest,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pixCodeText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  noQrContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  noQrText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  copyButton: { width: "100%", marginTop: spacing.sm },
  sandboxButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.outlineVariant,
    opacity: 0.8,
    minHeight: 44,
  },
  sandboxText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: `${colors.onSurfaceVariant}0D`,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
});
