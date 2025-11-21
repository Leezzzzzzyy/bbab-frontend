import {AppState} from "react-native";
import {chatAPI, type Message as APIMessage, type ListChatsResponse} from "./api";

export type Message = {
    id: string;
    dialogId: string;
    senderId: string;
    text: string;
    createdAt: number; // epoch ms
};

export type Dialog = {
    id: string;
    name: string;
    lastMessage?: string;
    lastTime?: number;
    unreadCount?: number;
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
                // noop
            }
        });
    }
}

export const currentUserId = "u0";

function seedMessages() {
    const names = [
        {id: "1", name: "Alice"},
        {id: "2", name: "Bob"},
        {id: "3", name: "Charlie"},
        {id: "4", name: "Diana"},
    ];
    const dialogs: Dialog[] = names.map((n) => ({id: n.id, name: n.name}));
    const messages: Message[] = [];

    const now = Date.now();
    let counter = 1;
    for (const d of dialogs) {
        const base = now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7);
        const count = 25 + Math.floor(Math.random() * 30);
        for (let i = 0; i < count; i++) {
            const isMe = Math.random() > 0.5;
            messages.push({
                id: `m${counter++}`,
                dialogId: d.id,
                senderId: isMe ? currentUserId : d.id,
                text: isMe ? "Sounds good!" : "Hey there!",
                createdAt: base + i * 1000 * 60 * (2 + Math.floor(Math.random() * 5)),
            });
        }
    }
    return {dialogs, messages};
}

const emitter = new Emitter();

class ChatStore {
    dialogs: Dialog[] = [];
    messagesByDialog = new Map<string, Message[]>();

    constructor() {
        const {dialogs, messages} = seedMessages();
        this.dialogs = dialogs;
        for (const d of dialogs) this.messagesByDialog.set(d.id, []);
        for (const m of messages) {
            const arr = this.messagesByDialog.get(m.dialogId)!;
            arr.push(m);
        }
        for (const [id, arr] of this.messagesByDialog) {
            arr.sort((a, b) => a.createdAt - b.createdAt);
        }
        this.recalcDialogSummaries();

        // Example: update summaries when app returns to foreground (simulating sync)
        AppState.addEventListener("change", (s) => {
            if (s === "active") this.recalcDialogSummaries();
        });
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
        // return copy sorted by lastTime desc
        return this.dialogs
            .slice()
            .sort((a, b) => (b.lastTime ?? 0) - (a.lastTime ?? 0));
    }

    subscribeDialogs(cb: Listener<Dialog[]>) {
        return emitter.on("dialogs:updated", cb);
    }

    getMessages(dialogId: string, before?: number, limit = 20): {
        messages: Message[];
        hasMore: boolean;
        nextCursor?: number
    } {
        const all = this.messagesByDialog.get(dialogId) ?? [];
        // messages sorted asc; select a window ending before 'before'
        let endIndex = all.length; // non-inclusive
        if (before != null) {
            endIndex = all.findIndex((m) => m.createdAt >= before);
            if (endIndex === -1) endIndex = all.length;
        }
        const startIndex = Math.max(0, endIndex - limit);
        const slice = all.slice(startIndex, endIndex);
        const hasMore = startIndex > 0;
        const nextCursor = hasMore ? all[startIndex - 1].createdAt : undefined;
        return {messages: slice, hasMore, nextCursor};
    }

    subscribeMessages(dialogId: string, cb: Listener<Message>) {
        return emitter.on<Message>(`msg:${dialogId}`, cb);
    }

    sendMessage(dialogId: string, text: string): Message {
        const msg: Message = {
            id: `m${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            dialogId,
            senderId: currentUserId,
            text: text.trim(),
            createdAt: Date.now(),
        };
        const arr = this.messagesByDialog.get(dialogId) ?? [];
        arr.push(msg);
        this.messagesByDialog.set(dialogId, arr);
        emitter.emit<Message>(`msg:${dialogId}`, msg);
        this.recalcDialogSummaries();
        return msg;
    }
}

export const chatStore = new ChatStore();
