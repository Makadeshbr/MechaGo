import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { MechaGoModal } from "@/components/ui";

const PROBLEM_LABELS: Record<string, string> = {
  tire: "Pneu",
  battery: "Bateria",
  electric: "Elétrico",
  overheat: "Superaquecimento",
  fuel: "Combustível",
  other: "Outro",
};

const PROBLEM_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tire: "car-tire-alert",
  battery: "battery-charging",
  electric: "flash",
  overheat: "thermometer-alert",
  fuel: "gas-station",
  other: "alert-circle",
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { requestData: request, clearRequest, socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState(180);
  const [isAccepting, setIsAccepting] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    type: "info" | "danger" | "success";
    confirmText: string;
    cancelText?: string;
    hideCancel?: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    description: "",
    type: "info",
    confirmText: "OK",
    cancelText: "VOLTAR",
    hideCancel: true,
    onConfirm: () => undefined,
  });

  const closeModal = () => {
    setModal((current) => ({ ...current, visible: false }));
  };

  const openInfoModal = (params: {
    title: string;
    description: string;
    type?: "info" | "danger" | "success";
    confirmText?: string;
    onConfirm?: () => void;
  }) => {
    setModal({
      visible: true,
      title: params.title,
      description: params.description,
      type: params.type ?? "info",
      confirmText: params.confirmText ?? "OK",
      hideCancel: true,
      onConfirm: () => {
        closeModal();
        params.onConfirm?.();
      },
    });
  };

  const openConfirmModal = (params: {
    title: string;
    description: string;
    type?: "info" | "danger" | "success";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setModal({
      visible: true,
      title: params.title,
      description: params.description,
      type: params.type ?? "info",
      confirmText: params.confirmText ?? "CONFIRMAR",
      cancelText: params.cancelText ?? "VOLTAR",
      hideCancel: false,
      onConfirm: () => {
        closeModal();
        params.onConfirm();
      },
    });
  };

  // Reseta o timer quando chega um novo chamado
  useEffect(() => {
    if (request?.requestId) {
      setTimeLeft(180);
      setIsAccepting(false);
    }
  }, [request?.requestId]);

  // Efeito para entrar/sair da sala de matching no Socket
  useEffect(() => {
    if (socket && request?.requestId) {
      console.log("[Socket] Joining matching room for:", request.requestId);
      socket.emit("join_matching", { requestId: request.requestId });

      return () => {
        console.log("[Socket] Leaving matching room for:", request.requestId);
        socket.emit("leave_matching", { requestId: request.requestId });
      };
    }
  }, [socket, request?.requestId]);

  // Efeito para monitorar cancelamento ou se outro profissional aceitou
  useEffect(() => {
    if (request?.isCancelled || (request?.isClaimed && !isAccepting)) {
      const title = request.isCancelled ? "Chamado Cancelado" : "Chamado Indisponível";
      const message = request.isCancelled 
        ? "O cliente cancelou a solicitação antes de você aceitar."
        : "Este chamado já foi aceito por outro profissional.";

      openInfoModal({
        title,
        description: message,
        type: "danger",
        onConfirm: () => {
          clearRequest();
          router.replace("/(tabs)");
        },
      });
    }
  }, [request?.isCancelled, request?.isClaimed, isAccepting]);

  useEffect(() => {
    if (!request || timeLeft <= 0 || request.isCancelled) {
      if (timeLeft <= 0 && !request?.isCancelled) {
        openInfoModal({
          title: "Tempo expirado",
          description: "O tempo para aceitar este chamado acabou.",
          type: "danger",
          onConfirm: () => {
            clearRequest();
            router.replace("/(tabs)");
          },
        });
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
    if (!request || request.isCancelled) return;
    try {
      setIsAccepting(true);
      if (socket) {
        socket.emit("leave_matching", { requestId: request.requestId });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await api.post(`service-requests/${request.requestId}/accept`);
      clearRequest();
      router.replace(`/(service-flow)/map-tracking?requestId=${request.requestId}` as any);
    } catch (err) {
      setIsAccepting(false);
      openInfoModal({
        title: "Não foi possível aceitar",
        description: "Este chamado pode ter sido cancelado ou aceito por outro profissional.",
        type: "danger",
        onConfirm: () => {
          clearRequest();
          router.replace("/(tabs)");
        },
      });
    }
  };

  const handleRefuse = () => {
    openConfirmModal({
      title: "Recusar chamado",
      description: "Tem certeza que não deseja realizar este atendimento?",
      type: "danger",
      confirmText: "SIM, RECUSAR",
      cancelText: "VOLTAR",
      onConfirm: () => {
        clearRequest();
        router.replace("/(tabs)");
      },
    });
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
  
  // Dados reais do veículo (fiel ao contrato brand/model)
  const vehicleInfo = request.vehicle 
    ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.year || ""}`
    : "Veículo não informado";
  
  const vehiclePlate = request.vehicle?.plate || "";
  const vehicleType = request.vehicle?.type || "car";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header Fiel ao DS V4 - Branding Centralizado */}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.logo}>MechaGo</Text>
          <View style={styles.headerSide}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={20} color={colors.onSurface} />
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Card de Notificação - Cores DS V4 */}
          <View style={styles.highlightCard}>
            <MaterialIcons name="notifications-active" size={32} color={colors.bg} />
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
              customMapStyle={mapStyle} // Estilo Noir
            >
              <Marker
                coordinate={{
                  latitude: Number(request.clientLatitude),
                  longitude: Number(request.clientLongitude),
                }}
              >
                <View style={styles.clientMarker}>
                  <MaterialIcons name="location-on" size={32} color={colors.primary} />
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
                <MaterialCommunityIcons 
                  name={vehicleType === "moto" ? "motorbike" : "car-side"} 
                  size={32} 
                  color={colors.primary} 
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.labelSmall}>Problema</Text>
                <View style={styles.problemRow}>
                  <MaterialCommunityIcons name={problemIcon} size={18} color={colors.onSurface} />
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
              accessibilityRole="button"
              accessibilityLabel="Aceitar chamado de socorro"
            >
              <Text style={styles.acceptText}>Aceitar Chamado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refuseButton}
              onPress={handleRefuse}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Recusar chamado de socorro"
            >
              <Text style={styles.refuseText}>Recusar Chamado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <MechaGoModal
        visible={modal.visible}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        hideCancel={modal.hideCancel}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
      />
    </SafeAreaView>
  );
}

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.headline,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  backButtonText: {
    fontFamily: fonts.body,
    fontWeight: "700",
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
  headerSide: {
    width: 44,
    alignItems: "center",
  },
  logo: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.primary,
    fontStyle: "italic",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
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
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  highlightTitle: {
    fontFamily: fonts.headline,
    fontSize: 20,
    color: colors.bg,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 48,
    color: colors.bg,
  },
  timerLabel: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 10,
    color: colors.bg,
    opacity: 0.8,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  mapWrapper: {
    height: 160,
    borderRadius: radii.xl,
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
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  distanceText: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 11,
    color: colors.primary,
  },
  detailsCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
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
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  vehicleName: {
    fontFamily: fonts.headline,
    fontSize: 20,
    color: colors.onSurface,
  },
  vehiclePlate: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  vehicleIcon: {
    backgroundColor: colors.bg,
    width: 64,
    height: 64,
    borderRadius: radii.lg,
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
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
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
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 14,
    color: colors.onSurface,
  },
  etaText: {
    fontFamily: fonts.headline,
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
    fontFamily: fonts.headline,
    fontSize: 26,
    color: colors.onSurface,
  },
  actionArea: {
    gap: spacing.md,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.bg,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  refuseButton: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  refuseText: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
