import React from "react";
import {SafeAreaView, StyleSheet} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    FadeIn,
    FadeOut,
} from "react-native-reanimated";

interface AuthCarouselProps {
    children: React.ReactNode;
    currentIndex: number;
}

export const AuthCarousel: React.FC<AuthCarouselProps> = ({
                                                              children,
                                                              currentIndex,
                                                          }) => {
    const opacity = useSharedValue(1);

    React.useEffect(() => {
        opacity.value = 0;
        opacity.value = withTiming(1, {duration: 300});
    }, [currentIndex, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <SafeAreaView style={styles.safeArea}>
            <Animated.View
                style={[styles.container, animatedStyle]}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
            >
                {children}
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
});
