# WebSocket Fixes

## Проблемы
1. **TypeError: can't access property "toString", item.id is undefined** - при отправке сообщений
2. **WebSocket не подключалась** - отсутствовала передача токена аутентификации
3. **Дублирование сообщений** - некорректная логика эмита событий

## Решения

### 1. Передача токена при подключении к WebSocket
- Токен теперь передается как query-параметр `?token=<TOKEN>`
- Это необходимо потому что WebSocket API в браузере не поддерживает произвольные заголовки
- Обновлен метод `connectWebSocket()` в `services/chat.ts`

```typescript
const encodedToken = encodeURIComponent(token);
const wsUrl = `${WS_BASE_URL}/chat/${dialogId}/ws?token=${encodedToken}`;
```

### 2. Обработка структуры данных от сервера
Сервер отправляет сообщения с полями в uppercase (`ID`, `Timestamp` и т.д.), а не lowercase.

Исправленная обработка в `handleWebSocketMessage()`:
```typescript
case "message": {
    const msgData = data.message as any;
    const msg: Message = {
        id: msgData.ID || msgData.id || 0,  // ID вместо id
        dialogId: msgData.chat_id || dialogId,
        senderId: msgData.sender_id,
        text: msgData.message,
        createdAt: new Date(msgData.Timestamp || msgData.timestamp).getTime(),
    };
    if (msg.id > 0) {  // Фильтруем сообщения с ID=0
        this.addMessage(dialogId, msg);
    }
}
```

### 3. Фильтрация и дедупликация сообщений
- Обновлена функция `addMessage()` - эмит событий происходит только если сообщение было добавлено
- В компоненте добавлена фильтрация перед рендером: `.filter(m => m.id > 0)`
- Улучшен `keyExtractor` для более надежной идентификации: `msg-${item.id}`

```typescript
// В [dialogId].tsx
data={[...messages].reverse().filter(m => m.id > 0)}
keyExtractor={(item) => `msg-${item.id}`}
```

### 4. Исправлена отправка read_receipt
Изменено с неправильного формата на корректный:
```typescript
// Было (неправильно)
message: messageId.toString()

// Стало (правильно)
message_id: messageId
```

## Структура сообщений от сервера

### При подключении
```json
{
  "type": "room_info",
  "message": {
    "chat_id": 7,
    "active_clients": 1,
    "created_at": "2025-12-10T21:01:27.762979908Z",
    "last_activity": "2025-12-10T21:04:15.126493612Z"
  }
}
```

### История сообщений
```json
{
  "type": "history",
  "messages": [
    {
      "ID": 1,
      "CreatedAt": "2025-12-10T17:56:20.018243Z",
      "chat_id": 7,
      "sender_id": 8,
      "message": "Текст сообщения",
      "Timestamp": "2025-12-10T17:56:20.018218Z"
    }
  ],
  "meta": {
    "count": 2,
    "has_more": false
  }
}
```

### Новое сообщение
```json
{
  "type": "message",
  "message": {
    "ID": 0,
    "chat_id": 7,
    "sender_id": 7,
    "message": "Текст сообщения",
    "Timestamp": "2025-12-10T21:04:35.010250514Z"
  }
}
```

### Подтверждение отправки
```json
{
  "type": "message_sent",
  "timestamp": "2025-12-10T21:04:35.010250514Z"
}
```

## Файлы которые были изменены
1. `services/chat.ts` - исправлена передача токена и обработка сообщений
2. `app/(tabs)/messages/[dialogId].tsx` - добавлена фильтрация и улучшен keyExtractor

