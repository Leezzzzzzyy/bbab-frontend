# WebSocket Message Queue Implementation

## Проблема
При попытке отправить сообщение до полного подключения к WebSocket возникала ошибка:
```
Failed to send message: Error: WebSocket not connected to chat 7
```

## Решение
Добавлена система очереди сообщений которая:
1. Автоматически добавляет сообщения в очередь если соединение не готово
2. Обрабатывает очередь после успешного подключения
3. Не требует изменений в UI компоненте

## Реализация

### 1. Добавлена очередь сообщений в ChatStore
```typescript
messageQueue = new Map<number, string[]>(); // очередь сообщений по dialogId
```

### 2. Улучшен метод sendMessage()
Теперь вместо выброса исключения:
- Если соединение не готово → сообщение добавляется в очередь
- Если соединение готово → сообщение отправляется сразу
- Если ошибка при отправке → сообщение добавляется в очередь

```typescript
sendMessage(dialogId: number, text: string) {
    const ws = this.activeConnections.get(dialogId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Добавить в очередь
        let queue = this.messageQueue.get(dialogId);
        if (!queue) {
            queue = [];
            this.messageQueue.set(dialogId, queue);
        }
        queue.push(text);
        return;
    }

    // Отправить сразу
    ws.send(JSON.stringify(payload));
}
```

### 3. Добавлен метод processMessageQueue()
Вызывается сразу после успешного подключения WebSocket:
```typescript
ws.onopen = () => {
    console.log(`WebSocket connected to chat ${dialogId}`);
    emitter.emit(`chat:status:${dialogId}`, "connected");
    // Обрабатываем очередь
    this.processMessageQueue(dialogId);
};
```

### 4. Упрощена обработка отправки в компоненте
```typescript
const onSend = useCallback(
    (text: string) => {
        if (!dialogIdNum) return;
        // Просто отправляем - очередь управляется автоматически
        chatStore.sendMessage(dialogIdNum, text);
    },
    [dialogIdNum]
);
```

## Преимущества
- ✅ Пользователь может писать сообщения сразу при входе в чат
- ✅ Сообщения автоматически отправляются когда соединение готово
- ✅ Не нужно показывать ошибки пользователю
- ✅ Прозрачная работа для UI компонента
- ✅ Надежная доставка сообщений

## Пример использования

```typescript
// Пользователь пишет сообщение до подключения
chatStore.sendMessage(7, "Привет!"); 
// → Добавляется в очередь

// Соединение устанавливается
ws.onopen = () => {
    // → "Привет!" автоматически отправляется
}

// Если пользователь напишет еще до подключения
chatStore.sendMessage(7, "Второе сообщение");
// → Тоже добавляется в очередь и отправляется после "Привет!"
```

## Файлы которые были изменены
1. `services/chat.ts`:
   - Добавлено `messageQueue` в ChatStore
   - Обновлен метод `sendMessage()`
   - Добавлен метод `processMessageQueue()`
   - Добавлен вызов обработки очереди в `ws.onopen`

2. `app/(tabs)/messages/[dialogId].tsx`:
   - Упрощена обработка в `onSend()` callback

3. `hooks/useMessageQueue.ts`:
   - Новый хук для управления очередью (опциональный, не используется в текущей реализации)

