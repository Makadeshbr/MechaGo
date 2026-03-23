import React from "react";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateVehicle } from "@/hooks/queries/useVehicles";
import { Input, Button, LogoPin } from "@/components/ui";
import {
  colors,
  spacing,
  borderRadius,
  createVehicleFormSchema,
  type VehicleType,
  type CreateVehicleFormInput,
  type CreateVehicleFormOutput,
} from "@mechago/shared";

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: string }[] = [
  { type: "car", label: "Carro", icon: "car-outline" },
  { type: "moto", label: "Moto", icon: "bicycle-outline" },
  { type: "suv", label: "SUV/Picape", icon: "car-sport-outline" },
  { type: "truck", label: "Caminhão", icon: "bus-outline" },
];

export default function RegisterVehicleScreen() {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateVehicleFormInput>({
    resolver: zodResolver(createVehicleFormSchema),
    defaultValues: {
      type: "car",
      brand: "",
      model: "",
      year: "",
      plate: "",
    },
  });

  const createVehicle = useCreateVehicle();

  function onSubmit(data: CreateVehicleFormOutput) {
    createVehicle.mutate(
      {
        type: data.type,
        brand: data.brand,
        model: data.model,
        year: data.year,
        plate: data.plate,
      },
      {
        onSuccess: () => {
          router.replace("/(tabs)");
        },
        onError: (error) => {
          setError("root", {
            message:
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

          {errors.root && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>
                {errors.root.message}
              </Text>
            </View>
          )}

          {/* Tipo de veículo — grid 2x2 com Controller */}
          <Text style={styles.sectionLabel}>TIPO DE VEÍCULO</Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.typeGrid} accessibilityRole="radiogroup">
                {VEHICLE_TYPES.map(({ type, label, icon }) => {
                  const isSelected = value === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => onChange(type)}
                      style={({ pressed }) => [
                        styles.typeCard,
                        isSelected && styles.typeCardSelected,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityLabel={`Tipo: ${label}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={28}
                        color={isSelected ? colors.background : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          isSelected && styles.typeLabelSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />

          {/* Campos do formulário */}
          <Controller
            control={control}
            name="brand"
            render={({ field: { onChange, value } }) => (
              <Input
                label="MARCA"
                placeholder="Ex: Honda"
                value={value}
                onChangeText={onChange}
                error={errors.brand?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="model"
            render={({ field: { onChange, value } }) => (
              <Input
                label="MODELO"
                placeholder="Ex: Civic"
                value={value}
                onChangeText={onChange}
                error={errors.model?.message}
              />
            )}
          />

          {/* Ano + Placa lado a lado */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Controller
                control={control}
                name="year"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="ANO"
                    placeholder="2024"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    maxLength={4}
                    error={errors.year?.message}
                  />
                )}
              />
            </View>
            <View style={styles.halfField}>
              <Controller
                control={control}
                name="plate"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="PLACA"
                    placeholder="ABC-1D23"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="characters"
                    maxLength={8}
                    error={errors.plate?.message}
                  />
                )}
              />
            </View>
          </View>

          <Button
            title="SALVAR VEÍCULO"
            onPress={handleSubmit(onSubmit)}
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
    color: colors.background,
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
