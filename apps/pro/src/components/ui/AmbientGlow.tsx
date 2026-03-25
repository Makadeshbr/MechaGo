import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

// Efeito "Kinetic Noir" do Design System — luz ambiente amarela difusa nos cantos
// Replica o efeito CSS: bg-primary/5 blur-[120px] do design Stitch
// Usa RadialGradient SVG para simular gaussian blur (RN não tem blur nativo em Views)
export function AmbientGlow() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Glow superior direito */}
      <View style={[styles.glow, styles.topRight]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glowTop" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FDD404" stopOpacity="0.07" />
              <Stop offset="40%" stopColor="#FDD404" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#FDD404" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowTop)" />
        </Svg>
      </View>
      {/* Glow inferior esquerdo */}
      <View style={[styles.glow, styles.bottomLeft]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glowBottom" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FDD404" stopOpacity="0.05" />
              <Stop offset="35%" stopColor="#FDD404" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#FDD404" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowBottom)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: "hidden",
  },
  glow: { position: "absolute" },
  topRight: { top: -150, right: -150, width: 500, height: 500 },
  bottomLeft: { bottom: -120, left: -120, width: 400, height: 400 },
});
