import colors from "@/assets/colors";
import { chatStore, type Dialog } from "@/services/chat";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Text, View, Pressable } from "react-native";

export default function MessagesIndex() {
  const [dialogs, setDialogs] = useState<Dialog[]>(chatStore.listDialogs());

  useEffect(() => {
    const off = chatStore.subscribeDialogs((d) => setDialogs(d.slice()));
    return () => off();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <FlatList
        data={dialogs}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Link href={`/messages/${item.id}`} asChild>
            <Pressable
              style={{
                backgroundColor: colors.backgroundAccent,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text
                style={{
                  color: colors.maintext,
                  fontWeight: "700",
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                {item.name}
              </Text>
              {!!item.lastMessage && (
                <Text numberOfLines={1} style={{ color: colors.additionalText }}>
                  {item.lastMessage}
                </Text>
              )}
              {!!item.lastTime && (
                <Text style={{ color: colors.additionalText, marginTop: 8, fontSize: 12 }}>
                  {new Date(item.lastTime).toLocaleString()}
                </Text>
              )}
            </Pressable>
          </Link>
        )}
        ListHeaderComponent={() => (
          <Text
            style={{
              color: colors.maintext,
              fontSize: 22,
              fontWeight: "800",
              marginBottom: 12,
            }}
          >
            Messages
          </Text>
        )}
      />
    </View>
  );
}
