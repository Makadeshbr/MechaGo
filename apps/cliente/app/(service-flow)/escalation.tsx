import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button } from "@/components/ui/Button";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";

const DESTINATIONS = [
  {
    id: "oficina-carlos",
    name: "Oficina do Carlos",
    specialty: "Troca de Pneus",
    price: "R$ 148",
    priceNote: "estimado",
    distance: "1,2 km",
    icon: "build" as const,
  },
  {
    id: "oficina-proxima",
    name: "Oficina mais próxima",
    specialty: "Serviços gerais",
    price: "R$ 109",
    priceNote: "estimado",
    distance: "2,4 km",
    icon: "directions-car" as const,
  },
  {
    id: "guincho-rodovia",
    name: "Guincho da rodovia",
    specialty: "Concessionária",
    price: "GRATUITO",
    priceNote: "",
    distance: null,
    icon: "local-shipping" as const,
  },
];

export default function EscalationScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { data: request } = useServiceRequest(requestId ?? "");

  const diagnosis = request?.diagnosis ?? "Problema não identificado";
  const supportPhone = request?.roadwayPhone;

  const handleCall = () => {
    const phone = supportPhone ?? "192"; // 192 = PRF
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MECHAGO</Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>PROBLEMA NÃO{"\n"}RESOLVIDO?</Text>
        <Text style={styles.subtitle}>
          Iniciando protocolo de escalada. Escolha como deseja prosseguir.
        </Text>

        {/* Card diagnóstico final */}
        <View style={styles.diagnosisCard}>
          <View style={styles.diagnosisHeader}>
            <MaterialIcons name="warning" size={18} color={colors.error} />
            <Text style={styles.diagnosisLabel}>DIAGNÓSTICO FINAL</Text>
          </View>
          <Text style={styles.diagnosisText}>{diagnosis}</Text>
        </View>

        {/* Botão principal: chamar agora */}
        <Button
          onPress={handleCall}
          title="CHAMAR AGORA"
          variant="primary"
          style={styles.callButton}
        />

        {/* Destinos recomendados */}
        <Text style={styles.sectionTitle}>DESTINOS RECOMENDADOS</Text>

        {DESTINATIONS.map((dest) => (
          <View key={dest.id} style={styles.destinationCard}>
            <View style={styles.destinationIcon}>
              <MaterialIcons name={dest.icon} size={22} color={colors.onSurfaceVariant} />
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>{dest.name}</Text>
              <Text style={styles.destinationSpecialty}>{dest.specialty}</Text>
            </View>
            <View style={styles.destinationPrice}>
              <Text style={styles.destinationPriceValue}>{dest.price}</Text>
              {dest.priceNote ? (
                <Text style={styles.destinationPriceNote}>{dest.priceNote}</Text>
              ) : null}
              {dest.distance ? (
                <Text style={styles.destinationDistance}>{dest.distance}</Text>
              ) : null}
            </View>
          </View>
        ))}

        {/* Nota de localização */}
        <View style={styles.locationNote}>
          <MaterialIcons name="location-on" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.locationNoteText}>
            Localizando veículos próximos...
          </Text>
        </View>
      </ScrollView>

      {/* Botão voltar */}
      <View style={styles.footer}>
        <Button
          onPress={() => router.replace("/(tabs)/")}
          title="VOLTAR PARA HOME"
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 32,
    color: colors.onSurface,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  diagnosisCard: {
    backgroundColor: `${colors.error}1A`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.error}33`,
  },
  diagnosisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  diagnosisLabel: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.error,
    letterSpacing: 1.5,
  },
  diagnosisText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  callButton: {
    width: "100%",
  },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  destinationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.outlineVariant}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: { flex: 1 },
  destinationName: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onSurface,
  },
  destinationSpecialty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  destinationPrice: { alignItems: "flex-end" },
  destinationPriceValue: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.onSurface,
  },
  destinationPriceNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  destinationDistance: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
  },
  locationNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
  },
  locationNoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}1A`,
  },
});
