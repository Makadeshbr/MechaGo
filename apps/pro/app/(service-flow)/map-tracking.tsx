import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii, fonts, darkMapStyle } from "@mechago/shared";
import { useSocket } from "@/providers/SocketProvider";
import { useServiceRequest, useArrivedServiceRequest } from "@/hooks/queries/useServiceRequest";
import { Skeleton, MechaGoModal } from "@/components/ui";

const { width } = Dimensions.get("window");

interface ModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
}

export default function NavigationScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);
  const arrivedMutation = useArrivedServiceRequest();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const mapRef = useRef<MapView>(null);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    description: "",
    type: "info",
  });

  const closeModal = useCallback(() => {
    setModal((m) => ({ ...m, visible: false }));
  }, []);

  const showModal = useCallback(
    (title: string, description: string, type: ModalState["type"] = "info") => {
      setModal({ visible: true, title, description, type });
    },
    [],
  );

  // 1. Join request room com cleanup
  useEffect(() => {
    if (socket && requestId) {
      socket.emit("join_request", { requestId });
    }

    return () => {
      if (socket && requestId) {
        socket.emit("leave_request", { requestId });
      }
    };
  }, [socket, requestId]);

  // 2. Location Tracking
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showModal(
          "Permissão necessária",
          "Para confirmar chegada precisamos da sua localização. Habilite o GPS nas configurações.",
          "danger",
        );
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          if (socket && requestId) {
            socket.emit("update_location", {
              requestId,
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude,
            });
          }
        },
      );
    };

    startTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [socket, requestId, showModal]);

  const handleArrived = useCallback(async () => {
    if (!location) {
      showModal(
        "GPS não disponível",
        "Aguardando sinal de GPS. Vá para um local aberto e tente novamente.",
        "info",
      );
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await arrivedMutation.mutateAsync({
        requestId: requestId as string,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      router.replace(
        `/(service-flow)/diagnosis?requestId=${requestId}` as `/(service-flow)/diagnosis?requestId=${string}`,
      );
    } catch (err: unknown) {
      let message = "Não foi possível confirmar chegada. Verifique sua conexão.";

      // Extrai mensagem da API de forma resiliente (compatível com ky, fetch, axios)
      try {
        const httpErr = err as Record<string, unknown>;
        const response = httpErr?.response as { json?: () => Promise<unknown> } | undefined;
        if (response?.json) {
          const body = (await response.json()) as { error?: { message?: string } };
          if (body?.error?.message) message = body.error.message;
        }
      } catch {
        // Falha no parse — usa mensagem padrão
      }

      showModal("Atenção", message, "danger");
    }
  }, [location, arrivedMutation, requestId, router, showModal]);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={{ width: 44, height: 44 }} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Skeleton width={120} height={18} />
            <Skeleton width={140} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
        {/* Placeholder para o mapa */}
        <View style={{ flex: 1, backgroundColor: colors.surface }} />
        {/* Placeholder para o card inferior */}
        <View style={[styles.bottomCard, { position: "relative", width: "100%" }]}>
          <Skeleton width={200} height={14} />
          <Skeleton height={16} style={{ marginTop: spacing.sm }} />
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Skeleton width={80} height={24} />
            <Skeleton width={80} height={24} />
          </View>
          <Skeleton height={56} style={{ borderRadius: radii.lg, marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  const clientCoords = {
    latitude: Number(request.clientLatitude),
    longitude: Number(request.clientLongitude),
  };

  return (
    <SafeAreaView style={styles.safe}>
      <MechaGoModal
        visible={modal.visible}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText="ENTENDI"
        hideCancel
        onClose={closeModal}
        onConfirm={closeModal}
      />
      <View style={styles.container}>
        {/* Header Noir */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Navegação</Text>
            <Text style={styles.headerSubtitle}>Indo até o cliente</Text>
          </View>
        </View>

        {/* Mapa Fullscreen */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            ...clientCoords,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          customMapStyle={darkMapStyle}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Você"
            >
              <View style={styles.proMarker}>
                <MaterialCommunityIcons name="car-connected" size={28} color={colors.primary} />
              </View>
            </Marker>
          )}

          <Marker coordinate={clientCoords} title="Cliente">
            <View style={styles.clientMarker}>
              <MaterialIcons name="person-pin-circle" size={32} color={colors.error} />
            </View>
          </Marker>

          {location && (
            <Polyline
              coordinates={[
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                clientCoords,
              ]}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        {/* Card Inferior Noir */}
        <View style={styles.bottomCard}>
          <View style={styles.infoRow}>
            <View style={styles.clientInfo}>
              <Text style={styles.labelSmall}>Destino</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {request.address || "Endereço do cliente"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => showModal("Em breve", "Chamada telefônica integrada estará disponível na V1.0.", "info")}
              accessibilityRole="button"
              accessibilityLabel="Ligar para o cliente"
            >
              <MaterialIcons name="phone" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <View style={styles.metricItem}>
              <Text style={styles.labelSmall}>Distância</Text>
              <Text style={styles.metricValue}>
                {request.distanceKm !== null && request.distanceKm !== undefined
                  ? `${request.distanceKm.toFixed(1)} km`
                  : "--"}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.labelSmall}>ETA</Text>
              <Text style={styles.metricValue}>
                {request.estimatedArrivalMinutes !== null && request.estimatedArrivalMinutes !== undefined
                  ? `${request.estimatedArrivalMinutes} min`
                  : "--"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.arrivedButton, arrivedMutation.isPending && styles.disabledButton]}
            onPress={handleArrived}
            disabled={arrivedMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Confirmar chegada no local do cliente"
          >
            <Text style={styles.arrivedButtonText}>
              {arrivedMutation.isPending ? "VALIDANDO..." : "CHEGUEI NO LOCAL"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.headline,
    fontSize: 18,
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  map: {
    flex: 1,
  },
  proMarker: {
    backgroundColor: colors.bg,
    padding: 6,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  clientMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.outline,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clientInfo: {
    flex: 1,
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
  addressText: {
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 15,
    color: colors.onSurface,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.lg,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  metricItem: {
    flex: 1,
  },
  metricValue: {
    fontFamily: fonts.headline,
    fontSize: 20,
    color: colors.primary,
  },
  arrivedButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  arrivedButtonText: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.bg,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
