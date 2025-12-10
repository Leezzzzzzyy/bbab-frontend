import React from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import colors from "@/assets/colors";

export type ConnectionStatusType = "connecting" | "connected" | "disconnected" | "error";

export default function ConnectionStatus({
    status,
}: {
    status: ConnectionStatusType;
}) {
    if (status === "connected") {
        return null; // Don't show anything when connected
    }

    const statusConfig = {
        connecting: {
            icon: "wifi-outline" as const,
            text: "Подключение...",
            color: "#FFA500",
        },
        disconnected: {
            icon: "wifi-off" as const,
            text: "Отключено",
            color: "#999",
        },
        error: {
            icon: "alert-circle-outline" as const,
            text: "Ошибка соединения",
            color: "#FF6B6B",
        },
    };

    const config = statusConfig[status];

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "rgba(0,0,0,0.3)",
                borderBottomColor: config.color,
                borderBottomWidth: 1,
            }}
        >
            <Ionicons
                name={config.icon}
                size={16}
                color={config.color}
                style={{ marginRight: 8 }}
            />
            <Text
                style={{
                    fontSize: 12,
                    color: config.color,
                    fontWeight: "500",
                }}
            >
                {config.text}
            </Text>
        </View>
    );
}
