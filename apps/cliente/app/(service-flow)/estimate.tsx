import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useCreateServiceRequest,
  useEstimatePrice,
} from "@/hooks/queries/useServiceRequest";
import { useCreateDiagnosticPayment } from "@/hooks/queries/usePayments";
import { Button, LogoPin, AmbientGlow } from "@/components/ui";
import { borderRadius, colors, problemTypeSchema, spacing } from "@mechago/shared";
import { nav, type ServiceFlowPaymentParams } from "@/lib/navigation";

interface LocationContext {
  address: string;
  city: string | null;
  street: string | null;
  region: string | null;
}

export default function EstimateScreen() {
  const params = useLocalSearchParams<{
    vehicleId: string;
    problemType: string;
    triageAnswers: string;
  }>();

  const parsedProblemType = problemTypeSchema.safeParse(params.problemType);
  const problemType = parsedProblemType.success ? parsedProblemType.data : undefined;
  const vehicleId = params.vehicleId;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationContext, setLocationContext] = useState<LocationContext | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createRequest = useCreateServiceRequest();
  const createPayment = useCreateDiagnosticPayment();
  const estimateParams =
    vehicleId && problemType
      ? {
          vehicleId,
          problemType,
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        }
      : null;

  const { data: pricing, isLoading: isLoadingPricing } = useEstimatePrice(estimateParams);

  // Obtém localização real + faz reverse geocoding para detectar cidade/rodovia
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permissão de localização negada");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);

      // Reverse geocoding para obter endereço completo e nome da cidade
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geo) {
          // Monta o endereço no formato esperado pelo backend para extração de cidade
          // Formato: "Rua X, 123 - Bairro, Cidade - UF, País"
          const parts = [
            geo.street && geo.streetNumber
              ? `${geo.street}, ${geo.streetNumber}`
              : geo.street ?? null,
            geo.district ?? geo.subregion ?? null,
            geo.city && geo.region
              ? `${geo.city} - ${geo.region}`
              : geo.city ?? geo.subregion ?? null,
            geo.country ?? null,
          ].filter(Boolean);

          setLocationContext({
            address: parts.join(", "),
            city: geo.city ?? geo.subregion ?? null,
            street: geo.street ?? null,
            region: geo.region ?? null,
          });
        }
      } catch {
        // Reverse geocoding falhou: segue sem endereço (contexto detectado via PostGIS)
      }
    })();
  }, []);

  function handleRequestSocorro() {
    if (!location || !problemType || !pricing) return;

    createRequest.mutate(
      {
        vehicleId,
        problemType,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        // Envia o endereço para o backend extrair a cidade e detectar rodovia
        address: locationContext?.address,
        triageAnswers: params.triageAnswers
          ? JSON.parse(params.triageAnswers)
          : {},
      },
      {
        onSuccess: async (data) => {
          try {
            const payment = await createPayment.mutateAsync({
              serviceRequestId: data.id,
            });

            nav.toPayment({
              paymentId: payment.id,
              requestId: data.id,
              nextScreen: "searching",
            } satisfies ServiceFlowPaymentParams);
          } catch (err) {
            console.error("[Estimate] Erro ao criar pagamento diagnóstico", err);
            // Fallback: vai direto para searching se pagamento falhar
            const r = router as unknown as { replace: (href: unknown) => void };
            r.replace({
              pathname: "/(service-flow)/searching",
              params: { requestId: data.id },
            });
          }
        },
      },
    );
  }

  const isLoadingLocation = !location && !errorMsg;
  const isGlobalLoading = isLoadingLocation || isLoadingPricing;
  const hasInvalidParams = !vehicleId || !problemType;

  // Determina o contexto de localização para exibir ao usuário
  // O contexto real (urban/highway) vem do backend via PostGIS
  const locationLabel = locationContext?.city
    ? `📍 ${locationContext.city}${locationContext.region ? ` - ${locationContext.region}` : ""}`
    : location
      ? "📍 Localização obtida"
      : null;

  const formatCurrency = (val?: number) =>
    val != null
      ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "R$ --,--";

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Estimativa de Preço</Text>

        {hasInvalidParams ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Não foi possível identificar os dados do chamado. Volte e tente novamente.
            </Text>
          </View>
        ) : isGlobalLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>
              {isLoadingLocation
                ? "Detectando sua localização..."
                : "Calculando melhor preço..."}
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Card de localização detectada */}
            {locationLabel && (
              <View style={styles.locationCard}>
                <MaterialCommunityIcons
                  name={pricing ? "city" : "map-marker"}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.locationText}>{locationLabel}</Text>
              </View>
            )}

            {errorMsg && (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>VALOR TOTAL ESTIMADO</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(pricing?.estimatedPrice)}
              </Text>
              <Text style={styles.priceSubtext}>
                O valor exato será confirmado pelo profissional após o diagnóstico.
              </Text>
            </View>

            <View style={styles.breakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>
                  Taxa de Diagnóstico (Pagar agora)
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(pricing?.diagnosticFee)}
                </Text>
              </View>
              <Text style={styles.infoText}>
                Esta taxa garante o deslocamento do profissional e o diagnóstico do
                problema. O valor é abatido do serviço final.
              </Text>

              {/* Detalhamento dos multiplicadores */}
              {pricing?.multipliers && (
                <View style={styles.multipliersContainer}>
                  {pricing.multipliers.time > 1 && (
                    <View style={styles.multiplierRow}>
                      <Ionicons name="moon-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.multiplierText}>
                        Horário noturno (+{Math.round((pricing.multipliers.time - 1) * 100)}%)
                      </Text>
                    </View>
                  )}
                  {pricing.multipliers.location > 1 && (
                    <View style={styles.multiplierRow}>
                      <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.multiplierText}>
                        Localização rodovia (+{Math.round((pricing.multipliers.location - 1) * 100)}%)
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.methodCard}>
              <Text style={styles.sectionTitle}>MÉTODO DE PAGAMENTO</Text>
              <View style={styles.methodRow}>
                <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
                <Text style={styles.methodName}>PIX (Copia e Cola)</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </View>

            <Button
              title="SOLICITAR SOCORRO AGORA"
              onPress={handleRequestSocorro}
              disabled={!location || !problemType || !pricing}
              loading={createRequest.isPending || createPayment.isPending}
              style={styles.cta}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerSpacer: { width: 44 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_400Regular",
    textAlign: "center",
  },
  content: { gap: spacing.xl },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  locationText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.error}15`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },
  priceCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  priceLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  priceValue: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 48,
    color: colors.primary,
  },
  priceSubtext: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  breakdown: {
    backgroundColor: colors.surfaceLow,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  breakdownValue: {
    fontFamily: "JetBrainsMono_500Medium",
    color: colors.primary,
    fontSize: 16,
  },
  infoText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  multipliersContainer: { gap: spacing.xs, marginTop: spacing.xs },
  multiplierRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  multiplierText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  methodCard: { gap: spacing.md },
  sectionTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  methodName: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: colors.text,
    fontSize: 16,
  },
  cta: { marginTop: spacing.lg },
});
