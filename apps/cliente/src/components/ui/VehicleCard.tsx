import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@mechago/shared";

interface VehicleCardProps {
  brand: string;
  model: string;
  year: number;
  plate: string;
  type: "car" | "moto" | "suv" | "truck";
  onPress?: () => void;
}

// Ícones por tipo de veículo (Material Icons via @expo/vector-icons)
const vehicleIcons: Record<string, string> = {
  car: "car-outline",
  moto: "bicycle-outline",
  suv: "car-sport-outline",
  truck: "bus-outline",
};

// Card de veículo seguindo o design da Home SOS
// Ícone amarelo circular à esquerda, nome + placa à direita, chevron
export function VehicleCard({
  brand,
  model,
  year,
  plate,
  type,
  onPress,
}: VehicleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && onPress && { opacity: 0.7 },
      ]}
      accessibilityLabel={`${brand} ${model} ${year}, placa ${plate}`}
      accessibilityRole="button"
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={vehicleIcons[type] as keyof typeof Ionicons.glyphMap}
          size={24}
          color="#000000"
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {brand} {model} {year}
        </Text>
        <Text style={styles.plate}>{plate}</Text>
      </View>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: colors.text,
  },
  plate: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
