import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, radii, fonts, darkMapStyle } from "@mechago/shared";
import { useSocket } from "@/providers/SocketProvider";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { Skeleton, MechaGoModal } from "@/components/ui";
import { nav } from "@/lib/navigation";

const { width } = Dimensions.get("window");

interface ModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
}

export default function TrackingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);

  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [realtimeEta, setRealtimeEta] = useState<number | null>(null);
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

  // Polling fallback: navega por status quando o Socket.IO não entrega o evento
  useEffect(() => {
    if (!request) return;
    const { status, id } = request;
    if (status === "resolved") {
      nav.toPriceApproval(id);
    } else if (status === "cancelled_client" || status === "cancelled_professional") {
      nav.toHome();
    }
  }, [request?.status, request?.id]);

  // Escuta localização do profissional e status updates via socket
  useEffect(() => {
    if (socket && requestId) {
      socket.emit("join_request", { requestId });

      socket.on("professional_location", (data: { lat: number; lng: number; estimatedArrivalMinutes?: number; distanceKm?: number }) => {
        setProLocation(data);
        if (data.estimatedArrivalMinutes !== undefined) {
          setRealtimeEta(data.estimatedArrivalMinutes);
        }
      });

      socket.on("status_update", (data: { status: string }) => {
        if (data.status === "professional_arrived") {
          router.replace(`/(service-flow)/service-active?requestId=${requestId}` as `/(service-flow)/service-active?requestId=${string}`);
        }
        if (data.status === "resolved") {
          nav.toPriceApproval(requestId as string);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("professional_location");
        socket.off("status_update");
        if (requestId) {
          socket.emit("leave_request", { requestId });
        }
      }
    };
  }, [socket, requestId, router]);

  // Sincroniza localização do profissional via polling (fallback do socket)
  useEffect(() => {
    if (
      request?.professionalLatitude !== null &&
      request?.professionalLatitude !== undefined &&
      request?.professionalLongitude !== null &&
      request?.professionalLongitude !== undefined
    ) {
      setProLocation({
        lat: request.professionalLatitude,
        lng: request.professionalLongitude,
      });
    }
  }, [request?.professionalLatitude, request?.professionalLongitude]);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={{ width: 44, height: 44 }} />
          <Skeleton width={200} height={18} style={{ marginLeft: spacing.sm }} />
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface }} />
        <View style={[styles.bottomCard, { position: "relative", width: "100%" }]}>
          <View style={styles.proInfoRow}>
            <Skeleton width={56} height={56} style={{ borderRadius: radii.full }} />
            <View style={{ flex: 1, marginLeft: spacing.md, gap: spacing.xs }}>
              <Skeleton width={140} height={18} />
              <Skeleton width={180} height={13} />
            </View>
            <Skeleton width={48} height={48} style={{ borderRadius: radii.full }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width={60} height={10} />
              <Skeleton width={80} height={16} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width={70} height={10} />
              <Skeleton width={60} height={20} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const clientLat = Number(request.clientLatitude);
  const clientLng = Number(request.clientLongitude);

  const clientCoords = {
    latitude: isNaN(clientLat) ? 0 : clientLat,
    longitude: isNaN(clientLng) ? 0 : clientLng,
  };

  const professional = request.professional;

  const professionalFallback = (
    <View style={styles.avatarFallback}>
      <MaterialIcons name="build-circle" size={28} color={colors.primary} />
    </View>
  );

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Profissional a caminho</Text>
            <Text style={styles.headerSubtitle}>
              {request.context === "highway"
                ? request.roadwayName || "Na Rodovia"
                : `Em ${request.cityName || "sua região"}`}
            </Text>
          </View>
        </View>

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
          <Marker coordinate={clientCoords} title="Você">
            <View style={styles.clientMarker}>
              <MaterialIcons name="person-pin-circle" size={32} color={colors.primary} />
            </View>
          </Marker>

          {proLocation && (
            <Marker
              coordinate={{
                latitude: proLocation.lat,
                longitude: proLocation.lng,
              }}
              title={professional?.name || "Profissional"}
            >
              <View style={styles.proMarker}>
                <MaterialCommunityIcons name="car-connected" size={28} color={colors.primary} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Card do Profissional */}
        <View style={styles.bottomCard}>
          <View style={styles.proInfoRow}>
            {professional?.avatarUrl ? (
              <Image source={{ uri: professional.avatarUrl }} style={styles.avatar} />
            ) : (
              professionalFallback
            )}
            <View style={styles.proText}>
              <Text style={styles.proName}>{professional?.name || "Profissional"}</Text>
              <Text style={styles.proDetails}>
                {"\u2605"} {professional?.rating || "5.0"} {"\u2022"} {professional?.specialties?.[0] || "Mecânica"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => showModal("Em breve", "Chamada telefônica integrada estará disponível na V1.0.", "info")}
              accessibilityRole="button"
              accessibilityLabel="Ligar para o profissional"
            >
              <MaterialIcons name="phone" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.labelSmall}>Status</Text>
              <Text style={styles.statusValue}>A caminho</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.labelSmall}>Chegada em</Text>
                <Text style={styles.etaValue}>
                 {realtimeEta !== null
                   ? `${realtimeEta} min`
                   : request.estimatedArrivalMinutes !== null && request.estimatedArrivalMinutes !== undefined
                   ? `${request.estimatedArrivalMinutes} min`
                   : "--"}
               </Text>
            </View>
          </View>
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
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerTextWrap: { flex: 1, marginLeft: spacing.sm },
  headerTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.onSurface },
  headerSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  map: { flex: 1 },
  clientMarker: { alignItems: "center", justifyContent: "center" },
  proMarker: {
    backgroundColor: colors.bg,
    padding: 6,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.primary,
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
  },
  proInfoRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: radii.full, borderWidth: 1, borderColor: colors.primary },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  proText: { flex: 1, marginLeft: spacing.md },
  proName: { fontFamily: fonts.headline, fontSize: 18, color: colors.onSurface },
  proDetails: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant },
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
  divider: { height: 1, backgroundColor: colors.outline, marginVertical: spacing.lg },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusItem: { flex: 1 },
  labelSmall: {
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusValue: { fontFamily: fonts.body, fontWeight: "600", fontSize: 16, color: colors.onSurface },
  etaValue: { fontFamily: fonts.headline, fontSize: 20, color: colors.primary },
});
