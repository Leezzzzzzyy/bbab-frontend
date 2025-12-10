# Future Features Implementation Guide

## 🎯 Следующие шаги для разработки

### 1. Typing Indicators (Пользователь печатает...)

**Компонент уже существует:** `components/chat/TypingIndicator.tsx`

**Что нужно добавить в chat.ts:**
```typescript
// Отправка индикатора печати
sendTypingIndicator(dialogId: number, isTyping: boolean) {
    const ws = this.activeConnections.get(dialogId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
        type: "typing",
        message: isTyping.toString(),
    }));
}

// Обработка получения индикатора печати
case "typing": {
    const typingUser: TypingUser = {
        userId: data.user_id || 0,
        username: data.username || "Unknown",
        isTyping: data.message === "true",
    };
    // Обновить typingUsers map
    let users = this.typingUsers.get(dialogId) ?? [];
    const idx = users.findIndex(u => u.userId === typingUser.userId);
    if (idx !== -1) {
        users[idx] = typingUser;
    } else {
        users.push(typingUser);
    }
    this.typingUsers.set(dialogId, users);
    emitter.emit(`typing:${dialogId}`, users);
    break;
}
```

**В компоненте [dialogId].tsx:**
```typescript
const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

useEffect(() => {
    const unsubscribe = chatStore.subscribeTyping?.(dialogIdNum, (users) => {
        setTypingUsers(users);
    });
    return unsubscribe;
}, [dialogIdNum]);

// В return - отобразить перед MessageInput
{typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
```

---

### 2. Read Receipts (Галочки "прочитано")

**Что нужно добавить в Message тип:**
```typescript
export type Message = {
    // ... existing fields
    readBy?: number[]; // ID пользователей которые прочитали
    isRead?: boolean;  // прочитано ли текущим пользователем
};
```

**Отправка read receipt:**
```typescript
markAsRead(dialogId: number, messageId: number) {
    const ws = this.activeConnections.get(dialogId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
        type: "read_receipt",
        message_id: messageId,
        timestamp: Date.now(),
    }));
}
```

**Обработка read receipt:**
```typescript
case "read_receipt": {
    // Обновить сообщение с информацией о том кто прочитал
    const messages = this.messagesByDialog.get(dialogId);
    if (messages) {
        const msg = messages.find(m => m.id === data.message_id);
        if (msg) {
            if (!msg.readBy) msg.readBy = [];
            if (!msg.readBy.includes(data.user_id)) {
                msg.readBy.push(data.user_id);
            }
            emitter.emit<Message>(`msg:${dialogId}`, msg);
        }
    }
    break;
}
```

**В MessageBubble компоненте:**
```typescript
{isMe && message.readBy && message.readBy.length > 0 && (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Ionicons name="checkmark-done" size={12} color="#0084FF" />
        <Text style={{ fontSize: 10, color: '#999', marginLeft: 2 }}>
            {message.readBy.length} прочитано
        </Text>
    </View>
)}
```

---

### 3. Edit Message (Редактирование сообщения)

**Метод уже существует в chat.ts:**
```typescript
editMessage(dialogId: number, messageId: number, newText: string) {
    const ws = this.activeConnections.get(dialogId);
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error(...);
    
    ws.send(JSON.stringify({
        type: "message_edit",
        message_id: messageId,
        message: newText.trim(),
        timestamp: Date.now(),
    }));
    
    // Обновить локально
    const messages = this.messagesByDialog.get(dialogId);
    if (messages) {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            msg.text = newText.trim();
            msg.updatedAt = Date.now();
            emitter.emit<Message>(`msg:${dialogId}`, msg);
        }
    }
}
```

**Обработка редактирования от сервера:**
```typescript
case "message_edit": {
    const messages = this.messagesByDialog.get(dialogId);
    if (messages) {
        const msg = messages.find(m => m.id === data.message_id);
        if (msg) {
            msg.text = data.message.message;
            msg.updatedAt = new Date(data.message.timestamp).getTime();
            emitter.emit<Message>(`msg:${dialogId}`, msg);
        }
    }
    break;
}
```

**В MessageBubble:**
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editText, setEditText] = useState(message.text);

const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
        onEdit?.(editText);
        setIsEditing(false);
    }
};

{isEditing ? (
    <TextInput
        value={editText}
        onChangeText={setEditText}
        onBlur={() => handleEdit()}
        autoFocus
    />
) : (
    <>
        <Text>{message.text}</Text>
        {message.updatedAt && <Text style={{fontSize: 10}}>отредактировано</Text>}
    </>
)}
```

---

### 4. Delete Message (Удаление сообщения)

**Метод уже существует в chat.ts:**
```typescript
deleteMessage(dialogId: number, messageId: number) {
    const ws = this.activeConnections.get(dialogId);
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error(...);
    
    ws.send(JSON.stringify({
        type: "message_delete",
        message_id: messageId,
        timestamp: Date.now(),
    }));
    
    // Обновить локально
    const messages = this.messagesByDialog.get(dialogId);
    if (messages) {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            msg.isDeleted = true;
            msg.text = "[Удалено]";
            emitter.emit<Message>(`msg:${dialogId}`, msg);
        }
    }
}
```

**Обработка удаления от сервера:**
```typescript
case "message_delete": {
    const messages = this.messagesByDialog.get(dialogId);
    if (messages) {
        const msg = messages.find(m => m.id === data.message_id);
        if (msg) {
            msg.isDeleted = true;
            msg.text = "[Удалено]";
            emitter.emit<Message>(`msg:${dialogId}`, msg);
        }
    }
    break;
}
```

**В MessageBubble:**
```typescript
if (message.isDeleted) {
    return (
        <View style={{paddingVertical: 8}}>
            <Text style={{color: '#999', fontStyle: 'italic'}}>
                [Сообщение удалено]
            </Text>
        </View>
    );
}

const handleDelete = () => {
    Alert.alert(
        "Удалить сообщение",
        "Вы уверены?",
        [
            { text: "Отмена" },
            {
                text: "Удалить",
                onPress: () => onDelete?.(),
                style: "destructive",
            },
        ]
    );
};
```

---

## 📋 Чек-лист для интеграции функций

- [ ] Typing Indicators
  - [ ] Метод `sendTypingIndicator()` в chat.ts
  - [ ] Обработка "typing" сообщений
  - [ ] Компонент TypingIndicator в чате
  - [ ] Очистка старых типирующих пользователей (timeout)

- [ ] Read Receipts
  - [ ] Отправка read_receipt при просмотре
  - [ ] Отображение галочек в MessageBubble
  - [ ] Показать список кто прочитал

- [ ] Edit/Delete
  - [ ] UI для свайп/долгого нажатия на сообщение
  - [ ] Модальное окно с опциями Edit/Delete
  - [ ] Обновление UI после edit/delete
  - [ ] Обработка запроса с сервера

---

## 🔗 Связанные события WebSocket

```json
// Typing
{
  "type": "typing",
  "user_id": 8,
  "username": "John",
  "message": "true|false"
}

// Read Receipt
{
  "type": "read_receipt",
  "user_id": 8,
  "message_id": 123,
  "timestamp": "2025-12-10T21:04:35.010250514Z"
}

// Edit
{
  "type": "message_edit",
  "message_id": 123,
  "message": {
    "ID": 123,
    "message": "Отредактированный текст",
    "Timestamp": "2025-12-10T21:04:35.010250514Z"
  }
}

// Delete
{
  "type": "message_delete",
  "message_id": 123,
  "timestamp": "2025-12-10T21:04:35.010250514Z"
}
```

