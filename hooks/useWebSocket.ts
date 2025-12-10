/**
 * React Hook for WebSocket connection
 * Provides easy-to-use interface for WebSocket communication in components
 */

import { useAuth } from "@/context/AuthContext";
import { WebSocketCallbacks, WebSocketMessage, webSocketService, WebSocketStatus } from "@/services/websocket";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWebSocketOptions {
  chatId: number | null;
  onMessage?: (message: WebSocketMessage) => void;
  onHistory?: (messages: WebSocketMessage[], meta?: { count: number; has_more: boolean }) => void;
  onMessageSent?: (messageId: number, timestamp: string) => void;
  onTyping?: (userId: number, isTyping: boolean) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  sendMessage: (text: string) => boolean;
  sendTypingIndicator: (isTyping: boolean) => boolean;
  sendReadReceipt: (messageId: number) => boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { chatId, autoConnect = true, ...callbacks } = options;
  const { credentials } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const callbacksRef = useRef<WebSocketCallbacks>(callbacks);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Wrapped callbacks that use ref to avoid re-renders
  const wrappedCallbacks: WebSocketCallbacks = {
    onMessage: (message) => callbacksRef.current.onMessage?.(message),
    onHistory: (messages, meta) => callbacksRef.current.onHistory?.(messages, meta),
    onMessageSent: (messageId, timestamp) => callbacksRef.current.onMessageSent?.(messageId, timestamp),
    onTyping: (userId, isTyping) => callbacksRef.current.onTyping?.(userId, isTyping),
    onError: (error) => callbacksRef.current.onError?.(error),
    onRoomInfo: (info) => callbacksRef.current.onRoomInfo?.(info),
    onUserJoined: (userId) => callbacksRef.current.onUserJoined?.(userId),
    onUserLeft: (userId) => callbacksRef.current.onUserLeft?.(userId),
    onStatusChange: (newStatus) => {
      setStatus(newStatus);
      callbacksRef.current.onStatusChange?.(newStatus);
    },
  };

  const connect = useCallback(() => {
    if (!chatId || !credentials?.token) {
      console.warn("[useWebSocket] Cannot connect: missing chatId or token");
      return;
    }

    webSocketService.connect(chatId, credentials.token, wrappedCallbacks);
  }, [chatId, credentials?.token]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Auto-connect when chatId or token changes
  useEffect(() => {
    if (autoConnect && chatId && credentials?.token) {
      connect();
    }

    return () => {
      // Disconnect when component unmounts or dependencies change
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, chatId, credentials?.token, connect, disconnect]);

  const sendMessage = useCallback((text: string): boolean => {
    return webSocketService.sendMessage(text);
  }, []);

  const sendTypingIndicator = useCallback((isTyping: boolean): boolean => {
    return webSocketService.sendTypingIndicator(isTyping);
  }, []);

  const sendReadReceipt = useCallback((messageId: number): boolean => {
    return webSocketService.sendReadReceipt(messageId);
  }, []);

  return {
    status,
    isConnected: status === "connected",
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    connect,
    disconnect,
  };
}

