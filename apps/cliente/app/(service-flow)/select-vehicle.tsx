import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles } from "@/hooks/queries/useVehicles";
import { Button, LogoPin, Skeleton, AmbientGlow } from "@/components/ui";
import { colors, spacing, borderRadius } from "@mechago/shared";

export default function SelectVehicleScreen() {
  const { data: vehicles, isLoading, isError } = useVehicles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleContinue() {
    if (!selectedId) return;
    // Salvar no estado global ou passar via params
    router.push({
      pathname: "/(service-flow)/select-problem",
      params: { vehicleId: selectedId },
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AmbientGlow />
        <View style={styles.header}>
          <LogoPin size="sm" />
        </View>
        <View style={styles.container}>
          <Text style={styles.title}>Selecione o veículo</Text>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={100} style={styles.skeleton} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <LogoPin size="sm" />
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Qual veículo precisa de socorro?</Text>

        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.card,
                selectedId === item.id && styles.cardSelected,
              ]}
              accessibilityLabel={`Veículo: ${item.brand} ${item.model}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedId === item.id }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={item.type === 'moto' ? 'bicycle' : 'car'} 
                    size={24} 
                    color={selectedId === item.id ? colors.bg : colors.primary} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.modelText, selectedId === item.id && styles.textInverted]}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={[styles.plateText, selectedId === item.id && styles.textInvertedSecondary]}>
                    {item.plate}
                  </Text>
                </View>
              </View>
              {selectedId === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.bg} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum veículo cadastrado.</Text>
              <Button 
                title="CADASTRAR VEÍCULO" 
                variant="outline" 
                onPress={() => router.push("/(auth)/register-vehicle")} 
              />
            </View>
          }
        />

        <Button
          title="CONTINUAR"
          onPress={handleContinue}
          disabled={!selectedId}
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerSpacer: { width: 44 },
  container: { flex: 1, paddingHorizontal: spacing.xl },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  list: { paddingBottom: spacing.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(253, 212, 4, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: { gap: 2 },
  modelText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: colors.text,
  },
  plateText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  textInverted: { color: colors.bg },
  textInvertedSecondary: { color: "rgba(0,0,0,0.6)" },
  skeleton: { marginBottom: spacing.md, borderRadius: borderRadius.lg },
  continueButton: { marginBottom: spacing.xl },
  empty: { alignItems: "center", gap: spacing.lg, marginTop: spacing.xxl },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
});
