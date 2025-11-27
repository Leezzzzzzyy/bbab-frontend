import colors from "@/assets/colors";
import { useAuth } from "@/context";
import React from "react";
import { Text, View } from "react-native";

export default function ProfileScreen() {
  const { credentials } = useAuth();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 16,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.maintext,
          fontSize: 22,
          fontWeight: "800",
          alignSelf: "flex-start",
          marginBottom: 16,
        }}
      >
        Profile
      </Text>

      <View
        style={{
          width: "100%",
          backgroundColor: colors.backgroundAccent,
          borderRadius: 16,
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            height: 96,
            width: 96,
            borderRadius: 48,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontWeight: "900",
              fontSize: 28,
            }}
          >
            {credentials?.username
              ? credentials.username.slice(0, 1).toUpperCase()
              : ""}
          </Text>
        </View>

        <Text
          style={{ color: colors.maintext, fontSize: 18, fontWeight: "700" }}
        >
          {credentials?.username ? credentials.username : "Без имени"}
        </Text>
        <Text style={{ color: colors.additionalText, marginTop: 6 }}>
          {credentials?.phone ? credentials.phone : "Без номера"}
        </Text>
      </View>
    </View>
  );
}
