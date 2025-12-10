import { AppState } from "react-native";
import { chatAPI, type Message as APIMessage, type ListChatsResponse } from "./api";
import { WS_BASE_URL } from "@/config/environment";

export type Message = {
    id: number;
    dialogId: number;
    senderId: number;
    text: string;
    createdAt: number; // epoch ms
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

class ChatStore {
    dialogs: Dialog[] = [];
    messagesByDialog = new Map<number, Message[]>();
    activeConnections = new Map<number, WebSocket>();
    typingUsers = new Map<number, TypingUser[]>(); // typing users по dialogId
    currentUserId: number | null = null;

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
            d.lastTime = last?.createdAt ?? undefined;
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
            endIndex = all.findIndex((m) => m.createdAt >= before);
            if (endIndex === -1) endIndex = all.length;
        }
        const startIndex = Math.max(0, endIndex - limit);
        const slice = all.slice(startIndex, endIndex);
        const hasMore = startIndex > 0;
        const nextCursor = hasMore ? all[startIndex - 1].createdAt : undefined;
        return { messages: slice, hasMore, nextCursor };
    }

    subscribeMessages(dialogId: number, cb: Listener<Message>) {
        return emitter.on<Message>(`msg:${dialogId}`, cb);
    }

    /**
     * Connect to chat WebSocket and load initial message history
     */
    async connectToChat(dialogId: number, token: string) {
        try {
            // Load message history from REST API
            await this.loadChatMessages(dialogId, token);

            // Connect to WebSocket
            this.connectWebSocket(dialogId, token);
        } catch (error) {
            console.error(`Failed to connect to chat ${dialogId}:`, error);
            throw error;
        }
    }

    /**
     * Load chat message history via REST API
     */
    private async loadChatMessages(dialogId: number, token: string) {
        try {
            const response = await chatAPI.getChatMessages(dialogId, token, undefined, 50);

            // Handle case when response data is null or not an array
            if (!response?.data || !Array.isArray(response.data)) {
                this.messagesByDialog.set(dialogId, []);
                emitter.emit("messages:loaded", { dialogId, messages: [] });
                return;
            }

            const messages = response.data.map((msg) => ({
                id: msg.id,
                dialogId: msg.chatID,
                senderId: msg.senderID,
                text: msg.message,
                createdAt: new Date(msg.createdAt).getTime(),
            }));

            // Sort messages by creation time (ascending)
            messages.sort((a, b) => a.createdAt - b.createdAt);

            this.messagesByDialog.set(dialogId, messages);
            emitter.emit("messages:loaded", { dialogId, messages });
        } catch (error) {
            console.error(`Failed to load messages for chat ${dialogId}:`, error);
            // Set empty messages array on error
            this.messagesByDialog.set(dialogId, []);
            // Don't throw - allow WebSocket to still connect
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

        const wsUrl = `${WS_BASE_URL}/chat/${dialogId}/ws`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log(`WebSocket connected to chat ${dialogId}`);
                // Send auth token if needed (some servers require this)
                // This depends on server implementation
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
            };

            ws.onclose = () => {
                console.log(`WebSocket closed for chat ${dialogId}`);
                this.activeConnections.delete(dialogId);
            };

            this.activeConnections.set(dialogId, ws);
        } catch (error) {
            console.error(`Failed to create WebSocket for chat ${dialogId}:`, error);
            throw error;
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
                    const msg: Message = {
                        id: data.message.id || data.message_id,
                        dialogId: data.message.chat_id || dialogId,
                        senderId: data.message.sender_id,
                        text: data.message.message,
                        createdAt: new Date(data.message.timestamp).getTime(),
                    };
                    this.addMessage(dialogId, msg);
                }
                break;
            }

            case "history": {
                // Message history on initial connection
                if (data.messages && Array.isArray(data.messages)) {
                    const messages = data.messages.map((msg: any) => ({
                        id: msg.id,
                        dialogId: msg.chat_id || dialogId,
                        senderId: msg.sender_id,
                        text: msg.message,
                        createdAt: new Date(msg.timestamp).getTime(),
                    }));
                    messages.sort((a, b) => a.createdAt - b.createdAt);
                    this.messagesByDialog.set(dialogId, messages);
                    emitter.emit("messages:history", { dialogId, messages });
                } else {
                    // No history messages
                    this.messagesByDialog.set(dialogId, []);
                    emitter.emit("messages:history", { dialogId, messages: [] });
                }
                break;
            }

            case "message_sent": {
                // Confirmation that message was sent
                console.log(`Message ${data.message_id} confirmed sent`);
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
        if (!arr.find((m) => m.id === msg.id)) {
            arr.push(msg);
            arr.sort((a, b) => a.createdAt - b.createdAt);
            this.messagesByDialog.set(dialogId, arr);
        }
        emitter.emit<Message>(`msg:${dialogId}`, msg);
        this.recalcDialogSummaries();
    }

    /**
     * Send message via WebSocket
     */
    sendMessage(dialogId: number, text: string) {
        const ws = this.activeConnections.get(dialogId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
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
            message: messageId.toString(),
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
     * Edit message
     */
    editMessage(dialogId: number, messageId: number, newText: string) {
        const ws = this.activeConnections.get(dialogId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error(`WebSocket not connected to chat ${dialogId}`);
        }

        const payload = {
            type: "message_edit",
            message_id: messageId,
            message: newText.trim(),
            timestamp: Date.now(),
        };

        try {
            ws.send(JSON.stringify(payload));
            console.log(`Message ${messageId} edited in chat ${dialogId}`);

            // Update local message
            const messages = this.messagesByDialog.get(dialogId);
            if (messages) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    msg.text = newText.trim();
                    msg.updatedAt = Date.now();
                    emitter.emit<Message>(`msg:${dialogId}`, msg);
                }
            }
        } catch (error) {
            console.error(`Failed to edit message:`, error);
            throw error;
        }
    }

    /**
     * Delete message
     */
    deleteMessage(dialogId: number, messageId: number) {
        const ws = this.activeConnections.get(dialogId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error(`WebSocket not connected to chat ${dialogId}`);
        }

        const payload = {
            type: "message_delete",
            message_id: messageId,
            timestamp: Date.now(),
        };

        try {
            ws.send(JSON.stringify(payload));
            console.log(`Message ${messageId} deleted in chat ${dialogId}`);

            // Update local message
            const messages = this.messagesByDialog.get(dialogId);
            if (messages) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    msg.isDeleted = true;
                    msg.text = "[Deleted]";
                    emitter.emit<Message>(`msg:${dialogId}`, msg);
                }
            }
        } catch (error) {
            console.error(`Failed to delete message:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from chat WebSocket
     */
    disconnectChat(dialogId: number) {
        const ws = this.activeConnections.get(dialogId);
        if (ws) {
            ws.close();
            this.activeConnections.delete(dialogId);
            console.log(`Disconnected from chat ${dialogId}`);
        }
    }

    /**
     * Disconnect from all chats
     */
    disconnectAll() {
        for (const [dialogId, ws] of this.activeConnections) {
            ws.close();
        }
        this.activeConnections.clear();
        console.log("Disconnected from all chats");
    }
}

export const chatStore = new ChatStore();

