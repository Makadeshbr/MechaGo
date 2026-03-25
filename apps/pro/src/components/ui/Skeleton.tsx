import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, type DimensionValue, type ViewStyle } from "react-native";
import { colors, borderRadius } from "@mechago/shared";

interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  style?: ViewStyle;
}

/**
 * Skeleton loading placeholder com animação de pulso.
 * Usado em cards enquanto dados da API carregam.
 */
export function Skeleton({ width = "100%", height, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, opacity } as Animated.WithAnimatedValue<ViewStyle>,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.outline,
    borderRadius: borderRadius.md,
  },
});
