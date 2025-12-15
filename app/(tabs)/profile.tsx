import colors from "@/assets/colors";
import { useAuth } from "@/context/AuthContext";
import { userAPI, type User } from "@/services/api";
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

// Маппинг ответа API в ваш интерфейс User
function mapApiUserToUser(apiUser: any): User {
  return {
    id: apiUser.ID,
    ID: apiUser.ID,
    username: apiUser.Username ?? null,
    password: apiUser.Password,
    phone: apiUser.Phone ?? null,
    createdAt: apiUser.CreatedAt ?? null,
    updatedAt: apiUser.UpdatedAt ?? null,
    deletedAt: apiUser.DeletedAt ?? null,
    chats: apiUser.Chats ?? [],
  };
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
    Alert.alert(
      "Выход из аккаунта",
      "Вы уверены, что хотите выйти из аккаунта?",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await clearCredentials();
              router.replace("/(auth)");
            } catch (error) {
              console.error("[ProfileScreen] Failed to logout:", error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
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

  const getInitials = (username: string | undefined | null) => {
    if (!username) return "?";
    const parts = username.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username[0].toUpperCase();
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
            <Text
              style={{
                color: "#1e1e1e",
                fontWeight: "900",
                fontSize: 32,
              }}
            >
              {getInitials(user.username)}
            </Text>
          </View>

          <Text
            style={{
              color: colors.maintext,
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            {user.username}
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

            {user.createdAt && (
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
                  {formatDate(user.createdAt)}
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
