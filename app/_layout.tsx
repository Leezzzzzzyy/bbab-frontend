import colors from "@/assets/colors";
import { AuthProvider, useAuth } from "@/context";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated } from "react-native";

function RootLayoutContent() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(1))[0];
  const { isSignedIn, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
        // Navigate to appropriate screen based on auth status
        const targetRoute = isSignedIn ? "/messages" : "/(auth)";
        router.replace(targetRoute);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, fadeAnim, isSignedIn, authLoading]);

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
