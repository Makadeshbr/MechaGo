import React, { useMemo, useState } from "react";
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
import { useDiagnosisServiceRequest, useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { uploadFile } from "@/lib/upload";

const diagnosisFormSchema = z.object({
  diagnosisNotes: z
    .string()
    .trim()
    .min(10, "Descreva o diagnóstico com pelo menos 10 caracteres"),
  canResolveOnSite: z.boolean(),
});

type DiagnosisFormValues = z.infer<typeof diagnosisFormSchema>;

async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as { response: Response }).response;
      if (response.status === 401) {
        return "Sessão expirada. Faça login novamente para continuar.";
      }
      const body = await response.json();
      return body?.error?.message ?? body?.userMessage ?? "Não foi possível salvar o diagnóstico.";
    }
  } catch {
    return "Erro de conexão com o servidor. Verifique sua internet.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado ao salvar o diagnóstico.";
}

export default function DiagnosisScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { data: request, isLoading } = useServiceRequest(requestId as string);
  const diagnosisMutation = useDiagnosisServiceRequest();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisFormSchema),
    defaultValues: {
      diagnosisNotes: "",
      canResolveOnSite: true,
    },
    mode: "onChange",
  });

  const canResolveOnSite = watch("canResolveOnSite");

  const problemLabel = useMemo(() => {
    switch (request?.problemType) {
      case "battery":
        return "Bateria";
      case "tire":
        return "Pneu";
      case "electric":
        return "Elétrica";
      case "overheat":
        return "Superaquecimento";
      case "fuel":
        return "Combustível";
      default:
        return "Outro problema";
    }
  }, [request?.problemType]);

  async function chooseImage(mode: "camera" | "library") {
    const permissionResponse =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResponse.status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        mode === "camera"
          ? "Precisamos da câmera para registrar o diagnóstico."
          : "Precisamos acessar sua galeria para anexar a foto.",
      );
      return;
    }

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
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
      Alert.alert("Foto obrigatória", "O MechaGo exige a foto do diagnóstico para continuar.");
      return;
    }

    try {
      setIsUploading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const fileName = `diagnosis_${requestId}_${Date.now()}.jpg`;
      const diagnosisPhotoUrl = await uploadFile(
        imageUri,
        fileName,
        "image/jpeg",
        "diagnosis",
      );

      await diagnosisMutation.mutateAsync({
        requestId: requestId as string,
        diagnosisNotes: values.diagnosisNotes,
        diagnosisPhotoUrl,
        canResolveOnSite: values.canResolveOnSite,
      });

      if (values.canResolveOnSite) {
        router.replace(`/(service-flow)/service-resolved?requestId=${requestId}` as never);
        return;
      }

      router.replace(`/(service-flow)/escalation?requestId=${requestId}` as never);
    } catch (error) {
      Alert.alert("Erro", await extractErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  });

  if (isLoading || !request) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
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

          <View style={styles.statusCard}>
            <View style={styles.statusBadge}>
              <MaterialIcons color={colors.onPrimary} name="location-on" size={20} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusEyebrow}>Status atual</Text>
              <Text style={styles.statusTitle}>Você está no local</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Informações do chamado</Text>
            <View style={styles.infoRow}>
              <MaterialIcons color={colors.primaryContainerSolid} name="directions-car" size={20} />
              <View style={styles.infoTextBlock}>
                <Text style={styles.infoKey}>Problema relatado</Text>
                <Text style={styles.infoValue}>{problemLabel}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons color={colors.primaryContainerSolid} name="place" size={20} />
              <View style={styles.infoTextBlock}>
                <Text style={styles.infoKey}>Endereço</Text>
                <Text style={styles.infoValue}>{request.address ?? "Localização compartilhada"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Resultado do diagnóstico</Text>
            <Controller
              control={control}
              name="diagnosisNotes"
              render={({ field: { onBlur, onChange, value } }) => (
                <>
                  <TextInput
                    accessibilityLabel="Descrição do diagnóstico técnico"
                    multiline
                    numberOfLines={5}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Descreva aqui a falha técnica encontrada após a análise física..."
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

            <Text style={styles.sectionTitle}>Foto do problema</Text>
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
                  accessibilityLabel="Tirar foto do diagnóstico"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("camera")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="photo-camera" size={28} />
                  <Text style={styles.photoButtonText}>Tirar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Selecionar foto da galeria"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("library")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="photo-library" size={28} />
                  <Text style={styles.photoButtonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.toggleCard}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Resolve no local?</Text>
                <Text style={styles.toggleSubtitle}>Escolha o próximo passo do atendimento</Text>
              </View>
              <View style={styles.toggleActions}>
                <TouchableOpacity
                  accessibilityLabel="Não resolve no local"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !canResolveOnSite }}
                  onPress={() => setValue("canResolveOnSite", false, { shouldValidate: true })}
                  style={[
                    styles.toggleOption,
                    !canResolveOnSite && styles.toggleOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleOptionText,
                      !canResolveOnSite && styles.toggleOptionTextActive,
                    ]}
                  >
                    Não
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Resolve no local"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: canResolveOnSite }}
                  onPress={() => setValue("canResolveOnSite", true, { shouldValidate: true })}
                  style={[
                    styles.toggleOption,
                    canResolveOnSite && styles.toggleOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleOptionText,
                      canResolveOnSite && styles.toggleOptionTextActive,
                    ]}
                  >
                    Sim
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            accessibilityLabel="Enviar diagnóstico"
            accessibilityRole="button"
            disabled={isUploading || diagnosisMutation.isPending}
            onPress={() => void onSubmit()}
            style={[
              styles.primaryAction,
              !canResolveOnSite && styles.primaryActionDanger,
              (isUploading || diagnosisMutation.isPending) && styles.primaryActionDisabled,
            ]}
          >
            {isUploading || diagnosisMutation.isPending ? (
              <ActivityIndicator color={canResolveOnSite ? colors.onSuccessContainer : colors.onError} />
            ) : (
              <>
                <MaterialIcons
                  color={canResolveOnSite ? colors.onSuccessContainer : colors.onError}
                  name={canResolveOnSite ? "check-circle" : "report"}
                  size={20}
                />
                <Text
                  style={[
                    styles.primaryActionText,
                    canResolveOnSite
                      ? styles.primaryActionTextSuccess
                      : styles.primaryActionTextDanger,
                  ]}
                >
                  {canResolveOnSite ? "Resolvido no local" : "Enviar diagnóstico e escalar"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
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
    letterSpacing: -0.5,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryBright,
    padding: spacing.xl,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: `${colors.onPrimary}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: {
    flex: 1,
  },
  statusEyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: `${colors.onPrimary}99`,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  statusTitle: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.onPrimary,
    marginTop: spacing.xs,
  },
  infoCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  infoTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  infoKey: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  infoValue: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.onSurface,
  },
  formCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
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
  photoActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
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
  previewImage: {
    width: "100%",
    height: 220,
  },
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
  toggleCard: {
    borderRadius: radii.lg,
    backgroundColor: `${colors.surfaceContainerHigh}CC`,
    padding: spacing.lg,
    gap: spacing.md,
  },
  toggleCopy: {
    gap: spacing.xs,
  },
  toggleTitle: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  toggleSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  toggleActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOptionActive: {
    backgroundColor: colors.primaryContainerSolid,
  },
  toggleOptionText: {
    fontFamily: fonts.headline,
    fontSize: 13,
    color: colors.onSurface,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  toggleOptionTextActive: {
    color: colors.onPrimary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.successContainer,
  },
  primaryActionDanger: {
    backgroundColor: colors.error,
  },
  primaryActionDisabled: {
    opacity: 0.6,
  },
  primaryActionText: {
    fontFamily: fonts.headline,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  primaryActionTextSuccess: {
    color: colors.onSuccessContainer,
  },
  primaryActionTextDanger: {
    color: colors.onError,
  },
});
