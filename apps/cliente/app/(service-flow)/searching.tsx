import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { LogoPin, Button, AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";
import { useServiceRequest, useCancelServiceRequest } from "@/hooks/queries/useServiceRequest";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

// Estilo Dark para o mapa (MechaGo Noir)
const MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121212" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function SearchingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();

  // Polling a cada 3 segundos
  const { data: request, isLoading, error } = useServiceRequest(requestId as string, 3000);
  const cancelMutation = useCancelServiceRequest();

  // Radar Animation (Pulso Visual)
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 2.5]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
  }));

  useEffect(() => {
    if (request?.status === "accepted" && request.professionalId) {
      router.replace(`/(service-flow)/professional-found?requestId=${request.id}` as any);
    }
  }, [request?.status]);

  const handleCancel = () => {
    Alert.alert(
      "Cancelar solicitação?",
      "Tem certeza que deseja cancelar a busca por profissionais?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(requestId as string);
              router.back();
            } catch (err) {
              Alert.alert("Erro", "Não foi possível cancelar. Tente novamente.");
            }
          },
        },
      ]
    );
  };

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
           <Text style={styles.title}>Iniciando busca...</Text>
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
      <AmbientGlow />
      
      {/* Mapa Real com Radar Visual conforme solicitado */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={MAP_STYLE}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          initialRegion={{
            ...clientCoords,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Círculo Estático de Referência (Design Stitch) */}
          <Circle
            center={clientCoords}
            radius={800}
            fillColor="rgba(253, 212, 4, 0.1)"
            strokeColor={colors.primary}
            strokeWidth={1}
          />
        </MapView>
        
        {/* Radar Pulse Centralizado sobre o PIN do Cliente */}
        <View style={styles.radarOverlay} pointerEvents="none">
          <Animated.View style={[styles.pulseCircle, pulseCircleStyle]} />
          <LogoPin size="lg" />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Buscando profissionais</Text>
        <Text style={styles.subtitle}>
          Estamos enviando seu chamado para os profissionais mais próximos da sua região.
        </Text>

        {request?.status === "waiting_queue" && (
           <View style={styles.queueBox}>
              <Text style={styles.queueText}>
                 Ninguém aceitou ainda. Você está na fila de espera.
              </Text>
           </View>
        )}

        <View style={styles.footer}>
          <Button 
            title="Cancelar Busca" 
            variant="outline" 
            onPress={handleCancel}
            loading={cancelMutation.isPending}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  mapContainer: {
    height: "50%",
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  radarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    alignItems: "center",
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  queueBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  queueText: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  footer: {
    position: "absolute",
    bottom: spacing.xxxl,
    width: "100%",
  }
});
