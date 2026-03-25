import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import MapView, { Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Button, AmbientGlow } from "@/components/ui";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { borderRadius, colors, type ScheduleType, spacing } from "@mechago/shared";

type ScheduleOption = {
  id: ScheduleType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// Estilo Dark para o mapa (MechaGo Noir)
// Definido conforme DS V4 para manter fidelidade visual ao produto
const MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const SCHEDULE_OPTIONS: ScheduleOption[] = [
  { id: "24h", label: "24 Horas", description: "Disponível a qualquer momento", icon: "flash-outline" },
  { id: "daytime", label: "Diurno", description: "Das 6h às 22h", icon: "sunny-outline" },
  { id: "nighttime", label: "Noturno", description: "22h às 6h", icon: "moon-outline" },
  { id: "custom", label: "Personalizado", description: "Defina seus horários", icon: "calendar-outline" },
];

// Raios de atendimento dinâmicos baseados no tipo de profissional
// Arquitetura pronta: Guinchos podem cobrir até 100km
const DEFAULT_RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50] as const;
const TOW_TRUCK_RADIUS_OPTIONS = [10, 20, 30, 50, 75, 100] as const;

export default function ServiceAreaScreen() {
  const { step2, step4, setStep4 } = useOnboardingStore();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Determina opções de raio conforme o tipo selecionado no Passo 2
  const isTowTruck = step2.type === "tow_truck";
  const radiusOptions = isTowTruck ? TOW_TRUCK_RADIUS_OPTIONS : DEFAULT_RADIUS_OPTIONS;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLoadingLocation(false);
    })();
  }, []);

  const selectedRadius = step4.radiusKm || 10;
  const selectedSchedule = step4.scheduleType || "24h";

  function onNext() {
    router.push("/(onboarding)/review");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />
      
      {/* Barra de progresso */}
      <View style={styles.progressBar}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressSegment, i <= 2 && styles.progressActive]} />
        ))}
      </View>

      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.step}>PASSO 3 DE 4</Text>
        <Text style={styles.title}>Área e Disponibilidade</Text>
        <Text style={styles.subtitle}>
          Defina o raio de quilômetros que deseja cobrir e seus horários de atendimento.
        </Text>

        <Text style={styles.sectionTitle}>RAIO DE COBERTURA</Text>
        
        {/* Mapa Real com Visual MechaGo Noir */}
        <View style={styles.mapContainer}>
          {loadingLocation ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.mapLoadingText}>Detectando localização...</Text>
            </View>
          ) : (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              customMapStyle={MAP_STYLE}
              scrollEnabled={false} // Mantém focado no PIN do usuário
              region={location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05 + (selectedRadius / 20), // Zoom dinâmico proporcional ao raio
                longitudeDelta: 0.05 + (selectedRadius / 20),
              } : undefined}
            >
              {location && (
                <Circle
                  center={location}
                  radius={selectedRadius * 1000} // React Native Maps usa metros
                  fillColor="rgba(253, 212, 4, 0.15)"
                  strokeColor={colors.primary}
                  strokeWidth={2}
                />
              )}
            </MapView>
          )}
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>{selectedRadius} KM</Text>
          </View>
        </View>

        <View style={styles.radiusSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll}>
            {radiusOptions.map((km) => (
              <Pressable
                key={km}
                onPress={() => setStep4({ radiusKm: km })}
                style={[styles.radiusChip, selectedRadius === km && styles.radiusChipSelected]}
              >
                <Text style={[styles.radiusChipText, selectedRadius === km && styles.radiusChipTextSelected]}>
                  {km} km
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>HORÁRIOS DE TRABALHO</Text>
        <View style={styles.optionsGrid}>
          {SCHEDULE_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setStep4({ scheduleType: option.id })}
              style={[styles.optionCard, selectedSchedule === option.id && styles.optionCardSelected]}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={selectedSchedule === option.id ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.optionLabel, selectedSchedule === option.id && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              <Text style={styles.optionDesc}>{option.description}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="PRÓXIMO" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressBar: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceLight },
  progressActive: { backgroundColor: colors.primary },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  backButton: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  step: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, color: colors.primary, letterSpacing: 2, marginBottom: spacing.sm },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  sectionTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.lg, marginTop: spacing.md },
  mapContainer: { width: "100%", height: 220, borderRadius: borderRadius.xl, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, marginBottom: spacing.lg },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm },
  mapLoadingText: { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular", fontSize: 12 },
  mapBadge: { position: "absolute", bottom: spacing.md, right: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  mapBadgeText: { fontFamily: "JetBrainsMono_700Bold", fontSize: 14, color: "#000000" },
  radiusSelector: { marginBottom: spacing.xxl },
  radiusScroll: { gap: spacing.sm },
  radiusChip: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  radiusChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusChipText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: colors.textSecondary },
  radiusChipTextSelected: { color: "#000000" },
  optionsGrid: { gap: spacing.md },
  optionCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  optionCardSelected: { borderColor: colors.primary, backgroundColor: "rgba(253, 212, 4, 0.05)" },
  optionLabel: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 16, color: colors.text, marginTop: spacing.sm },
  optionLabelSelected: { color: colors.primary },
  optionDesc: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.md },
});
