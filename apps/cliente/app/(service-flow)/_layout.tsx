import { Stack } from "expo-router";
import { colors } from "@mechago/shared";

export default function ServiceFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen name="select-problem" />
      <Stack.Screen name="triage" />
      <Stack.Screen name="estimate" />
      <Stack.Screen name="searching" />
      <Stack.Screen name="professional-found" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="service-active" />
      <Stack.Screen name="price-approval" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="rating" />
      <Stack.Screen name="completed" />
      <Stack.Screen name="escalation" />
    </Stack>
  );
}
