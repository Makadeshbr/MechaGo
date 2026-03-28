// Design tokens do MechaGo DS V4
// Importar sempre deste arquivo — NUNCA usar cores hardcoded

export const colors = {
  primary: "#FDD404",
  primaryBright: "#FFE484",
  primaryDark: "#D4B200",
  primaryContainer: "rgba(253, 212, 4, 0.1)",
  primaryContainerSolid: "#FDD404",
  onPrimary: "#0A0A0A",
  onPrimaryContainer: "#594A00",
  bg: "#0A0A0A",
  background: "#0A0A0A",
  surfaceLowest: "#000000",
  surfaceContainerLow: "#131313",
  surfaceContainer: "#1A1919",
  surfaceContainerHigh: "#201F1F",
  surfaceContainerHighest: "#262626",
  surfaceVariant: "#262626",
  surface: "#1A1A1A",
  surfaceLight: "#2A2A2A",
  surfaceHigh: "#2A2A2A",
  surfaceLow: "#141414",
  onSurface: "#FFFFFF",
  onSurfaceVariant: "#A0A0A0",
  outline: "#333333",
  outlineVariant: "#494847",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  error: "#FF4444",
  errorContainer: "#B92902",
  onError: "#FFFFFF",
  onErrorContainer: "#FFD2C8",
  success: "#00C853",
  successContainer: "#DFF66E",
  onSuccessContainer: "#4F5D00",
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
  xxl: 32,
  full: 9999,
} as const;

// Alias para compatibilidade — preferir borderRadius em código novo
export const radii = borderRadius;

// Fontes reais carregadas nos apps (Plus Jakarta Sans, Space Grotesk, JetBrains Mono)
export const fontBody = "PlusJakartaSans_400Regular";
export const fontHeadline = "SpaceGrotesk_700Bold";
export const fontMono = "JetBrainsMono_400Regular";

export const fonts = {
  body: fontBody,
  headline: fontHeadline,
  mono: fontMono,
} as const;
