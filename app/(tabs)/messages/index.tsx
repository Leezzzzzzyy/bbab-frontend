import colors from "@/assets/colors";
import {chatStore, type Dialog} from "@/services/chat";
import {useAuth} from "@/context/AuthContext";
import {Link} from "expo-router";
import React, {useCallback, useEffect, useState} from "react";
import {FlatList, Text, View, Pressable, ActivityIndicator, Alert, Modal, SafeAreaView} from "react-native";
import UserSearch from "@/components/chat/UserSearch";
import Ionicons from "@expo/vector-icons/Ionicons";


export default function MessagesIndex() {
    const [dialogs, setDialogs] = useState<Dialog[]>(chatStore.listDialogs());
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const {credentials} = useAuth();

    const loadDialogs = useCallback(async () => {
        if (!credentials?.token) return;
        try {
            setIsLoading(true);
            await chatStore.loadDialogs(credentials.token);
            setDialogs(chatStore.listDialogs());
        } catch (error) {
            console.error("Failed to load dialogs:", error);
            Alert.alert("Ошибка", "Не удалось загрузить чаты. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsLoading(false);
        }
    }, [credentials?.token]);

    useEffect(() => {
        loadDialogs();
        const off = chatStore.subscribeDialogs((d) => setDialogs(d.slice()));
        
        // Периодически проверяем последние сообщения для всех диалогов
        // чтобы обновлять список диалогов реактивно, даже если нет активных WebSocket соединений
        const checkAllDialogsInterval = setInterval(() => {
            const token = credentials?.token;
            if (token) {
                // Получаем актуальный список диалогов на момент проверки
                const currentDialogs = chatStore.listDialogs();
                if (currentDialogs.length > 0) {
                    // Проверяем последнее сообщение для каждого диалога
                    currentDialogs.forEach((dialog) => {
                        chatStore.checkLastMessage(dialog.id, token).catch((error) => {
                            console.error(`Failed to check last message for dialog ${dialog.id}:`, error);
                        });
                    });
                }
            }
        }, 5000); // Проверяем каждые 5 секунд
        
        return () => {
            off();
            clearInterval(checkAllDialogsInterval);
        };
    }, [credentials?.token, loadDialogs]);

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background, padding: 16}}>
            <View style={{flex: 1, padding: 16}}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                    }}
                >
                    <Text
                        style={{
                            color: colors.maintext,
                            fontSize: 22,
                            fontWeight: "800",
                        }}
                    >
                        Сообщения
                    </Text>
                    <Pressable
                        onPress={() => setIsSearchModalVisible(true)}
                        style={{
                            backgroundColor: colors.main,
                            borderRadius: 20,
                            width: 40,
                            height: 40,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="add" size={24} color="#1e1e1e"/>
                    </Pressable>
                </View>

            {isLoading ? (
                <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
                    <ActivityIndicator color={colors.main} size="large" />
                </View>
            ) : (
                <FlatList
                    data={dialogs}
                    keyExtractor={(item) => item.id.toString()}
                    ItemSeparatorComponent={() => <View style={{height: 12}}/>}
                    renderItem={({item}) => (
                        <Link href={`/messages/${item.id}`} asChild>
                            <Pressable
                                style={{
                                    backgroundColor: colors.backgroundAccent,
                                    borderRadius: 12,
                                    padding: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.maintext,
                                        fontWeight: "700",
                                        fontSize: 16,
                                        marginBottom: 6,
                                    }}
                                >
                                    {item.name}
                                </Text>
                                {!!item.lastMessage && (
                                    <Text numberOfLines={1} style={{color: colors.additionalText}}>
                                        {item.lastMessage}
                                    </Text>
                                )}
                                {!!item.lastTime && (
                                    <Text style={{color: colors.additionalText, marginTop: 8, fontSize: 12}}>
                                        {new Date(item.lastTime).toLocaleString()}
                                    </Text>
                                )}
                            </Pressable>
                        </Link>
                    )}
                    ListEmptyComponent={() => (
                        <View style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            paddingVertical: 40,
                        }}>
                            <Text style={{
                                color: colors.additionalText,
                                fontSize: 16,
                                textAlign: "center",
                            }}>
                                Нет чатов
                            </Text>
                            <Text style={{
                                color: colors.additionalText,
                                fontSize: 14,
                                textAlign: "center",
                                marginTop: 8,
                            }}>
                                Начните разговор, чтобы отправить первое сообщение
                            </Text>
                        </View>
                    )}
                />
            )}
            </View>
            <Modal
                visible={isSearchModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsSearchModalVisible(false)}
            >
                <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: "rgba(255,255,255,0.1)",
                        }}
                    >
                        <Text
                            style={{
                                color: colors.maintext,
                                fontSize: 20,
                                fontWeight: "700",
                            }}
                        >
                            Новый чат
                        </Text>
                        <Pressable
                            onPress={() => setIsSearchModalVisible(false)}
                            style={{
                                padding: 8,
                            }}
                        >
                            <Ionicons name="close" size={24} color={colors.maintext}/>
                        </Pressable>
                    </View>
                    <UserSearch onClose={() => setIsSearchModalVisible(false)}/>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>

    );
}
