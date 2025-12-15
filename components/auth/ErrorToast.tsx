import colors from "@/assets/colors";
import React from "react";
import {Animated, PanResponder, StyleSheet, Text, View} from "react-native";

interface ErrorToastProps {
    message: string;
    isVisible: boolean;
    onHide: () => void;
    duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
                                                          message,
                                                          isVisible,
                                                          onHide,
                                                          duration = 4000,
                                                      }) => {
    const translateY = React.useRef(new Animated.Value(-100)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };



    React.useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 6,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, hideToast, opacity, translateY]);


    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy < 0) {
                translateY.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy < -50) {
                hideToast();
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            }
        },
    });

    if (!isVisible) return null;

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    transform: [{translateY}, {translateX: "-50%"}],
                    opacity,
                },
            ]}
            {...panResponder.panHandlers}
        >
            <View style={styles.toastContent}>
                <Text style={styles.toastText}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: "absolute",
        top: 0,
        left: "50%",
        backgroundColor: colors.error,
        width: "90%",
        borderRadius: 14,
        zIndex: 1000,
    },
    toastContent: {
        paddingHorizontal: 30,
        paddingVertical: 16,
    },
    toastText: {
        color: colors.maintext,
        fontFamily: "Inter-Regular",
        fontSize: 16,
        textAlign: "center",
    },
});
