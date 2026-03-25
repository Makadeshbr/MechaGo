import { Stack } from "expo-router";
import { colors } from "@mechago/shared";

// Layout do onboarding — slide_from_right sem header para experiência imersiva
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
