import React, { useEffect, useState, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from "react-native";
import colors from "@/assets/colors";
import { chatAPI, type User, getDisplayName } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/Avatar";
import UserSearch from "@/components/chat/UserSearch";

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
    const { credentials } = useAuth();
    const [isInviteVisible, setIsInviteVisible] = useState(false);
    const [isInviting, setIsInviting] = useState(false);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("🔍 ChatMembersModal.loadMembers: dialogId=", dialogId, "token=", credentials?.token ? "exists" : "missing");

            if (!credentials?.token) {
                console.log("❌ ChatMembersModal.loadMembers: No token");
                setError("Нет авторизации");
                return;
            }

            console.log("📡 Fetching chat users for dialogId:", dialogId);
            const users = await chatAPI.getChatUsers(dialogId, credentials.token);
            console.log("✅ Received users:", users);

            setMembers(users || []);
        } catch (err: any) {
            console.error("❌ Failed to load chat members:", err);
            setError("Не удалось загрузить участников");
        } finally {
            setLoading(false);
        }
    }, [dialogId, credentials?.token]);

    const handleInvite = useCallback(async (user: User) => {
        if (!credentials?.token) {
            Alert.alert("Ошибка", "Нет токена аутентификации");
            return;
        }
        const userId = (user.ID ?? user.id) as number | undefined;
        if (!userId) return;

        try {
            setIsInviting(true);
            // Use joinChat API to notify that user joined the chat (per requested endpoint)
            await chatAPI.joinChat(dialogId, userId, credentials.token);

            // Refresh members list
            await loadMembers();

            // Close invite modal
            setIsInviteVisible(false);
        } catch (err: any) {
            console.error("Failed to invite user:", err);
            // Show API error message if available
            const msg = err?.message ?? "Не удалось пригласить пользователя";
            Alert.alert("Ошибка", msg);
        } finally {
            setIsInviting(false);
        }
    }, [credentials?.token, dialogId, loadMembers]);

    useEffect(() => {
        console.log("🔔 ChatMembersModal.useEffect: visible=", visible, "dialogId=", dialogId);
        if (visible && dialogId) {
            console.log("🔔 ChatMembersModal.useEffect: Calling loadMembers");
            loadMembers();
        }
    }, [visible, dialogId, loadMembers]);

    const renderMember = ({ item }: { item: User }) => {
        const displayName = getDisplayName(item) ?? "Неизвестно";
        console.log(displayName);
        const memberId = (item.ID ?? item.id) as number | undefined;
        const isMe = !!(credentials?.userId && memberId && credentials.userId === memberId);
        const displayLabel = isMe ? `${displayName} (Вы)` : displayName;
        return (
            <View style={styles.memberItem}>
                <Avatar user={item} size={40} style={{ marginRight: 12 }} />
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{displayLabel}</Text>
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
                            {dialogName ? `${dialogName} — Участники (${members.length})` : `Участники (${members.length})`}
                        </Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <TouchableOpacity
                                style={[styles.closeButton, {marginRight: 8}]}
                                onPress={() => setIsInviteVisible(true)}
                            >
                                <Text style={[styles.closeButtonText, {fontSize: 22}]}>＋</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
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
            {/* Invite modal uses the existing UserSearch component */}
            <Modal
                visible={isInviteVisible}
                animationType="slide"
                onRequestClose={() => setIsInviteVisible(false)}
            >
                <View style={{flex: 1, backgroundColor: colors.background}}>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}>
                        <Text style={{color: colors.text, fontSize: 18, fontWeight: '600'}}>Пригласить в чат</Text>
                        <TouchableOpacity onPress={() => setIsInviteVisible(false)} style={{padding: 8}}>
                            <Text style={{color: colors.text, fontSize: 20}}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <UserSearch
                        onClose={() => setIsInviteVisible(false)}
                        excludeIds={members.map(m => (m.ID ?? m.id) as number).filter(Boolean)}
                        onUserSelect={async (user) => {
                            await handleInvite(user);
                        }}
                    />
                </View>
            </Modal>
        </Modal>
    );
}
