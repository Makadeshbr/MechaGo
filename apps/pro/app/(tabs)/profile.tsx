import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfessional } from "@/hooks/queries/useProfessional";
import { AmbientGlow, Button, MechaGoModal } from "@/components/ui";
import { colors, spacing, borderRadius, fonts } from "@mechago/shared";

const specialtyValues = [
  "car_general",
  "moto",
  "diesel_truck",
  "electronic_injection",
  "suspension",
  "brakes",
  "air_conditioning",
  "transmission",
] as const;

type Specialty = (typeof specialtyValues)[number];

const SPECIALTY_LABELS: Record<Specialty, string> = {
  car_general: "Mecânica Geral",
  moto: "Motocicletas",
  diesel_truck: "Linha Diesel",
  electronic_injection: "Injeção Eletrônica",
  suspension: "Suspensão",
  brakes: "Freios",
  air_conditioning: "Ar Condicionado",
  transmission: "Câmbio/Transmissão",
};

const profileFormSchema = z.object({
  radiusKm: z.number().int().min(3).max(100),
  specialties: z.array(z.enum(specialtyValues)).min(1, "Selecione ao menos uma especialidade"),
});

type ProfileFormInput = z.infer<typeof profileFormSchema>;

export default function ProfileScreen() {
  const { data: user, isLoading } = useUser();
  const { logout } = useAuth();
  const updateProfessional = useUpdateProfessional();

  const [isEditing, setIsEditing] = useState(false);

  const defaultValues = useMemo<ProfileFormInput>(
    () => ({
      radiusKm: user?.radiusKm ?? 10,
      specialties: (user?.specialties?.filter((value): value is Specialty =>
        specialtyValues.includes(value as Specialty),
      ) ?? ["car_general"]),
    }),
    [user?.radiusKm, user?.specialties],
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  const editedRadius = watch("radiusKm");
  const editedSpecialties = watch("specialties");

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [modalVisible, setModalVisible] = useState(false);
  const showError = useCallback(() => setModalVisible(true), []);
  const closeError = useCallback(() => setModalVisible(false), []);

  const ratingLabel = user?.rating ? Number(user.rating).toFixed(1) : "--";
  const reviewsLabel = user?.totalReviews ?? 0;
  const levelLabel = user?.isVerified ? "Verificado" : "Pendente";

  const handleToggleSpecialty = (spec: Specialty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextValue = editedSpecialties.includes(spec)
      ? editedSpecialties.filter((item) => item !== spec)
      : [...editedSpecialties, spec];

    setValue("specialties", nextValue, { shouldValidate: true });
  };

  const handleSave = handleSubmit(async (formData) => {
    try {
      await updateProfessional.mutateAsync({
        radiusKm: formData.radiusKm,
        specialties: formData.specialties,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError();
    }
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MechaGoModal
        visible={modalVisible}
        title="Erro"
        description="Não foi possível salvar as alterações. Tente novamente."
        type="danger"
        confirmText="ENTENDI"
        hideCancel
        onClose={closeError}
        onConfirm={closeError}
      />
      <AmbientGlow />
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (isEditing) {
              reset(defaultValues);
            }
            setIsEditing(!isEditing);
          }}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "CANCELAR" : "EDITAR PERFIL"}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : user ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar e dados básicos */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{ratingLabel}</Text>
                <Text style={styles.statLabel}>Avaliação</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reviewsLabel}</Text>
                <Text style={styles.statLabel}>Atendimentos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{levelLabel}</Text>
                <Text style={styles.statLabel}>Nível</Text>
              </View>
            </View>
          </View>

          {/* Configurações Editáveis */}
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>MINHAS ESPECIALIDADES</Text>
            <View style={styles.specialtiesGrid}>
              {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map((spec) => {
                const isActive = isEditing 
                  ? editedSpecialties.includes(spec)
                  : (user.specialties as string[]).includes(spec);
                
                return (
                  <Pressable
                    key={spec}
                    disabled={!isEditing}
                    onPress={() => handleToggleSpecialty(spec)}
                    style={[
                      styles.specialtyBadge,
                      isActive && styles.specialtyBadgeActive,
                      !isEditing && !isActive && { display: "none" }
                    ]}
                  >
                    <Text style={[
                      styles.specialtyText,
                      isActive && styles.specialtyTextActive
                    ]}>
                      {SPECIALTY_LABELS[spec]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
              RAIO DE ATENDIMENTO
            </Text>
            {isEditing ? (
              <View style={styles.radiusEditor}>
                <Pressable 
                  onPress={() =>
                    setValue("radiusKm", Math.max(3, editedRadius - 1), { shouldValidate: true })
                  }
                  style={styles.radiusControl}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.radiusDisplay}>
                  <Text style={styles.radiusValue}>{editedRadius}</Text>
                  <Text style={styles.radiusUnit}>KM</Text>
                </View>
                <Pressable 
                  onPress={() =>
                    setValue("radiusKm", Math.min(100, editedRadius + 1), { shouldValidate: true })
                  }
                  style={styles.radiusControl}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={styles.infoText}>Atendendo em até {user.radiusKm}km</Text>
              </View>
            )}

            {errors.specialties?.message ? (
              <Text style={styles.errorText}>{errors.specialties.message}</Text>
            ) : null}
          </View>

          {isEditing && (
            <Button
              title="SALVAR ALTERAÇÕES"
              onPress={handleSave}
              loading={updateProfessional.isPending}
              variant="primary"
            />
          )}

          {/* Dados de conta */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>DADOS DA CONTA</Text>
            <View style={styles.infoCard}>
              <Ionicons name="call-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>{user.cpfCnpj}</Text>
            </View>
          </View>

          {/* Logout */}
          <Pressable
            onPress={() => logout.mutate()}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceLowest },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}1A`,
  },
  editButtonText: {
    fontFamily: fonts.headline,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  avatarContainer: { alignItems: "center" },
  avatarWrap: { marginBottom: spacing.md, position: "relative" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: `${colors.outlineVariant}33`,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.surfaceLowest,
    borderRadius: 12,
    padding: 1,
  },
  userName: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: fonts.headline,
    fontSize: 18,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: `${colors.outlineVariant}33` },
  configSection: { gap: spacing.md },
  specialtiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  specialtyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    backgroundColor: colors.surfaceVariant,
  },
  specialtyBadgeActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: colors.primary,
  },
  specialtyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  specialtyTextActive: {
    color: colors.primary,
    fontFamily: fonts.headline,
  },
  radiusEditor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  radiusControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: "center",
    alignItems: "center",
  },
  radiusDisplay: { alignItems: "center" },
  radiusValue: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.primary,
  },
  radiusUnit: {
    fontFamily: fonts.headline,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  infoSection: { gap: spacing.md },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.error}14`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: `${colors.error}26`,
  },
  logoutText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
    fontWeight: "600",
  },
});
