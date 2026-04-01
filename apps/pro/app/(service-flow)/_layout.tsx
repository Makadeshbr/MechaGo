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
      <Stack.Screen name="map-tracking" />
      <Stack.Screen name="diagnosis" />
      <Stack.Screen name="service-resolved" />
      <Stack.Screen name="service-completed" />
      <Stack.Screen name="escalation" />
    </Stack>
  );
}
