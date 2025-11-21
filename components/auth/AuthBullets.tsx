import colors from "@/assets/colors";
import React, { useEffect, useRef } from "react";

import { Animated, StyleSheet, View } from "react-native";

interface AuthBulletsProps {
  currentStep: number;
  totalSteps: number;
}

export const AuthBullets: React.FC<AuthBulletsProps> = ({
  currentStep,
  totalSteps,
}) => {
  const colorAnims = useRef(
    Array.from({ length: totalSteps }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    colorAnims.forEach((anim, index) => {
      const toValue = index === currentStep ? 1 : 0;

      Animated.timing(anim, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [colorAnims, currentStep, totalSteps]);

  const getBulletColor = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.maintext, colors.main],
    });
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bullet,
            {
              backgroundColor: getBulletColor(colorAnims[index]),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 8,
    left: "50%",
    transform: [{ translateX: "-50%" }],
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
