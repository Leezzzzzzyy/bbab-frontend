/**
 * WebSocket Service for BBBAB Messenger
 * Handles real-time communication with the backend WebSocket API
 */

import { WS_BASE_URL } from "@/config/environment";

// ============================================================================
// Types
// ============================================================================

export interface WebSocketMessage {
  id?: number;
  chat_id: number;
  sender_id: number;
  message: string;
  type?: string;
  timestamp: string;
  sender?: {
    id: number;
    username: string;
    avatar_url?: string;
  };
}

export interface WebSocketInEvent {
  type: string;
  message?: string;
  timestamp?: number;
}

export interface WebSocketOutEvent {
  type: string;
  message?: any;
  messages?: WebSocketMessage[];
  user_id?: number;
  chat_id?: number;
  timestamp?: string;
  message_id?: number;
  meta?: {
    count?: number;
    has_more?: boolean;
  };
}

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void;
  onHistory?: (messages: WebSocketMessage[], meta?: { count: number; has_more: boolean }) => void;
  onMessageSent?: (messageId: number, timestamp: string) => void;
  onTyping?: (userId: number, isTyping: boolean) => void;
  onError?: (error: string) => void;
  onRoomInfo?: (info: { chat_id: number; active_clients: number; created_at: string; last_activity: string }) => void;
  onUserJoined?: (userId: number) => void;
  onUserLeft?: (userId: number) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

// ============================================================================
// WebSocket Service
// ============================================================================

class WebSocketService {
  private ws: WebSocket | null = null;
  private chatId: number | null = null;
  private token: string | null = null;
  private callbacks: WebSocketCallbacks = {};
  private status: WebSocketStatus = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private messageQueue: WebSocketInEvent[] = [];

  /**
   * Connect to WebSocket server
   */
  connect(chatId: number, token: string, callbacks: WebSocketCallbacks = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.chatId === chatId) {
      // Already connected to this chat
      return;
    }

    // Disconnect existing connection if any
    this.disconnect();

    this.chatId = chatId;
    this.token = token;
    this.callbacks = callbacks;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (!this.chatId || !this.token) {
      return;
    }

    this.setStatus("connecting");

    try {
      // Construct WebSocket URL with token as query parameter
      // Backend supports token via query parameter for clients that can't set headers
      const wsUrl = `${WS_BASE_URL}/chat/${this.chatId}/ws?token=${encodeURIComponent(this.token)}`;
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to chat ${this.chatId}`);
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Send queued messages
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketOutEvent = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
          this.callbacks.onError?.("Failed to parse server message");
        }
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        this.setStatus("error");
        this.callbacks.onError?.("WebSocket connection error");
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed:`, event.code, event.reason);
        this.setStatus("disconnected");
        this.cleanup();

        // Attempt reconnection if not intentionally closed
        if (this.shouldReconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("[WebSocket] Failed to create connection:", error);
      this.setStatus("error");
      this.callbacks.onError?.("Failed to create WebSocket connection");
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: WebSocketOutEvent): void {
    switch (data.type) {
      case "message":
        if (data.message) {
          this.callbacks.onMessage?.(data.message as WebSocketMessage);
        }
        break;

      case "history":
        if (data.messages) {
          this.callbacks.onHistory?.(data.messages, data.meta as { count: number; has_more: boolean });
        }
        break;

      case "message_sent":
        if (data.message_id && data.timestamp) {
          this.callbacks.onMessageSent?.(data.message_id, data.timestamp);
        }
        break;

      case "typing":
        if (data.user_id !== undefined && data.message !== undefined) {
          const isTyping = typeof data.message === "boolean" ? data.message : data.message === true || data.message === "true";
          this.callbacks.onTyping?.(data.user_id, isTyping);
        }
        break;

      case "error":
        const errorMsg = typeof data.message === "string" ? data.message : "Unknown error";
        console.error("[WebSocket] Server error:", errorMsg);
        this.callbacks.onError?.(errorMsg);
        break;

      case "room_info":
        if (data.message) {
          this.callbacks.onRoomInfo?.(data.message as any);
        }
        break;

      case "user_joined":
        if (data.user_id) {
          this.callbacks.onUserJoined?.(data.user_id);
        }
        break;

      case "user_left":
        if (data.user_id) {
          this.callbacks.onUserLeft?.(data.user_id);
        }
        break;

      default:
        console.warn("[WebSocket] Unknown event type:", data.type);
    }
  }

  /**
   * Send a message to the chat
   */
  sendMessage(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later
      this.messageQueue.push({
        type: "message",
        message: text,
        timestamp: Date.now(),
      });
      return false;
    }

    try {
      const event: WebSocketInEvent = {
        type: "message",
        message: text,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(event));
      return true;
    } catch (error) {
      console.error("[WebSocket] Failed to send message:", error);
      this.callbacks.onError?.("Failed to send message");
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(isTyping: boolean): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const event: WebSocketInEvent = {
        type: "typing",
        message: isTyping.toString(),
      };
      this.ws.send(JSON.stringify(event));
      return true;
    } catch (error) {
      console.error("[WebSocket] Failed to send typing indicator:", error);
      return false;
    }
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(messageId: number): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const event: WebSocketInEvent = {
        type: "read_receipt",
        message: messageId.toString(),
      };
      this.ws.send(JSON.stringify(event));
      return true;
    } catch (error) {
      console.error("[WebSocket] Failed to send read receipt:", error);
      return false;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const msg of queue) {
      if (msg.type === "message") {
        this.sendMessage(msg.message || "");
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnection attempts reached");
      this.callbacks.onError?.("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.attemptConnection();
    }, delay);
  }

  /**
   * Set connection status
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Cleanup handled in disconnect
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setStatus("disconnected");
    this.chatId = null;
    this.token = null;
    this.messageQueue = [];
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

