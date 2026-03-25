import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow, Button, MechaGoModal } from "@/components/ui";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useRegisterProfessional } from "@/hooks/queries/useProfessional";
import { colors, spacing, borderRadius } from "@mechago/shared";

interface ReviewModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
}

// Labels legíveis para exibir no resumo — evita mostrar IDs técnicos ao usuário
const TYPE_LABELS: Record<string, string> = {
  mechanic_mobile: "Mecânico Móvel",
  mechanic_workshop: "Mecânico com Oficina",
  tire_repair: "Borracheiro",
  tow_truck: "Guincho",
};

const SCHEDULE_LABELS: Record<string, string> = {
  "24h": "24 Horas",
  daytime: "Diurno (6h-22h)",
  nighttime: "Noturno (22h-6h)",
  custom: "Personalizado",
};

const SPECIALTY_LABELS: Record<string, string> = {
  car_general: "Mecânica Geral",
  electronic_injection: "Injeção Eletrônica",
  brakes: "Freios",
  suspension: "Suspensão",
  air_conditioning: "Ar Condicionado",
  transmission: "Transmissão",
  moto: "Motocicletas",
  diesel_truck: "Diesel / Caminhão",
};

const VEHICLE_LABELS: Record<string, string> = {
  car: "Passeio",
  suv: "SUV",
  truck: "Carga",
  moto: "Moto",
};

// Passo 4/4 do onboarding: revisão final + submit ao backend
// Lê dados consolidados do onboarding store e chama POST /professionals/register
export default function ReviewScreen() {
  const { getRegistrationData, reset } = useOnboardingStore();
  const { step2, step3, step4 } = useOnboardingStore();
  const registerProfessional = useRegisterProfessional();
  const [modal, setModal] = React.useState<ReviewModalState>({
    visible: false,
    title: "",
    description: "",
    type: "info",
  });

  const registrationData = getRegistrationData();

  function closeModal() {
    setModal((current) => ({ ...current, visible: false }));
  }

  function openModal(
    title: string,
    description: string,
    type: ReviewModalState["type"] = "info",
  ) {
    setModal({ visible: true, title, description, type });
  }

  function onFinish() {
    if (!registrationData) {
      openModal(
        "Dados incompletos",
        "Volte aos passos anteriores e preencha todos os campos obrigatórios.",
      );
      return;
    }

    registerProfessional.mutate(registrationData, {
      onSuccess: () => {
        // Limpa store temporário e navega para o dashboard
        reset();
        router.replace("/(tabs)");
      },
      onError: (error) => {
        const message =
          (error as { message?: string }).message ??
          "Erro ao finalizar cadastro. Tente novamente.";
        openModal("Erro", message, "danger");
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />
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

      {/* Barra de progresso — todas ativas */}
      <View style={styles.progressBar}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressSegment, styles.progressActive]} />
        ))}
      </View>

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de sucesso */}
        <View style={styles.successIcon}>
          <View style={styles.successGlow}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.step}>PASSO 4 DE 4</Text>
        <Text style={styles.title}>Quase lá!</Text>
        <Text style={styles.subtitle}>
          Revise as informações abaixo e confirme para começar a receber chamados.
        </Text>

        {/* Resumo com dados reais do store */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>RESUMO DO PERFIL</Text>

          {/* Tipo de profissional */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Tipo</Text>
              <Text style={styles.summaryValue}>
                {step2.type ? TYPE_LABELS[step2.type] ?? step2.type : "Não definido"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Especialidades */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="construct-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Especialidades</Text>
              <Text style={styles.summaryValue}>
                {step3.specialties?.length
                  ? step3.specialties.map((s) => SPECIALTY_LABELS[s] ?? s).join(", ")
                  : "Nenhuma selecionada"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Veículos atendidos */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="car-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Veículos atendidos</Text>
              <Text style={styles.summaryValue}>
                {step3.vehicleTypesServed?.length
                  ? step3.vehicleTypesServed.map((v) => VEHICLE_LABELS[v] ?? v).join(", ")
                  : "Nenhum selecionado"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Disponibilidade */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Disponibilidade</Text>
              <Text style={styles.summaryValue}>
                {step4.scheduleType
                  ? SCHEDULE_LABELS[step4.scheduleType] ?? step4.scheduleType
                  : "Não definida"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Raio */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="map-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Raio de atendimento</Text>
              <Text style={styles.summaryValue}>
                {step4.radiusKm !== undefined ? `${step4.radiusKm} km` : "Não definido"}
              </Text>
            </View>
          </View>
        </View>

        {/* Aviso sobre análise */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Após o cadastro, sua conta ficará ativa imediatamente. Você já poderá
            receber chamados dentro do seu raio de atuação.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="FINALIZAR CADASTRO"
          onPress={onFinish}
          loading={registerProfessional.isPending}
          disabled={!registrationData}
          accessibilityLabel="Finalizar cadastro e acessar o app"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressBar: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
  },
  progressActive: { backgroundColor: colors.primary },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  backButton: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  successIcon: { marginBottom: spacing.xxl, marginTop: spacing.lg },
  successGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  step: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xxxl,
    textAlign: "center",
    maxWidth: 300,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(253, 212, 4, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  summaryContent: { flex: 1 },
  summaryLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.xs,
  },
  infoBox: {
    width: "100%",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "rgba(253, 212, 4, 0.06)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(253, 212, 4, 0.12)",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
});
