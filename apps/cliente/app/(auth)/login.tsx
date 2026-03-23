import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { Input, Button, LogoPin } from "@/components/ui";
import {
  colors,
  spacing,
  loginFormSchema,
  type LoginFormInput,
  type LoginFormOutput,
} from "@mechago/shared";

export default function LoginScreen() {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const { login } = useAuth();

  function onSubmit(data: LoginFormOutput) {
    login.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          router.replace("/(tabs)");
        },
        onError: (error) => {
          setError("root", {
            message:
              (error as { message?: string }).message ??
              "E-mail ou senha incorretos",
          });
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LogoPin size="lg" />
            <Text style={styles.subtitle}>
              Acesse sua conta para continuar
            </Text>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            {errors.root && (
              <View style={styles.formError}>
                <Text style={styles.formErrorText}>
                  {errors.root.message}
                </Text>
              </View>
            )}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="E-MAIL OU TELEFONE"
                  placeholder="nome@exemplo.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="SENHA"
                  placeholder="Sua senha"
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  autoComplete="password"
                  error={errors.password?.message}
                />
              )}
            />

            <Pressable
              onPress={() => {
                // TODO: Navegar para tela de esqueci minha senha
              }}
              style={styles.forgotButton}
              hitSlop={8}
              accessibilityLabel="Esqueci minha senha"
              accessibilityRole="link"
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>

            <Button
              title="ENTRAR"
              onPress={handleSubmit(onSubmit)}
              loading={login.isPending}
              style={styles.loginButton}
            />

            {/* Divisor */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="CRIAR CONTA"
              variant="outline"
              onPress={() => router.push("/(auth)/register")}
            />
          </View>

          {/* Termos */}
          <Text style={styles.terms}>
            Ao entrar, você concorda com nossos{" "}
            <Text style={styles.termsLink}>Termos de Uso</Text> e{" "}
            <Text style={styles.termsLink}>Política de Privacidade</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xxxl + spacing.lg,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.xxxl,
  },
  formError: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formErrorText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -spacing.sm,
    marginBottom: spacing.xxl,
    minHeight: 44,
    justifyContent: "center",
  },
  forgotText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: colors.primary,
  },
  loginButton: {
    marginBottom: spacing.xxl,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceLight,
  },
  dividerText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
  },
  terms: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
