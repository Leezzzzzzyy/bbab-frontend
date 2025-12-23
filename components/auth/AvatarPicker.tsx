import colors from "@/assets/colors";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, View } from "react-native";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { userAPI } from "@/services/api";

const AvatarPicker = ({ onUploaded, size = 100 }: { onUploaded?: (url: string | null) => void; size?: number }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { credentials } = useAuth();

  // Web-only: create a hidden file input to support web file picking
  const webInputRef = React.useRef<HTMLInputElement | null>(null);
  // uploadFile will be defined as useCallback below, so include it in deps
  const uploadFileRef = React.useRef<((file: any) => Promise<void>) | null>(null);

  React.useEffect(() => {
    uploadFileRef.current = async (file: any) => {
      // @ts-ignore
      await uploadFile(file);
    };
  });

  React.useEffect(() => {
    if (Platform.OS === "web" && !webInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          setImage(URL.createObjectURL(file));
          // use ref to avoid missing dependency on uploadFile
          await uploadFileRef.current?.(file);
        }
      };
      webInputRef.current = input;
    }
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "web") return true;
    const { status: galleryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (galleryStatus !== "granted") {
      Alert.alert(
        "Разрешение необходимо",
        "Нужно разрешение для доступа к галерее"
      );
      return false;
    }
    if (cameraStatus !== "granted") {
      Alert.alert(
        "Разрешение необходимо",
        "Нужно разрешение для использования камеры"
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (Platform.OS === "web") {
      // trigger file input
      webInputRef.current && webInputRef.current.click();
      return;
    }

    Alert.alert("Выбор фото", "Снять или выбрать из галереи?", [
      { text: "Из галереи", onPress: pickFromGallery },
      { text: "Снять на камеру", onPress: takePhoto },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const uploadFile = React.useCallback(async (file: any) => {
    if (!credentials?.token || !credentials?.userId) {
      Alert.alert("Ошибка", "Необходима авторизация для загрузки аватара");
      return;
    }
    setIsUploading(true);
    try {
      let resultUrl: string | null;
      if (Platform.OS === "web") {
        // file is a File instance
        resultUrl = await userAPI.uploadAvatar(credentials.userId, file as File, credentials.token);
      } else {
        // native: file is a uri string or object
        resultUrl = await userAPI.uploadAvatar(credentials.userId, file as any, credentials.token);
      }
      if (resultUrl) {
        onUploaded && onUploaded(resultUrl);
        Alert.alert("Успешно", "Аватар обновлен");
      } else {
        onUploaded && onUploaded(null);
      }
    } catch (err: any) {
      console.error("[AvatarPicker] upload failed", err);
      Alert.alert("Ошибка", err?.message || "Не удалось загрузить аватар");
    } finally {
      setIsUploading(false);
    }
  }, [credentials?.token, credentials?.userId, onUploaded]);

  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1], // Квадратное для аватара
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImage(uri);
      // start upload
      await uploadFile(uri);
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImage(uri);
      await uploadFile(uri);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.container} disabled={isUploading}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {isUploading ? (
          <ActivityIndicator size="small" color={colors.main} />
        ) : image ? (
          <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.main }} />
        ) : (
          // If user is logged in, try to display their remote avatar via Avatar component
          credentials?.userId ? (
            <Avatar userId={credentials.userId} size={size} />
          ) : (
            <Image
              source={require("@/assets/images/AvatarPick.png")}
              style={{ width: size, height: size, opacity: 0.7 }}
            />
          )
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AvatarPicker;
