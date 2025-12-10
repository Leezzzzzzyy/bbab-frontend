# 📖 Примеры использования новой системы чата

## 1. Загрузка списка чатов

### Во время загрузки приложения

```typescript
// app/_layout.tsx
import { chatStore } from "@/services/chat";
import { useAuth } from "@/context/AuthContext";

function RootLayoutContent() {
    const { credentials } = useAuth();
    
    useEffect(() => {
        if (credentials?.userId) {
            chatStore.setCurrentUserId(credentials.userId);
        }
    }, [credentials?.userId]);
    
    // ...
}
```

### При открытии страницы сообщений

```typescript
// app/(tabs)/messages/index.tsx
const [dialogs, setDialogs] = useState<Dialog[]>([]);
const { credentials } = useAuth();

useEffect(() => {
    const loadDialogs = async () => {
        if (!credentials?.token) return;
        await chatStore.loadDialogs(credentials.token);
        setDialogs(chatStore.listDialogs());
    };
    
    loadDialogs();
    
    // Подписка на изменения
    const off = chatStore.subscribeDialogs((d) => setDialogs(d));
    return () => off();
}, [credentials?.token]);
```

## 2. Подключение к чату

### Автоматическое подключение

```typescript
// app/(tabs)/messages/[dialogId].tsx
const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
const { credentials } = useAuth();
const [messages, setMessages] = useState<Message[]>([]);

useEffect(() => {
    if (!dialogId || !credentials?.token) return;
    
    const connectChat = async () => {
        try {
            // Подключается и загружает историю
            await chatStore.connectToChat(parseInt(dialogId), credentials.token);
            
            // Получить загруженные сообщения
            const { messages: loaded } = chatStore.getMessages(parseInt(dialogId));
            setMessages(loaded);
        } catch (error) {
            Alert.alert("Error", "Failed to connect to chat");
        }
    };
    
    connectChat();
    
    // Подписка на новые сообщения
    const offMessages = chatStore.subscribeMessages(parseInt(dialogId), (msg) => {
        setMessages((prev) => [...prev, msg]);
    });
    
    // Очистка
    return () => {
        offMessages();
        chatStore.disconnectChat(parseInt(dialogId));
    };
}, [dialogId, credentials?.token]);
```

## 3. Отправка сообщения

```typescript
const onSend = useCallback((text: string) => {
    try {
        chatStore.sendMessage(parseInt(dialogId), text);
        // Сообщение отправлено в WebSocket
    } catch (error) {
        console.error("Failed to send message:", error);
        Alert.alert("Error", "Failed to send message");
    }
}, [dialogId]);
```

## 4. Получение сообщений

### Все загруженные сообщения

```typescript
const dialogIdNum = parseInt(dialogId);
const { messages } = chatStore.getMessages(dialogIdNum);
```

### С пагинацией (для infinite scroll)

```typescript
const { messages, hasMore, nextCursor } = chatStore.getMessages(
    dialogIdNum,
    cursor,  // null для первой загрузки
    20       // количество сообщений
);

// Когда нужны более старые сообщения:
loadMore = () => {
    const { messages: batch, hasMore: more, nextCursor } = 
        chatStore.getMessages(dialogIdNum, cursor, 20);
    setMessages((prev) => [...batch, ...prev]);
    setCursor(nextCursor);
};
```

### Подписка на новые сообщения

```typescript
const offMessages = chatStore.subscribeMessages(dialogIdNum, (newMsg) => {
    setMessages((prev) => [...prev, newMsg]);
    // Автоматически скроллится вниз
    scrollToBottom();
});

// Не забыть отписаться
return () => offMessages();
```

## 5. Индикатор печати

### Отправить когда пользователь начал печатать

```typescript
const [isTyping, setIsTyping] = useState(false);

const handleTextChange = (text: string) => {
    setText(text);
    
    if (!isTyping) {
        setIsTyping(true);
        chatStore.sendTypingIndicator(dialogIdNum, true);
        
        // Через 2 секунды без действия отключить
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            chatStore.sendTypingIndicator(dialogIdNum, false);
        }, 2000);
    }
};

const handleSubmit = (text: string) => {
    clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    chatStore.sendTypingIndicator(dialogIdNum, false);
    chatStore.sendMessage(dialogIdNum, text);
};
```

## 6. Подтверждение прочтения

```typescript
const handleMessageRead = (messageId: number) => {
    chatStore.markAsRead(dialogIdNum, messageId);
};

// Например, в onViewableItemsChanged FlatList
const onViewableItemsChanged = ({ viewableItems }: any) => {
    viewableItems.forEach((item: any) => {
        if (item.isViewable) {
            handleMessageRead(item.item.id);
        }
    });
};
```

## 7. Обработка ошибок

### REST API ошибки

```typescript
try {
    await chatStore.loadDialogs(token);
} catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    Alert.alert("Load Error", message);
}
```

### WebSocket ошибки

Автоматически обрабатываются в ChatStore, но вы можете мониторить консоль:

```typescript
// В консоли будет видно:
// WebSocket error for chat 1: ...
// WebSocket closed for chat 1
```

## 8. Получение текущего пользователя

```typescript
// chatStore.currentUserId установлен при инициализации
const isMyMessage = message.senderId === chatStore.currentUserId;

// Использовать в UI
<MessageBubble 
    message={msg}
    isMe={msg.senderId === chatStore.currentUserId}
/>
```

## 9. Полный пример компоненты диалога

```typescript
import { chatStore } from "@/services/chat";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, View, Alert, ActivityIndicator } from "react-native";

export default function DialogScreen() {
    const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
    const { credentials } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dialogIdNum = parseInt(dialogId);

    useEffect(() => {
        if (!dialogIdNum || !credentials?.token) return;

        const connect = async () => {
            setIsLoading(true);
            try {
                await chatStore.connectToChat(dialogIdNum, credentials.token);
                const { messages: loaded } = chatStore.getMessages(dialogIdNum);
                setMessages(loaded);
            } catch (error) {
                Alert.alert("Error", "Failed to connect");
            } finally {
                setIsLoading(false);
            }
        };

        connect();

        const offMessages = chatStore.subscribeMessages(dialogIdNum, (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            offMessages();
            chatStore.disconnectChat(dialogIdNum);
        };
    }, [dialogIdNum, credentials?.token]);

    const onSend = (text: string) => {
        try {
            chatStore.sendMessage(dialogIdNum, text);
        } catch (error) {
            Alert.alert("Error", "Failed to send message");
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : (
                <>
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <MessageBubble
                                message={item}
                                isMe={item.senderId === chatStore.currentUserId}
                            />
                        )}
                        inverted
                    />
                    <MessageInput onSend={onSend} />
                </>
            )}
        </View>
    );
}
```

## 10. Отключение от всех чатов

```typescript
// При выходе из приложения
useEffect(() => {
    return () => {
        chatStore.disconnectAll();
    };
}, []);
```

## Важные замечания

### ⚠️ WebSocket сохраняет соединение
- Соединение остается открытым пока пользователь не закроет экран
- При выходе из диалога соединение закрывается автоматически
- При закрытии приложения все соединения закрываются

### 📝 Сообщения локально кешируются
- Сообщения хранятся в памяти `messagesByDialog` Map
- При перезагрузке приложения данные теряются
- История всегда загружается свежая с сервера

### 🔐 Аутентификация
- Bearer токен передается в REST запросах
- WebSocket требует того же токена (через заголовки или другой механизм)
- Если токен истекает, нужно переподключиться

### ⏱️ Таймауты
- Ping-Pong отправляется сервером каждые 54 секунды
- Если нет пинга 60 секунд - соединение закроется
- Нет автоматического переподключения - нужно добавить при необходимости

