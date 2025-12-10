# 🎨 Новые функции: Typing Indicators, Read Receipts, Message Editing

## ✅ Реализованные функции

### 1. UI для Typing Indicators 🔤

**Что это?** Показывает когда другой пользователь печатает сообщение.

**Файлы:**
- `components/chat/TypingIndicator.tsx` - новая компонента
- `services/chat.ts` - отслеживание печатающих пользователей
- `app/(tabs)/messages/[dialogId].tsx` - интеграция в экран

**Как это работает:**

```typescript
// В ChatStore
getTypingUsers(dialogId: number): TypingUser[]
subscribeTyping(dialogId: number, cb: Listener<{ users: TypingUser[] }>)
sendTypingIndicator(dialogId: number, isTyping: boolean)

// В компоненте диалога
const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

// Подписка на события
const offTyping = chatStore.subscribeTyping(dialogIdNum, ({ users }) => {
    setTypingUsers(users);
});

// Отправка индикатора при печати
const handleTextChange = (text: string) => {
    if (!isTyping && text.trim()) {
        setIsTyping(true);
        chatStore.sendTypingIndicator(dialogIdNum, true);
    }
};

// Отображение компоненты
<TypingIndicator typingUsers={typingUsers} />
```

**UI:**
- Строка с анимированными точками
- Имена печатающих пользователей
- Автоматически исчезает когда пользователь выходит из режима печати

### 2. UI для Read Receipts ✓

**Что это?** Показывает кто прочитал ваше сообщение.

**Файлы:**
- `components/chat/MessageBubble.tsx` - иконка read receipt
- `services/chat.ts` - отправка read_receipt событий

**Как это работает:**

```typescript
// Message type теперь имеет поле
export type Message = {
    // ...
    readBy?: number[]; // ID пользователей которые прочитали
};

// В MessageBubble
{isMe && message.readBy && message.readBy.length > 0 && (
    <Ionicons
        name="checkmark-done"
        size={12}
        color={message.readBy.length > 0 ? "#0084ff" : "#2a2a2a"}
    />
)}

// Отправка подтверждения
chatStore.markAsRead(dialogId, messageId);
```

**UI:**
- Голубая двойная галочка рядом со временем сообщения
- Только для своих сообщений
- Показывает что сообщение прочитано

### 3. Message Editing 📝

**Что это?** Позволяет отредактировать уже отправленное сообщение.

**Файлы:**
- `components/chat/MessageBubble.tsx` - UI для editing
- `services/chat.ts` - методы editMessage

**Как это работает:**

```typescript
// Long press на сообщение показывает кнопки действия
const [showActions, setShowActions] = useState(false);
const [isEditing, setIsEditing] = useState(false);

// Нажатие на кнопку edit входит в режим редактирования
{isEditing && isMe ? (
    <View>
        {/* Отображение текста для редактирования */}
        <Text>{editText}</Text>
        {/* Кнопки Cancel/Save */}
        <Pressable onPress={() => setIsEditing(false)}>
            <Text>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleEdit}>
            <Text>Save</Text>
        </Pressable>
    </View>
) : (
    {/* Обычное отображение сообщения */}
)}

// Отправка отредактированного сообщения
const handleEdit = () => {
    chatStore.editMessage(dialogId, messageId, newText);
};
```

**WebSocket сообщение:**
```json
{
    "type": "message_edit",
    "message_id": 12345,
    "message": "Новый текст",
    "timestamp": 1634567890123
}
```

**UI:**
- Long press на сообщение (только свои сообщения)
- Появляются кнопки: edit (карандаш) и delete (корзина)
- При редактировании показывается "(edited)" рядом с временем

### 4. Message Deletion 🗑️

**Что это?** Позволяет удалить отправленное сообщение.

**Файлы:**
- `components/chat/MessageBubble.tsx` - UI для deletion
- `services/chat.ts` - методы deleteMessage

**Как это работает:**

```typescript
// При нажатии на кнопку delete показывается подтверждение
const handleDelete = () => {
    Alert.alert(
        "Delete message",
        "Are you sure you want to delete this message?",
        [
            { text: "Cancel" },
            {
                text: "Delete",
                onPress: () => {
                    chatStore.deleteMessage(dialogId, messageId);
                },
                style: "destructive",
            },
        ]
    );
};

// Отправка на сервер
const deleteMessage = (dialogId: number, messageId: number) => {
    const payload = {
        type: "message_delete",
        message_id: messageId,
        timestamp: Date.now(),
    };
    ws.send(JSON.stringify(payload));
};
```

**WebSocket сообщение:**
```json
{
    "type": "message_delete",
    "message_id": 12345,
    "timestamp": 1634567890123
}
```

**UI:**
- Long press на сообщение (только свои сообщения)
- Красная кнопка корзины
- Подтверждение перед удалением
- После удаления сообщение показывает "[Deleted]"

## 📝 Message Type обновления

```typescript
export type Message = {
    id: number;
    dialogId: number;
    senderId: number;
    text: string;
    createdAt: number;
    updatedAt?: number;      // ← для edited сообщений
    isDeleted?: boolean;      // ← для deleted сообщений
    readBy?: number[];        // ← для read receipts
};

export type TypingUser = {
    userId: number;
    username: string;
    isTyping: boolean;
};
```

## 🔄 Жизненный цикл Typing

```
1. Пользователь начинает печатать
   ↓
2. sendTypingIndicator(true) отправляет WebSocket событие
   ↓
3. Сервер отправляет это другим клиентам
   ↓
4. TypingIndicator компонента показывает имя пользователя
   ↓
5. Через 3 секунды без действия автоматически отправляется false
   ↓
6. TypingIndicator исчезает
```

## 📱 Обновленные компоненты

### MessageBubble
- Добавлены пропсы: `onEdit`, `onDelete`
- Long press для показа action buttons
- Edit mode с сохранением/отменой
- Display deleted message
- Read receipt иконка

### TypingIndicator (новая)
- Анимированные точки
- Список печатающих пользователей
- Автоматическое скрытие когда пусто

### MessageInput
- Добавлен пропс: `onTextChange`
- Вызывается при каждом изменении текста
- Используется для отправки typing indicators

## 🔧 ChatStore методы

```typescript
// Typing
getTypingUsers(dialogId: number): TypingUser[]
subscribeTyping(dialogId: number, cb: Listener<{ users: TypingUser[] }>)
sendTypingIndicator(dialogId: number, isTyping: boolean)

// Editing
editMessage(dialogId: number, messageId: number, newText: string)

// Deletion
deleteMessage(dialogId: number, messageId: number)

// Read receipts
markAsRead(dialogId: number, messageId: number)
```

## 🧪 Тестирование

### Typing Indicators
```bash
1. Открыть диалог в двух браузерах
2. В первом начать печатать в поле ввода
3. Во втором должна появиться "User is typing..."
4. Пауза 3+ секунд - disappears
```

### Read Receipts
```bash
1. Отправить сообщение
2. Рядом со временем появится серая галочка
3. Когда другой прочитает - станет голубой
```

### Message Editing
```bash
1. Long press на свое сообщение
2. Нажать на кнопку карандаша
3. Отредактировать текст
4. Нажать Save или Cancel
5. Сообщение обновится с пометкой "(edited)"
```

### Message Deletion
```bash
1. Long press на свое сообщение
2. Нажать на кнопку корзины
3. Подтвердить удаление
4. Сообщение изменится на "[Deleted]"
```

## ⚠️ Важные замечания

### Typing Indicators
- Автоматически отправляется false через 3 секунды без действий
- Отключается при нажатии Send
- Не отправляется для пустого текста

### Read Receipts
- Требует поддержки на сервере (readBy поле)
- Синхронизируется через WebSocket
- Только для своих сообщений

### Message Editing
- Только свои сообщения можно редактировать
- На сервере должно быть поле updatedAt
- Показывает "(edited)" рядом с временем

### Message Deletion
- Только свои сообщения можно удалять
- Сообщение заменяется на "[Deleted]"
- Требует подтверждения через Alert

## 🚀 Готово к использованию

Все функции полностью интегрированы и готовы к использованию!

---

**Дата реализации**: 2024-12-10  
**Статус**: ✅ READY

