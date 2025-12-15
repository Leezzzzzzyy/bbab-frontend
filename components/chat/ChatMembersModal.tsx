import React, { useEffect, useState, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import colors from "@/assets/colors";
import { chatAPI, type User } from "@/services/api";

interface ChatMembersModalProps {
    visible: boolean;
    dialogId: number;
    dialogName: string;
    onClose: () => void;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    content: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 16,
        paddingHorizontal: 16,
        maxHeight: "80%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    closeButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    closeButtonText: {
        fontSize: 28,
        color: colors.main,
        fontWeight: "300",
    },
    memberItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.main,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    memberAvatarText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    memberUsername: {
        fontSize: 12,
        color: colors.additionalText,
        marginTop: 2,
    },
    loadingContainer: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    errorText: {
        fontSize: 14,
        color: colors.error || "#ff4444",
        textAlign: "center",
        paddingVertical: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.additionalText,
        textAlign: "center",
        paddingVertical: 16,
    },
});

export default function ChatMembersModal({
    visible,
    dialogId,
    dialogName,
    onClose,
}: ChatMembersModalProps) {
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const users = await chatAPI.getChatUsers(dialogId);
            setMembers(users || []);
        } catch (err) {
            console.error("Failed to load chat members:", err);
            setError("Не удалось загрузить участников");
        } finally {
            setLoading(false);
        }
    }, [dialogId]);

    useEffect(() => {
        if (visible && dialogId) {
            loadMembers();
        }
    }, [visible, dialogId, loadMembers]);

    const getInitials = (username?: string | null): string => {
        if (!username) return "?";
        const parts = username.split(" ");
        return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
    };

    const renderMember = ({ item }: { item: User }) => {
        const displayName = item.Username || "Неизвестно";
        return (
            <View style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{getInitials(item.Username)}</Text>
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{displayName}</Text>
                    {item.phone && (
                        <Text style={styles.memberUsername}>{item.phone}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            Участники ({members.length})
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color={colors.main}
                            />
                        </View>
                    ) : error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : members.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Нет участников
                        </Text>
                    ) : (
                        <FlatList
                            data={members}
                            keyExtractor={(item) => `member-${item.id}`}
                            renderItem={renderMember}
                            scrollEnabled={true}
                            nestedScrollEnabled={true}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

