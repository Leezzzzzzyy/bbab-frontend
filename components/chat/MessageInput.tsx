import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, TextInput, View, Platform } from "react-native";

export default function MessageInput({
    onSend,
    onTyping,
     onTextChange,
     disabled = false,
}: {
    onSend: (text: string) => void;
    onTyping?: (isTyping: boolean) => void;
    onTextChange?: (text: string) => void;
    disabled?: boolean;
}) {
    const [text, setText] = useState("");
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    // ref на TextInput чтобы можно было вернуть фокус
    const inputRef = useRef<TextInput | null>(null);

    const handleTextChange = useCallback(
        (newText: string) => {
            setText(newText);
            // Передаём изменение текста наружу, если нужно
            onTextChange?.(newText);
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
        [onTyping, onTextChange]
    );

    const submit = useCallback(() => {
        if (disabled) return;
        const value = text.trim();
        if (!value) return;
        onSend(value);
        setText("");
        // Для web возвращаем фокус в инпут; на нативе старое поведение — скрыть клавиатуру
        if (Platform.OS === 'web') {
            // Небольшая задержка помогает в web-платформе, чтобы фокус точно сработал после очистки
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            Keyboard.dismiss();
        }
        // Stop typing indicator
        if (onTyping && isTypingRef.current) {
            isTypingRef.current = false;
            onTyping(false);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [onSend, onTyping, text, disabled]);

    // Обработчик клавиш для web: Enter отправляет, Shift+Enter — новая строка
    const handleKeyPress = useCallback((e: any) => {
        try {
            const key = e?.nativeEvent?.key;
            const shift = e?.nativeEvent?.shiftKey;
            if (key === "Enter" && !shift) {
                // Попробуем предотвратить стандартное поведение (если доступно)
                if (typeof e.preventDefault === "function") e.preventDefault();
                submit();
            }
        } catch {
            // тихо игнорируем
        }
    }, [submit]);

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
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <TextInput
                ref={inputRef}
                placeholder="Сообщение"
                placeholderTextColor={colors.additionalText}
                value={text}
                onChangeText={handleTextChange}
                // onSubmitEditing по-прежнему работает для нативных платформ
                onSubmitEditing={submit}
                // На web используем onKeyPress для перехвата Enter (чтобы отличить Shift+Enter)
                {...(Platform.OS === 'web' ? { onKeyPress: handleKeyPress } : {})}
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
