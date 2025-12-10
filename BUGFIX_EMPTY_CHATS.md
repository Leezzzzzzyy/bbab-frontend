# 🐛 Исправления: Обработка пустых чатов и сообщений

## Проблема

При загрузке чатов у пользователя который не имеет чатов, или при загрузке пустого чата без сообщений, приложение падало с ошибкой:

```
Failed to load dialogs: TypeError: can't access property "map", chats is null
```

## Причины

1. **В ChatStore.loadDialogs()**: Сервер возвращал `null` вместо пустого массива, код пытался вызвать `.map()` на null
2. **В ChatStore.loadChatMessages()**: Не проверялась корректность ответа перед использованием
3. **В WebSocket обработке**: История ("history" событие) не обрабатывала null или пустые массивы
4. **В UI**: Нет отображения состояния когда список пуст

## Решения

### 1. ChatStore.loadDialogs() ✅

**Добавлена проверка на null и тип:**
```typescript
async loadDialogs(token: string) {
    try {
        const chats = await chatAPI.listChats(token);
        // Handle case when chats is null or not an array
        if (!chats || !Array.isArray(chats)) {
            this.dialogs = [];
        } else {
            this.dialogs = chats.map((chat) => { ... });
        }
        // ...
    } catch (error) {
        console.error("Failed to load dialogs:", error);
        // Set empty dialogs on error
        this.dialogs = [];
        this.recalcDialogSummaries();
    }
}
```

**Что изменилось:**
- Проверка на null: `if (!chats || !Array.isArray(chats))`
- При ошибке также устанавливаются пустые диалоги
- Всегда вызывается `recalcDialogSummaries()`

### 2. ChatStore.loadChatMessages() ✅

**Добавлена проверка на null в response.data:**
```typescript
private async loadChatMessages(dialogId: number, token: string) {
    try {
        const response = await chatAPI.getChatMessages(dialogId, token, undefined, 50);
        
        // Handle case when response data is null or not an array
        if (!response?.data || !Array.isArray(response.data)) {
            this.messagesByDialog.set(dialogId, []);
            emitter.emit("messages:loaded", { dialogId, messages: [] });
            return;
        }
        
        const messages = response.data.map((msg) => { ... });
        // ...
    } catch (error) {
        console.error(`Failed to load messages for chat ${dialogId}:`, error);
        // Set empty messages array on error
        this.messagesByDialog.set(dialogId, []);
    }
}
```

**Что изменилось:**
- Проверка на null в response: `if (!response?.data || !Array.isArray(response.data))`
- При пустом массиве устанавливается пустой массив сообщений
- При ошибке также устанавливаются пустые сообщения
- Не прерывает соединение WebSocket

### 3. WebSocket обработка "history" события ✅

**Улучшена обработка истории:**
```typescript
case "history": {
    // Message history on initial connection
    if (data.messages && Array.isArray(data.messages)) {
        const messages = data.messages.map((msg: any) => { ... });
        // ...
    } else {
        // No history messages
        this.messagesByDialog.set(dialogId, []);
        emitter.emit("messages:history", { dialogId, messages: [] });
    }
    break;
}
```

**Что изменилось:**
- Добавлена явная проверка на null: `if (data.messages && Array.isArray(...))`
- Явно устанавливается пустой массив если истории нет
- Эмитируется событие в обоих случаях

### 4. UI - Список чатов (messages/index.tsx) ✅

**Добавлен ListEmptyComponent:**
```typescript
<FlatList
    // ...
    ListEmptyComponent={() => (
        <View style={{...}}>
            <Text>No chats yet</Text>
            <Text>Start a conversation to begin messaging</Text>
        </View>
    )}
/>
```

**Что добавилось:**
- Отображение сообщения когда нет чатов
- Подсказка пользователю

### 5. UI - Диалог (messages/[dialogId].tsx) ✅

**Добавлен ListEmptyComponent для сообщений:**
```typescript
<FlatList
    // ...
    ListEmptyComponent={
        !isConnecting ? (
            <View>
                <Text>No messages yet</Text>
                <Text>Start the conversation</Text>
            </View>
        ) : null
    }
/>
```

**Что добавилось:**
- Отображение сообщения когда нет сообщений в чате
- Не показывается пока идет загрузка (isConnecting)
- Text импорт добавлен в imports

## Протестировано

### Сценарий 1: Пользователь без чатов ✅
- Сервер возвращает null или пустой массив
- UI отображает: "No chats yet"
- Нет ошибок в консоли

### Сценарий 2: Пустой чат (нет сообщений) ✅
- Загружается диалог с пустым массивом сообщений
- UI отображает: "No messages yet"
- Можно отправлять сообщения

### Сценарий 3: Ошибка API ✅
- При 401, 403, 500 ошибках
- Устанавливаются пустые массивы
- Показываются пользовательские Alert уведомления

## Файлы которые были изменены

1. **services/chat.ts**
   - loadDialogs() - добавлена null проверка
   - loadChatMessages() - добавлена null проверка в response.data
   - handleWebSocketMessage() - улучшена обработка "history" события

2. **app/(tabs)/messages/index.tsx**
   - Добавлен ListEmptyComponent

3. **app/(tabs)/messages/[dialogId].tsx**
   - Добавлен ListEmptyComponent для сообщений
   - Добавлен Text импорт

## Резюме

Все случаи с null и пустыми данными теперь обработаны. Приложение не будет падать при:
- Пользователе без чатов
- Пустом чате (без сообщений)
- Ошибках API
- Null ответах от сервера

UI корректно показывает пустые состояния с подсказками пользователю.

---

**Дата исправления**: 2024-12-10  
**Статус**: ✅ ГОТОВО

