import colors from "@/assets/colors";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated } from "react-native";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
        router.replace("/messages");
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, fadeAnim]);

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
