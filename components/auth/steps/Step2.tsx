import colors from "@/assets/colors";
import { usePhone } from "@/context/PhoneContext";
import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CodeField } from "react-native-confirmation-code-field";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ErrorToast } from "../ErrorToast";

export const Step2: React.FC<{ onNext: () => void; onBack: () => void }> = ({
  onNext,
  onBack,
}) => {
  const { phoneNumber, setConfirmationCode } = usePhone();
  const [code, setCode] = useState<string>("");
  const [isCodeResendable, setIsCodeResendable] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const swipeBack = Gesture.Pan()
    .minDistance(20)
    .onEnd((event) => {
      if (event.velocityX > 500 && event.translationX > 50) {
        onBack();
      }
    })
    .runOnJS(true);

  useEffect(() => {
    if (timeLeft === 0) {
      setIsCodeResendable(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (code.length === 5) {
      if (code !== "25863") {
        setErrorMessage("Код подтверждения неверен");

        setTimeout(() => {
          setCode("");
        }, 1000);

        return;
      }

      // Save confirmation code to context
      setConfirmationCode(code);

      Keyboard.dismiss();
      setTimeout(() => {
        onNext();
      }, 500);
      setTimeout(() => {
        setCode("");
      }, 1000);
      return;
    }
  }, [code, onNext, setConfirmationCode]);

  const handleErrorHide = () => {
    setErrorMessage(null);
  };

  return (
    <GestureDetector gesture={swipeBack}>
      <View style={styles.stepContainer}>
        <ErrorToast
          message={errorMessage || ""}
          isVisible={!!errorMessage}
          onHide={handleErrorHide}
          duration={5000}
        />

        <Text style={styles.caption}>Проверка телефона</Text>
        <View style={styles.informationContainer}>
          <Image
            source={require("@/assets/images/PhoneCheck.png")}
            style={styles.informationLogo}
          />
          <Text style={styles.informationCaption}>Введите код</Text>
          <Text style={styles.informationText}>
            Мы отправили SMS с кодом проверки{"\n"}на Ваш телефон +7
            {"(" +
              phoneNumber.slice(0, 3) +
              ") " +
              phoneNumber.slice(3, 6) +
              "-" +
              phoneNumber.slice(6, 8) +
              "-" +
              phoneNumber.slice(8)}
          </Text>

          <CodeField
            value={code}
            onChangeText={setCode}
            cellCount={5}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            autoFocus={true}
            renderCell={({ index, symbol }) => (
              <View key={index} style={[styles.cell]}>
                <Text style={styles.cellSymbol}>{symbol}</Text>
              </View>
            )}
          />

          {!isCodeResendable ? (
            <Text style={styles.codeResetInactive}>
              Отправить код заново через {timeLeft} сек
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTimeLeft(50);
                setIsCodeResendable(false);
              }}
            >
              <Text style={styles.codeResendActive}>Отправить код еще раз</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GestureDetector>
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
  informationContainer: {
    alignItems: "center",
    width: "100%",
  },
  informationLogo: {
    width: 48,
    height: 48,
  },
  informationCaption: {
    fontFamily: "Inter-Bold",
    color: colors.maintext,
    fontSize: 24,
    marginTop: 20,
  },
  informationText: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    lineHeight: 18,
    color: colors.additionalText,
    textAlign: "center",
    marginTop: 20,
  },
  codeFieldRoot: {
    width: "75%",
    height: 64,
    marginTop: 48,
  },
  cell: {
    borderBottomColor: colors.main,
    borderBottomWidth: 3,
    width: "12%",
    justifyContent: "center",
    alignItems: "center",
  },
  cellSymbol: {
    fontFamily: "Inter-Bold",
    color: colors.maintext,
    fontSize: 48,
  },
  codeResetInactive: {
    color: colors.contrast,
    fontFamily: "Inter-Regular",
    fontSize: 14,
    marginTop: 28,
  },
  codeResendActive: {
    color: colors.accent,
    fontFamily: "Inter-Regular",
    fontSize: 14,
    marginTop: 28,
  },
});
