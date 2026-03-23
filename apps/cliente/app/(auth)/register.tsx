import React, { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { Input, Button, LogoPin } from "@/components/ui";
import { colors, spacing } from "@mechago/shared";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2)
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    if (!email.trim() || !email.includes("@"))
      newErrors.email = "E-mail inválido";
    if (!phone.trim())
      newErrors.phone = "Telefone é obrigatório";
    if (!cpfCnpj.trim())
      newErrors.cpfCnpj = "CPF é obrigatório";
    if (password.length < 8)
      newErrors.password = "Senha deve ter pelo menos 8 caracteres";
    else if (!/[A-Z]/.test(password))
      newErrors.password = "Senha deve ter pelo menos 1 letra maiúscula";
    else if (!/[0-9]/.test(password))
      newErrors.password = "Senha deve ter pelo menos 1 número";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Senhas não conferem";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleRegister() {
    if (!validate()) return;

    register.mutate(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        cpfCnpj: cpfCnpj.trim(),
        password,
        type: "client",
      },
      {
        onSuccess: () => {
          // Após cadastro, ir para cadastro de veículo
          router.replace("/(auth)/register-vehicle");
        },
        onError: (error) => {
          setErrors({
            form:
              (error as { message?: string }).message ??
              "Erro ao criar conta. Tente novamente.",
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
            {errors.form && (
              <View style={styles.formError}>
                <Text style={styles.formErrorText}>{errors.form}</Text>
              </View>
            )}

            <Input
              label="NOME COMPLETO"
              placeholder="Ex: João Silva"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              error={errors.name}
            />

            <Input
              label="E-MAIL"
              placeholder="nome@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            {/* Telefone + CPF lado a lado */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="TELEFONE"
                  placeholder="(00) 00000-000"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  error={errors.phone}
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChangeText={setCpfCnpj}
                  keyboardType="numeric"
                  error={errors.cpfCnpj}
                />
              </View>
            </View>

            <Input
              label="SENHA"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="new-password"
              error={errors.password}
            />

            <Input
              label="CONFIRMAR SENHA"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
            />

            <Button
              title="CRIAR CONTA"
              onPress={handleRegister}
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
