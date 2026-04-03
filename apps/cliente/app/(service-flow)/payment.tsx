import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button, LogoPin, AmbientGlow } from "@/components/ui";
import { api } from "@/lib/api";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";

interface PaymentData {
  id: string;
  amount: number;
  type: "diagnostic_fee" | "service";
  pixQrCode: string;
  pixQrCodeBase64: string;
  status: "pending" | "captured" | "failed";
}

export default function PaymentScreen() {
  const { paymentId, requestId, nextScreen } = useLocalSearchParams<{
    paymentId: string;
    requestId: string;
    nextScreen: string;
  }>();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: request } = useServiceRequest(requestId ?? "");

  const fetchPayment = useCallback(async () => {
    try {
      const response = await api.get(`payments/${paymentId}`);
      const data = await response.json<PaymentData>();
      setPayment(data);

      if (data.status === "captured") {
        handleSuccess();
      }
    } catch (err) {
      console.error("[Payment] Error fetching payment", err);
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
    // Poll a cada 5 segundos para verificar o status do pagamento
    const interval = setInterval(fetchPayment, 5000);
    return () => clearInterval(interval);
  }, [fetchPayment]);

  const handleSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Pequeno delay para o usuário ver o "sucesso"
    setTimeout(() => {
      if (nextScreen === "searching") {
        router.replace({ pathname: "/(service-flow)/searching", params: { requestId } });
      } else if (nextScreen === "rating") {
        router.replace({
          pathname: "/(service-flow)/rating",
          params: {
            requestId,
            professionalUserId: request?.professional?.userId,
            professionalName: request?.professional?.name,
            finalPrice: String(request?.finalPrice),
          },
        });
      } else {
        router.replace("/(tabs)");
      }
    }, 1500);
  };

  const copyToClipboard = () => {
    if (!payment?.pixQrCode) return;
    Clipboard.setString(payment.pixQrCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Sucesso", "Código Pix copiado para a área de transferência!");
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
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
                icon={<MaterialIcons name="content-copy" size={20} color={colors.onPrimary} />}
              />
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>
                Após o pagamento, esta tela será atualizada automaticamente em alguns segundos.
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
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
  content: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.xxl, paddingTop: spacing.xl },
  statusBox: { alignItems: "center", gap: spacing.md },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSuccess: {
    backgroundColor: `${colors.success}1A`,
  },
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
  copyButton: { width: "100%", marginTop: spacing.sm },
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
