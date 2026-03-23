import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { colors, spacing } from "@mechago/shared";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tela não encontrada</Text>
      <Link href="/" style={styles.link}>
        Voltar ao início
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  link: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: colors.primary,
  },
});
