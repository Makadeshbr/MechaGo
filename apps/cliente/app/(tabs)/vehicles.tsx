import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles, useDeleteVehicle } from "@/hooks/queries/useVehicles";
import { LogoPin, AmbientGlow, MechaGoModal } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

// Ícones por tipo de veículo
const vehicleIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  car: "car-outline",
  moto: "bicycle-outline",
  suv: "car-sport-outline",
  truck: "bus-outline",
};

// Labels descritivos por tipo
const vehicleTypeLabels: Record<string, string> = {
  car: "Sedan",
  moto: "Motocicleta",
  suv: "SUV / Utilitário",
  truck: "Caminhão / Pesado",
};

export default function VehiclesScreen() {
  const { data: vehicles, isLoading, error, refetch } = useVehicles();
  const deleteVehicle = useDeleteVehicle();

  // Estados locais para controle de exclusão
  const [modalVisible, setModalVisible] = React.useState(false);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<{ id: string; name: string } | null>(null);

  function handleDeletePress(id: string, name: string) {
    setVehicleToDelete({ id, name });
    setModalVisible(true);
  }

  function handleConfirmDelete() {
    if (!vehicleToDelete) return;

    deleteVehicle.mutate(vehicleToDelete.id, {
      onSuccess: () => {
        setModalVisible(false);
        setVehicleToDelete(null);
      },
      onError: (err) => {
        Alert.alert("Erro", (err as any).message || "Não foi possível excluir o veículo.");
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <MechaGoModal
        visible={modalVisible}
        title="Excluir veículo"
        description={`Tem certeza que deseja remover seu "${vehicleToDelete?.name}"? Esta ação não pode ser desfeita.`}
        type="danger"
        confirmText="EXCLUIR"
        loading={deleteVehicle.isPending}
        onClose={() => !deleteVehicle.isPending && setModalVisible(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* TopBar — fiel ao design */}
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
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityLabel="Perfil"
          accessibilityRole="button"
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>01. FROTA</Text>
        <Text style={styles.title}>MEUS VEÍCULOS</Text>
      </View>

      {/* Botão adicionar — full width amarelo */}
      <View style={styles.addContainer}>
        <Pressable
          onPress={() => router.push("/(auth)/register-vehicle")}
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityLabel="Adicionar novo veículo"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle" size={22} color={colors.background} />
          <Text style={styles.addButtonText}>ADICIONAR NOVO</Text>
        </Pressable>
      </View>

      {/* Lista */}
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
          <Text style={styles.emptySubtext}>
            Adicione seu primeiro veículo para solicitar socorro
          </Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const vehicleName = `${item.brand} ${item.model} ${item.year}`;

            return (
              <View style={styles.card}>
                {/* Topo do card — ícone + ações */}
                <View style={styles.cardTopRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name={vehicleIcons[item.type] ?? "car-outline"}
                      size={24}
                      color={colors.background}
                    />
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Em breve",
                          "A edição de veículos estará disponível em uma próxima atualização.",
                        );
                      }}
                      style={({ pressed }) => [
                        styles.cardActionBtn,
                        pressed && { opacity: 0.5 },
                      ]}
                      hitSlop={8}
                      accessibilityLabel={`Editar ${vehicleName}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="create-outline" size={18} color={colors.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeletePress(item.id, vehicleName)}
                      style={({ pressed }) => [
                        styles.cardActionBtn,
                        styles.cardDeleteBtn,
                        pressed && { opacity: 0.5 },
                      ]}
                      hitSlop={8}
                      disabled={deleteVehicle.isPending}
                      accessibilityLabel={`Excluir ${vehicleName}`}
                      accessibilityRole="button"
                    >
                      {deleteVehicle.isPending && vehicleToDelete?.id === item.id ? (
                        <ActivityIndicator size={16} color={colors.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Info do veículo */}
                <Text style={styles.cardName}>{vehicleName}</Text>
                <Text style={styles.cardType}>
                  {vehicleTypeLabels[item.type] ?? item.type}
                </Text>

                {/* Placa em badge */}
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{item.plate}</Text>
                </View>
              </View>
            );
          }}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
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
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
  },
  addContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    paddingVertical: spacing.lg,
    // Glow sutil amarelo
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  addButtonText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: colors.background,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.error,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    opacity: 0.7,
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
    height: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDeleteBtn: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  cardName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardType: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(253, 212, 4, 0.1)",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  plateText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 13,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
