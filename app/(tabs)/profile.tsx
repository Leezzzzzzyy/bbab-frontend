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
  TextInput,
} from "react-native";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/auth/AvatarPicker";

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

// Вспомогательный компонент для редактирования display_name
function EditableDisplayName({
  user,
  credentials,
  onUpdate,
}: {
  user: User;
  credentials: any;
  onUpdate: (u: User) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState<string>(user.display_name ?? "");
  const [isSaving, setIsSaving] = React.useState(false);

  useEffect(() => {
    setValue(user.display_name ?? "");
  }, [user.display_name, user.username]);

  const displayToShow = (valueToShow?: string | null) => {
    const v = valueToShow ?? user.display_name ?? null;
    const dn = getDisplayName({ display_name: v, username: user.username });
    return dn ?? user.username ?? "";
  };

  const handleSave = async () => {
    if (!credentials?.token) {
      if (typeof window === "undefined") {
        Alert.alert("Ошибка", "Отсутствует токен авторизации");
      } else {
        window.alert("Отсутствует токен авторизации");
      }
      return;
    }
    if (!user?.id) {
      if (typeof window === "undefined") {
        Alert.alert("Ошибка", "Неизвестный пользователь");
      } else {
        window.alert("Неизвестный пользователь");
      }
      return;
    }

    setIsSaving(true);
    try {
      // Отправляем только display_name, остальные поля пустые строки как по спецификации
      const body = {
        display_name: value,
        password: "",
        phone: "",
        profile_picture_key: "",
        username: "",
      };
      await userAPI.updateUser(user.id as number, body, credentials.token);
      // После успешного обновления рефрешим профиль через API
      const apiuserData = await userAPI.getCurrentUser(credentials.token);
      const refreshed = mapApiUserToUser(apiuserData);
      onUpdate(refreshed);
      setIsEditing(false);
    } catch (err: any) {
      console.error("[EditableDisplayName] update failed:", err);
      const msg = err?.message ?? "Не удалось сохранить";
      if (typeof window === "undefined") {
        Alert.alert("Ошибка", msg);
      } else {
        window.alert(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(user.display_name ?? "");
    setIsEditing(false);
  };

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {!isEditing ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: colors.maintext,
              fontSize: 22,
              fontWeight: "700",
            }}
          >
            {displayToShow(user.display_name)}
          </Text>
          {/* Edit button visible only for current user */}
          {credentials?.userId && user.id === credentials.userId && (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.main} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={{ width: "100%", alignItems: "center" }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={user.username ?? "Имя пользователя"}
            style={{
              width: "100%",
              backgroundColor: colors.background,
              borderColor: colors.main,
              borderWidth: 1,
              padding: 8,
              borderRadius: 8,
              color: colors.maintext,
              fontSize: 16,
            }}
            editable={!isSaving}
          />

          <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{
                backgroundColor: colors.main,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600" }}>Сохранить</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleCancel}
              disabled={isSaving}
              style={{
                backgroundColor: colors.background,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.additionalText,
              }}
            >
              <Text style={{ color: colors.additionalText, fontWeight: "600" }}>Отменить</Text>
            </Pressable>
          </View>

          <Text style={{ color: colors.additionalText, marginTop: 8, fontSize: 12 }}>
            Пустое значение будет отображать username
          </Text>
        </View>
      )}
    </View>
  );
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
            {/* If this is the current user, allow picking; otherwise just show avatar */}
            {credentials?.userId && user.id === credentials.userId ? (
              <AvatarPicker
                size={96}
                onUploaded={(url) => {
                  // update local user object and avatar cache
                  setUser((prev) => {
                    if (!prev) return prev;
                    return { ...prev, profilePictureURL: url ?? prev.profilePictureURL } as User;
                  });
                  if (user?.id) {
                    if (url) userAPI._avatarCache.set(user.id as number, url);
                    else userAPI._avatarCache.delete(user.id as number);
                  }
                }}
              />
            ) : (
              <Avatar user={user} size={96} />
            )}
          </View>

          <EditableDisplayName
            user={user}
            credentials={credentials}
            onUpdate={setUser}
          />

          {/* User Info */}
          <View style={{ width: "100%", marginTop: 16 }}>
            {/* ID */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                ID пользователя
              </Text>
              <Text
                style={{
                  color: colors.additionalText,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                #{user.id}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Имя пользователя
              </Text>
              <Text
                style={{
                  color: colors.additionalText,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                {user.username}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Телефон
              </Text>
              <Text
                style={{
                  color: colors.additionalText,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                {user.phone ?? "Не указан"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 16,
                }}
              >
                Дата регистрации
              </Text>
              <Text
                style={{
                  color: colors.maintext,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                {user.CreatedAt ? formatDate(user.CreatedAt) : "-"}
              </Text>
            </View>
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
