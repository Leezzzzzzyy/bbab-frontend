import colors from "@/assets/colors";
import React from "react";
import {View, Text} from "react-native";
import type {Message} from "@/services/chat";

export default function MessageBubble({message, isMe}: { message: Message; isMe: boolean }) {
    const time = new Date(message.createdAt);
    const hh = time.getHours().toString().padStart(2, "0");
    const mm = time.getMinutes().toString().padStart(2, "0");

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginVertical: 4,
                paddingHorizontal: 12,
            }}
        >
            <View
                style={{
                    maxWidth: "80%",
                    backgroundColor: isMe ? colors.main : colors.backgroundAccent,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                }}
            >
                <Text
                    style={{
                        color: isMe ? "#1e1e1e" : colors.maintext,
                        fontSize: 16,
                    }}
                >
                    {message.text}
                </Text>
                <Text
                    style={{
                        color: isMe ? "#2a2a2a" : colors.additionalText,
                        fontSize: 11,
                        alignSelf: "flex-end",
                        marginTop: 6,
                    }}
                >
                    {hh}:{mm}
                </Text>
            </View>
        </View>
    );
}
