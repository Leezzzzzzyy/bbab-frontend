import React from "react";
import { Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
console.log(width);

interface AuthCarouselProps {
  children: React.ReactNode[];
  currentIndex: number;
}

export const AuthCarousel: React.FC<AuthCarouselProps> = ({
  children,
  currentIndex,
}) => {
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withTiming(-currentIndex * width, {
      duration: 500,
    });
  }, [currentIndex, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <SafeAreaView>
      <Animated.View style={[styles.carousel, animatedStyle]}>
        {children.map((child, index) => (
          <View key={index} style={styles.slide}>
            {child}
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  carousel: {
    flexDirection: "row",
  },
  slide: {
    width: width,
  },
});
