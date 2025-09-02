import colors from "@/assets/colors";
import { usePhone } from "@/context/PhoneContext";
import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { CodeField } from "react-native-confirmation-code-field";

export const Step2: React.FC<{ onNext: () => void; onBack: () => void }> = ({
  onNext,
  onBack,
}) => {
  const { phoneNumber } = usePhone();
  const [code, setCode] = useState<string>("");
  const [isCodeResendable, setIsCodeResendable] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);

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

  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={styles.stepContainer}>
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
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    height: "100%",
    alignItems: "center",
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
