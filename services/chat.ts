import { WS_BASE_URL } from "@/config/environment";
import { AppState } from "react-native";
import { chatAPI, userAPI, type User } from "./api";

export type Message = {
    id: number;
    dialogId: number;
    senderId: number;
    text: string;
    timestamp: number; // epoch ms
    updatedAt?: number; // для edited сообщений
    isDeleted?: boolean; // помечено ли как удаленное
    readBy?: number[]; // ID пользователей которые прочитали
};

export type TypingUser = {
    userId: number;
    username: string;
    isTyping: boolean;
};

export type Dialog = {
    id: number;
    name: string;
    lastMessage?: string;
    lastTime?: number;
    unreadCount?: number;
};

// WebSocket event types
type WSMessage = {
    type: string;
    message?: string | any;
    messages?: any[];
    timestamp?: string;
    message_id?: number;
    user_id?: number;
    username?: string;
    chat_id?: number;
    meta?: any;
};

type Listener<T> = (payload: T) => void;

class Emitter {
    private map = new Map<string, Set<Function>>();

    on<T = any>(event: string, cb: Listener<T>) {
        const set = this.map.get(event) ?? new Set();
        set.add(cb as any);
        this.map.set(event, set);
        return () => this.off(event, cb);
    }

    off(event: string, cb: Function) {
        const set = this.map.get(event);
        if (!set) return;
        set.delete(cb);
        if (set.size === 0) this.map.delete(event);
    }

    emit<T = any>(event: string, payload: T) {
        const set = this.map.get(event);
        if (!set) return;
        set.forEach((fn) => {
            try {
                (fn as Listener<T>)(payload);
            } catch (e) {
                console.error(`Error in emitter listener for event ${event}:`, e);
            }
        });
    }
}

const emitter = new Emitter();

// Экспортируем emitter для использования в других модулях
export { emitter as chatEmitter };

// User cache with TTL
type CachedUser = {
    data: User;
    timestamp: number;
};

class ChatStore {
    dialogs: Dialog[] = [];
    messagesByDialog = new Map<number, Message[]>();
    activeConnections = new Map<number, WebSocket>();
    typingUsers = new Map<number, TypingUser[]>();
    currentUserId: number | null = null;

    // User cache with 5 minute TTL
    private userCache = new Map<number, CachedUser>();
    private readonly USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Reconnection logic
    private reconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
    private reconnectAttempts = new Map<number, number>();
    private readonly MAX_RECONNECT_ATTEMPTS = 10;
    private readonly BASE_RECONNECT_DELAY = 1000; // 1 second

    // WebSocket tokens for reconnection
    private wsTokens = new Map<number, string>();

    // Connection state tracking to prevent duplicate connections
    private connectionStates = new Map<number, "connecting" | "connected" | "disconnected">();

    // Track intentional disconnections to prevent auto-reconnect
    private intentionallyDisconnected = new Set<number>();

    constructor() {
        // Load dialogs on demand via API
        this.recalcDialogSummaries();

        // Update summaries when app returns to foreground
        AppState.addEventListener("change", (s) => {
            if (s === "active") this.recalcDialogSummaries();
        });
    }

    setCurrentUserId(userId: number) {
        this.currentUserId = userId;
    }

    private recalcDialogSummaries() {
        for (const d of this.dialogs) {
            const arr = this.messagesByDialog.get(d.id) || [];
            const last = arr[arr.length - 1];
            d.lastMessage = last?.text ?? undefined;
            d.lastTime = last?.timestamp ?? undefined;
        }
        emitter.emit("dialogs:updated", this.dialogs.slice());
    }

    listDialogs(): Dialog[] {
        return this.dialogs
            .slice()
            .sort((a, b) => (b.lastTime ?? 0) - (a.lastTime ?? 0));
    }

    subscribeDialogs(cb: Listener<Dialog[]>) {
        return emitter.on("dialogs:updated", cb);
    }

    async loadDialogs(token: string) {
        try {
            const chats = await chatAPI.listChats(token);
            // Handle case when chats is null or not an array
            if (!chats || !Array.isArray(chats)) {
                this.dialogs = [];
            } else {
                this.dialogs = chats.map((chat) => ({
                    id: chat.id,
                    name: chat.name,
                    lastMessage: chat.lastMessage?.message,
                    lastTime: chat.lastMessage?.createdAt
                        ? new Date(chat.lastMessage.createdAt).getTime()
                        : undefined,
                }));
            }
            for (const dialog of this.dialogs) {
                if (!this.messagesByDialog.has(dialog.id)) {
                    this.messagesByDialog.set(dialog.id, []);
                }
            }
            this.recalcDialogSummaries();
        } catch (error) {
            console.error("Failed to load dialogs:", error);
            // Set empty dialogs on error
            this.dialogs = [];
            this.recalcDialogSummaries();
        }
    }

    getMessages(
        dialogId: number,
        before?: number,
        limit = 20
    ): {
        messages: Message[];
        hasMore: boolean;
        nextCursor?: number;
    } {
        const all = this.messagesByDialog.get(dialogId) ?? [];
        let endIndex = all.length;
        if (before != null) {
            endIndex = all.findIndex((m) => m.timestamp >= before);
            if (endIndex === -1) endIndex = all.length;
        }
        const startIndex = Math.max(0, endIndex - limit);
        const slice = all.slice(startIndex, endIndex);
        const hasMore = startIndex > 0;
        const nextCursor = hasMore ? all[startIndex - 1].timestamp : undefined;
        return { messages: slice, hasMore, nextCursor };
    }

    subscribeMessages(dialogId: number, cb: Listener<Message>) {
        return emitter.on<Message>(`msg:${dialogId}`, cb);
    }

    subscribeStatus(dialogId: number, cb: Listener<string>) {
        return emitter.on<string>(`chat:status:${dialogId}`, cb);
    }

    subscribeHistory(dialogId: number, cb: Listener<{ dialogId: number; messages: Message[] }>) {
        return emitter.on<{ dialogId: number; messages: Message[] }>(`messages:history:${dialogId}`, cb);
    }

    /**
     * Connect to chat WebSocket and load initial message history
     */
    async connectToChat(dialogId: number, token: string) {
        try {
            // Ensure message array is initialized before connecting
            if (!this.messagesByDialog.has(dialogId)) {
                this.messagesByDialog.set(dialogId, []);
                console.log(`Initialized message array for chat ${dialogId}`);
            }
            // Connect to WebSocket
            this.connectWebSocket(dialogId, token);
        } catch (error) {
            console.error(`Failed to connect to chat ${dialogId}:`, error);
            throw error;
        }
    }


    /**
     * Connect to WebSocket for real-time messages
     */
    private connectWebSocket(dialogId: number, token: string) {
        // Prevent multiple concurrent connection attempts
        const currentState = this.connectionStates.get(dialogId);
        const existing = this.activeConnections.get(dialogId);
        
        // Если уже подключены и соединение открыто - не переподключаемся
        if (existing && existing.readyState === WebSocket.OPEN && currentState === "connected") {
            console.log(`Already connected to chat ${dialogId}, skip reconnect`);
            return;
        }
        
        // Если уже идет процесс подключения - не создаем новое
        if (currentState === "connecting") {
            console.log(`Already connecting to chat ${dialogId}, skipping duplicate request`);
            return;
        }

        // Close existing connection if any (только если оно не открыто или не в процессе подключения)
        if (existing) {
            const readyState = existing.readyState;
            if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
                // Если соединение открыто или в процессе подключения, закрываем его перед созданием нового
                try {
                    // Mark as intentional disconnection before closing existing connection
                    this.intentionallyDisconnected.add(dialogId);
                    existing.close();
                    // Удаляем из активных соединений сразу
                    this.activeConnections.delete(dialogId);
                } catch (e) {
                    console.log(`Failed to close existing connection for chat ${dialogId}:`, e);
                }
            } else if (readyState !== WebSocket.CLOSED) {
                // Для других состояний (CLOSING) тоже закрываем
                try {
                    this.intentionallyDisconnected.add(dialogId);
                    existing.close();
                    this.activeConnections.delete(dialogId);
                } catch (e) {
                    console.log(`Failed to close existing connection for chat ${dialogId}:`, e);
                }
            }
        }

        // Clear any pending reconnect timer before starting new connection
        const pendingTimer = this.reconnectTimers.get(dialogId);
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            this.reconnectTimers.delete(dialogId);
        }

        // Save token for reconnection
        this.wsTokens.set(dialogId, token);

        // Reset reconnection attempts
        this.reconnectAttempts.set(dialogId, 0);

        // Mark as connecting
        this.connectionStates.set(dialogId, "connecting");

        // Pass token as query parameter (required for WebSocket auth in browser)
        const encodedToken = encodeURIComponent(token);
        const wsUrl = `${WS_BASE_URL}/chat/${dialogId}/ws?token=${encodedToken}`;
        console.log(`Connecting to WebSocket: ${wsUrl.replace(encodedToken, '***')}`);

        // Emit connecting status
        emitter.emit(`chat:status:${dialogId}`, "connecting");

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                // Проверяем, что это все еще наше соединение и мы в состоянии подключения
                const currentState = this.connectionStates.get(dialogId);
                const currentConnection = this.activeConnections.get(dialogId);
                
                if (currentState === "connecting" && currentConnection === ws) {
                    console.log(`WebSocket connected to chat ${dialogId}`);
                    this.connectionStates.set(dialogId, "connected");
                    emitter.emit(`chat:status:${dialogId}`, "connected");
                    // Reset reconnection attempts on successful connection
                    this.reconnectAttempts.set(dialogId, 0);
                    // Clear any pending reconnect timer
                    const pendingTimer = this.reconnectTimers.get(dialogId);
                    if (pendingTimer) {
                        clearTimeout(pendingTimer);
                        this.reconnectTimers.delete(pendingTimer);
                    }
                    // Убеждаемся, что флаг intentional disconnection снят
                    this.intentionallyDisconnected.delete(dialogId);
                } else {
                    // Это старое соединение, которое уже не нужно - закрываем его
                    console.log(`WebSocket opened but connection state changed, closing old connection for chat ${dialogId}`);
                    ws.close();
                }
            };

            ws.onmessage = (event) => {
                try {
                    // Handle case where multiple JSON messages are bundled together
                    this.parseWebSocketMessages(event.data, (data: WSMessage) => {
                        // Skip heartbeat response messages
                        if (data.type === "pong" || data.type === "ping") {
                            return;
                        }
                        this.handleWebSocketMessage(dialogId, data);
                    });
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            ws.onerror = (error) => {
                console.error(`WebSocket error for chat ${dialogId}:`, error);
                this.connectionStates.set(dialogId, "disconnected");
                emitter.emit(`chat:status:${dialogId}`, "error");
            };

            ws.onclose = (event) => {
                // Проверяем, что это закрытие относится к текущему соединению
                const currentConnection = this.activeConnections.get(dialogId);
                if (currentConnection !== ws) {
                    // Это старое соединение, игнорируем его закрытие
                    console.log(`Ignoring close event for old connection of chat ${dialogId}`);
                    return;
                }

                // Check if this was an intentional disconnection
                const wasIntentional = this.intentionallyDisconnected.has(dialogId);

                if (wasIntentional) {
                    console.log(`WebSocket intentionally closed for chat ${dialogId}`);
                    this.intentionallyDisconnected.delete(dialogId);
                    this.activeConnections.delete(dialogId);
                    this.connectionStates.set(dialogId, "disconnected");
                    emitter.emit(`chat:status:${dialogId}`, "disconnected");
                    return;
                }

            // Inspect close reason — avoid endless retries on auth/forbidden errors
            const closeCode = event?.code;
            const closeReason = event?.reason?.toLowerCase?.() || "";
            const isAuthError =
              closeCode === 4001 ||
              closeCode === 4401 ||
              closeCode === 1008 || // policy violation (often auth)
              closeReason.includes("unauth") ||
              closeReason.includes("forbidden") ||
              closeReason.includes("token") ||
              closeReason.includes("expired");

            // Если это ошибка авторизации, вызываем глобальный обработчик
            if (isAuthError) {
                console.warn(`[ChatStore] WebSocket auth error for chat ${dialogId}, code: ${closeCode}, reason: ${closeReason}`);
                // Эмитируем событие для глобального обработчика
                emitter.emit("auth:unauthorized", { dialogId, closeCode, closeReason });
            }

            const shouldStop =
              isAuthError ||
              closeCode === 1000; // normal close - don't hammer reconnects

            // Only attempt reconnection if this was an unexpected close
            const state = this.connectionStates.get(dialogId);
            console.log(`WebSocket closed for chat ${dialogId}, state: ${state}, code: ${closeCode}, reason: ${closeReason}`);
            this.activeConnections.delete(dialogId);
            this.connectionStates.set(dialogId, "disconnected");
            emitter.emit(`chat:status:${dialogId}`, shouldStop ? "error" : "disconnected");

            if (shouldStop) {
              console.warn(`Stopping reconnects for chat ${dialogId} due to close reason/code`);
              return;
            }

            // Attempt to reconnect
            this.scheduleReconnect(dialogId, token);
            };

            // Сохраняем соединение сразу, но проверяем его актуальность в обработчиках
            this.activeConnections.set(dialogId, ws);
        } catch (error) {
            console.error(`Failed to create WebSocket for chat ${dialogId}:`, error);
            this.connectionStates.set(dialogId, "disconnected");
            this.activeConnections.delete(dialogId);
            emitter.emit(`chat:status:${dialogId}`, "error");
            // Schedule reconnect on error
            this.scheduleReconnect(dialogId, token);
        }
    }

    /**
     * Schedule WebSocket reconnection with exponential backoff
     */
    private scheduleReconnect(dialogId: number, token: string) {
    // Do not reconnect if we no longer have a token stored
    const tokenToUse = this.wsTokens.get(dialogId) || token;
    if (!tokenToUse) {
      console.warn(`No token available to reconnect chat ${dialogId}, aborting`);
      return;
    }

        // If already trying to reconnect, don't schedule another one
        const existingTimer = this.reconnectTimers.get(dialogId);
        if (existingTimer) {
            console.log(`Reconnection already scheduled for chat ${dialogId}, skipping duplicate request`);
            return;
        }

        // Prevent reconnecting if still in connecting state
        const currentState = this.connectionStates.get(dialogId);
        if (currentState === "connecting" || currentState === "connected") {
            console.log(`State=${currentState} for chat ${dialogId}, not scheduling reconnect`);
            return;
        }

        const attempts = this.reconnectAttempts.get(dialogId) ?? 0;

        // Check if max attempts reached
        if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.error(`Max reconnection attempts reached for chat ${dialogId}`);
            emitter.emit(`chat:status:${dialogId}`, "reconnect_failed");
            return;
        }

        // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc., capped at 30 seconds
        const baseDelay = this.BASE_RECONNECT_DELAY * Math.pow(2, attempts);
        const delay = Math.min(baseDelay, 30000); // Cap at 30 seconds

        console.log(`Scheduling reconnect for chat ${dialogId} in ${delay}ms (attempt ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

        const timer = setTimeout(() => {
            // Clear the timer from map before attempting reconnect
            this.reconnectTimers.delete(dialogId);
            this.reconnectAttempts.set(dialogId, attempts + 1);
            emitter.emit(`chat:status:${dialogId}`, "reconnecting");
      this.connectWebSocket(dialogId, tokenToUse);
        }, delay);

        this.reconnectTimers.set(dialogId, timer);
    }

    /**
     * Parse WebSocket message data that may contain multiple JSON objects
     * Handles cases where multiple JSON messages are bundled together
     */
    private parseWebSocketMessages(data: string, callback: (msg: WSMessage) => void) {
        let pos = 0;

        while (pos < data.length) {
            // Find the next opening brace
            const startPos = data.indexOf('{', pos);
            if (startPos === -1) break; // No more JSON objects

            // Try to find the matching closing brace
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            let endPos = -1;

            for (let i = startPos; i < data.length; i++) {
                const char = data[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }

                if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endPos = i;
                            break;
                        }
                    }
                }
            }

            if (endPos === -1) {
                // Malformed JSON, try to parse what we have
                console.warn('Malformed JSON in WebSocket message, attempting to parse remaining data');
                try {
                    const msg = JSON.parse(data.substring(startPos));
                    callback(msg);
                } catch (e) {
                    console.error('Failed to parse remaining WebSocket data:', e);
                }
                break;
            }

            // Extract and parse the JSON object
            const jsonStr = data.substring(startPos, endPos + 1);
            try {
                const msg: WSMessage = JSON.parse(jsonStr);
                callback(msg);
            } catch (e) {
                console.error('Failed to parse WebSocket message:', jsonStr, e);
            }

            pos = endPos + 1;
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleWebSocketMessage(dialogId: number, data: WSMessage) {
        console.log(`WebSocket message for chat ${dialogId}:`, data.type);

        switch (data.type) {
            case "message": {
                // New message received
                if (data.message && typeof data.message === "object") {
                    const msgData = data.message as any;
                    console.debug(`WebSocket new message for chat ${dialogId}:`, msgData);
                    // Server uses uppercase field names (ID, not id)
                    const timestamp = new Date(msgData.Timestamp || msgData.timestamp).getTime();
                    const updatedAtRaw = msgData.UpdatedAt ? new Date(msgData.UpdatedAt).getTime() : undefined;
                    // Устанавливаем updatedAt только если он действительно отличается от timestamp (сообщение было отредактировано)
                    const updatedAt = updatedAtRaw && updatedAtRaw > timestamp ? updatedAtRaw : undefined;
                    const msg: Message = {
                        id: msgData.ID || msgData.id || 0,
                        dialogId: msgData.chat_id || dialogId,
                        senderId: msgData.sender_id,
                        text: msgData.message,
                        timestamp: timestamp,
                        updatedAt: updatedAt,
                        isDeleted: msgData.IsDeleted || false,
                    };
                    console.log(`Parsed message: id=${msg.id}, sender=${msg.senderId}, text="${msg.text.substring(0, 50)}..."`);
                    if (msg.id > 0) {
                        this.addMessage(dialogId, msg);
                    } else {
                        console.warn(`Ignoring message with invalid ID: ${msg.id}`);
                    }
                } else {
                    console.warn(`Received message event with unexpected data format:`, data.message);
                }
                break;
            }

            case "history": {
                // Message history on initial connection
                if (data.messages && Array.isArray(data.messages)) {
                    const messages: Message[] = [];
                    for (const msg of data.messages) {
                        if (!msg.ID) continue;
                        const timestamp = new Date(msg.Timestamp || msg.CreatedAt).getTime();
                        const updatedAtRaw = msg.UpdatedAt ? new Date(msg.UpdatedAt).getTime() : undefined;
                        // Устанавливаем updatedAt только если он действительно отличается от timestamp (сообщение было отредактировано)
                        const updatedAt = updatedAtRaw && updatedAtRaw > timestamp ? updatedAtRaw : undefined;
                        messages.push({
                            id: msg.ID,
                            dialogId: msg.chat_id || dialogId,
                            senderId: msg.sender_id,
                            text: msg.message,
                            timestamp: timestamp,
                            updatedAt: updatedAt,
                            isDeleted: msg.IsDeleted || false,
                        });
                    }

                    // Merge history with existing, всегда обновляем сообщения из истории
                    const existing = this.messagesByDialog.get(dialogId) ?? [];
                    const byId = new Map<number, Message>();
                    
                    // Сначала добавляем существующие сообщения
                    for (const m of existing) byId.set(m.id, m);
                    
                    // Затем обновляем/добавляем сообщения из истории
                    // Сообщения из истории имеют приоритет, так как они свежие с сервера
                    for (const m of messages) {
                        const existingMsg = byId.get(m.id);
                        if (existingMsg) {
                            // Обновляем существующее сообщение данными из истории
                            // Это гарантирует, что последнее сообщение всегда будет актуальным
                            Object.assign(existingMsg, m);
                        } else {
                            byId.set(m.id, m);
                        }
                    }

                    const merged = Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);

                    this.messagesByDialog.set(dialogId, merged);
                    console.log(`History loaded for chat ${dialogId}: ${messages.length} from history, total merged: ${merged.length}`);
                    emitter.emit(`messages:history:${dialogId}`, { dialogId, messages: merged });
                } else {
                    const existing = this.messagesByDialog.get(dialogId) ?? [];
                    console.log(`No history messages for chat ${dialogId}, keeping ${existing.length} existing messages`);
                    emitter.emit(`messages:history:${dialogId}`, { dialogId, messages: existing });
                }
                break;
            }

            case "message_sent": {
                // Confirmation that message was sent
                console.log(`Message sent confirmation at ${data.timestamp}`);
                break;
            }

            case "typing": {
                // User typing indicator
                if (data.user_id && data.user_id !== this.currentUserId) {
                    const typingUsers = this.typingUsers.get(dialogId) || [];
                    const isTyping = data.message === true || data.message === "true";

                    if (isTyping) {
                        // Add or update typing user
                        const existingIndex = typingUsers.findIndex(u => u.userId === data.user_id);
                        if (existingIndex >= 0) {
                            typingUsers[existingIndex].isTyping = true;
                        } else {
                            typingUsers.push({
                                userId: data.user_id,
                                username: data.username || `User ${data.user_id}`,
                                isTyping: true,
                            });
                        }
                        this.typingUsers.set(dialogId, typingUsers);
                        emitter.emit(`typing:${dialogId}`, { users: typingUsers });
                    } else {
                        // Remove typing user
                        const filteredUsers = typingUsers.filter(u => u.userId !== data.user_id);
                        this.typingUsers.set(dialogId, filteredUsers);
                        emitter.emit(`typing:${dialogId}`, { users: filteredUsers });
                    }
                }
                break;
            }

            case "error": {
                console.error(`WebSocket error event:`, data.message);
                break;
            }

            case "room_info": {
                console.log(`Room info for chat ${dialogId}:`, data.message);
                break;
            }

            case "user_joined":
            case "user_left": {
                console.log(`User ${data.type} chat ${dialogId}:`, data.user_id);
                break;
            }
        }
    }

    /**
     * Add message to store and emit event
     */
    private addMessage(dialogId: number, msg: Message) {
        const arr = this.messagesByDialog.get(dialogId) ?? [];
        // Check if message already exists
        const exists = arr.find((m) => m.id === msg.id);
        if (exists) {
            // Проверяем, нужно ли обновить сообщение
            // Обновляем если:
            // 1. timestamp изменился (новое сообщение)
            // 2. updatedAt изменился (сообщение было отредактировано)
            // 3. текст изменился (сообщение было изменено)
            // 4. статус удаления изменился
            const shouldUpdate = 
                msg.timestamp > exists.timestamp ||
                (msg.updatedAt && (!exists.updatedAt || msg.updatedAt > exists.updatedAt)) ||
                msg.text !== exists.text ||
                msg.isDeleted !== exists.isDeleted;
            
            if (shouldUpdate) {
                Object.assign(exists, msg);
                this.messagesByDialog.set(dialogId, [...arr].sort((a, b) => a.timestamp - b.timestamp));
                emitter.emit<Message>(`msg:${dialogId}`, exists);
                this.recalcDialogSummaries();
                console.log(`Updated message ${msg.id} in chat ${dialogId}`);
            } else {
                console.log(`Message ${msg.id} already exists in chat ${dialogId}, skipping duplicate`);
            }
            return;
        }

        arr.push(msg);
        arr.sort((a, b) => a.timestamp - b.timestamp);
        this.messagesByDialog.set(dialogId, arr);
        console.log(`Added message ${msg.id} to chat ${dialogId}, total messages: ${arr.length}`);
        emitter.emit<Message>(`msg:${dialogId}`, msg);
        this.recalcDialogSummaries();
    }

    /**
     * Send message via WebSocket directly (no queue)
     */
    sendMessage(dialogId: number, text: string) {
        const ws = this.activeConnections.get(dialogId);

        // If WebSocket is not ready, throw error
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket not ready for chat ${dialogId}`);
            throw new Error(`WebSocket not connected to chat ${dialogId}`);
        }

        const payload = {
            type: "message",
            message: text.trim(),
            timestamp: Date.now(),
        };

        try {
            ws.send(JSON.stringify(payload));
            console.log(`Message sent to chat ${dialogId}`);
        } catch (error) {
            console.error(`Failed to send message to chat ${dialogId}:`, error);
            throw error;
        }
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator(dialogId: number, isTyping: boolean) {
        const ws = this.activeConnections.get(dialogId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const payload = {
            type: "typing",
            message: isTyping.toString(),
        };

        try {
            ws.send(JSON.stringify(payload));
        } catch (error) {
            console.error(`Failed to send typing indicator:`, error);
        }
    }

    /**
     * Mark message as read
     */
    markAsRead(dialogId: number, messageId: number) {
        const ws = this.activeConnections.get(dialogId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const payload = {
            type: "read_receipt",
            message_id: messageId,
            timestamp: Date.now(),
        };

        try {
            ws.send(JSON.stringify(payload));
        } catch (error) {
            console.error(`Failed to send read receipt:`, error);
        }
    }

    /**
     * Get typing users in dialog
     */
    getTypingUsers(dialogId: number): TypingUser[] {
        return this.typingUsers.get(dialogId) || [];
    }

    /**
     * Subscribe to typing events
     */
    subscribeTyping(dialogId: number, cb: Listener<{ users: TypingUser[] }>) {
        return emitter.on(`typing:${dialogId}`, cb);
    }


    /**
     * Get user by ID with caching (5 minute TTL)
     */
    async getUser(userId: number): Promise<User> {
        const cached = this.userCache.get(userId);

        // Return cached data if valid
        if (cached && Date.now() - cached.timestamp < this.USER_CACHE_TTL) {
            return cached.data;
        }

        console.log('getting user from API', userId);
        try {
            const user = await userAPI.getUser(userId);
            // Cache the result
            this.userCache.set(userId, {
                data: user,
                timestamp: Date.now(),
            });
            return user;
        } catch (error) {
            console.error(`Failed to load user ${userId}:`, error);
            // Return unknown user on error
            return {
                id: userId,
                ID: userId,
                username: "Неизвестно",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }
    }

    /**
     * Clear user cache
     */
    clearUserCache() {
        this.userCache.clear();
    }

    /**
     * Disconnect from chat WebSocket
     */
    disconnectChat(dialogId: number) {
        // Mark as intentional disconnection before closing
        this.intentionallyDisconnected.add(dialogId);

        const ws = this.activeConnections.get(dialogId);
        if (ws) {
            ws.close();
            this.activeConnections.delete(dialogId);
        }

        // Clear reconnect timer
        const timer = this.reconnectTimers.get(dialogId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(dialogId);
        }

        // Clear connection state
        this.connectionStates.delete(dialogId);

        console.log(`Disconnected from chat ${dialogId}`);
    }

    /**
     * Disconnect from all chats
     */
    disconnectAll() {
        for (const [dialogId, ws] of this.activeConnections) {
            // Mark all as intentional disconnection
            this.intentionallyDisconnected.add(dialogId);
            ws.close();
        }
        this.activeConnections.clear();

        // Clear all reconnect timers
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();

        // Clear all connection states
        this.connectionStates.clear();

        // Clear all messages and dialogs
        this.messagesByDialog.clear();
        this.dialogs = [];
        this.recalcDialogSummaries();

        // Clear typing users
        this.typingUsers.clear();

        // Clear WebSocket tokens
        this.wsTokens.clear();

        // Reset current user ID
        this.currentUserId = null;

        console.log("Disconnected from all chats and cleared all data");
    }

    /**
     * Check and update last message for a dialog
     * This ensures the last message is always up-to-date
     */
    async checkLastMessage(dialogId: number, token: string): Promise<void> {
        if (!dialogId || !token) return;

        try {
            // Получаем последние сообщения через API (направление older без курсора = последние сообщения)
            const response = await chatAPI.getChatMessages(dialogId, token, undefined, 1, "older");
            
            if (response.data && response.data.length > 0) {
                // Первое сообщение в ответе - это самое последнее (при direction="older" они отсортированы от новых к старым)
                const apiMessage = response.data[0];
                const timestamp = new Date(apiMessage.createdAt || (apiMessage as any).CreatedAt).getTime();
                const updatedAtRaw = apiMessage.updatedAt ? new Date(apiMessage.updatedAt).getTime() : undefined;
                // Устанавливаем updatedAt только если он действительно отличается от timestamp (сообщение было отредактировано)
                const updatedAt = updatedAtRaw && updatedAtRaw > timestamp ? updatedAtRaw : undefined;
                const msg: Message = {
                    id: apiMessage.id || (apiMessage as any).ID || 0,
                    dialogId: dialogId,
                    senderId: (apiMessage as any).sender_id || (apiMessage as any).senderID || 0,
                    text: apiMessage.message || "",
                    timestamp: timestamp,
                    updatedAt: updatedAt,
                    isDeleted: (apiMessage as any).deletedAt ? true : false,
                };

                if (msg.id > 0) {
                    // Получаем текущее последнее сообщение для сравнения
                    const currentMessages = this.messagesByDialog.get(dialogId) ?? [];
                    const currentLastMessage = currentMessages[currentMessages.length - 1];
                    
                    // Используем addMessage для правильной обработки обновления
                    // addMessage проверит, нужно ли обновить сообщение, и обновит его если нужно
                    this.addMessage(dialogId, msg);
                    
                    // Если это новое сообщение или изменилось последнее сообщение, обновляем сводки диалогов
                    if (!currentLastMessage || currentLastMessage.id !== msg.id || currentLastMessage.text !== msg.text) {
                        this.recalcDialogSummaries();
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to check last message for chat ${dialogId}:`, error);
            // Не выбрасываем ошибку, чтобы не прерывать работу приложения
        }
    }
}

export const chatStore = new ChatStore();
