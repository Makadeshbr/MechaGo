import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { nav } from "@/lib/navigation";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts, radii, spacing } from "@mechago/shared";
import { useResolveServiceRequest, useServiceRequest } from "@/hooks/queries/useServiceRequest";
import { MechaGoModal } from "@/components/ui";
import { uploadFile } from "@/lib/upload";

const resolvedFormSchema = z.object({
  finalPrice: z
    .string()
    .trim()
    .min(1, "Informe o valor do serviço")
    .refine((value) => !Number.isNaN(Number(value.replace(",", "."))), {
      message: "Informe um valor válido",
    }),
  priceJustification: z.string().trim().optional(),
});

type ResolvedFormValues = z.infer<typeof resolvedFormSchema>;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as { response: Response }).response;
      const body = await response.json();
      return body?.error?.message ?? body?.userMessage ?? "Não foi possível finalizar o serviço.";
    }
  } catch {
    return "Não foi possível finalizar o serviço.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível finalizar o serviço.";
}

interface ModalState {
  visible: boolean;
  title: string;
  description: string;
  type: "info" | "danger" | "success";
  onConfirm?: () => void;
}

export default function ServiceResolvedScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { data: request, isLoading } = useServiceRequest(requestId as string);
  const resolveMutation = useResolveServiceRequest();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    description: "",
    type: "info",
  });

  const closeModal = useCallback(() => {
    setModal((m) => ({ ...m, visible: false }));
  }, []);

  const showModal = useCallback(
    (title: string, description: string, type: ModalState["type"] = "info", onConfirm?: () => void) => {
      setModal({ visible: true, title, description, type, onConfirm });
    },
    [],
  );

  const handleModalConfirm = useCallback(() => {
    const callback = modal.onConfirm;
    closeModal();
    callback?.();
  }, [modal.onConfirm, closeModal]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResolvedFormValues>({
    resolver: zodResolver(resolvedFormSchema),
    defaultValues: {
      finalPrice: "",
      priceJustification: "",
    },
    mode: "onChange",
  });

  const estimatedPrice = request?.estimatedPrice ?? 0;
  const finalPriceInput = watch("finalPrice");
  const parsedFinalPrice = Number(finalPriceInput?.replace(",", "."));
  const isPriceValid = finalPriceInput ? !Number.isNaN(parsedFinalPrice) : false;
  const priceRange = useMemo(() => {
    const margin = estimatedPrice * 0.25;
    return {
      min: estimatedPrice - margin,
      max: estimatedPrice + margin,
    };
  }, [estimatedPrice]);
  const isOutOfRange = isPriceValid
    ? parsedFinalPrice < priceRange.min || parsedFinalPrice > priceRange.max
    : false;

  async function chooseImage(mode: "camera" | "library") {
    const permissionResponse =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResponse.status !== "granted") {
      showModal(
        "Permissão necessária",
        mode === "camera"
          ? "Precisamos da câmera para registrar o serviço concluído."
          : "Precisamos acessar sua galeria para anexar a foto do serviço.",
        "danger",
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
      showModal("Foto obrigatória", "Envie a foto do serviço concluído para continuar.", "danger");
      return;
    }

    const finalPrice = Number(values.finalPrice.replace(",", "."));

    if (isOutOfRange && (!values.priceJustification || values.priceJustification.trim().length < 10)) {
      showModal(
        "Justificativa necessária",
        "Explique o motivo do desvio maior que 25% em pelo menos 10 caracteres.",
        "danger",
      );
      return;
    }

    try {
      setIsUploading(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const fileName = `completion_${requestId}_${Date.now()}.jpg`;
      const completionPhotoUrl = await uploadFile(
        imageUri,
        fileName,
        "image/jpeg",
        "completion",
      );

      await resolveMutation.mutateAsync({
        requestId: requestId as string,
        finalPrice,
        completionPhotoUrl,
        priceJustification: values.priceJustification?.trim() || undefined,
      });

      const clientUserId = request?.clientId ?? "";
      showModal(
        "Sucesso",
        "Serviço enviado para aprovação do cliente.",
        "success",
        () => nav.toServiceCompleted({ requestId: requestId as string, clientUserId }),
      );
    } catch (error) {
      showModal("Erro", await extractErrorMessage(error), "danger");
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
      <MechaGoModal
        visible={modal.visible}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText="ENTENDI"
        hideCancel
        onClose={closeModal}
        onConfirm={handleModalConfirm}
      />
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

          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <MaterialIcons color={colors.onSuccessContainer} name="check-circle" size={30} />
            </View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>Serviço resolvido</Text>
              <Text style={styles.successSubtitle}>Finalize e envie para aprovação do cliente</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Estimativa inicial</Text>
            <Text style={styles.summaryValue}>{formatCurrency(estimatedPrice)}</Text>
            <Text style={styles.rangeHint}>
              Margem sugerida ±25% ({formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)})
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Valor do serviço</Text>
            <Controller
              control={control}
              name="finalPrice"
              render={({ field: { onBlur, onChange, value } }) => (
                <>
                  <View style={[styles.priceField, isOutOfRange && styles.priceFieldAlert]}>
                    <Text style={styles.currencyPrefix}>R$</Text>
                    <TextInput
                      accessibilityLabel="Valor final do serviço"
                      keyboardType="decimal-pad"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="95,00"
                      placeholderTextColor={colors.onSurfaceVariant}
                      style={styles.priceInput}
                      value={value}
                    />
                  </View>
                  {errors.finalPrice ? (
                    <Text style={styles.errorText}>{errors.finalPrice.message}</Text>
                  ) : null}
                </>
              )}
            />

            {isOutOfRange ? (
              <View style={styles.warningCard}>
                <MaterialIcons color={colors.error} name="warning" size={20} />
                <Text style={styles.warningText}>
                  O valor excede a margem permitida. A justificativa passa a ser obrigatória.
                </Text>
              </View>
            ) : null}

            {isOutOfRange ? (
              <Controller
                control={control}
                name="priceJustification"
                render={({ field: { onBlur, onChange, value } }) => (
                  <>
                    <Text style={styles.sectionTitle}>Justificativa do desvio</Text>
                    <TextInput
                      accessibilityLabel="Justificativa do desvio de preço"
                      multiline
                      numberOfLines={4}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Explique por que o valor ficou acima ou abaixo da faixa prevista..."
                      placeholderTextColor={colors.onSurfaceVariant}
                      style={styles.notesInput}
                      textAlignVertical="top"
                      value={value}
                    />
                  </>
                )}
              />
            ) : null}

            <Text style={styles.sectionTitle}>Foto do serviço</Text>
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
                  accessibilityLabel="Tirar foto do serviço concluído"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("camera")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="photo-camera" size={28} />
                  <Text style={styles.photoButtonText}>Tirar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Selecionar foto do serviço concluído na galeria"
                  accessibilityRole="button"
                  onPress={() => void chooseImage("library")}
                  style={styles.photoButton}
                >
                  <MaterialIcons color={colors.primaryContainerSolid} name="photo-library" size={28} />
                  <Text style={styles.photoButtonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            accessibilityLabel="Enviar para aprovação do cliente"
            accessibilityRole="button"
            disabled={isUploading || resolveMutation.isPending}
            onPress={() => void onSubmit()}
            style={[
              styles.primaryAction,
              (isUploading || resolveMutation.isPending) && styles.primaryActionDisabled,
            ]}
          >
            {isUploading || resolveMutation.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons color={colors.onPrimary} name="arrow-forward" size={20} />
                <Text style={styles.primaryActionText}>Enviar para aprovação do cliente</Text>
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
    letterSpacing: -0.5,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.xl,
    backgroundColor: colors.successContainer,
  },
  successIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: `${colors.onSuccessContainer}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  successCopy: { flex: 1 },
  successTitle: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.onSuccessContainer,
    textTransform: "uppercase",
  },
  successSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    color: `${colors.onSuccessContainer}CC`,
  },
  summaryCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  summaryValue: {
    fontFamily: fonts.headline,
    fontSize: 34,
    color: colors.onSurface,
  },
  rangeHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
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
  priceField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.xl,
  },
  priceFieldAlert: {
    borderWidth: 1,
    borderColor: `${colors.error}66`,
  },
  currencyPrefix: {
    fontFamily: fonts.headline,
    fontSize: 24,
    color: colors.primaryBright,
    marginRight: spacing.sm,
  },
  priceInput: {
    flex: 1,
    fontFamily: fonts.headline,
    fontSize: 28,
    color: colors.onSurface,
  },
  errorText: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: `${colors.errorContainer}22`,
    padding: spacing.md,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onErrorContainer,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLowest,
    padding: spacing.lg,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
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
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainerSolid,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionDisabled: { opacity: 0.6 },
  primaryActionText: {
    fontFamily: fonts.headline,
    fontSize: 14,
    color: colors.onPrimary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
});
