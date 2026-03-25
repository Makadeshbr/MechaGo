import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, AmbientGlow } from "@/components/ui";
import { colors, spacing } from "@mechago/shared";
import { useServiceRequest } from "@/hooks/queries/useServiceRequest";

export default function ProfessionalFoundScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();

  const { data: request, isLoading } = useServiceRequest(requestId as string, 5000);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
           <Text style={styles.title}>Carregando dados do profissional...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const professional = request.professional;

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.container}>
        <Text style={styles.title}>Profissional Encontrado!</Text>
        <Text style={styles.subtitle}>Ele já está a caminho.</Text>
        
        <View style={styles.card}>
          <Image 
             source={{ uri: professional?.avatarUrl || "https://i.pravatar.cc/150?u=fallback" }} 
             style={styles.avatar} 
           />
           <Text style={styles.profName}>{professional?.name || "Profissional"}</Text>
           <Text style={styles.profDetails}>
             {professional?.rating ? `★ ${professional.rating.toFixed(1)}` : ""}
             {professional?.specialties && professional.specialties.length > 0 ? ` • ${professional.specialties[0]}` : ""}
           </Text>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Ver no mapa" 
            onPress={() => router.push(`/(service-flow)/tracking?requestId=${request.id}` as any)} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.xxl,
    width: "100%",
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: spacing.lg,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  profName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
  },
  profDetails: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  distance: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.md,
  },
  footer: {
    position: "absolute",
    bottom: spacing.xxxl,
    width: "100%",
  }
});
