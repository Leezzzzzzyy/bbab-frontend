# Интеграция API чата с WebSocket

## Обзор

Система чата была интегрирована с реальным API сервера. Все функции работают через:
- **REST API** для получения истории сообщений
- **WebSocket** для отправки и получения сообщений в реальном времени

## Архитектура

### ChatStore (`services/chat.ts`)

Централизованное хранилище для управления всеми операциями чата:

```typescript
export const chatStore = new ChatStore();
```

**Основные методы:**

#### Инициализация
- `setCurrentUserId(userId: number)` - установить ID текущего пользователя
- `loadDialogs(token: string)` - загрузить список чатов пользователя

#### Работа с подключением
- `connectToChat(dialogId: number, token: string)` - подключиться к чату (загружает историю + WebSocket)
- `disconnectChat(dialogId: number)` - отключиться от чата
- `disconnectAll()` - отключиться от всех чатов

#### Получение сообщений
- `getMessages(dialogId: number, before?: number, limit?: number)` - получить сообщения с локальной пагинацией
- `subscribeMessages(dialogId: number, cb: Listener<Message>)` - подписаться на новые сообщения

#### Отправка сообщений
- `sendMessage(dialogId: number, text: string)` - отправить сообщение через WebSocket
- `sendTypingIndicator(dialogId: number, isTyping: boolean)` - отправить индикатор печати
- `markAsRead(dialogId: number, messageId: number)` - отметить сообщение как прочитанное

#### Работа со списком диалогов
- `listDialogs()` - получить список диалогов отсортированный по времени
- `subscribeDialogs(cb: Listener<Dialog[]>)` - подписаться на изменения списка диалогов

### Тип Message

```typescript
export type Message = {
    id: number;              // ID сообщения от сервера
    dialogId: number;        // ID чата
    senderId: number;        // ID отправителя
    text: string;            // Текст сообщения
    createdAt: number;       // Время создания (epoch ms)
};
```

### Тип Dialog

```typescript
export type Dialog = {
    id: number;              // ID чата
    name: string;            // Название чата
    lastMessage?: string;    // Последнее сообщение
    lastTime?: number;       // Время последнего сообщения
    unreadCount?: number;    // Количество непрочитанных
};
```

## Жизненный цикл подключения

### 1. При загрузке приложения
```typescript
// app/_layout.tsx
if (isSignedIn && credentials?.userId) {
    chatStore.setCurrentUserId(credentials.userId);
}
```

### 2. При входе пользователя
```typescript
// components/auth/steps/Step3.tsx
const currentUser = await userAPI.getCurrentUser(response.token);
await setCredentials({
    token: response.token,
    username: username,
    userId: currentUser.id,
    phone: `+7${phoneNumber}`,
});
chatStore.setCurrentUserId(currentUser.id);
```

### 3. При открытии страницы чата
```typescript
// app/(tabs)/messages/[dialogId].tsx
useEffect(() => {
    if (!dialogIdNum || !credentials?.token) return;
    
    const connectChat = async () => {
        await chatStore.connectToChat(dialogIdNum, credentials.token);
        const { messages } = chatStore.getMessages(dialogIdNum, undefined, 50);
        setMessages(messages);
    };
    
    connectChat();
    
    // Подписка на новые сообщения
    const offMessages = chatStore.subscribeMessages(dialogIdNum, (m) => {
        setMessages((prev) => [...prev, m]);
    });
    
    // Очистка при размонтировании
    return () => {
        offMessages();
        chatStore.disconnectChat(dialogIdNum);
    };
}, [dialogIdNum, credentials?.token]);
```

### 4. При отправке сообщения
```typescript
const onSend = useCallback((text: string) => {
    try {
        chatStore.sendMessage(dialogIdNum, text);
    } catch (error) {
        Alert.alert("Error", "Failed to send message");
    }
}, [dialogIdNum]);
```

## API Интеграция

### REST API методы

#### Список чатов
```typescript
await chatAPI.listChats(token) // GET /chat/list
```
Возвращает массив чатов пользователя.

#### История сообщений
```typescript
await chatAPI.getChatMessages(chatId, token, cursor?, limit?, direction?)
// GET /chat/{id}/messages
```
Параметры:
- `cursor` - строка для пагинации
- `limit` - количество сообщений (по умолчанию 20, макс 100)
- `direction` - "older" | "newer" (по умолчанию "older")

Возвращает:
```typescript
{
    data: Message[],
    pagination: {
        nextCursor?: string,
        previousCursor?: string,
        hasNext: boolean,
        hasPrevious: boolean,
        limit: number,
        totalCount: number
    }
}
```

### WebSocket сообщения

#### От клиента к серверу

**Отправка сообщения:**
```json
{
    "type": "message",
    "message": "Текст сообщения",
    "timestamp": 1634567890123
}
```

**Индикатор печати:**
```json
{
    "type": "typing",
    "message": "true"
}
```

**Подтверждение прочтения:**
```json
{
    "type": "read_receipt",
    "message": "12345"
}
```

#### От сервера к клиенту

**Новое сообщение:**
```json
{
    "type": "message",
    "message": {
        "id": 12345,
        "chat_id": 456,
        "sender_id": 789,
        "message": "Текст",
        "timestamp": "2023-10-18T12:30:45Z"
    }
}
```

**История сообщений:**
```json
{
    "type": "history",
    "messages": [...],
    "meta": {
        "count": 25,
        "has_more": true
    }
}
```

**Ошибка:**
```json
{
    "type": "error",
    "message": "Описание ошибки"
}
```

## Обработка ошибок

### REST API ошибки
```typescript
try {
    await chatStore.connectToChat(dialogId, token);
} catch (error) {
    console.error("Failed to connect:", error);
    Alert.alert("Error", "Failed to load chat");
}
```

### WebSocket ошибки
Автоматически обрабатываются в `handleWebSocketMessage()`:
- Парсинг ошибок
- Автоматическое закрытие при ошибке
- Логирование в консоль

## Лимиты и ограничения

- **Rate limit:** 10 сообщений в секунду
- **Max message size:** 5000 символов
- **Max connections per chat:** 100 одновременных
- **Timeout соединения:** 60 секунд

## Отладка

Все операции логируются в консоль:
```
Connecting to WebSocket: ws://94.241.170.140:8080/api/chat/1/ws
WebSocket connected to chat 1
Message sent to chat 1
WebSocket closed for chat 1
```

## Отличия от старой системы

| Функция | Было | Стало |
|---------|------|-------|
| Источник данных | Mock data | Реальный API сервер |
| История сообщений | Жестко закодирована | GET /chat/{id}/messages |
| Отправка сообщений | Mock эмиттер | WebSocket отправка |
| Получение сообщений | Mock эмиттер | WebSocket подписка |
| ID пользователя | Строка "u0" | Число от API |
| Типы ID чатов | Строки | Числа |

## Миграция кода

Если у вас есть код, который использует старый `currentUserId = "u0"`, нужно заменить на:
```typescript
import { chatStore } from "@/services/chat";

// Использование
if (item.senderId === chatStore.currentUserId) {
    // Это мое сообщение
}
```

