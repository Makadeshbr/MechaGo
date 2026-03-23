import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/hooks/queries/useUser";
import { useVehicles } from "@/hooks/queries/useVehicles";
import { LogoPin, VehicleCard } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

export default function HomeSOS() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();

  const isLoading = userLoading || vehiclesLoading;
  const firstVehicle = vehicles?.[0];

  // Se não tem veículo, redirecionar para cadastro
  React.useEffect(() => {
    if (!vehiclesLoading && vehicles && vehicles.length === 0) {
      router.replace("/(auth)/register-vehicle");
    }
  }, [vehicles, vehiclesLoading]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* TopBar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.menuButton}
            hitSlop={8}
            accessibilityLabel="Menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </Pressable>
          <LogoPin size="sm" />
          <Pressable
            style={styles.avatarButton}
            hitSlop={8}
            accessibilityLabel="Perfil"
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person-circle-outline" size={32} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Modo urbano indicator */}
        <View style={styles.modeIndicator}>
          <View style={styles.modeGreenDot} />
          <Text style={styles.modeText}>MODO URBANO</Text>
        </View>

        {/* Localização */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.locationText}>São Paulo, SP</Text>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          {isLoading ? (
            <View style={styles.skeletonName} />
          ) : (
            <>
              <Text style={styles.greeting}>
                Olá, {user?.name?.split(" ")[0] ?? ""}
              </Text>
              <Text style={styles.greetingSub}>
                Já estamos prontos pra te ajudar
              </Text>
            </>
          )}
        </View>

        {/* Vehicle Card */}
        {vehiclesLoading ? (
          <View style={styles.vehicleSkeleton}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : firstVehicle ? (
          <VehicleCard
            brand={firstVehicle.brand}
            model={firstVehicle.model}
            year={firstVehicle.year}
            plate={firstVehicle.plate}
            type={firstVehicle.type}
            onPress={() => router.push("/(tabs)/vehicles")}
          />
        ) : null}

        {/* SOS Hero Button */}
        <Pressable
          style={({ pressed }) => [
            styles.sosCard,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {
            // TODO: Navegar para fluxo de serviço
          }}
          accessibilityLabel="Solicitar socorro agora"
          accessibilityRole="button"
        >
          <View style={styles.sosGradient}>
            <Text style={styles.sosLogoWatermark}>MECHAGO</Text>
            <Text style={styles.sosTitle}>SOCORRO AGORA</Text>
            <View style={styles.sosSubRow}>
              <Text style={styles.sosSub}>
                Toque para solicitar ajuda imediata
              </Text>
              <Ionicons name="finger-print-outline" size={20} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </Pressable>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Serviços rápidos"
            accessibilityRole="button"
          >
            <Ionicons name="build-outline" size={24} color={colors.text} />
            <Text style={styles.actionText}>Serviços Rápidos</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Chat humano"
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
            <Text style={styles.actionText}>Chat Humano</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  modeText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  locationText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  greetingContainer: {
    marginBottom: spacing.xxl,
  },
  skeletonName: {
    width: 180,
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  greeting: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  greetingSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
  },
  vehicleSkeleton: {
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  sosCard: {
    marginTop: spacing.xxl,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    marginBottom: spacing.xxl,
  },
  sosGradient: {
    // Gradiente laranja/vermelho fiel ao design
    backgroundColor: colors.error,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  sosLogoWatermark: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.3)",
    fontStyle: "italic",
    marginBottom: spacing.md,
  },
  sosTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  sosSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sosSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 90,
    justifyContent: "center",
  },
  actionText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
  },
});
