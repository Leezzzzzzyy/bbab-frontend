import { AppState } from "react-native";
import { chatAPI, userAPI, type User } from "./api";
import { WS_BASE_URL } from "@/config/environment";

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
        // Close existing connection if any
        const existing = this.activeConnections.get(dialogId);
        if (existing) {
            existing.close();
        }

        // Save token for reconnection
        this.wsTokens.set(dialogId, token);

        // Reset reconnection attempts
        this.reconnectAttempts.set(dialogId, 0);

        // Pass token as query parameter (required for WebSocket auth in browser)
        const encodedToken = encodeURIComponent(token);
        const wsUrl = `${WS_BASE_URL}/chat/${dialogId}/ws?token=${encodedToken}`;
        console.log(`Connecting to WebSocket: ${wsUrl.replace(encodedToken, '***')}`);

        // Emit connecting status
        emitter.emit(`chat:status:${dialogId}`, "connecting");

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log(`WebSocket connected to chat ${dialogId}`);
                emitter.emit(`chat:status:${dialogId}`, "connected");
                // Reset reconnection attempts on successful connection
                this.reconnectAttempts.set(dialogId, 0);
            };

            ws.onmessage = (event) => {
                try {
                    const data: WSMessage = JSON.parse(event.data);
                    this.handleWebSocketMessage(dialogId, data);
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            ws.onerror = (error) => {
                console.error(`WebSocket error for chat ${dialogId}:`, error);
                emitter.emit(`chat:status:${dialogId}`, "error");
            };

            ws.onclose = () => {
                console.log(`WebSocket closed for chat ${dialogId}`);
                this.activeConnections.delete(dialogId);
                emitter.emit(`chat:status:${dialogId}`, "disconnected");

                // Attempt to reconnect
                this.scheduleReconnect(dialogId, token);
            };

            this.activeConnections.set(dialogId, ws);
        } catch (error) {
            console.error(`Failed to create WebSocket for chat ${dialogId}:`, error);
            emitter.emit(`chat:status:${dialogId}`, "error");
            // Schedule reconnect on error
            this.scheduleReconnect(dialogId, token);
        }
    }

    /**
     * Schedule WebSocket reconnection with exponential backoff
     */
    private scheduleReconnect(dialogId: number, token: string) {
        // Clear any existing timer
        const existingTimer = this.reconnectTimers.get(dialogId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const attempts = this.reconnectAttempts.get(dialogId) ?? 0;

        // Check if max attempts reached
        if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.error(`Max reconnection attempts reached for chat ${dialogId}`);
            emitter.emit(`chat:status:${dialogId}`, "reconnect_failed");
            return;
        }

        // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delay = this.BASE_RECONNECT_DELAY * Math.pow(2, attempts);

        console.log(`Scheduling reconnect for chat ${dialogId} in ${delay}ms (attempt ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

        const timer = setTimeout(() => {
            this.reconnectAttempts.set(dialogId, attempts + 1);
            emitter.emit(`chat:status:${dialogId}`, "reconnecting");
            this.connectWebSocket(dialogId, token);
        }, delay);

        this.reconnectTimers.set(dialogId, timer);
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
                    const msg: Message = {
                        id: msgData.ID || msgData.id || 0,
                        dialogId: msgData.chat_id || dialogId,
                        senderId: msgData.sender_id,
                        text: msgData.message,
                        timestamp: new Date(msgData.Timestamp || msgData.timestamp).getTime(),
                    };
                    if (msg.id > 0) {
                        this.addMessage(dialogId, msg);
                    }
                }
                break;
            }

            case "history": {
                // Message history on initial connection
                if (data.messages && Array.isArray(data.messages)) {
                    const messages = data.messages
                        .map((msg: any) => {
                            // Filter out invalid messages
                            if (!msg.ID) return null;
                            return {
                                id: msg.ID,
                                dialogId: msg.chat_id || dialogId,
                                senderId: msg.sender_id,
                                text: msg.message,
                                timestamp: new Date(msg.Timestamp || msg.CreatedAt).getTime(),
                            };
                        })
                        .filter((msg): msg is Message => msg !== null);
                    messages.sort((a, b) => a.timestamp - b.timestamp);
                    this.messagesByDialog.set(dialogId, messages);
                    emitter.emit(`messages:history:${dialogId}`, { dialogId, messages });
                } else {
                    // No history messages
                    this.messagesByDialog.set(dialogId, []);
                    emitter.emit(`messages:history:${dialogId}`, { dialogId, messages: [] });
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
        if (!exists) {
            arr.push(msg);
            arr.sort((a, b) => a.timestamp - b.timestamp);
            this.messagesByDialog.set(dialogId, arr);
            // Only emit and recalc if message was actually added
            emitter.emit<Message>(`msg:${dialogId}`, msg);
            this.recalcDialogSummaries();
        }
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

        console.log(`Disconnected from chat ${dialogId}`);
    }

    /**
     * Disconnect from all chats
     */
    disconnectAll() {
        for (const [dialogId, ws] of this.activeConnections) {
            ws.close();
        }
        this.activeConnections.clear();

        // Clear all reconnect timers
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();

        console.log("Disconnected from all chats");
    }
}

export const chatStore = new ChatStore();
