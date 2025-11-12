import colors from "@/assets/colors";
import {usePhone} from "@/context/PhoneContext";
import {useRef, useState} from "react";
import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export const Step1: React.FC<{ onNext: () => void }> = ({onNext}) => {
    const [viewedPhoneNumber, setViewedPhoneNumber] = useState("");
    const inputRef = useRef<TextInput>(null);

    const {setPhoneNumber} = usePhone();

    const formatPhoneNumber = (text: string) => {
        // Удаляем все нецифровые символы
        const cleaned = text.replace(/\D/g, "");

        // Ограничиваем длину до 10 цифр (без кода страны +7)
        const limited = cleaned.slice(0, 10);

        // Форматируем по маске (***) ***-**-**
        let formatted = "";
        if (limited.length > 0) {
            formatted += "(" + limited.slice(0, 3);
        }
        if (limited.length > 3) {
            formatted += ") " + limited.slice(3, 6);
        }
        if (limited.length > 6) {
            formatted += "-" + limited.slice(6, 8);
        }
        if (limited.length > 8) {
            formatted += "-" + limited.slice(8, 10);
        }

        return formatted;
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setViewedPhoneNumber(formatted);
    };

    const handlePhone = () => {
        const cleanNumber = viewedPhoneNumber.replace(/\D/g, "");
        setPhoneNumber(cleanNumber);
        console.log(cleanNumber);
        onNext();
    };

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.caption}>Ваш номер телефона</Text>
            <View style={styles.countryContainer}>
                <Image
                    source={require("@/assets/images/RussianFlag.png")}
                    style={styles.flag}
                />
                <Text style={styles.countryName}>Россия</Text>
            </View>
            <View style={styles.phoneInputWrapper}>
                <View style={styles.phoneCountryStart}>
                    <Text style={styles.phoneCountryNumber}>+7</Text>
                </View>
                <View style={styles.inputFieldWrapper}>
                    <TextInput
                        ref={inputRef}
                        style={styles.inputField}
                        value={viewedPhoneNumber}
                        onChangeText={handlePhoneChange}
                        placeholder="(999) 123-45-67"
                        placeholderTextColor={colors.additionalText + "60"}
                        keyboardType="phone-pad"
                        autoFocus={true}
                        maxLength={16}
                    />
                </View>
            </View>

            <View style={styles.continueContainer}>
                <TouchableOpacity
                    onPress={() => handlePhone()}
                    style={
                        viewedPhoneNumber.length < 15
                            ? styles.continueButtonInactive
                            : styles.continueButton
                    }
                    disabled={viewedPhoneNumber.length < 15}
                >
                    <Text style={styles.continueText}>ПРОДОЛЖИТЬ</Text>
                </TouchableOpacity>
                <Text style={styles.registrationNotation}>
                    Регистрируюсь, вы принимаете
                </Text>
                <TouchableOpacity
                    onPress={() => onNext()}
                    style={styles.agreementButton}
                >
                    <Text style={styles.agreementText}>
                        Пользовательское соглашение
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContainer: {
        flex: 1,
        alignItems: "center",
    },
    caption: {
        color: colors.maintext,
        fontFamily: "Inter-Bold",
        fontSize: 32,
        marginTop: 64,
        marginBottom: 48,
    },
    countryContainer: {
        borderBottomColor: colors.main,
        borderBottomWidth: 3,
        width: "75%",
        flexDirection: "row",
        gap: 12,
        paddingBottom: 8,
    },
    flag: {
        width: 45,
        height: 30,
        resizeMode: "contain",
    },
    countryName: {
        color: colors.maintext,
        fontFamily: "Inter-Bold",
        fontSize: 28,
    },
    phoneInputWrapper: {
        flexDirection: "row",
        width: "75%",
        marginTop: 32,
    },
    phoneCountryNumber: {
        color: colors.maintext,
        fontFamily: "Inter-Bold",
        fontSize: 28,
    },
    phoneCountryStart: {
        borderBottomColor: colors.main,
        borderBottomWidth: 3,
        paddingBottom: 8,
        width: "20%",
        paddingLeft: 10,
        justifyContent: "flex-end",
    },
    inputFieldWrapper: {
        width: "70%",
        paddingBottom: 8,
        borderBottomColor: colors.main,
        borderBottomWidth: 3,
        marginLeft: "10%",
    },
    inputField: {
        color: colors.maintext,
        fontFamily: "Inter-Bold",
        fontSize: 28,
        width: "100%",
        padding: 0,
        margin: 0,
    },
    continueContainer: {
        flexDirection: "column",
        width: "100%",
        alignItems: "center",
    },
    continueButton: {
        backgroundColor: colors.main,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 120,
        borderRadius: 6,
    },
    continueButtonInactive: {
        backgroundColor: colors.main,
        opacity: 0.7,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 120,
        borderRadius: 6,
    },
    continueText: {
        fontSize: 28,
        fontFamily: "Inter-Bold",
        color: colors.maintext,
    },
    registrationNotation: {
        fontFamily: "Inter-Regular",
        color: colors.maintext,
        fontSize: 16,
        marginTop: 16,
    },
    agreementButton: {},
    agreementText: {
        color: colors.main,
        fontSize: 16,
        marginTop: 4,
    },
});
