import colors from "@/assets/colors";
import UserSearch from "@/components/chat/UserSearch";
import { chatStore, type Dialog } from "@/services/chat";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from "react-native";

export default function MessagesIndex() {
    const [dialogs, setDialogs] = useState<Dialog[]>(chatStore.listDialogs());
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

    useEffect(() => {
        const off = chatStore.subscribeDialogs((d) => setDialogs(d.slice()));
        return () => off();
    }, []);

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
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
                        Messages
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

                <FlatList
                    data={dialogs}
                    keyExtractor={(item) => item.id}
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
                />
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
