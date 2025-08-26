import colors from "@/assets/colors";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const Step4: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <View>
      <Text style={{ color: colors.maintext, fontSize: 20, margin: 10 }}>
        This is the Step2
      </Text>
      <TouchableOpacity onPress={() => onBack()}>
        <Text style={{ color: colors.additionalText, fontSize: 30 }}>BACK</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({});
