import colors from "@/assets/colors";
import { useAppFonts } from "@/assets/fonts/useFonts";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";

export default function AuthIndex() {
  const { fontsLoadded: _ } = useAppFonts();

  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        height: "100%",
        paddingTop: 160,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flex: 1, alignItems: "center" }}>
        <Image
          source={require("@/assets/images/Logo.png")}
          style={{
            height: 120,
            width: 120,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: "Inter-Bold",
            color: colors.maintext,
            marginTop: 20,
            fontSize: 40,
            fontWeight: "bold",
          }}
        >
          AMBER
        </Text>
        <Text
          style={{
            color: colors.additionalText,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Здесь начинаются твои разговоры{"\n"}без шума.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.main,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginTop: 60,
            borderRadius: 6,
          }}
          onPress={() => router.replace("/(auth)/authHandler")}
        >
          <Text
            style={{
              color: colors.maintext,
              fontFamily: "Inter-Bold",
              fontSize: 28,
            }}
          >
            ПРИСТУПИТЬ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 20,
          }}
          onPress={() => {
            const botUsername = 'amber_login_bot'; 
            const telegramUrl = `tg://resolve?domain=${botUsername}`;
            const webUrl = `https://t.me/${botUsername}`;
            
            // Пытаемся открыть в приложении Telegram
            Linking.canOpenURL(telegramUrl).then(supported => {
              if (supported) {
                return Linking.openURL(telegramUrl);
              } else {
                // Если приложение Telegram не установлено, открываем в браузере
                return Linking.openURL(webUrl);
              }
            }).catch(err => {
              console.log('Error opening Telegram:', err);
            });
          }}
          activeOpacity={0.7}
        >
          <Text
            style={{
              color: colors.main,
              fontFamily: "Inter-Regular",
              fontSize: 16,
            }}
          >
            Ссылка на Telegram Бота для получения кодов
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
