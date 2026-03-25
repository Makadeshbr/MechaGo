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
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { Input, Button, LogoPin, AmbientGlow } from "@/components/ui";
import {
  colors,
  spacing,
  registerFormSchema,
  type RegisterFormInput,
  type RegisterFormOutput,
} from "@mechago/shared";

export default function RegisterScreen() {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpfCnpj: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { register } = useAuth();

  function onSubmit(data: RegisterFormOutput) {
    register.mutate(
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpfCnpj: data.cpfCnpj,
        password: data.password,
        type: "client",
      },
      {
        onSuccess: () => {
          router.replace("/(auth)/register-vehicle");
        },
        onError: (error) => {
          setError("root", {
            message:
              (error as { message?: string }).message ??
              "Erro ao criar conta. Tente novamente.",
          });
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header com back button e logo */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityLabel="Voltar"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <LogoPin size="sm" />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Título */}
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Insira seus dados para começar sua jornada premium.
          </Text>

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
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="NOME COMPLETO"
                  placeholder="Ex: João Silva"
                  value={value}
                  onChangeText={onChange}
                  autoComplete="name"
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="E-MAIL"
                  placeholder="nome@email.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            {/* Telefone + CPF lado a lado */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="TELEFONE"
                      placeholder="(00) 00000-000"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      error={errors.phone?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.halfField}>
                <Controller
                  control={control}
                  name="cpfCnpj"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="CPF"
                      placeholder="000.000.000-00"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      error={errors.cpfCnpj?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="SENHA"
                  placeholder="Mínimo 8 caracteres"
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  autoComplete="new-password"
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="CONFIRMAR SENHA"
                  placeholder="Repita a senha"
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="CRIAR CONTA"
              onPress={handleSubmit(onSubmit)}
              loading={register.isPending}
              style={styles.submitButton}
            />
          </View>

          {/* Termos */}
          <Text style={styles.terms}>
            Ao criar sua conta, você declara que leu e concorda com os{" "}
            <Text style={styles.termsLink}>Termos de Uso</Text> e a{" "}
            <Text style={styles.termsLink}>Política de Privacidade</Text> da
            MechaGo.
          </Text>

          {/* Link para login */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Já possui uma conta?</Text>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              hitSlop={8}
              accessibilityLabel="Fazer login"
              accessibilityRole="link"
            >
              <Text style={styles.loginAction}>FAZER LOGIN</Text>
            </Pressable>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  form: {
    marginBottom: spacing.xxl,
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
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  terms: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.xxl,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  loginLink: {
    alignItems: "center",
    gap: spacing.sm,
  },
  loginText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginAction: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 1,
  },
});
