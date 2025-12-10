/**
 * UserSearch Component
 * Search bar for finding users and creating chats with them
 */

import colors from "@/assets/colors";
import { useAuth } from "@/context/AuthContext";
import { chatAPI, userAPI, type User } from "@/services/api";
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
    const [isCreatingChat, setIsCreatingChat] = useState<number | null>(null);
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
                // Filter out current user if we can get their ID
                // For now, just show all results
                setUsers(results.filter(r => r.id != null));
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
            if (!credentials?.token || isCreatingChat === user.id) return;

            setIsCreatingChat(user.id);
            try {
                // Create chat with selected user
                const chat = await chatAPI.createChat(
                    {
                        name: "", // Empty name for direct chat
                        user_ids: [user.id],
                    },
                    credentials.token
                );

                // Navigate to chat
                router.push(`/messages/${chat.id}`);
                onClose?.();
            } catch (error) {
                console.error("[UserSearch] Failed to create chat:", error);
                // TODO: Show error toast
            } finally {
                setIsCreatingChat(null);
            }
        },
        [credentials?.token, isCreatingChat, router, onClose]
    );

    const renderUserItem = useCallback(
        ({item}: {item: User}) => {
            const isCreating = isCreatingChat === item.id;

            return (
                <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleUserSelect(item)}
                    disabled={isCreating}
                >
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {item.username?.[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.username}>{item.username}</Text>
                            {item.phone && (
                                <Text style={styles.phone}>{item.phone}</Text>
                            )}
                        </View>
                    </View>
                    {isCreating ? (
                        <ActivityIndicator size="small" color={colors.main}/>
                    ) : (
                        <Ionicons name="chatbubble-outline" size={20} color={colors.main}/>
                    )}
                </TouchableOpacity>
            );
        },
        [handleUserSelect, isCreatingChat]
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

