/**
 * UserSearch Component
 * Search bar for finding users and creating chats with them
 */

import colors from "@/assets/colors";
import { useAuth } from "@/context/AuthContext";
import { chatAPI, userAPI, type User, getDisplayName } from "@/services/api";
import { chatStore } from "@/services/chat";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface UserSearchProps {
    onClose?: () => void;
}

export default function UserSearch({onClose}: UserSearchProps) {
    const {credentials} = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length < 2) {
            setUsers([]);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                if (!credentials?.token) {
                    setUsers([]);
                    return;
                }

                const results = await userAPI.searchUsers(searchQuery.trim());

                const normalized = results.map(user => {
                    const raw = user as any; // временно отключаем TS для приведения
                    return {
                        id: raw.id ?? raw.ID,
                        ID: raw.ID ?? raw.id,
                        username: raw.username ?? raw.Username ?? null,
                        Username: raw.Username ?? raw.username ?? null,
                        password: raw.password ?? raw.Password ?? "",
                        phone: raw.phone ?? raw.Phone ?? null,
                        CreatedAt: raw.CreatedAt ?? raw.createdAt ?? null,
                        UpdatedAt: raw.UpdatedAt ?? raw.updatedAt ?? null,
                        DeletedAt: raw.DeletedAt ?? raw.deletedAt ?? null,
                        display_name: raw.display_name ?? raw.DisplayName ?? raw.displayName ?? raw.Username ?? raw.username ?? null,
                        Chats: raw.Chats ?? raw.chats ?? [],
                    } as User;
                });

                setUsers(normalized.filter(u => u.id != null) as unknown as User[]);
            } catch (error) {
                console.error("[UserSearch] Failed to search users:", error);
                setUsers([]);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, credentials?.token]);

    const handleUserSelect = useCallback(
        async (user: User) => {
            if (!credentials?.token || !credentials?.userId || !user?.id) return;

            try {
                // Читаемое имя чата: "Вы и Пользователь" или запасные варианты
                const chatName =
                    `${credentials.username ?? "Вы"} и ${user.username ?? user.phone ?? "пользователь"}`.trim();

                // Создаём чат с обоими участниками (бек всё равно добавит инициатора, но передаем явно)
                const resultChat = await chatAPI.createChat(
                    {
                        name: chatName,
                        user_ids: [credentials.userId, user.id],
                    },
                    credentials.token
                );

                // Обновляем список диалогов локально
                await chatStore.loadDialogs(credentials.token);

                // Закрываем модалку перед навигацией
                onClose?.();

                // Навигация к созданному чату (бек может вернуть ID в разных регистрах)
                const newChatId = (resultChat as any)?.id ?? (resultChat as any)?.ID;
                if (newChatId) {
                    router.push(`/messages/${newChatId}`);
                }
            } catch (err) {
                console.error("[CreateChat] Ошибка создания чата:", err);
            }
        },
        [router, credentials, onClose]
    );

    const renderUserItem = useCallback(
        ({item}: {item: User}) => {
            return (
                <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleUserSelect(item)}
                >
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(getDisplayName(item) ?? item.username ?? item.phone)?.[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.username}>{getDisplayName(item) ?? item.username}</Text>
                            {item.phone && (
                                <Text style={styles.phone}>{item.phone}</Text>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.main}/>
                </TouchableOpacity>
            );
        },
        [handleUserSelect]
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={colors.additionalText} style={styles.searchIcon}/>
                <TextInput
                    style={styles.input}
                    placeholder="Поиск пользователей..."
                    placeholderTextColor={colors.additionalText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color={colors.additionalText}/>
                    </Pressable>
                )}
            </View>

            {isSearching && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.main}/>
                    <Text style={styles.loadingText}>Поиск...</Text>
                </View>
            )}

            {!isSearching && searchQuery.trim().length >= 2 && (
                <FlatList
                    data={users.filter(user => user?.id != null)}
                    keyExtractor={(item, idx) => (item?.id != null ? item.id.toString() : `user-${idx}`)}
                    renderItem={renderUserItem}
                    style={styles.resultsList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color={colors.additionalText}/>
                            <Text style={styles.emptyText}>Пользователи не найдены</Text>
                        </View>
                    }
                />
            )}

            {searchQuery.trim().length < 2 && !isSearching && (
                <View style={styles.hintContainer}>
                    <Ionicons name="information-circle-outline" size={24} color={colors.additionalText}/>
                    <Text style={styles.hintText}>Введите минимум 2 символа для поиска</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundAccent,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        margin: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: colors.maintext,
        fontSize: 16,
    },
    clearButton: {
        padding: 4,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 12,
    },
    loadingText: {
        color: colors.additionalText,
        fontSize: 14,
    },
    resultsList: {
        flex: 1,
    },
    userItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.backgroundAccent,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.main,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    avatarText: {
        color: "#1e1e1e",
        fontSize: 18,
        fontWeight: "700",
    },
    userDetails: {
        flex: 1,
    },
    username: {
        color: colors.maintext,
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    phone: {
        color: colors.additionalText,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    emptyText: {
        color: colors.additionalText,
        fontSize: 16,
        marginTop: 12,
    },
    hintContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 8,
    },
    hintText: {
        color: colors.additionalText,
        fontSize: 14,
    },
});
