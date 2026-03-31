import React, { useState, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing, borderRadius } from "@mechago/shared";
import { Button } from "@/components/ui/Button";
import { useCreateReview } from "@/hooks/queries/useReviews";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";

const TAGS = [
  "Rápido",
  "Honesto",
  "Explicou bem",
  "Bom preço",
  "Equipado",
  "Pontual",
] as const;

type Tag = (typeof TAGS)[number];

// Mapa de tag display → valor da API
const TAG_VALUE_MAP: Record<Tag, string> = {
  "Rápido": "rapido",
  "Honesto": "honesto",
  "Explicou bem": "competente",
  "Bom preço": "justo",
  "Equipado": "profissional",
  "Pontual": "pontual",
};

export default function RatingScreen() {
  const { requestId, professionalUserId, professionalName, finalPrice } =
    useLocalSearchParams<{
      requestId: string;
      professionalUserId: string;
      professionalName: string;
      finalPrice: string;
    }>();
  const router = useRouter();
  const { data: request } = useServiceRequest(requestId ?? "");
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");

  const ratingLabels = ["", "Ruim", "Regular", "Bom", "Muito Bom", "Excelente"];
  const activeStar = hoveredStar || rating;

  const handleStarPress = useCallback((star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(star);
  }, []);

  const handleTagToggle = useCallback((tag: Tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || !requestId || !professionalUserId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const tags = Array.from(selectedTags).map(
      (t) => TAG_VALUE_MAP[t as Tag] ?? t,
    );

    await createReview.mutateAsync({
      serviceRequestId: requestId,
      toUserId: professionalUserId,
      rating,
      tags,
      comment: comment.trim() || undefined,
    });

    router.replace({
      pathname: "/(service-flow)/completed",
      params: { requestId, finalPrice },
    });
  }, [rating, requestId, professionalUserId, selectedTags, comment, createReview, router, finalPrice]);

  const professional = request?.professional;
  const displayName = professionalName ?? professional?.name ?? "Profissional";
  const displayPrice = finalPrice
    ? `R$\u00a0${Number(finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>MECHAGO</Text>
          </View>

          {/* Título */}
          <Text style={styles.title}>Como foi?</Text>
          <Text style={styles.subtitle}>
            Sua avaliação ajuda a manter a qualidade MechaGo.
          </Text>

          {/* Card profissional */}
          <View style={styles.professionalCard}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="person" size={28} color={colors.primary} />
            </View>
            <View style={styles.professionalInfo}>
              <Text style={styles.professionalName}>{displayName}</Text>
              {displayPrice ? (
                <Text style={styles.professionalPrice}>{displayPrice}</Text>
              ) : null}
            </View>
          </View>

          {/* Estrelas */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                accessibilityLabel={`${star} estrela${star > 1 ? "s" : ""}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
              >
                <MaterialIcons
                  name={activeStar >= star ? "star" : "star-border"}
                  size={44}
                  color={activeStar >= star ? colors.primary : colors.outlineVariant}
                />
              </Pressable>
            ))}
          </View>

          {activeStar > 0 && (
            <Text style={styles.ratingLabel}>{ratingLabels[activeStar]}</Text>
          )}

          {/* Tags */}
          <Text style={styles.sectionTitle}>O que mais te marcou?</Text>
          <View style={styles.tagsRow}>
            {TAGS.map((tag) => {
              const selected = selectedTags.has(tag);
              return (
                <Pressable
                  key={tag}
                  accessibilityLabel={`Tag ${tag}${selected ? ", selecionada" : ""}`}
                  accessibilityRole="button"
                  onPress={() => handleTagToggle(tag)}
                  style={[styles.tag, selected && styles.tagSelected]}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Comentário */}
          <Text style={styles.sectionTitle}>
            Comentário <Text style={styles.optional}>(opcional)</Text>
          </Text>
          <TextInput
            accessibilityLabel="Comentário sobre o profissional"
            multiline
            numberOfLines={4}
            onChangeText={setComment}
            placeholder={`Escreva como foi sua experiência com o ${displayName}...`}
            placeholderTextColor={colors.onSurfaceVariant}
            style={styles.textArea}
            textAlignVertical="top"
            value={comment}
          />
        </ScrollView>

        {/* Botão fixo */}
        <View style={styles.footer}>
          <Button
            disabled={rating === 0}
            loading={createReview.isPending}
            onPress={handleSubmit}
            title="ENVIAR AVALIAÇÃO"
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  flex: { flex: 1 },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.headline,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 32,
    color: colors.onSurface,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  professionalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}1F`,
    alignItems: "center",
    justifyContent: "center",
  },
  professionalInfo: { flex: 1, gap: 2 },
  professionalName: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.onSurface,
  },
  professionalPrice: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.primary,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  starButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingLabel: {
    fontFamily: fonts.headline,
    fontSize: 15,
    color: colors.primary,
    textAlign: "center",
    marginTop: -spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.headline,
    fontSize: 15,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  optional: {
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: "transparent",
    minHeight: 44,
    justifyContent: "center",
  },
  tagSelected: {
    backgroundColor: `${colors.primary}1F`,
    borderColor: colors.primary,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  tagTextSelected: {
    color: colors.primary,
    fontFamily: fonts.headline,
  },
  textArea: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    padding: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    minHeight: 100,
    marginTop: -spacing.sm,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}1A`,
  },
});
