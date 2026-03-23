import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles } from "@/hooks/queries/useVehicles";
import { VehicleCard } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

export default function VehiclesScreen() {
  const { data: vehicles, isLoading, error, refetch } = useVehicles();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus veículos</Text>
        <Pressable
          onPress={() => router.push("/(auth)/register-vehicle")}
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel="Adicionar veículo"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={24} color="#000000" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Erro ao carregar veículos</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : vehicles && vehicles.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Nenhum veículo cadastrado</Text>
          <Pressable
            onPress={() => router.push("/(auth)/register-vehicle")}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Adicionar veículo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <VehicleCard
              brand={item.brand}
              model={item.model}
              year={item.year}
              plate={item.plate}
              type={item.type}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  errorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.error,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  separator: {
    height: spacing.md,
  },
});
