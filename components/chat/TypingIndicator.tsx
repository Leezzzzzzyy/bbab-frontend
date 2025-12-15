import colors from "@/assets/colors";
import React from "react";
import { View, Text } from "react-native";
import type { TypingUser } from "@/services/chat";

export default function TypingIndicator({ typingUsers }: { typingUsers: TypingUser[] }) {
    if (!typingUsers || typingUsers.length === 0) {
        return null;
    }

    const names = typingUsers.map((u) => u.username).join(", ");
    const isPlural = typingUsers.length > 1;

    return (
        <View
            style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
            }}
        >
            {/* Animated dots */}
            <View style={{ flexDirection: "row", gap: 3 }}>
                {[0, 1, 2].map((i) => (
                    <View
                        key={i}
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: colors.additionalText,
                            opacity: 0.6,
                        }}
                    />
                ))}
            </View>
            <Text
                style={{
                    color: colors.additionalText,
                    fontSize: 13,
                    fontStyle: "italic",
                }}
            >
                {names} {isPlural ? "are" : "is"} typing...
            </Text>
        </View>
    );
}

