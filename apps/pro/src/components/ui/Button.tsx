import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { colors, spacing, borderRadius } from "@mechago/shared";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "error";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

// Botão seguindo DS V4 Kinetic Noir
// Primary: fundo amarelo (#FDD404), texto preto, uppercase, bold
// Outline: fundo transparente, borda amarela 20% opacity, texto amarelo
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";
  const isError = variant === "error";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : isError ? styles.error : styles.outline,
        pressed && !isDisabled && { opacity: 0.7, transform: [{ scale: 0.97 }] },
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isError ? "#000000" : colors.primary}
        />
      ) : (
        <Text style={[styles.text, variant === "outline" && styles.textOutline]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  error: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(253, 212, 4, 0.2)",
  },
  disabled: { opacity: 0.5 },
  text: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  textOutline: { color: colors.primary },
});
