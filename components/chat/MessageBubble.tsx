import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useMemo } from "react";
import {View, Text, Pressable, Alert} from "react-native";
import type {Message} from "@/services/chat";

const MONTH_NAMES = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

export default function MessageBubble({
    message,
    isMe,
    senderName,
    onEdit,
    onDelete,
}: {
    message: Message;
    isMe: boolean;
    senderName?: string;
    onEdit?: (text: string) => void;
    onDelete?: () => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);

    const timeDisplay = useMemo(() => {
        const time = new Date(message.timestamp);
        const hh = time.getHours().toString().padStart(2, "0");
        const mm = time.getMinutes().toString().padStart(2, "0");
        
        // Check if message is older than 24 hours
        const now = new Date();
        const diffMs = now.getTime() - time.getTime();
        const isOlderThan24Hours = diffMs > MILLISECONDS_IN_DAY;
        
        // Format timestamp
        let display = `${hh}:${mm}`;
        if (isOlderThan24Hours) {
            const dd = time.getDate().toString().padStart(2, "0");
            const month = MONTH_NAMES[time.getMonth()];
            const year = time.getFullYear();
            const currentYear = now.getFullYear();
            
            if (year === currentYear) {
                display = `${dd} ${month}, ${hh}:${mm}`;
            } else {
                display = `${dd} ${month} ${year}, ${hh}:${mm}`;
            }
        }
        return display;
    }, [message.timestamp]);

    const handleEdit = () => {
        if (editText.trim() && editText !== message.text) {
            onEdit?.(editText);
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete message",
            "Are you sure you want to delete this message?",
            [
                { text: "Cancel", onPress: () => {} },
                {
                    text: "Delete",
                    onPress: () => {
                        onDelete?.();
                        setShowActions(false);
                    },
                    style: "destructive",
                },
            ]
        );
    };

    if (message.isDeleted) {
        return (
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginVertical: 4,
                    paddingHorizontal: 12,
                }}
            >
                <Text style={{ color: colors.additionalText, fontSize: 14, fontStyle: "italic" }}>
                    [Message deleted]
                </Text>
            </View>
        );
    }

    return (
        <View>
            {/* Sender name for other users' messages */}
            {!isMe && senderName && (
                <Text
                    style={{
                        marginVertical: 2,
                        marginHorizontal: 12,
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.maintext,
                    }}
                >
                    {senderName}
                </Text>
            )}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginVertical: 4,
                    paddingHorizontal: 12,
                }}
            >
            <Pressable
                onLongPress={() => isMe && setShowActions(!showActions)}
                onPress={() => setShowActions(false)}
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
                {isEditing && isMe ? (
                    <View>
                        <View
                            style={{
                                backgroundColor: "rgba(0,0,0,0.1)",
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                marginBottom: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color: isMe ? "#1e1e1e" : colors.maintext,
                                    fontSize: 16,
                                }}
                            >
                                {editText}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                            <Pressable
                                onPress={() => {
                                    setEditText(message.text);
                                    setIsEditing(false);
                                }}
                                style={{ padding: 4 }}
                            >
                                <Text
                                    style={{
                                        color: isMe ? "#2a2a2a" : colors.additionalText,
                                        fontSize: 12,
                                    }}
                                >
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleEdit}
                                style={{ padding: 4 }}
                            >
                                <Text
                                    style={{
                                        color: isMe ? "#2a2a2a" : colors.main,
                                        fontSize: 12,
                                        fontWeight: "600",
                                    }}
                                >
                                    Save
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <>
                        <Text
                            style={{
                                color: isMe ? "#1e1e1e" : colors.maintext,
                                fontSize: 16,
                            }}
                        >
                            {message.text}
                        </Text>
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color: isMe ? "#2a2a2a" : colors.additionalText,
                                    fontSize: 11,
                                }}
                            >
                                {timeDisplay}
                                {message.updatedAt && " (edited)"}
                            </Text>
                            {/* Read receipts indicator */}
                            {isMe && message.readBy && message.readBy.length > 0 && (
                                <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color={message.readBy.length > 0 ? "#0084ff" : "#2a2a2a"}
                                />
                            )}
                        </View>
                    </>
                )}
            </Pressable>

            {/* Action buttons (long press menu) */}
            {showActions && isMe && (
                <View
                    style={{
                        flexDirection: "row",
                        gap: 8,
                        marginLeft: 8,
                        justifyContent: "center",
                    }}
                >
                    <Pressable
                        onPress={() => {
                            setIsEditing(true);
                            setShowActions(false);
                        }}
                        style={{
                            padding: 8,
                            backgroundColor: colors.backgroundAccent,
                            borderRadius: 8,
                        }}
                    >
                        <Ionicons name="pencil" size={16} color={colors.main} />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        style={{
                            padding: 8,
                            backgroundColor: "#ffcccc",
                            borderRadius: 8,
                        }}
                    >
                        <Ionicons name="trash" size={16} color="#cc0000" />
                    </Pressable>
                </View>
            )}
            </View>
        </View>
    );
}
