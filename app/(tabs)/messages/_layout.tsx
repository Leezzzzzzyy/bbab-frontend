import colors from "@/assets/colors";
import { Stack } from "expo-router";
import React from "react";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundAccent },
        headerTintColor: colors.maintext,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[dialogId]" options={{ title: "Chat" }} />
    </Stack>
  );
}
