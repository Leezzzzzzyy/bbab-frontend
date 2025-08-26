import { useFonts } from "expo-font";

export const useAppFonts = () => {
  const [fontsLoadded, error] = useFonts({
    "Inter-Regular": require("@/assets/fonts/Inter-VariableFont_opsz,wght.ttf"),
    "Inter-Bold": require("@/assets/fonts/Inter_18pt-Bold.ttf"),
  });

  return { fontsLoadded, error };
};
