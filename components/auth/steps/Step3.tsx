import colors from "@/assets/colors";
import { useAuth } from "@/context";
import { usePhone } from "@/context/PhoneContext";
import { authAPI } from "@/services/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AvatarPicker from "../AvatarPicker";
import { ErrorToast } from "../ErrorToast";

export const Step3: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { phoneNumber, confirmationCode } = usePhone();
  const { setCredentials } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [name, setName] = useState<string>("");
  // const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleErrorHide = () => {
    setErrorMessage(null);
  };

  const endAuthorization = async () => {
    if (username.length < 3) {
      setErrorMessage("Название аккаунта меньше 4-х символов");
      return;
    } else if (name.length < 2) {
      setErrorMessage("Имя пользователя меньше 3-х символов");
      return;
    }

    // setIsLoading(true);
    try {
      const response = await authAPI.confirmLogin({
        phone: `${phoneNumber}`,
        code: confirmationCode, // Use saved code or fallback
        username: username,
      });
      // Token received, save it and navigate to main app
      console.log("Login successful, token:", response.token);

      // Save credentials to storage
      await setCredentials({
        token: response.token,
        username: username,
        phone: `+7${phoneNumber}`,
      });

      // Navigate to main app
      router.replace("/messages");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ошибка при входе"
      );
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={styles.stepContainer}>
        <ErrorToast
          message={errorMessage || ""}
          isVisible={!!errorMessage}
          onHide={handleErrorHide}
          duration={5000}
        />

        <Text style={styles.caption}>Настройка профиля</Text>
        <View style={styles.inputContainerWrapper}>
          <AvatarPicker />
          <View style={styles.inputsContainer}>
            <TextInput
              style={styles.inputField}
              placeholderTextColor={colors.additionalText + "60"}
              value={username}
              onChangeText={setUsername}
              placeholder="Название аккаунта"
            />
            <TextInput
              style={styles.inputField}
              placeholderTextColor={colors.additionalText + "60"}
              value={name}
              onChangeText={setName}
              placeholder="Имя"
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={endAuthorization}
          style={styles.endAuthButton}
        >
          <Text style={styles.endAuthText}>ЗАВЕРШИТЬ</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  caption: {
    color: colors.maintext,
    fontFamily: "Inter-Bold",
    fontSize: 32,
    marginTop: 64,
    marginBottom: 64,
  },
  inputContainerWrapper: {
    width: "75%",
    height: "auto",
    alignContent: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    // borderColor: "red",
    // borderWidth: 2,
  },
  inputsContainer: {
    width: "60%",
    // borderColor: "green",
    // borderWidth: 1,
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  inputField: {
    borderBottomColor: colors.main,
    borderBottomWidth: 2,
    color: colors.maintext,
    fontFamily: "Inter-Regular",
    fontSize: 18,
    paddingBottom: 4,
    textAlign: "center",
  },
  endAuthButton: {
    backgroundColor: colors.main,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 120,
    borderRadius: 6,
  },
  endAuthText: {
    fontSize: 28,
    fontFamily: "Inter-Bold",
    color: colors.maintext,
  },
});
