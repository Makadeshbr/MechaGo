import React from "react";
import {
  Dimensions,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { borderRadius, colors, fonts, spacing } from "@mechago/shared";
import { Button } from "./Button";

interface MechaGoModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "danger" | "success";
  loading?: boolean;
  hideCancel?: boolean;
}

const { width } = Dimensions.get("window");

export function MechaGoModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "CONFIRMAR",
  cancelText = "CANCELAR",
  type = "info",
  loading = false,
  hideCancel = false,
}: MechaGoModalProps) {
  const iconName =
    type === "danger"
      ? "report"
      : type === "success"
        ? "check-circle"
        : "info";

  const accentColor =
    type === "danger"
      ? colors.error
      : type === "success"
        ? colors.successContainer
        : colors.primaryContainerSolid;

  const accentTextColor =
    type === "danger"
      ? colors.onErrorContainer
      : type === "success"
        ? colors.onSuccessContainer
        : colors.onPrimary;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>MechaGo</Text>
            <Pressable
              accessibilityLabel="Fechar modal"
              accessibilityRole="button"
              disabled={loading}
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialIcons color={colors.onSurfaceVariant} name="close" size={18} />
            </Pressable>
          </View>

          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}1F` }]}> 
            <MaterialIcons color={accentTextColor} name={iconName} size={30} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.footer}>
            <Button
              title={confirmText}
              onPress={onConfirm}
              loading={loading}
              variant={type === "danger" ? "error" : "primary"}
              style={styles.confirmButton}
            />

            {!hideCancel ? (
              <Pressable
                onPress={onClose}
                style={styles.cancelButton}
                hitSlop={8}
                disabled={loading}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${colors.surfaceLowest}D9`,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: width - spacing.xl * 2,
    backgroundColor: `${colors.surfaceVariant}CC`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.primaryContainerSolid,
    textTransform: "uppercase",
    letterSpacing: 1.8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.surfaceContainerHigh}CC`,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.6,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  footer: {
    width: "100%",
    gap: spacing.md,
  },
  confirmButton: {
    width: "100%",
  },
  cancelButton: {
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
