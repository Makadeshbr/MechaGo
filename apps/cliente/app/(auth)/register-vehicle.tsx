import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreateVehicle } from "@/hooks/queries/useVehicles";
import { Input, Button, LogoPin } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

type VehicleType = "car" | "moto" | "suv" | "truck";

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: string }[] = [
  { type: "car", label: "Carro", icon: "car-outline" },
  { type: "moto", label: "Moto", icon: "bicycle-outline" },
  { type: "suv", label: "SUV/Picape", icon: "car-sport-outline" },
  { type: "truck", label: "Caminhão", icon: "bus-outline" },
];

export default function RegisterVehicleScreen() {
  const [selectedType, setSelectedType] = useState<VehicleType>("car");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createVehicle = useCreateVehicle();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!brand.trim()) newErrors.brand = "Marca é obrigatória";
    if (!model.trim()) newErrors.model = "Modelo é obrigatório";

    const yearNum = parseInt(year, 10);
    if (!year || isNaN(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 1) {
      newErrors.year = "Ano inválido";
    }

    // Validação de placa: formato antigo (AAA-1234) ou Mercosul (AAA1A23)
    const plateClean = plate.toUpperCase().trim();
    if (!plateClean || !/^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/.test(plateClean)) {
      newErrors.plate = "Placa inválida (ABC-1234 ou ABC1A23)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    createVehicle.mutate(
      {
        type: selectedType,
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        plate: plate.toUpperCase().trim(),
      },
      {
        onSuccess: () => {
          router.replace("/(tabs)");
        },
        onError: (error) => {
          setErrors({
            form:
              (error as { message?: string }).message ??
              "Erro ao salvar veículo. Tente novamente.",
          });
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
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
          <LogoPin size="sm" />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Adicionar veículo</Text>

          {errors.form && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}

          {/* Tipo de veículo — grid 2x2 */}
          <Text style={styles.sectionLabel}>TIPO DE VEÍCULO</Text>
          <View style={styles.typeGrid}>
            {VEHICLE_TYPES.map(({ type, label, icon }) => (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={({ pressed }) => [
                  styles.typeCard,
                  selectedType === type && styles.typeCardSelected,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityLabel={`Tipo: ${label}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedType === type }}
              >
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={28}
                  color={selectedType === type ? "#000000" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type && styles.typeLabelSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Campos do formulário */}
          <Input
            label="MARCA"
            placeholder="Ex: Honda"
            value={brand}
            onChangeText={setBrand}
            error={errors.brand}
          />

          <Input
            label="MODELO"
            placeholder="Ex: Civic"
            value={model}
            onChangeText={setModel}
            error={errors.model}
          />

          {/* Ano + Placa lado a lado */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="ANO"
                placeholder="2024"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
                error={errors.year}
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="PLACA"
                placeholder="ABC-1D23"
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
                maxLength={8}
                error={errors.plate}
              />
            </View>
          </View>

          <Button
            title="SALVAR VEÍCULO"
            onPress={handleSave}
            loading={createVehicle.isPending}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xxl,
  },
  formError: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formErrorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
  },
  sectionLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  typeCard: {
    width: "48%",
    flexBasis: "47%",
    flexGrow: 1,
    aspectRatio: 1.5,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 100,
  },
  typeCardSelected: {
    backgroundColor: colors.primary,
  },
  typeLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.textSecondary,
  },
  typeLabelSelected: {
    color: "#000000",
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
