import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useState } from "react";
import { View, TextInput, Pressable, Keyboard } from "react-native";

export default function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
    Keyboard.dismiss();
  }, [onSend, text]);

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
        onChangeText={setText}
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
        style={{ padding: 10, opacity: text.trim() ? 1 : 0.5 }}
      >
        <Ionicons name="send" color={colors.main} size={24} />
      </Pressable>
    </View>
  );
}
