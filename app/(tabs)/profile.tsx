import colors from "@/assets/colors";
import { useAuth } from "@/context/AuthContext";
import { userAPI, type User, getDisplayName } from "@/services/api";
import { chatStore } from "@/services/chat";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import Avatar from "@/components/Avatar";

// Маппинг ответа API в ваш интерфейс User
function mapApiUserToUser(apiUser: any): User {
  return {
    id: apiUser.ID ?? apiUser.id,
    ID: apiUser.ID ?? apiUser.id,
    username: apiUser.Username ?? apiUser.username ?? null,
    password: apiUser.Password,
    phone: apiUser.Phone ?? apiUser.phone ?? null,
    CreatedAt: apiUser.CreatedAt ?? apiUser.createdAt ?? null,
    UpdatedAt: apiUser.UpdatedAt ?? apiUser.updatedAt ?? null,
    DeletedAt: apiUser.DeletedAt ?? apiUser.deletedAt ?? null,
    Chats: apiUser.Chats ?? apiUser.chats ?? [],
    display_name: apiUser.display_name ?? apiUser.DisplayName ?? apiUser.displayName ?? apiUser.Username ?? apiUser.username ?? null,
    // Map avatar fields from API if present
    profile_picture_key: apiUser.profile_picture_key ?? apiUser.ProfilePictureKey ?? apiUser.profilePictureKey ?? null,
    profilePictureURL: apiUser.profilePictureURL ?? apiUser.profile_picture_url ?? apiUser.avatar_url ?? null,
  } as User;
}

export default function ProfileScreen() {
  const { credentials, clearCredentials } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!credentials?.token) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("starting to get current user info");
        const apiuserData = await userAPI.getCurrentUser(credentials.token);
        const userData = mapApiUserToUser(apiuserData);
        setUser(userData);
        console.log(userData);
      } catch (error) {
        console.error("[ProfileScreen] Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [credentials?.token]);

  const handleLogout = async () => {
    // If in web, use window.confirm, else Alert.alert
    const isWeb = typeof window !== 'undefined';
    const confirmLogout = isWeb ? window.confirm('Вы уверены, что хотите выйти из аккаунта?') : null;
    if ((isWeb && !confirmLogout)) {
      // User cancelled in web
      return;
    }
    if (!isWeb) {
      Alert.alert(
        "Выход из аккаунта",
        "Вы уверены, что хотите выйти из аккаунта?",
        [
          {
            text: "Отмена",
            style: "cancel",
            onPress: () => {},
          },
          {
            text: "Выйти",
            style: "destructive",
            onPress: async () => {
              await doLogout();
            },
          },
        ]
      );
      return;
    }
    // For web, just proceed if confirmed
    await doLogout();
  };

  const doLogout = async () => {
    setIsLoggingOut(true);
    try {
      chatStore.disconnectAll();
      chatStore.clearUserCache && chatStore.clearUserCache();
      await clearCredentials();
      await new Promise(resolve => setTimeout(resolve, 200));
      router.replace("/(auth)");
    } catch (error) {
      console.error("[ProfileScreen] Failed to logout:", error);
      if (typeof window === 'undefined') {
        Alert.alert("Ошибка", "Не удалось выйти из аккаунта. Попробуйте еще раз.");
      } else {
        window.alert("Не удалось выйти из аккаунта. Попробуйте еще раз.");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.main} />
          <Text style={{ color: colors.additionalText, marginTop: 12 }}>
            Загрузка профиля...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Ionicons
            name="person-circle-outline"
            size={64}
            color={colors.additionalText}
          />
          <Text
            style={{
              color: colors.maintext,
              fontSize: 18,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Не удалось загрузить данные профиля
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text
          style={{
            color: colors.maintext,
            fontSize: 28,
            fontWeight: "800",
            marginBottom: 24,
          }}
        >
          Профиль
        </Text>

        {/* User Card */}
        <View
          style={{
            width: "100%",
            backgroundColor: colors.backgroundAccent,
            borderRadius: 16,
            alignItems: "center",
            padding: 24,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              height: 96,
              width: 96,
              borderRadius: 48,
              backgroundColor: colors.main,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Avatar user={user} size={96} />
          </View>

          <Text
            style={{
              color: colors.maintext,
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            {getDisplayName(user) ?? user.username}
          </Text>

          {user.phone && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={colors.additionalText}
              />
              <Text
                style={{
                  color: colors.additionalText,
                  fontSize: 16,
                  marginLeft: 6,
                }}
              >
                {user.phone}
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View
          style={{
            width: "100%",
            backgroundColor: colors.backgroundAccent,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              color: colors.maintext,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 16,
            }}
          >
            Информация
          </Text>

          <View style={{ gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.additionalText}
                />
                <Text
                  style={{
                    color: colors.additionalText,
                    fontSize: 14,
                    marginLeft: 8,
                  }}
                >
                  ID пользователя
                </Text>
              </View>
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                #{user.id}
              </Text>
            </View>

            {user.CreatedAt && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.additionalText}
                  />
                  <Text
                    style={{
                      color: colors.additionalText,
                      fontSize: 14,
                      marginLeft: 8,
                    }}
                  >
                    Дата регистрации
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.maintext,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {formatDate(user.CreatedAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={{
            backgroundColor: "#ff6b6b",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoggingOut ? 0.6 : 1,
          }}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Выйти из аккаунта
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
