import colors from "@/assets/colors";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import {chatStore, currentUserId, type Message} from "@/services/chat";
import {useLocalSearchParams, useNavigation} from "expo-router";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    View,
} from "react-native";

export default function ChatScreen() {
    const {dialogId} = useLocalSearchParams<{ dialogId: string }>();
    const nav = useNavigation();

    const dialog = useMemo(() => chatStore.listDialogs().find((d) => d.id === dialogId), [dialogId]);

    useEffect(() => {
        if (dialog) {
            nav.setOptions({title: dialog.name});
        }
    }, [dialog, nav]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const listRef = useRef<FlatList<Message>>(null);

    const loadMore = useCallback(() => {
        if (!dialogId || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const {messages: batch, hasMore: more, nextCursor} = chatStore.getMessages(dialogId, cursor, 20);
        setMessages((prev) => [...batch, ...prev]);
        setHasMore(more);
        setCursor(nextCursor);
        setLoadingMore(false);
    }, [cursor, dialogId, hasMore, loadingMore]);

    useEffect(() => {
        // initial load: get latest page
        setMessages([]);
        setHasMore(true);
        setCursor(undefined);
        setLoadingMore(false);
        loadMore();

        // live subscription for new messages
        const off = chatStore.subscribeMessages(dialogId!, (m) => {
            setMessages((prev) => [...prev, m]);
            requestAnimationFrame(() => listRef.current?.scrollToOffset({offset: 0, animated: true}));
        });
        return () => off();
    }, [dialogId]);

    const onSend = useCallback(
        (text: string) => {
            if (!dialogId) return;
            chatStore.sendMessage(dialogId, text);
        },
        [dialogId]
    );

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.select({ios: "padding", android: undefined})}
                keyboardVerticalOffset={Platform.select({ios: 88, android: 0})}
            >
                <FlatList
                    ref={listRef}
                    data={[...messages].reverse()}
                    keyExtractor={(item) => item.id}
                    renderItem={({item}) => (
                        <MessageBubble message={item} isMe={item.senderId === currentUserId}/>)
                    }
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
                />
                <MessageInput onSend={onSend}/>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
