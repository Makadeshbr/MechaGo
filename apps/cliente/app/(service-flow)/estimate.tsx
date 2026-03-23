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
import { Ionicons } from "@expo/vector-icons";
import { useCreateServiceRequest } from "@/hooks/queries/useServiceRequest";
import { Button, LogoPin, Skeleton } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

export default function EstimateScreen() {
  const params = useLocalSearchParams<{ 
    vehicleId: string; 
    problemType: any; 
    triageAnswers: string 
  }>();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const createRequest = useCreateServiceRequest();

  // Pegar localização real para o Geofencing
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  function handleRequestSocorro() {
    if (!location) return;

    createRequest.mutate({
      vehicleId: params.vehicleId,
      problemType: params.problemType,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      triageAnswers: params.triageAnswers ? JSON.parse(params.triageAnswers) : {},
    }, {
      onSuccess: (data) => {
        // Navegar para a busca de profissionais (C09)
        router.replace({
          pathname: "/(service-flow)/searching",
          params: { requestId: data.id }
        });
      }
    });
  }

  const isLoadingLocation = !location && !errorMsg;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Estimativa de Preço</Text>
        
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Detectando sua localização...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>VALOR TOTAL ESTIMADO</Text>
              <Text style={styles.priceValue}>R$ ---,--</Text>
              <Text style={styles.priceSubtext}>O valor exato será confirmado pelo profissional após o diagnóstico.</Text>
            </View>

            <View style={styles.breakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Taxa de Diagnóstico (Pagar agora)</Text>
                <Text style={styles.breakdownValue}>R$ 35,00</Text>
              </View>
              <Text style={styles.infoText}>
                Esta taxa garante o deslocamento do profissional e o diagnóstico do problema. O valor é abatido do serviço final.
              </Text>
            </View>

            <View style={styles.methodCard}>
              <Text style={styles.sectionTitle}>MÉTODO DE PAGAMENTO</Text>
              <View style={styles.methodRow}>
                <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
                <Text style={styles.methodName}>PIX (Copia e Cola)</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </View>

            <Button
              title="SOLICITAR SOCORRO AGORA"
              onPress={handleRequestSocorro}
              loading={createRequest.isPending}
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  loadingText: { color: colors.textSecondary, marginTop: spacing.md, fontFamily: "PlusJakartaSans_400Regular" },
  content: { gap: spacing.xl },
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
