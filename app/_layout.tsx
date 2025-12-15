import colors from "@/assets/colors";
import { AuthProvider, useAuth } from "@/context";
import { chatStore } from "@/services/chat";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

function RootLayoutContent() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasReset, setHasReset] = useState(false);
  const hasNavigatedRef = useRef(false);
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(1))[0];
  const resetRef = useRef(false);
  const {
    isSignedIn,
    isLoading: authLoading,
    credentials,
    clearCredentials,
  } = useAuth();

  // Сброс сохраненных cred'ов и активных соединений при старте приложения
  useEffect(() => {
    if (resetRef.current) return;
    resetRef.current = true;

    (async () => {
      try {
        await clearCredentials();
        chatStore.disconnectAll();
      } catch (error) {
        console.warn("[RootLayout] Failed to reset credentials on launch", error);
      } finally {
        setHasReset(true);
      }
    })();
  }, [clearCredentials]);

  useEffect(() => {
    if (authLoading || !hasReset || hasNavigatedRef.current) return;

    console.log("[RootLayout] Auth status:", {
      isSignedIn,
      userId: credentials?.userId,
      username: credentials?.username,
    });

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
        // Всегда принудительно отправляем на экран авторизации
        const targetRoute = "/(auth)";
        router.replace(targetRoute);
        hasNavigatedRef.current = true;
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, fadeAnim, isSignedIn, authLoading, credentials?.userId, hasReset]);

  // Отдельно сохраняем текущий userId для чата после успешной авторизации
  useEffect(() => {
    if (isSignedIn && credentials?.userId) {
      chatStore.setCurrentUserId(credentials.userId);
    }
  }, [isSignedIn, credentials?.userId]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(auth)"
          options={{
            animation: "fade",
            animationDuration: 1200,
          }}
        />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {isLoading && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            zIndex: 1000,
            opacity: fadeAnim,
          }}
        >
          <Animated.Image
            source={require("@/assets/images/Logo.png")}
            style={{
              height: 150,
              width: 150,
            }}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
