import colors from "@/assets/colors";
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

export const Step3: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [username, setUsername] = useState<string>("");
  const [name, setName] = useState<string>("");

  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={styles.stepContainer}>
        <Text style={styles.caption}>Настройка профиля</Text>
        <View style={styles.inputContainerWrapper}>
          <AvatarPicker />
          <View style={styles.inputsContainer}>
            <TextInput
              style={styles.inputField}
              placeholderTextColor={colors.additionalText + "40"}
              value={username}
              onChangeText={setUsername}
              placeholder="Название аккаунта"
            />
            <TextInput
              style={styles.inputField}
              placeholderTextColor={colors.additionalText + "40"}
              value={name}
              onChangeText={setName}
              placeholder="Имя"
            />
          </View>
        </View>
        <TouchableOpacity onPress={() => null} style={styles.endAuthButton}>
          <Text style={styles.endAuthText}>ЗАВЕРШИТЬ</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    height: "100%",
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
