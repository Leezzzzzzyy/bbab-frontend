import colors from "@/assets/colors";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const Step1: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.caption}>This is the Step1</Text>

      <TouchableOpacity onPress={() => onNext()}>
        <Text style={{ color: colors.main, fontSize: 30 }}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    borderWidth: 2,
    borderColor: "red",
    height: "100%",
    alignItems: "center",
  },
  caption: {
    color: colors.maintext,
  },
});
