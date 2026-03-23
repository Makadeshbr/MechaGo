// Design tokens do MechaGo DS V4
// Importar sempre deste arquivo — NUNCA usar cores hardcoded

export const colors = {
  primary: "#FDD404",
  primaryDark: "#D4B200",
  bg: "#0A0A0A",
  background: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceLight: "#2A2A2A",
  surfaceLow: "#141414",
  outline: "#333333",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  error: "#FF4444",
  success: "#00C853",
  warning: "#FF9800",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
