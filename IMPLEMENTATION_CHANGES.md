# Implemented Changes - WebSocket & Messaging Improvements

## Overview
Реализованы все требуемые изменения для упрощения системы обмена сообщениями и добавления механизма переподключения.

## Changes Made

### 1. ✅ Удаление Message Queue (`services/chat.ts`)

**Было:**
- Система очередирования сообщений с `messageQueue` Map
- Попытка отправить в очередь, если WS не готово
- Обработка очереди при подключении

**Стало:**
- Прямая отправка сообщений в WebSocket
- Выброс ошибки `Error('WebSocket not connected')` если не готово
- Упрощенный код с минимум состояния

```typescript
sendMessage(dialogId: number, text: string) {
    const ws = this.activeConnections.get(dialogId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(`WebSocket not connected to chat ${dialogId}`);
    }
    
    ws.send(JSON.stringify({
        type: "message",
        message: text.trim(),
        timestamp: Date.now(),
    }));
}
```

**Преимущества:**
- ✅ Меньше state management
- ✅ Более явное поведение (fail fast)
- ✅ Обработка ошибок на UI уровне

---

### 2. ✅ Кеш пользователей с TTL (`services/chat.ts`)

**Добавлено:**
- `userCache: Map<number, CachedUser>` - кеш информации об отправителях
- TTL = 5 минут для автоматической инвалидации

```typescript
private userCache = new Map<number, CachedUser>();
private readonly USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async getUser(userId: number): Promise<User> {
    const cached = this.userCache.get(userId);
    
    // Return cached if valid
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_TTL) {
        return cached.data;
    }
    
    try {
        const user = await userAPI.getUser(userId);
        this.userCache.set(userId, { data: user, timestamp: Date.now() });
        return user;
    } catch (error) {
        return { id: userId, username: "Неизвестно", ... };
    }
}
```

**Особенности:**
- ✅ Автоматическая инвалидация через 5 минут
- ✅ На ошибку возвращает "Неизвестно"
- ✅ Метод `clearUserCache()` для ручной очистки

---

### 3. ✅ Механизм переподключения (`services/chat.ts`)

**Добавлено:**
- Экспоненциальная задержка: 1s → 2s → 4s → 8s → ...
- Максимум 10 попыток переподключения
- Автоматическая переподписка при восстановлении

```typescript
private scheduleReconnect(dialogId: number, token: string) {
    const attempts = this.reconnectAttempts.get(dialogId) ?? 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
        emitter.emit(`chat:status:${dialogId}`, "reconnect_failed");
        return;
    }
    
    const delay = this.BASE_RECONNECT_DELAY * Math.pow(2, attempts);
    
    const timer = setTimeout(() => {
        this.reconnectAttempts.set(dialogId, attempts + 1);
        emitter.emit(`chat:status:${dialogId}`, "reconnecting");
        this.connectWebSocket(dialogId, token);
    }, delay);
    
    this.reconnectTimers.set(dialogId, timer);
}
```

**Статусы:**
- `"connecting"` - начальное подключение
- `"connected"` - успешное подключение
- `"reconnecting"` - попытка переподключения
- `"disconnected"` - отключено пользователем
- `"reconnect_failed"` - все попытки исчерпаны

---

### 4. ✅ Отображение имени отправителя (`components/chat/MessageBubble.tsx`)

**Добавлено:**
- Параметр `senderName?: string` в props
- Отображение имени выше сообщения для чужих сообщений (слева)
- Собственные сообщения справа без имени

```typescriptreact
export default function MessageBubble({
    message,
    isMe,
    senderName,
    onEdit,
    onDelete,
}: { ... }) {
    return (
        <View>
            {/* Sender name for other users' messages */}
            {!isMe && senderName && (
                <Text style={{ fontSize: 12, fontWeight: "600" }}>
                    {senderName}
                </Text>
            )}
            <View>
                {/* Message bubble */}
            </View>
        </View>
    );
}
```

---

### 5. ✅ Загрузка информации об отправителе (`app/(tabs)/messages/[dialogId].tsx`)

**Добавлено:**
- Состояние `senderNames: {[key: number]: string}` - локальный кеш имён
- Асинхронная загрузка информации через `chatStore.getUser()`
- Передача `senderName` в `MessageBubble`

```typescriptreact
renderItem={({item}) => {
    const isMe = item.senderId === chatStore.currentUserId;
    const senderName = senderNames[item.senderId];
    
    // Load sender name if not Me and not cached
    if (!isMe && !senderName) {
        chatStore.getUser(item.senderId).then((user) => {
            setSenderNames((prev) => ({
                ...prev,
                [item.senderId]: user.username || "Неизвестно",
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
```

---

### 6. ✅ Обработка ошибок отправки сообщения (`app/(tabs)/messages/[dialogId].tsx`)

**Было:**
```typescript
const onSend = useCallback(
    (text: string) => {
        chatStore.sendMessage(dialogIdNum, text);
    },
    [dialogIdNum]
);
```

**Стало:**
```typescript
const onSend = useCallback(
    (text: string) => {
        if (!dialogIdNum) return;
        try {
            chatStore.sendMessage(dialogIdNum, text);
        } catch (error) {
            Alert.alert("Error", "Failed to send message. Please try again.");
        }
    },
    [dialogIdNum]
);
```

---

### 7. ✅ Удаление useMessageQueue

**Удалено:**
- Файл `hooks/useMessageQueue.ts` (больше не используется)
- Все ссылки на hook в компонентах

---

## Testing Checklist

- [ ] Подключение к WS при входе в чат
- [ ] Отправка сообщений напрямую в WS
- [ ] Ошибка при отправке если WS не подключен
- [ ] Отображение имени отправителя для чужих сообщений
- [ ] Отсутствие имени для собственных сообщений
- [ ] Кеш пользователей работает (5 минут TTL)
- [ ] Переподключение при потере связи
- [ ] Экспоненциальная задержка между попытками
- [ ] Максимум 10 попыток переподключения
- [ ] Обновление статуса соединения в UI

---

## Architecture Benefits

1. **Меньше complexity** - удалена очередь, меньше state
2. **Лучше error handling** - fail fast вместо hidden queue
3. **Больше reliability** - автоматическое переподключение
4. **Лучше UX** - пользователи видят имена в групповых чатах
5. **Efficient caching** - кеш с TTL предотвращает лишние запросы

---

## Environment Variables

Убедитесь, что установлены:
- `WS_BASE_URL` в `.env` или `config/environment.ts`
- API доступна на `userAPI.getUser()` endpoint

---

## Notes

- При отключении пользователя все таймеры очищаются в `disconnectAll()`
- Кеш пользователей персистентен в памяти, но инвалидируется при TTL
- Статусы соединения транслируются через emitter для UI обновлений

