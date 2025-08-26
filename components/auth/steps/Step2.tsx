import colors from "@/assets/colors";
import { Text, TouchableOpacity, View } from "react-native";

export const Step2: React.FC<{ onNext: () => void; onBack: () => void }> = ({
  onNext,
  onBack,
}) => {
  return (
    <View>
      <Text style={{ color: colors.maintext, fontSize: 20, margin: 10 }}>
        This is the Step2
      </Text>
      <TouchableOpacity onPress={() => onNext()}>
        <Text style={{ color: colors.main, fontSize: 30 }}>NEXT</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onBack()}>
        <Text style={{ color: colors.additionalText, fontSize: 30 }}>BACK</Text>
      </TouchableOpacity>
    </View>
  );
};

// const styles = StyleSheet.create({});
