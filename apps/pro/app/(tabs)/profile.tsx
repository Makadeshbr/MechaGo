import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useUser } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfessional } from "@/hooks/queries/useProfessional";
import { AmbientGlow, Button, MechaGoModal } from "@/components/ui";
import { colors, spacing, borderRadius, fonts } from "@mechago/shared";

type Specialty = "car_general" | "moto" | "diesel_truck" | "electronic_injection" | "suspension" | "brakes" | "air_conditioning" | "transmission";

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

export default function ProfileScreen() {
  const { data: user, isLoading } = useUser();
  const { logout } = useAuth();
  const updateProfessional = useUpdateProfessional();

  const [isEditing, setIsEditing] = useState(false);
  const [editedRadius, setEditedRadius] = useState(user?.radiusKm ?? 10);
  const [editedSpecialties, setEditedSpecialties] = useState<Specialty[]>(user?.specialties as Specialty[] ?? []);

  const ratingLabel = user?.rating ? Number(user.rating).toFixed(1) : "--";
  const reviewsLabel = user?.totalReviews ?? 0;
  const levelLabel = user?.isVerified ? "Verificado" : "Pendente";

  const handleToggleSpecialty = (spec: Specialty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (editedSpecialties.length === 0) {
      Alert.alert("Erro", "Selecione ao menos uma especialidade");
      return;
    }

    try {
      await updateProfessional.mutateAsync({
        radiusKm: editedRadius,
        specialties: editedSpecialties,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível salvar as alterações");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AmbientGlow />
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                <Ionicons name="person" size={40} color={colors.textSecondary} />
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
                  onPress={() => setEditedRadius(Math.max(3, editedRadius - 1))}
                  style={styles.radiusControl}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.radiusDisplay}>
                  <Text style={styles.radiusValue}>{editedRadius}</Text>
                  <Text style={styles.radiusUnit}>KM</Text>
                </View>
                <Pressable 
                  onPress={() => setEditedRadius(Math.min(100, editedRadius + 1))}
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
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
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
  safe: { flex: 1, backgroundColor: colors.background },
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
    color: colors.text,
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
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.outline,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 1,
  },
  userName: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
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
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: colors.outline },
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
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  specialtyBadgeActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: colors.primary,
  },
  specialtyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
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
    color: colors.textSecondary,
  },
  infoSection: { gap: spacing.md },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.15)",
  },
  logoutText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
    fontWeight: "600",
  },
});
