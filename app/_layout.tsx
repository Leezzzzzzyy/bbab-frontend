import colors from "@/assets/colors";
import { AuthProvider, useAuth } from "@/context";
import { chatStore, chatEmitter } from "@/services/chat";
import { setUnauthorizedHandler } from "@/services/api";
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

  // Настраиваем глобальный обработчик ошибок 401
  useEffect(() => {
    const handleUnauthorized = async () => {
      console.log("[RootLayout] Handling unauthorized error, logging out");
      try {
        // Отключаем все соединения
        chatStore.disconnectAll();
        // Очищаем credentials
        await clearCredentials();
        // Перенаправляем на экран авторизации
        router.replace("/(auth)");
      } catch (error) {
        console.error("[RootLayout] Failed to handle unauthorized error:", error);
      }
    };

    // Устанавливаем обработчик для HTTP API ошибок
    setUnauthorizedHandler(handleUnauthorized);

    // Подписываемся на события WebSocket ошибок авторизации
    let unsubscribe: (() => void) | null = null;
    if (chatEmitter) {
      unsubscribe = chatEmitter.on("auth:unauthorized", handleUnauthorized);
    }

    return () => {
      setUnauthorizedHandler(() => {});
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [clearCredentials, router]);

  // Инициализация при старте приложения
  useEffect(() => {
    if (resetRef.current) return;
    resetRef.current = true;

    // Просто помечаем как инициализированное, не трогая данные
    // Данные должны сохраняться между сессиями
    setHasReset(true);
  }, []);

  // Обработка начальной навигации при загрузке приложения
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
        // Направляем на экран авторизации только если пользователь не авторизован
        if (!isSignedIn) {
          const targetRoute = "/(auth)";
          router.replace(targetRoute);
        }
        hasNavigatedRef.current = true;
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, fadeAnim, isSignedIn, authLoading, credentials?.userId, hasReset]);

  // Отдельный эффект для обработки выхода из аккаунта
  useEffect(() => {
    // Если пользователь вышел из аккаунта (был авторизован, но теперь нет)
    if (!authLoading && !isSignedIn && hasNavigatedRef.current) {
      console.log("[RootLayout] User logged out, redirecting to auth");
      // Сбрасываем флаг навигации для возможности новой навигации
      hasNavigatedRef.current = false;
      // Перенаправляем на экран авторизации
      router.replace("/(auth)");
    }
  }, [isSignedIn, authLoading, router]);

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
