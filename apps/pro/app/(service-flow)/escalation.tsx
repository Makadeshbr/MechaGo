import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts, radii, spacing } from "@mechago/shared";
import { useEscalateServiceRequest, useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { uploadFile } from "@/lib/upload";

const destinationOptions = [
  {
    id: "parts",
    label: "Peças indisponíveis no momento",
    icon: "build",
  },
  {
    id: "complex",
    label: "Problema requer maquinário de oficina",
    icon: "build-circle",
  },
  {
    id: "equipment",
    label: "Equipamento inadequado para este caso",
    icon: "construction",
  },
  {
    id: "other",
    label: "Sem sugestão de destino",
    icon: "block",
  },
] as const;

const escalationFormSchema = z.object({
  diagnosisNotes: z
    .string()
    .trim()
    .min(10, "Descreva o motivo da impossibilidade de reparo no local"),
  escalationReason: z
    .string()
    .trim()
    .min(1, "Selecione um motivo principal para a escalação"),
  needsTow: z.boolean(),
});

type EscalationFormValues = z.infer<typeof escalationFormSchema>;

async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as { response: Response }).response;
      const body = await response.json();
      return body?.error?.message ?? body?.userMessage ?? "Não foi possível escalar o caso.";
    }
  } catch {
    return "Não foi possível escalar o caso.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível escalar o caso.";
}

export default function EscalationScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { data: request, isLoading } = useServiceRequest(requestId as string);
  const escalateMutation = useEscalateServiceRequest();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EscalationFormValues>({
    resolver: zodResolver(escalationFormSchema),
    defaultValues: {
      diagnosisNotes: "",
      escalationReason: "",
      needsTow: false,
    },
    mode: "onChange",
  });

  const selectedReason = watch("escalationReason");
  const needsTow = watch("needsTow");

  async function chooseImage(mode: "camera" | "library") {
    const permissionResponse =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResponse.status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        mode === "camera"
          ? "Precisamos da câmera para registrar a evidência do defeito."
          : "Precisamos acessar sua galeria para anexar a evidência do defeito.",
      );
      return;
    }

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!imageUri) {
      Alert.alert("Registro visual obrigatório", "Anexe a foto do defeito antes de escalar o caso.");
      return;
    }

    try {
      setIsUploading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const fileName = `escalation_${requestId}_${Date.now()}.jpg`;
      const photoUrl = await uploadFile(
        imageUri,
        fileName,
        "image/jpeg",
        "diagnosis",
      );

      await escalateMutation.mutateAsync({
        requestId: requestId as string,
        escalationReason: values.escalationReason,
        needsTow: values.needsTow,
        photoUrl,
        diagnosisNotes: values.diagnosisNotes,
      });

      Alert.alert(
        "Caso escalado",
        "O cliente foi notificado e poderá seguir com guincho ou oficina especializada.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error) {
      Alert.alert("Erro", await extractErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  });

  if (isLoading || !request) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardArea}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <TouchableOpacity
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <MaterialIcons color={colors.primaryContainerSolid} name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.brandTitle}>MechaGo PRO</Text>
          </View>

          <View style={styles.warningCard}>
            <MaterialIcons color={colors.onErrorContainer} name="report" size={26} />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>Não foi possível resolver</Text>
              <Text style={styles.warningSubtitle}>
                Você recebe a taxa de diagnóstico normalmente. O caso seguirá para oficina ou guincho.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Diagnóstico detalhado</Text>
            <Controller
              control={control}
              name="diagnosisNotes"
              render={({ field: { onBlur, onChange, value } }) => (
                <>
                  <TextInput
                    accessibilityLabel="Diagnóstico detalhado"
                    multiline
                    numberOfLines={5}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Descreva o motivo da impossibilidade de reparo no local..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={styles.notesInput}
                    textAlignVertical="top"
                    value={value}
                  />
                  {errors.diagnosisNotes ? (
                    <Text style={styles.errorText}>{errors.diagnosisNotes.message}</Text>
                  ) : null}
                </>
              )}
            />

            <Text style={styles.sectionTitle}>Registro visual</Text>
            {imageUri ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  accessibilityLabel="Remover foto selecionada"
                  accessibilityRole="button"
                  onPress={() => setImageUri(null)}
                  style={styles.removePhotoButton}
                >
                  <MaterialIcons color={colors.onSurface} name="close" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  accessibilityLabel="Tirar foto do defeito"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("camera")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="add-a-photo" size={28} />
                  <Text style={styles.photoButtonText}>Foto do defeito</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Selecionar foto do defeito na galeria"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("library")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="photo-library" size={28} />
                  <Text style={styles.photoButtonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionTitle}>Motivo principal</Text>
            <View style={styles.reasonList}>
              {destinationOptions.map((option) => {
                const isSelected = selectedReason === option.label;

                return (
                  <TouchableOpacity
                    key={option.id}
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setValue("escalationReason", option.label, { shouldValidate: true })}
                    style={[
                      styles.reasonCard,
                      isSelected && styles.reasonCardSelected,
                    ]}
                  >
                    <View style={styles.reasonCardContent}>
                      <View
                        style={[
                          styles.reasonIconWrap,
                          isSelected && styles.reasonIconWrapSelected,
                        ]}
                      >
                          <MaterialIcons
                            color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                          name={option.icon as keyof typeof MaterialIcons.glyphMap}
                          size={22}
                        />
                      </View>
                      <Text
                        style={[
                          styles.reasonText,
                          isSelected && styles.reasonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    <MaterialIcons
                      color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                      name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                      size={20}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.escalationReason ? (
              <Text style={styles.errorText}>{errors.escalationReason.message}</Text>
            ) : null}

            <View style={styles.towCard}>
              <View style={styles.towCopy}>
                <Text style={styles.towTitle}>Solicitar guincho</Text>
                <Text style={styles.towSubtitle}>Ative apenas se o veículo realmente precisar de remoção</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Solicitar guincho"
                accessibilityRole="switch"
                accessibilityState={{ checked: needsTow }}
                onPress={() => setValue("needsTow", !needsTow)}
                style={[styles.switchTrack, needsTow && styles.switchTrackActive]}
              >
                <View style={[styles.switchThumb, needsTow && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            accessibilityLabel="Enviar diagnóstico e escalar"
            accessibilityRole="button"
            disabled={isUploading || escalateMutation.isPending}
            onPress={() => void onSubmit()}
            style={[
              styles.primaryAction,
              (isUploading || escalateMutation.isPending) && styles.primaryActionDisabled,
            ]}
          >
            {isUploading || escalateMutation.isPending ? (
              <ActivityIndicator color={colors.onError} />
            ) : (
              <>
                <MaterialIcons color={colors.onError} name="local-shipping" size={20} />
                <Text style={styles.primaryActionText}>Enviar diagnóstico e escalar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerHigh,
  },
  brandTitle: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.primaryContainerSolid,
    textTransform: "uppercase",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.errorContainer,
    padding: spacing.xl,
  },
  warningCopy: { flex: 1 },
  warningTitle: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.onErrorContainer,
    textTransform: "uppercase",
  },
  warningSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    color: `${colors.onErrorContainer}CC`,
  },
  formCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 12,
    color: colors.primaryContainerSolid,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLowest,
    padding: spacing.lg,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  errorText: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
  },
  photoActionsRow: { flexDirection: "row", gap: spacing.md },
  photoButton: {
    flex: 1,
    minHeight: 124,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  photoButtonText: {
    fontFamily: fonts.headline,
    fontSize: 12,
    color: colors.onSurface,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  previewCard: {
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLowest,
    minHeight: 220,
  },
  previewImage: { width: "100%", height: 220 },
  removePhotoButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: `${colors.surfaceContainerHighest}D9`,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonList: { gap: spacing.md },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
  },
  reasonCardSelected: {
    backgroundColor: colors.primaryContainerSolid,
  },
  reasonCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reasonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonIconWrapSelected: {
    backgroundColor: `${colors.onPrimary}14`,
  },
  reasonText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
  },
  reasonTextSelected: {
    color: colors.onPrimary,
    fontFamily: fonts.headline,
  },
  towCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerHigh,
    padding: spacing.lg,
  },
  towCopy: { flex: 1 },
  towTitle: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.onSurface,
    textTransform: "uppercase",
  },
  towSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceLowest,
    padding: 3,
  },
  switchTrackActive: {
    backgroundColor: colors.primaryContainerSolid,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.onSurfaceVariant,
  },
  switchThumbActive: {
    backgroundColor: colors.onPrimary,
    transform: [{ translateX: 20 }],
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionDisabled: { opacity: 0.6 },
  primaryActionText: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onError,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
});
