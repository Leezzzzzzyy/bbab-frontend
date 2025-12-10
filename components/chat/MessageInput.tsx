import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, {useCallback, useState} from "react";
import {View, TextInput, Pressable, Keyboard} from "react-native";

export default function MessageInput({
    onSend,
    onTextChange,
    disabled = false,
}: {
    onSend: (text: string) => void;
    onTextChange?: (text: string) => void;
    disabled?: boolean;
}) {
    const [text, setText] = useState("");

    const submit = useCallback(() => {
        if (disabled) return;
        const value = text.trim();
        if (!value) return;
        onSend(value);
        setText("");
        Keyboard.dismiss();
    }, [onSend, text, disabled]);

    const handleTextChange = useCallback(
        (value: string) => {
            if (disabled) return;
            setText(value);
            onTextChange?.(value);
        },
        [onTextChange, disabled]
    );

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
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <TextInput
                placeholder="Сообщение"
                placeholderTextColor={colors.additionalText}
                value={text}
                onChangeText={handleTextChange}
                onSubmitEditing={submit}
                multiline
                editable={!disabled}
                style={{
                    flex: 1,
                    minHeight: 40,
                    maxHeight: 120,
                    color: colors.maintext,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: "#262626",
                    borderRadius: 12,
                    opacity: disabled ? 0.6 : 1,
                }}
            />
            <Pressable
                onPress={submit}
                disabled={!text.trim() || disabled}
                style={{padding: 10, opacity: (text.trim() && !disabled) ? 1 : 0.5}}
            >
                <Ionicons name="send" color={colors.main} size={24}/>
            </Pressable>
        </View>
    );
}
