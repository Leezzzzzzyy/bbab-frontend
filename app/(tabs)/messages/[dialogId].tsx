import colors from "@/assets/colors";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { chatAPI, userAPI } from "@/services/api";
import { WebSocketMessage } from "@/services/websocket";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text,
    View,
} from "react-native";

export default function ChatScreen() {
    const {dialogId} = useLocalSearchParams<{ dialogId: string }>();
    const nav = useNavigation();
    const {credentials} = useAuth();
    const chatId = dialogId ? parseInt(dialogId, 10) : null;

    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const listRef = useRef<FlatList<WebSocketMessage>>(null);
    const typingTimeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    // Fetch current user ID
    useEffect(() => {
        if (credentials?.token && !currentUserId) {
            userAPI
                .getCurrentUser(credentials.token)
                .then((user) => {
                    setCurrentUserId(user.id);
                    // Set navigation title
                    nav.setOptions({title: user.username || "Chat"});
                })
                .catch((error) => {
                    console.error("[ChatScreen] Failed to get current user:", error);
                });
        }
    }, [credentials?.token, currentUserId, nav]);

    // WebSocket connection
    const {
        status: wsStatus,
        isConnected,
        sendMessage: wsSendMessage,
        sendTypingIndicator,
    } = useWebSocket({
        chatId,
        autoConnect: !!chatId && !!credentials?.token,
        onMessage: (message) => {
            setMessages((prev) => {
                // Check if message already exists (avoid duplicates)
                if (message.id && prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
            // Scroll to bottom when new message arrives
            setTimeout(() => {
                listRef.current?.scrollToOffset({offset: 0, animated: true});
            }, 100);
        },
        onHistory: (historyMessages, meta) => {
            setIsLoadingHistory(false);
            if (historyMessages && historyMessages.length > 0) {
                // Sort messages by timestamp (oldest first)
                const sorted = [...historyMessages].sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeA - timeB;
                });
                setMessages(sorted);
                setHasMore(meta?.has_more ?? false);
            }
        },
        onTyping: (userId, isTyping) => {
            setTypingUsers((prev) => {
                const next = new Set(prev);
                if (isTyping) {
                    next.add(userId);
                    // Clear typing indicator after 3 seconds
                    const existingTimeout = typingTimeoutRef.current.get(userId);
                    if (existingTimeout) {
                        clearTimeout(existingTimeout);
                    }
                    const timeout = setTimeout(() => {
                        setTypingUsers((current) => {
                            const updated = new Set(current);
                            updated.delete(userId);
                            return updated;
                        });
                        typingTimeoutRef.current.delete(userId);
                    }, 3000);
                    typingTimeoutRef.current.set(userId, timeout);
                } else {
                    next.delete(userId);
                    const existingTimeout = typingTimeoutRef.current.get(userId);
                    if (existingTimeout) {
                        clearTimeout(existingTimeout);
                        typingTimeoutRef.current.delete(userId);
                    }
                }
                return next;
            });
        },
        onError: (error) => {
            console.error("[ChatScreen] WebSocket error:", error);
        },
        onStatusChange: (status) => {
            console.log("[ChatScreen] WebSocket status:", status);
        },
    });

    // Load initial messages from API
    const loadInitialMessages = useCallback(async () => {
        if (!chatId || !credentials?.token) return;

        setIsLoadingHistory(true);
        try {
            const response = await chatAPI.getChatMessages(chatId, undefined, 20, "older");
            if (response.data && response.data.length > 0) {
                // Convert API messages to WebSocket format
                const wsMessages: WebSocketMessage[] = response.data.map((msg) => ({
                    id: msg.id,
                    chat_id: msg.chatID,
                    sender_id: msg.senderID,
                    message: msg.message,
                    type: msg.type || "text",
                    timestamp: msg.createdAt || new Date().toISOString(),
                }));
                // Sort by timestamp
                wsMessages.sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeA - timeB;
                });
                setMessages(wsMessages);
                setHasMore(response.pagination.hasNext);
                setCursor(response.pagination.nextCursor);
            } else {
                setIsLoadingHistory(false);
            }
        } catch (error) {
            console.error("[ChatScreen] Failed to load messages:", error);
            setIsLoadingHistory(false);
        }
    }, [chatId, credentials?.token]);

    // Load more messages (pagination)
    const loadMore = useCallback(async () => {
        if (!chatId || !credentials?.token || loadingMore || !hasMore || !cursor) return;

        setLoadingMore(true);
        try {
            const response = await chatAPI.getChatMessages(chatId, cursor, 20, "older");
            if (response.data && response.data.length > 0) {
                const wsMessages: WebSocketMessage[] = response.data.map((msg) => ({
                    id: msg.id,
                    chat_id: msg.chatID,
                    sender_id: msg.senderID,
                    message: msg.message,
                    type: msg.type || "text",
                    timestamp: msg.createdAt || new Date().toISOString(),
                }));
                // Prepend older messages
                setMessages((prev) => {
                    const combined = [...wsMessages, ...prev];
                    // Remove duplicates
                    const unique = combined.filter(
                        (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
                    );
                    return unique;
                });
                setHasMore(response.pagination.hasNext);
                setCursor(response.pagination.nextCursor);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("[ChatScreen] Failed to load more messages:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [chatId, credentials?.token, cursor, hasMore, loadingMore]);

    // Initial load
    useEffect(() => {
        if (chatId) {
            loadInitialMessages();
        }
    }, [chatId, loadInitialMessages]);

    // Cleanup typing timeouts
    useEffect(() => {
        return () => {
            typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
            typingTimeoutRef.current.clear();
        };
    }, []);

    const onSend = useCallback(
        (text: string) => {
            if (!chatId || !text.trim()) return;
            const success = wsSendMessage(text.trim());
            if (!success) {
                console.error("[ChatScreen] Failed to send message via WebSocket");
            }
        },
        [chatId, wsSendMessage]
    );

    // Typing indicator handler
    const handleTyping = useCallback(
        (isTyping: boolean) => {
            if (chatId) {
                sendTypingIndicator(isTyping);
            }
        },
        [chatId, sendTypingIndicator]
    );

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.select({ios: "padding", android: undefined})}
                keyboardVerticalOffset={Platform.select({ios: 88, android: 0})}
            >
                {isLoadingHistory ? (
                    <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
                        <ActivityIndicator color={colors.main} size="large"/>
                        <Text style={{color: colors.additionalText, marginTop: 12}}>Загрузка сообщений...</Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            ref={listRef}
                            data={[...messages].reverse()}
                            keyExtractor={(item) => item.id?.toString() || `msg-${item.timestamp}`}
                            renderItem={({item}) => {
                                // Convert WebSocketMessage to Message format for MessageBubble
                                const message = {
                                    id: item.id?.toString() || `msg-${item.timestamp}`,
                                    dialogId: item.chat_id.toString(),
                                    senderId: item.sender_id.toString(),
                                    text: item.message,
                                    createdAt: new Date(item.timestamp).getTime(),
                                };
                                return <MessageBubble message={message} isMe={currentUserId !== null && item.sender_id === currentUserId}/>;
                            }}
                            contentContainerStyle={{paddingVertical: 8}}
                            inverted
                            onEndReachedThreshold={0.2}
                            onEndReached={() => {
                                if (!loadingMore && hasMore) {
                                    loadMore();
                                }
                            }}
                            ListFooterComponent={
                                loadingMore ? (
                                    <View style={{paddingVertical: 12}}>
                                        <ActivityIndicator color={colors.main}/>
                                    </View>
                                ) : null
                            }
                            ListHeaderComponent={
                                typingUsers.size > 0 ? (
                                    <View style={{paddingHorizontal: 12, paddingVertical: 8}}>
                                        <Text style={{color: colors.additionalText, fontSize: 12, fontStyle: "italic"}}>
                                            Печатает...
                                        </Text>
                                    </View>
                                ) : null
                            }
                        />
                        {!isConnected && (
                            <View style={{paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#ff6b6b"}}>
                                <Text style={{color: "#fff", fontSize: 12, textAlign: "center"}}>
                                    Нет соединения. Переподключение...
                                </Text>
                            </View>
                        )}
                        <MessageInput onSend={onSend} onTyping={handleTyping}/>
                    </>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
