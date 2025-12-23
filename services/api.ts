/**
 * API Service for BBBAB Messenger
 * Handles all HTTP requests to the backend API
 * Base URL: http://94.241.170.140:8080/api
 */
import { API_BASE_URL } from "@/config/environment";


// ============================================================================
// Types
// ============================================================================

export interface SMSLoginRequest {
    phone: string;
}

export interface ConfirmLoginRequest {
    phone: string;
    code: string;
    username?: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    confirmPassword: string;
}

export interface TokenResponse {
    token: string;
}

export interface User {
    id?: number;
    ID?: number;
    username?: string | null;
    Username?: string | null;
    display_name?: string | null;
    displayName?: string | null;
    DisplayName?: string | null;
    password?: string;
    phone?: string | null;
    CreatedAt?: string | null;
    UpdatedAt?: string | null;
    DeletedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
    Chats?: Chat[];
    chats?: Chat[];
    profile_picture_key?: string | null;
}

/**
 * Helper: return the best display name for a user.
 * Preference order: display_name, DisplayName, Username, username
 */
export function getDisplayName(user: Partial<User> | any): string | null {
    if (!user) return null;

    const candidates = [
        user.display_name,
        user.DisplayName,
        user.displayName,
        user.Username,
        user.username,
    ];

    for (const v of candidates) {
        if (v == null) continue; // null or undefined
        if (typeof v === "string") {
            const t = v.trim();
            if (t.length > 0) return t;
            continue;
        }
        // If it's not a string but present, return its string representation
        return String(v);
    }

    return null;
}

export interface Chat {
    ID: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    users?: User[];
    messages?: Message[];
}

export interface Message {
    type: string;
    id: number;
    chatID: number;
    senderID: number;
    message: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface ErrorResponse {
    message: string;
}

export interface CreateGroupRequest {
    name: string;
    user_ids: number[];
}

export interface SendMessageRequest {
    receiver_id: number;
    message: string;
}

export interface AddUserRequest {
    user_id: number;
}

export interface ListChatsResponse {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    lastMessage?: Message;
}

export interface ChatMessagesResponse {
    data: Message[];
    pagination: PaginationInfo;
}

export interface PaginationInfo {
    nextCursor?: string;
    previousCursor?: string;
    hasNext: boolean;
    hasPrevious: boolean;
    limit: number;
    totalCount: number;
}

export interface ChatDetailResponse {
    createdAt: string;
    deletedAt?: {
        time: string;
        valid: boolean;
    } | null;
    id: number;
    isGroup: boolean;
    messages?: Array<{
        attachment_url?: string;
        chat_id: number;
        createdAt: string;
        deletedAt?: {
            time: string;
            valid: boolean;
        } | null;
        id: number;
        is_edited: boolean;
        message: string;
        reply_to?: string;
        reply_to_id?: number;
        sender: User;
        sender_id: number;
        status?: string;
        timestamp: string;
        type: string;
        updatedAt: string;
    }>;
    name: string;
    updatedAt: string;
    Users: User[];
}

// ============================================================================
// Helper Functions
// ============================================================================

// Глобальный обработчик ошибок авторизации
let onUnauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedHandler(callback: () => void) {
    onUnauthorizedCallback = callback;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        // Если получили 401 Unauthorized, вызываем обработчик выхода
        if (response.status === 401) {
            console.warn("[API] Received 401 Unauthorized, triggering logout");
            if (onUnauthorizedCallback) {
                onUnauthorizedCallback();
            }
        }
        
        const error: ErrorResponse = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        
        // Создаем специальный тип ошибки для 401
        const errorMessage = error.message || "API request failed";
        const apiError = new Error(errorMessage);
        (apiError as any).status = response.status;
        throw apiError;
    }
    const data = await response.json();
    console.log("[API] Response received, status:", response.status, "data:", data);
    return data;
}

function getAuthHeader(token?: string): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

// ============================================================================
// System Endpoints
// ============================================================================

export const systemAPI = {
    /**
     * GET /ping
     * Health check endpoint for monitoring service availability
     */
    ping: async (): Promise<{ message: string }> => {
        const response = await fetch(`${API_BASE_URL}/ping`, {
            method: "GET",
            headers: getAuthHeader(),
        });
        return handleResponse(response);
    },
};

// ============================================================================
// Auth Endpoints
// ============================================================================

export const authAPI = {
    /**
     * POST /initlogin
     * Start SMS login procedure by sending a verification code to the provided phone number
     */
    initLogin: async (data: SMSLoginRequest): Promise<{ message: string, user_exists: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/initlogin`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * POST /confirmlogin
     * Validate phone verification code and log the user in (creating a new account if necessary)
     */
    confirmLogin: async (data: ConfirmLoginRequest): Promise<TokenResponse> => {
        const response = await fetch(`${API_BASE_URL}/confirmlogin`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * POST /register
     * Register a new account using username and password
     */
    register: async (data: RegisterRequest): Promise<TokenResponse> => {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * POST /login
     * Login using username and password credentials
     */
    login: async (data: LoginRequest): Promise<TokenResponse> => {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
};

// ============================================================================
// User Endpoints
// ============================================================================

// Add simple in-memory avatar cache to avoid repeated requests
const avatarCache: Map<number, string | null> = new Map();

// Add helper for fetching avatar URL for a user. Returns null when user has no avatar (404) or on error.
async function fetchAvatarUrl(userId: number): Promise<string | null> {
    try {
        // The backend exposes GET /user/{id}/avatar which returns { profilePictureURL: string } or 404
        const url = `${API_BASE_URL}/user/${userId}/avatar`;
        const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (response.status === 404) {
            // No avatar for this user
            avatarCache.set(userId, null);
            return null;
        }
        if (!response.ok) {
            console.warn("[userAPI.getAvatarUrl] Unexpected response", response.status, await response.text().catch(() => ""));
            avatarCache.set(userId, null);
            return null;
        }
        const data = await response.json().catch(() => null);
        const maybeUrl = data && (data.profilePictureURL ?? data.profile_picture_url ?? data.url ?? null);
        if (typeof maybeUrl === "string" && maybeUrl.length > 0) {
            avatarCache.set(userId, maybeUrl);
            return maybeUrl;
        }
        avatarCache.set(userId, null);
        return null;
    } catch (err) {
        console.warn("[userAPI.getAvatarUrl] Failed to fetch avatar:", err);
        avatarCache.set(userId, null);
        return null;
    }
}

export const userAPI = {
    /**
     * GET /user/me
     * Return the authenticated user's profile
     */
    getCurrentUser: async (token: string): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/me`, {
            method: "GET",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

    /**
     * GET /user/{id}
     * Retrieve user profile information by ID
     */
    getUser: async (id: number): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/user/${id}`, {
            method: "GET",
            headers: getAuthHeader(),
        });
        return handleResponse(response);
    },

    /**
     * GET /search/{prompt}
     * Search users by partial match of username
     */
    searchUsers: async (prompt: string): Promise<User[]> => {
        const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(prompt)}`, {
            method: "GET",
            headers: getAuthHeader(),
        });
        return handleResponse(response);
    },

    // New: get avatar URL for a user (uses internal cache). Returns null if no avatar.
    getAvatarUrl: async (userId: number): Promise<string | null> => {
        if (!userId) return null;
        if (avatarCache.has(userId)) return avatarCache.get(userId) as string | null;
        return fetchAvatarUrl(userId);
    },

    // Expose cache for other parts of the app to inspect/clear if needed
    _avatarCache: avatarCache,
};

// ============================================================================
// Chat Endpoints
// ============================================================================

export const chatAPI = {
    /**
     * POST /chat/create
     * Create a new group chat with specified users or a direct chat
     */
    createChat: async (data: CreateGroupRequest, token: string): Promise<Chat> => {
        const response = await fetch(`${API_BASE_URL}/chat/create`, {
            method: "POST",
            headers: getAuthHeader(token),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * GET /chat/list
     * Get list of chats for the current authenticated user
     */
    listChats: async (token: string): Promise<ListChatsResponse[]> => {
        const response = await fetch(`${API_BASE_URL}/chat/list`, {
            method: "GET",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

    /**
     * GET /chat/{id}
     * Get users of chat by retrieving full chat details
     */
    getChatUsers: async (chatId: number, token: string): Promise<User[]> => {
        const url = `${API_BASE_URL}/chat/${chatId}`;
        console.log(`📡 getChatUsers: Fetching from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: getAuthHeader(token),
        });
        console.log(`📡 getChatUsers: Response status ${response.status}`);
        const chatData: ChatDetailResponse = await handleResponse(response);
        console.log(`📡 getChatUsers: Chat data keys:`, Object.keys(chatData));
        console.log(`📡 getChatUsers: Chat data.users:`, chatData.Users);
        console.log(`📡 getChatUsers: Chat data.users type:`, typeof chatData.Users);
        console.log(`📡 getChatUsers: Chat data.users is array:`, Array.isArray(chatData.Users));
        const users = chatData.Users || [];
        console.log(`📡 getChatUsers: Extracted ${users.length} users`, users);
        return users;
    },

    /**
     * POST /chat/{id}/add
     * Add user to chat
     */
    addUserToChat: async (chatId: number, data: AddUserRequest, token: string): Promise<{ status: string }> => {
        const response = await fetch(`${API_BASE_URL}/chat/${chatId}/add`, {
            method: "POST",
            headers: getAuthHeader(token),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * POST /chat/sendmessage
     * Send a message between two users. If chat does not exist, it will be created automatically
     */
    sendMessage: async (data: SendMessageRequest, token: string): Promise<Message> => {
        const response = await fetch(`${API_BASE_URL}/chat/sendmessage`, {
            method: "POST",
            headers: getAuthHeader(token),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    /**
     * GET /chat/{id}/messages
     * Get messages of chat with cursor-based pagination
     */
    getChatMessages: async (
        chatId: number,
        token: string,
        cursor?: string,
        limit: number = 20,
        direction: "older" | "newer" = "older"
    ): Promise<ChatMessagesResponse> => {
        const params = new URLSearchParams();
        if (cursor) params.append("cursor", cursor);
        params.append("limit", limit.toString());
        params.append("direction", direction);

        const response = await fetch(`${API_BASE_URL}/chat/${chatId}/messages?${params.toString()}`, {
            method: "GET",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

    /**
     * GET /chat/{id}
     * Retrieve full chat details including messages and users by its ID
     */
    getChat: async (chatId: number, token: string): Promise<ChatDetailResponse> => {
        const response = await fetch(`${API_BASE_URL}/chat/${chatId}`, {
            method: "GET",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

    /**
     * POST /chat/join/{chat_id}/{user_id}
     * Mark user as joined in chat (cache, Redis)
     */
    joinChat: async (chatId: number, userId: number, token: string): Promise<{ status: string }> => {
        const response = await fetch(`${API_BASE_URL}/chat/join/${chatId}/${userId}`, {
            method: "POST",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

    /**
     * POST /chat/leave/{chat_id}/{user_id}
     * Mark user as left in chat (persist and clear if last user)
     */
    leaveChat: async (chatId: number, userId: number, token: string): Promise<{ status: string }> => {
        const response = await fetch(`${API_BASE_URL}/chat/leave/${chatId}/${userId}`, {
            method: "POST",
            headers: getAuthHeader(token),
        });
        return handleResponse(response);
    },

};

// ============================================================================
// Export all APIs
// ============================================================================

export const api = {
    system: systemAPI,
    auth: authAPI,
    user: userAPI,
    chat: chatAPI,
};

export default api;
