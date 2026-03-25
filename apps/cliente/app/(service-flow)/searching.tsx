import React, { useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LogoPin, Button, AmbientGlow } from "@/components/ui";
import { colors, spacing } from "@mechago/shared";
import { useServiceRequest, useCancelServiceRequest } from "@/hooks/queries/useServiceRequest";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export default function SearchingScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();

  // Polling a cada 3 segundos
  const { data: request, isLoading, error } = useServiceRequest(requestId as string, 3000);
  const cancelMutation = useCancelServiceRequest();

  // Radar Animation
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  useEffect(() => {
    pulse1.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    setTimeout(() => {
      pulse2.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 600);
    setTimeout(() => {
      pulse3.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 1200);
  }, []);

  const createPulseStyle = (sharedValue: Animated.SharedValue<number>) => 
    useAnimatedStyle(() => ({
      transform: [{ scale: sharedValue.value * 2.5 + 0.8 }],
      opacity: 1 - sharedValue.value,
    }));

  const pulseStyle1 = createPulseStyle(pulse1);
  const pulseStyle2 = createPulseStyle(pulse2);
  const pulseStyle3 = createPulseStyle(pulse3);

  useEffect(() => {
    if (request?.status === "accepted" && request.professionalId) {
      router.replace(`/(service-flow)/professional-found?requestId=${request.id}` as any);
    }
  }, [request?.status]);

  const handleCancel = () => {
    Alert.alert(
      "Cancelar solicitação?",
      "Tem certeza que deseja cancelar a busca por profissionais?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(requestId as string);
              router.back();
            } catch (err) {
              Alert.alert("Erro", "Não foi possível cancelar. Tente novamente.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
           <Text style={styles.title}>Iniciando busca...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
           <Text style={styles.title}>Erro ao buscar. Tente novamente.</Text>
           <Button title="Voltar" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <View style={styles.container}>
        <View style={styles.radarContainer}>
          <Animated.View style={[styles.pulseCircle, pulseStyle1]} />
          <Animated.View style={[styles.pulseCircle, pulseStyle2]} />
          <Animated.View style={[styles.pulseCircle, pulseStyle3]} />
          <LogoPin size="lg" />
        </View>
        <Text style={styles.title}>Buscando profissionais</Text>
        <Text style={styles.subtitle}>
          Estamos enviando seu chamado para os profissionais mais próximos da sua região.
        </Text>

        {request?.status === "waiting_queue" && (
           <View style={styles.queueBox}>
              <Text style={styles.queueText}>
                 Ninguém aceitou ainda. Você está na fila de espera.
              </Text>
           </View>
        )}

        <View style={styles.footer}>
          <Button 
            title="Cancelar Busca" 
            variant="outline" 
            onPress={handleCancel}
            loading={cancelMutation.isPending}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginBottom: spacing.xxl,
  },
  pulseCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
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
    marginTop: spacing.md,
    lineHeight: 24,
  },
  queueBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: spacing.md,
  },
  queueText: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  footer: {
    position: "absolute",
    bottom: spacing.xxxl,
    width: "100%",
  }
});
