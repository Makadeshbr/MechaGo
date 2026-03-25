import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@mechago/shared";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";

const { width } = Dimensions.get("window");

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const PROBLEM_LABELS: Record<string, string> = {
  battery: "Bateria",
  tire: "Pneu",
  electric: "Pane Elétrica",
  overheat: "Superaquecimento",
  fuel: "Pane Seca",
  other: "Outro",
};

const PROBLEM_ICONS: Record<string, any> = {
  battery: "flash",
  tire: "construct",
  electric: "bulb",
  overheat: "thermometer",
  fuel: "funnel",
  other: "alert-circle",
};

export default function NewRequestScreen() {
  const router = useRouter();
  const { requestData: request, clearRequest } = useSocket();
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (!request || timeLeft <= 0) {
      if (timeLeft <= 0) {
        clearRequest();
        router.replace("/(tabs)");
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearRequest();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request, timeLeft, clearRequest, router]);

  const handleAccept = async () => {
    if (!request) return;
    try {
      await api.post(`service-requests/${request.requestId}/accept`);
      clearRequest();
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Error accepting request", err);
    }
  };

  const handleRefuse = () => {
    clearRequest();
    router.replace("/(tabs)");
  };

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Sem chamados pendentes</Text>
          <TouchableOpacity 
            onPress={() => router.replace("/(tabs)")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>VOLTAR AO PAINEL</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const distanceKm = (request.distanceMeters / 1000).toFixed(1);
  const problemLabel = PROBLEM_LABELS[request.problemType] || "Outro";
  const problemIcon = PROBLEM_ICONS[request.problemType] || "alert-circle";
  
  // Dados reais do veículo (fallbacks para segurança)
  const vehicleInfo = request.vehicle 
    ? `${request.vehicle.make} ${request.vehicle.model} ${request.vehicle.year || ""}`
    : "Veículo não informado";
  
  const vehiclePlate = request.vehicle?.plate || "";
  const vehicleType = request.vehicle?.type || "car";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header Fiel ao DS V4 */}
        <View style={styles.header}>
          <Text style={styles.logo}>MechaGo</Text>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.text} />
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Card de Notificação com Pulse Animado (Simulado via Opacidade) */}
          <View style={styles.highlightCard}>
            <Ionicons name="notifications" size={32} color={colors.bg} />
            <Text style={styles.highlightTitle}>NOVO CHAMADO!</Text>
            <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>AGUARDANDO RESPOSTA</Text>
          </View>

          {/* Mapa Real com Localização do Cliente */}
          <View style={styles.mapWrapper}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: Number(request.clientLatitude),
                longitude: Number(request.clientLongitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: Number(request.clientLatitude),
                  longitude: Number(request.clientLongitude),
                }}
              >
                <View style={styles.clientMarker}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                </View>
              </Marker>
            </MapView>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distanceKm} km de você</Text>
            </View>
          </View>

          {/* Detalhes do Chamado - Dados Reais */}
          <View style={styles.detailsCard}>
            <View style={styles.vehicleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSmall}>Veículo do Cliente</Text>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicleInfo}
                </Text>
                {vehiclePlate ? (
                  <Text style={styles.vehiclePlate}>{vehiclePlate}</Text>
                ) : null}
              </View>
              <View style={styles.vehicleIcon}>
                <Ionicons 
                  name={vehicleType === "moto" ? "bicycle" : "car-sport"} 
                  size={32} 
                  color={colors.primary} 
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.labelSmall}>Problema</Text>
                <View style={styles.problemRow}>
                  <Ionicons name={problemIcon} size={16} color={colors.text} />
                  <Text style={styles.problemText}>{problemLabel}</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.labelSmall}>Chegada</Text>
                <Text style={styles.etaText}>
                  ~{Math.max(1, Math.round(request.distanceMeters / 1000 * 5))} min
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View>
                <Text style={styles.labelSmall}>Estimativa</Text>
                <Text style={styles.priceValue}>
                  R$ {Number(request.estimatedPrice).toFixed(2).replace(".", ",")}
                </Text>
              </View>
            </View>
          </View>

          {/* Área de Ação com Botões de Elite */}
          <View style={styles.actionArea}>
            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptText}>Aceitar Chamado</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refuseButton}
              onPress={handleRefuse}
              activeOpacity={0.6}
            >
              <Text style={styles.refuseText}>Recusar Chamado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  backButtonText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    height: 64,
  },
  logo: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  highlightCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  highlightTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.bg,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  timer: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 48,
    color: colors.bg,
  },
  timerLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    color: colors.bg,
    opacity: 0.8,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  mapWrapper: {
    height: 160,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  clientMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  distanceBadge: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  distanceText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    color: colors.primary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  labelSmall: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  vehicleName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
  },
  vehiclePlate: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  vehicleIcon: {
    backgroundColor: colors.background,
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  problemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4,
  },
  problemText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.text,
  },
  etaText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: colors.primary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  priceValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: colors.text,
  },
  actionArea: {
    gap: spacing.md,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  acceptText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: colors.bg,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  refuseButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  refuseText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
