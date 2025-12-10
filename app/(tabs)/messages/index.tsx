import colors from "@/assets/colors";
import {chatStore, type Dialog} from "@/services/chat";
import {useAuth} from "@/context/AuthContext";
import {Link} from "expo-router";
import React, {useEffect, useState} from "react";
import {FlatList, Text, View, Pressable, ActivityIndicator, Alert} from "react-native";

export default function MessagesIndex() {
    const [dialogs, setDialogs] = useState<Dialog[]>(chatStore.listDialogs());
    const [isLoading, setIsLoading] = useState(true);
    const {credentials} = useAuth();

    useEffect(() => {
        const loadDialogs = async () => {
            if (!credentials?.token) return;
            try {
                setIsLoading(true);
                await chatStore.loadDialogs(credentials.token);
                setDialogs(chatStore.listDialogs());
            } catch (error) {
                console.error("Failed to load dialogs:", error);
                Alert.alert("Error", "Failed to load chats. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadDialogs();

        const off = chatStore.subscribeDialogs((d) => setDialogs(d.slice()));
        return () => off();
    }, [credentials?.token]);

    return (
        <View style={{flex: 1, backgroundColor: colors.background, padding: 16}}>
            {isLoading ? (
                <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
                    <ActivityIndicator color={colors.main} size="large" />
                </View>
            ) : (
                <FlatList
                    data={dialogs}
                    keyExtractor={(item) => item.id.toString()}
                    ItemSeparatorComponent={() => <View style={{height: 12}}/>}
                    renderItem={({item}) => (
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
                                    <Text numberOfLines={1} style={{color: colors.additionalText}}>
                                        {item.lastMessage}
                                    </Text>
                                )}
                                {!!item.lastTime && (
                                    <Text style={{color: colors.additionalText, marginTop: 8, fontSize: 12}}>
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
                    ListEmptyComponent={() => (
                        <View style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            paddingVertical: 40,
                        }}>
                            <Text style={{
                                color: colors.additionalText,
                                fontSize: 16,
                                textAlign: "center",
                            }}>
                                No chats yet
                            </Text>
                            <Text style={{
                                color: colors.additionalText,
                                fontSize: 14,
                                textAlign: "center",
                                marginTop: 8,
                            }}>
                                Start a conversation to begin messaging
                            </Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}
