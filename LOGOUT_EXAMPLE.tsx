/**
 * Example: How to implement logout in your profile or settings screen
 */

import { useAuth } from "@/context";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors from "@/assets/colors";

export const LogoutExample = () => {
  const { clearCredentials } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear credentials from storage and state
      await clearCredentials();

      // Navigate back to login screen
      router.replace("/(auth)");
    } catch (error) {
      console.error("Logout failed:", error);
      // Show error toast to user
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Выход</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  logoutButton: {
    backgroundColor: colors.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  logoutText: {
    color: colors.maintext,
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
});

