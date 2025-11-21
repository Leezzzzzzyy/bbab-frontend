import colors from "@/assets/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import {Tabs} from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.main,
                tabBarInactiveTintColor: colors.additionalText,
                tabBarStyle: {
                    backgroundColor: colors.backgroundAccent,
                    borderTopColor: "rgba(255,255,255,0.1)",
                },
            }}
        >
            {/* Скрываем автоматически сгенерированный index экран, если он есть */}
            <Tabs.Screen
                name="index"
                options={{
                    // скрыть кнопку на таб-баре
                    href: null,
                }}
            />

            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",
                    tabBarIcon: ({color, focused, size}: { color: string; focused: boolean; size: number }) => (
                        <Ionicons
                            name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({color, focused, size}: { color: string; focused: boolean; size: number }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
