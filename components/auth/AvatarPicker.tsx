import colors from "@/assets/colors";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, TouchableOpacity } from "react-native";

const AvatarPicker = () => {
  const [image, setImage] = useState<string | null>(null);

  const requestPermissions = async () => {
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

    Alert.alert("Выбор фото", "Снять или выбрать из галереи?", [
      { text: "Из галереи", onPress: pickFromGallery },
      { text: "Снять на камеру", onPress: takePhoto },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
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
      setImage(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.container}>
      {image ? (
        <Image source={{ uri: image }} style={styles.avatarImage} />
      ) : (
        <Image
          source={require("@/assets/images/AvatarPick.png")}
          style={styles.placeholderImage}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.main,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    opacity: 0.7,
  },
});

export default AvatarPicker;
