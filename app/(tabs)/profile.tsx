import colors from "@/assets/colors";
import { Image, Text, View } from "react-native";

export default function ProfileScreen() {
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
          <Text style={{ color: colors.background, fontWeight: "900", fontSize: 28 }}>
            A
          </Text>
        </View>

        <Text style={{ color: colors.maintext, fontSize: 18, fontWeight: "700" }}>
          Alex Developer
        </Text>
        <Text style={{ color: colors.additionalText, marginTop: 6 }}>
          alex@example.com
        </Text>
      </View>
    </View>
  );
}
