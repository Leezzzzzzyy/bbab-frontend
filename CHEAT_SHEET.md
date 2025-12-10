# ⚡ Справка - Чит-лист интеграции API чата

## 🚀 Быстрые команды

### Проверка компиляции
```bash
npx tsc --noEmit --skipLibCheck
```

### Запуск приложения
```bash
expo start
```

### Тестирование API
```bash
curl http://94.241.170.140:8080/api/ping
```

### Тестирование WebSocket
```bash
npm install -g wscat
wscat -c "ws://94.241.170.140:8080/api/chat/1/ws"
```

## 📌 Основные методы ChatStore

```typescript
// Инициализация
chatStore.setCurrentUserId(userId)
chatStore.loadDialogs(token)

// Работа с диалогом
await chatStore.connectToChat(chatId, token)
chatStore.disconnectChat(chatId)
chatStore.disconnectAll()

// Сообщения
chatStore.getMessages(chatId, before?, limit?)
chatStore.subscribeMessages(chatId, callback)
chatStore.sendMessage(chatId, text)

// Индикаторы
chatStore.sendTypingIndicator(chatId, isTyping)
chatStore.markAsRead(chatId, messageId)

// Получение данных
chatStore.listDialogs()
chatStore.subscribeDialogs(callback)
```

## 🔗 API Endpoints

```
GET  /chat/list              - список чатов
GET  /chat/{id}/messages     - история сообщений
GET  /user/me                - текущий пользователь
ws   /chat/{id}/ws           - WebSocket
```

## 🎯 WebSocket события

### Отправляемые
```json
{"type":"message","message":"text","timestamp":1234567890}
{"type":"typing","message":"true"}
{"type":"read_receipt","message":"12345"}
```

### Получаемые
```json
{"type":"message","message":{...}}
{"type":"history","messages":[...]}
{"type":"message_sent","message_id":12345}
{"type":"typing","user_id":123,"message":true}
{"type":"error","message":"error text"}
```

## 📂 Главные файлы

| Файл | Функция |
|------|---------|
| `services/chat.ts` | ChatStore (ядро системы) |
| `services/api.ts` | HTTP клиент |
| `app/(tabs)/messages/index.tsx` | Список чатов |
| `app/(tabs)/messages/[dialogId].tsx` | Экран диалога |
| `context/AuthContext.tsx` | Управление auth |

## 🔑 Ключевые переменные

```typescript
// В ChatStore
chatStore.currentUserId        // ID текущего пользователя
chatStore.dialogs              // Список диалогов
chatStore.messagesByDialog     // Map сообщений по ID чата
chatStore.activeConnections    // Map WebSocket соединений

// В Auth
credentials.token              // Bearer токен
credentials.userId             // ID пользователя
credentials.username           // Имя пользователя
```

## ⚠️ Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| "WebSocket not connected" | Диалог не подключен | Вызвать connectToChat() |
| "Failed to load dialogs" | API недоступен | Проверить сервер |
| "401 Unauthorized" | Невалидный токен | Переавторизоваться |
| TypeError: can't access property "map" | Null данные | ✅ ИСПРАВЛЕНО |
| "Failed to parse WebSocket message" | Неправильный JSON | Проверить сервер |

## ✨ Особенности реализации

```typescript
// ✅ Автоматическое управление подключениями
await chatStore.connectToChat(id, token)  // подключиться
chatStore.disconnectChat(id)              // отключиться

// ✅ Автоматическое управление подписками
const unsubscribe = chatStore.subscribeMessages(id, cb)
// ... использование
unsubscribe()  // отписка

// ✅ Автоматическая очистка
useEffect(() => {
    return () => {
        offMessages()  // отписка
        disconnectChat(id)  // отключение
    }
}, [])

// ✅ Graceful degradation
try {
    chatStore.sendMessage(id, text)
} catch (error) {
    Alert.alert("Error", error.message)
    // App continues working
}

// ✅ Null-safe операции
if (!chats || !Array.isArray(chats)) {
    this.dialogs = []
}
```

## 📱 UI Компоненты

```
messages/
  ├─ index.tsx
  │  ├─ Loading: ActivityIndicator
  │  ├─ List: FlatList чатов
  │  └─ Empty: "No chats yet"
  │
  └─ [dialogId].tsx
     ├─ Loading: ActivityIndicator
     ├─ List: FlatList сообщений (inverted)
     ├─ Empty: "No messages yet"
     └─ Input: MessageInput
```

## 🧪 Тестовые URL

```bash
# Сервер
http://94.241.170.140:8080/api/ping

# Chat endpoints
http://94.241.170.140:8080/api/chat/list
http://94.241.170.140:8080/api/chat/1/messages

# WebSocket
ws://94.241.170.140:8080/api/chat/1/ws
```

## 🔐 Аутентификация

```bash
# 1. Инициировать вход
curl -X POST http://94.241.170.140:8080/api/initlogin \
  -d '{"phone":"9001234567"}'

# 2. Подтвердить (получить токен)
curl -X POST http://94.241.170.140:8080/api/confirmlogin \
  -d '{"phone":"9001234567","code":"1234","username":"test"}'

# 3. Использовать токен
curl http://94.241.170.140:8080/api/chat/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Структура данных

```typescript
// Dialog
{
  id: 123,
  name: "Chat Name",
  lastMessage?: "Last text",
  lastTime?: 1234567890,
  unreadCount?: 5
}

// Message
{
  id: 456,
  dialogId: 123,
  senderId: 789,
  text: "Message text",
  createdAt: 1234567890  // epoch ms
}
```

## 🎯 Статус функций

| Функция | Статус |
|---------|--------|
| Загрузка чатов | ✅ |
| Загрузка сообщений | ✅ |
| Отправка сообщений | ✅ |
| Получение сообщений real-time | ✅ |
| Индикатор печати | ✅ |
| Подтверждение прочтения | ✅ |
| Обработка ошибок | ✅ |
| Empty states | ✅ |
| Пагинация | ✅ (в коде, не в UI) |

## 🚨 Debug режим

```typescript
// Включить логирование в консоль браузера
// Все операции логируются автоматически

// Проверить состояние
chatStore.messagesByDialog      // Map сообщений
chatStore.dialogs               // Список диалогов
chatStore.activeConnections     // WebSocket соединения

// Посмотреть события
// DevTools → Network tab → WS → Messages
```

## 📖 Документация

| Файл | Для кого |
|------|----------|
| QUICK_START.md | Новичков |
| CHAT_API_INTEGRATION.md | Разработчиков |
| USAGE_EXAMPLES.md | Разработчиков |
| TESTING_GUIDE.md | QA |
| BUGFIX_EMPTY_CHATS.md | Разработчиков |
| FINAL_REPORT.md | Менеджеров |
| DOCUMENTATION_INDEX.md | Всех |

## ⏱️ Таймауты

```
WebSocket Ping: каждые 54 секунды
WebSocket Pong timeout: 60 секунд
Write timeout: 10 секунд
Rate limit: 10 сообщений/сек
```

## 🎉 Готовые шаблоны

### Использование чата в компоненте
```typescript
const { credentials } = useAuth();
const { dialogId } = useLocalSearchParams();
const [messages, setMessages] = useState<Message[]>([]);

useEffect(() => {
    const id = parseInt(dialogId);
    await chatStore.connectToChat(id, credentials.token!);
    const { messages } = chatStore.getMessages(id);
    setMessages(messages);
    
    const off = chatStore.subscribeMessages(id, (m) => {
        setMessages(p => [...p, m]);
    });
    
    return () => {
        off();
        chatStore.disconnectChat(id);
    };
}, []);
```

### Загрузка чатов
```typescript
const { credentials } = useAuth();
const [dialogs, setDialogs] = useState<Dialog[]>([]);

useEffect(() => {
    await chatStore.loadDialogs(credentials.token!);
    setDialogs(chatStore.listDialogs());
    
    const off = chatStore.subscribeDialogs(setDialogs);
    return () => off();
}, []);
```

---

**Последнее обновление**: 2024-12-10  
**Версия**: 1.0.0

