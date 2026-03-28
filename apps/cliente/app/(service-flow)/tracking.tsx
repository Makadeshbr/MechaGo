import React, { useEffect, useState, useRef } from "react";
import { Alert, View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, radii, fonts } from "@mechago/shared";
import { useSocket } from "@/providers/SocketProvider";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { Skeleton } from "@/components/ui";

const { width } = Dimensions.get("window");

export default function TrackingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);

  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // 1. Listen for professional location updates
  useEffect(() => {
    if (socket && requestId) {
      socket.emit("join_request", { requestId });

      socket.on("professional_location", (data: { lat: number; lng: number }) => {
        setProLocation(data);
      });

      socket.on("status_update", (data: { status: string }) => {
        if (data.status === "professional_arrived") {
          router.replace(`/(service-flow)/service-active?requestId=${requestId}` as `/(service-flow)/service-active?requestId=${string}`);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("professional_location");
        socket.off("status_update");
        // Limpa a sala ao sair da tela para evitar memory leak
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
          <View style={{ width: 44, height: 44 }} />
          <Skeleton width={200} height={18} style={{ marginLeft: spacing.sm }} />
        </View>
        {/* Placeholder para o mapa */}
        <View style={{ flex: 1, backgroundColor: colors.surface }} />
        {/* Placeholder para o card do profissional */}
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

  // Proteção contra coordenadas inválidas
  const clientCoords = {
    latitude: isNaN(clientLat) ? 0 : clientLat,
    longitude: isNaN(clientLng) ? 0 : clientLng,
  };

  const professional = request.professional;

  useEffect(() => {
    if (
      request.professionalLatitude !== null &&
      request.professionalLatitude !== undefined &&
      request.professionalLongitude !== null &&
      request.professionalLongitude !== undefined
    ) {
      setProLocation({
        lat: request.professionalLatitude,
        lng: request.professionalLongitude,
      });
    }
  }, [request.professionalLatitude, request.professionalLongitude]);

  const professionalFallback = (
    <View style={styles.avatarFallback}>
      <MaterialIcons name="build-circle" size={28} color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header Focado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profissional a caminho</Text>
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
          customMapStyle={mapStyle}
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

        {/* Card do Profissional Noir */}
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
                ★ {professional?.rating || "5.0"} • {professional?.specialties?.[0] || "Mecânica"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Alert.alert("Ligar", "Funcionalidade de chamada será implementada com integração telefônica.")}
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
                 {request.estimatedArrivalMinutes !== null && request.estimatedArrivalMinutes !== undefined
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
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
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
  headerTitle: { fontFamily: fonts.headline, fontSize: 18, color: colors.onSurface, marginLeft: spacing.sm },
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
