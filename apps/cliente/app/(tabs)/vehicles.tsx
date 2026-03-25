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
import {
  useDeleteVehicle,
  useVehicleDeletionImpact,
  useVehicles,
} from "@/hooks/queries/useVehicles";
import { LogoPin, AmbientGlow, MechaGoModal } from "@/components/ui";
import { borderRadius, colors, spacing, type VehicleDeletionImpact } from "@mechago/shared";

interface FeedbackModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
}

async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const body = await (error as { response: Response }).response.clone().json();
      return body?.error?.message ?? body?.message ?? "Erro inesperado";
    }
  } catch {
    // Ignora body não-JSON
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir esta ação.";
}

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
  const deletionImpact = useVehicleDeletionImpact();

  // Estados locais para controle de exclusão
  const [modalVisible, setModalVisible] = React.useState(false);
  const [pendingDeletionImpactVehicleId, setPendingDeletionImpactVehicleId] =
    React.useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<{
    id: string;
    name: string;
    impact: VehicleDeletionImpact | null;
  } | null>(null);
  const [feedbackModal, setFeedbackModal] = React.useState<FeedbackModalState>({
    visible: false,
    title: "",
    description: "",
    type: "info",
  });

  function closeFeedbackModal() {
    setFeedbackModal((current) => ({ ...current, visible: false }));
  }

  function openFeedbackModal(
    title: string,
    description: string,
    type: FeedbackModalState["type"] = "info",
  ) {
    setFeedbackModal({ visible: true, title, description, type });
  }

  function buildDeletionDescription(name: string, impact: VehicleDeletionImpact | null) {
    if (!impact) {
      return `Tem certeza que deseja remover seu "${name}"? Esta ação não pode ser desfeita.`;
    }

    if (!impact.canDelete) {
      return impact.message;
    }

    if (impact.willCancelPendingRequests) {
      return `Tem certeza que deseja remover seu "${name}"? ${impact.message}`;
    }

    return `Tem certeza que deseja remover seu "${name}"? Esta ação não pode ser desfeita.`;
  }

  function handleDeletePress(id: string, name: string) {
    setPendingDeletionImpactVehicleId(id);
    deletionImpact.mutate(id, {
      onSuccess: (impact) => {
        setPendingDeletionImpactVehicleId(null);
        if (!impact.canDelete) {
          openFeedbackModal("Não é possível excluir", impact.message, "danger");
          return;
        }

        setVehicleToDelete({ id, name, impact });
        setModalVisible(true);
      },
      onError: (err) => {
        setPendingDeletionImpactVehicleId(null);
        void (async () => {
          const message = await extractErrorMessage(err);
          openFeedbackModal("Não foi possível verificar", message, "danger");
        })();
      },
    });
  }

  function handleConfirmDelete() {
    if (!vehicleToDelete) return;

    deleteVehicle.mutate(vehicleToDelete.id, {
      onSuccess: () => {
        setModalVisible(false);
        setVehicleToDelete(null);
      },
      onError: (err) => {
        void (async () => {
          const message = await extractErrorMessage(err);
          openFeedbackModal("Não foi possível excluir", message, "danger");
        })();
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />

      <MechaGoModal
        visible={modalVisible}
        title="Excluir veículo"
        description={buildDeletionDescription(
          vehicleToDelete?.name ?? "veículo",
          vehicleToDelete?.impact ?? null,
        )}
        type="danger"
        confirmText="EXCLUIR"
        loading={deleteVehicle.isPending || deletionImpact.isPending}
        onClose={() =>
          !deleteVehicle.isPending &&
          !deletionImpact.isPending &&
          setModalVisible(false)
        }
        onConfirm={handleConfirmDelete}
      />

      <MechaGoModal
        visible={feedbackModal.visible}
        title={feedbackModal.title}
        description={feedbackModal.description}
        type={feedbackModal.type}
        confirmText="ENTENDI"
        hideCancel
        onClose={closeFeedbackModal}
        onConfirm={closeFeedbackModal}
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
                        openFeedbackModal(
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
                      disabled={
                        deleteVehicle.isPending ||
                        pendingDeletionImpactVehicleId === item.id
                      }
                      accessibilityLabel={`Excluir ${vehicleName}`}
                      accessibilityRole="button"
                    >
                      {(deleteVehicle.isPending && vehicleToDelete?.id === item.id) ||
                      pendingDeletionImpactVehicleId === item.id ? (
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
