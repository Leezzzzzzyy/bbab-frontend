import colors from "@/assets/colors";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import ConnectionStatus, { type ConnectionStatusType } from "@/components/chat/ConnectionStatus";
import ChatMembersModal from "@/components/chat/ChatMembersModal";
import {chatStore, type Message} from "@/services/chat";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text,
    View,
    Alert,
    TouchableOpacity,
} from "react-native";

export default function ChatScreen() {
    const {dialogId} = useLocalSearchParams<{ dialogId: string }>();
    const nav = useNavigation();
    const {credentials} = useAuth();
    const currentUserId = credentials?.userId;

    const dialogIdNum = useMemo(() => (dialogId ? parseInt(dialogId) : null), [dialogId]);
    const dialog = useMemo(
        () => dialogIdNum ? chatStore.listDialogs().find((d) => d.id === dialogIdNum) : null,
        [dialogIdNum]
    );

    useEffect(() => {
        if (dialog) {
            nav.setOptions({
                headerTitle: () => (
                    <TouchableOpacity
                        onPress={() => setShowMembersModal(true)}
                        style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                        }}
                    >
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: colors.text,
                        }}>
                            {dialog.name}
                        </Text>
                    </TouchableOpacity>
                ),
            });
        }
    }, [dialog, nav]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>("connecting");
    const [senderNames, setSenderNames] = useState<{[key: number]: string}>({}); // Cache sender names
    const [showMembersModal, setShowMembersModal] = useState(false);

    // Set current user ID in chatStore from credentials
    useEffect(() => {
        if (credentials?.userId) {
            chatStore.setCurrentUserId(credentials.userId);
        }
    }, [credentials?.userId]);

    const listRef = useRef<FlatList<Message>>(null);

    const loadMore = useCallback(() => {
        if (!dialogIdNum || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const {messages: batch, hasMore: more, nextCursor} = chatStore.getMessages(dialogIdNum, cursor, 20);
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
                await chatStore.connectToChat(dialogIdNum, credentials.token!);

                // Load initial messages
                // const {messages: initialMessages} = chatStore.getMessages(dialogIdNum, undefined, 50);
                // setMessages(initialMessages);
                // setHasMore(initialMessages.length >= 50);
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
                if (m.id && prev.some((msg) => msg.id === m.id)) {
                    return prev;
                }
                return [...prev, m];
            });
            requestAnimationFrame(() => listRef.current?.scrollToOffset({offset: 0, animated: true}));
        });

        const offHistory = chatStore.subscribeHistory(dialogIdNum, ({messages: history}) => {
            console.debug(`History loaded for chat ${dialogIdNum}:`, history.length, history);
            setMessages(history);
            setHasMore(history.length >= 50);
            setCursor(undefined);
        });

        // Subscribe to connection status
        const offStatus = chatStore.subscribeStatus(dialogIdNum, (status) => {
            setConnectionStatus(status as ConnectionStatusType);
        });

        // Cleanup on unmount or dialogId change
        return () => {
            offMessages();
            offHistory();
            offStatus();
            chatStore.disconnectChat(dialogIdNum);
        };
    }, [dialogIdNum, credentials?.token]);

    const onSend = useCallback(
        (text: string) => {
            if (!dialogIdNum) return;
            try {
                // Send message directly to WebSocket
                chatStore.sendMessage(dialogIdNum, text);
            } catch (error) {
                console.error("Failed to send message:", error);
                Alert.alert("Error", "Failed to send message. Please try again.");
            }
        },
        [dialogIdNum]
    );

    const handleTyping = useCallback(
        (isTyping: boolean) => {
            if (dialogIdNum) {
                chatStore.sendTypingIndicator(dialogIdNum, isTyping);
            }
        },
        [dialogIdNum]
    );


    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.select({ios: "padding", android: undefined})}
                keyboardVerticalOffset={Platform.select({ios: 88, android: 0})}
            >
                {isConnecting ? (
                    // Loading screen during connection
                    <View style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: colors.background,
                    }}>
                        <ActivityIndicator size="large" color={colors.main}/>
                        <Text style={{
                            marginTop: 16,
                            fontSize: 16,
                            color: colors.main,
                            fontWeight: "500",
                        }}>
                            Подключение...
                        </Text>
                        <Text style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: colors.additionalText,
                        }}>
                            Загрузка чата
                        </Text>
                    </View>
                ) : (
                    <>
                        <ConnectionStatus status={connectionStatus}/>
                        <FlatList
                            ref={listRef}
                            data={[...messages].reverse()}
                            keyExtractor={(item) => (item.id ? `msg-${dialogIdNum}-${item.id}` : `msg-${dialogIdNum}-${item.timestamp}-${item.senderId}`)}
                            renderItem={({item}) => {
                                const isMe = item.senderId === currentUserId;
                                const senderName = senderNames[item.senderId];

                                // Load sender name if not Me and not cached
                                if (!isMe && !senderName) {
                                    chatStore.getUser(item.senderId).then((user) => {
                                        setSenderNames((prev) => ({
                                            ...prev,
                                            [item.senderId]: user.Username || "Неизвестно",
                                        }));
                                    });
                                }

                                return (
                                    <MessageBubble
                                        message={item}
                                        isMe={isMe}
                                        senderName={senderName}
                                    />
                                );
                            }}
                            contentContainerStyle={{paddingVertical: 8}}
                            inverted
                            onEndReachedThreshold={0.2}
                            onEndReached={() => {
                                if (!loadingMore && hasMore) loadMore();
                            }}
                            ListFooterComponent={
                                loadingMore ? (
                                    <View style={{paddingVertical: 12}}>
                                        <ActivityIndicator color={colors.main}/>
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
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
                                        Нет сообщений
                                    </Text>
                                    <Text style={{
                                        color: colors.additionalText,
                                        fontSize: 14,
                                        textAlign: "center",
                                        marginTop: 8,
                                    }}>
                                        Начните разговор
                                    </Text>
                                </View>
                            }
                        />
                        <MessageInput onSend={onSend} onTyping={handleTyping} disabled={isConnecting}/>
                    </>
                )}
            </KeyboardAvoidingView>

            {dialogIdNum && dialog && (
                <ChatMembersModal
                    visible={showMembersModal}
                    dialogId={dialogIdNum}
                    dialogName={dialog.name}
                    onClose={() => setShowMembersModal(false)}
                />
            )}
        </SafeAreaView>
    );
}
