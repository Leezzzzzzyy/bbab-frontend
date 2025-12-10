import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

export default function MessageInput({
    onSend,
    onTyping,
}: {
    onSend: (text: string) => void;
    onTyping?: (isTyping: boolean) => void;
}) {
    const [text, setText] = useState("");
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const handleTextChange = useCallback(
        (newText: string) => {
            setText(newText);
            if (onTyping) {
                const isTyping = newText.trim().length > 0;
                if (isTyping && !isTypingRef.current) {
                    isTypingRef.current = true;
                    onTyping(true);
                }
                // Clear existing timeout
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                // Set timeout to stop typing indicator after 2 seconds of no typing
                typingTimeoutRef.current = setTimeout(() => {
                    if (isTypingRef.current) {
                        isTypingRef.current = false;
                        onTyping(false);
                    }
                }, 2000);
            }
        },
        [onTyping]
    );

    const submit = useCallback(() => {
        const value = text.trim();
        if (!value) return;
        onSend(value);
        setText("");
        Keyboard.dismiss();
        // Stop typing indicator
        if (onTyping && isTypingRef.current) {
            isTypingRef.current = false;
            onTyping(false);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [onSend, onTyping, text]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (onTyping && isTypingRef.current) {
                onTyping(false);
            }
        };
    }, [onTyping]);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: colors.backgroundAccent,
                borderTopColor: "rgba(255,255,255,0.08)",
                borderTopWidth: 1,
            }}
        >
            <TextInput
                placeholder="Message"
                placeholderTextColor={colors.additionalText}
                value={text}
                onChangeText={handleTextChange}
                onSubmitEditing={submit}
                multiline
                style={{
                    flex: 1,
                    minHeight: 40,
                    maxHeight: 120,
                    color: colors.maintext,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: "#262626",
                    borderRadius: 12,
                }}
            />
            <Pressable
                onPress={submit}
                disabled={!text.trim()}
                style={{padding: 10, opacity: text.trim() ? 1 : 0.5}}
            >
                <Ionicons name="send" color={colors.main} size={24}/>
            </Pressable>
        </View>
    );
}
