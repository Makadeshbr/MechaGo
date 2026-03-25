import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { colors, spacing, borderRadius } from "@mechago/shared";

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
}: MechaGoModalProps) {
  const iconName = 
    type === "danger" ? "alert-circle" : 
    type === "success" ? "checkmark-circle" : 
    "information-circle";
  
  const iconColor = 
    type === "danger" ? colors.error : 
    type === "success" ? "#4CAF50" : 
    colors.primary;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
              <Ionicons name={iconName} size={32} color={iconColor} />
            </View>
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
            
            <Pressable 
              onPress={onClose} 
              style={styles.cancelButton}
              hitSlop={8}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: width - spacing.xl * 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
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
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
