import React from "react";
import { Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "@mechago/shared";

interface LogoPinProps {
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

// Logo MechaGo em texto estilizado — Space Grotesk bold italic amarelo
// Segue o padrão visual do design Stitch (tipografia como logo)
export function LogoPin({ size = "md", style }: LogoPinProps) {
  const fontSize = size === "sm" ? 20 : size === "md" ? 28 : 40;

  return (
    <Text
      style={[
        styles.logo,
        { fontSize },
        style,
      ]}
      accessibilityRole="header"
    >
      MECHAGO
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.primary,
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
});
