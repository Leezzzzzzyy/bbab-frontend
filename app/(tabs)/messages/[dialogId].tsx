import colors from "@/assets/colors";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import { chatStore, type Message } from "@/services/chat";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    View,
    Alert,
    Text,
} from "react-native";

export default function ChatScreen() {
    const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
    const nav = useNavigation();
    const { credentials } = useAuth();

    const dialogIdNum = useMemo(() => (dialogId ? parseInt(dialogId) : null), [dialogId]);
    const dialog = useMemo(
        () => dialogIdNum ? chatStore.listDialogs().find((d) => d.id === dialogIdNum) : null,
        [dialogIdNum]
    );

    useEffect(() => {
        if (dialog) {
            nav.setOptions({ title: dialog.name });
        }
    }, [dialog, nav]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const listRef = useRef<FlatList<Message>>(null);

    const loadMore = useCallback(() => {
        if (!dialogIdNum || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const { messages: batch, hasMore: more, nextCursor } = chatStore.getMessages(dialogIdNum, cursor, 20);
        setMessages((prev) => [...batch, ...prev]);
        setHasMore(more);
        setCursor(nextCursor);
        setLoadingMore(false);
    }, [cursor, dialogIdNum, hasMore, loadingMore]);

    // Connect to WebSocket and load messages
    useEffect(() => {
        if (!dialogIdNum || !credentials?.token) return;

        const connectChat = async () => {
            try {
                setIsConnecting(true);
                await chatStore.connectToChat(dialogIdNum, credentials.token);

                // Load initial messages
                const { messages: initialMessages } = chatStore.getMessages(dialogIdNum, undefined, 50);
                setMessages(initialMessages);
                setHasMore(initialMessages.length >= 50);
                setCursor(undefined);
            } catch (error) {
                console.error("Failed to connect to chat:", error);
                Alert.alert("Error", "Failed to connect to chat. Please try again.");
            } finally {
                setIsConnecting(false);
            }
        };

        connectChat();

        // Subscribe to new messages
        const offMessages = chatStore.subscribeMessages(dialogIdNum, (m) => {
            setMessages((prev) => {
                // Check if message already exists
                if (prev.find((msg) => msg.id === m.id)) {
                    return prev;
                }
                return [...prev, m];
            });
            requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
        });

        // Cleanup on unmount or dialogId change
        return () => {
            offMessages();
            chatStore.disconnectChat(dialogIdNum);
        };
    }, [dialogIdNum, credentials?.token]);

    const onSend = useCallback(
        (text: string) => {
            if (!dialogIdNum) return;
            try {
                chatStore.sendMessage(dialogIdNum, text);
            } catch (error) {
                console.error("Failed to send message:", error);
                Alert.alert("Error", "Failed to send message. Please try again.");
            }
        },
        [dialogIdNum]
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding", android: undefined })}
                keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
            >
                {isConnecting && (
                    <View style={{ paddingVertical: 12, alignItems: "center" }}>
                        <ActivityIndicator color={colors.main} />
                    </View>
                )}
                <FlatList
                    ref={listRef}
                    data={[...messages].reverse()}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            isMe={item.senderId === chatStore.currentUserId}
                        />
                    )}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    inverted
                    onEndReachedThreshold={0.2}
                    onEndReached={() => {
                        if (!loadingMore && hasMore) loadMore();
                    }}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 12 }}>
                                <ActivityIndicator color={colors.main} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !isConnecting ? (
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
                                    No messages yet
                                </Text>
                                <Text style={{
                                    color: colors.additionalText,
                                    fontSize: 14,
                                    textAlign: "center",
                                    marginTop: 8,
                                }}>
                                    Start the conversation
                                </Text>
                            </View>
                        ) : null
                    }
                />
                <MessageInput onSend={onSend} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

