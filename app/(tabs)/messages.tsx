import colors from "@/assets/colors";
import { FlatList, Text, View } from "react-native";

const DATA = [
  { id: "1", name: "Alice", lastMessage: "Hey there!", time: "10:24" },
  { id: "2", name: "Bob", lastMessage: "Let's catch up later.", time: "09:12" },
  { id: "3", name: "Charlie", lastMessage: "Meeting at 5?", time: "Yesterday" },
  { id: "4", name: "Diana", lastMessage: "Sent a photo", time: "Mon" },
];

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.backgroundAccent,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: colors.maintext,
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 6,
              }}
            >
              {item.name}
            </Text>
            <Text style={{ color: colors.additionalText }}>{item.lastMessage}</Text>
            <Text style={{ color: colors.additionalText, marginTop: 8, fontSize: 12 }}>
              {item.time}
            </Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <Text
            style={{
              color: colors.maintext,
              fontSize: 22,
              fontWeight: "800",
              marginBottom: 12,
            }}
          >
            Messages
          </Text>
        )}
      />
    </View>
  );
}
