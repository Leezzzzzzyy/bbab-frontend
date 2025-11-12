import {Stack} from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{headerShown: false}}>
            <Stack.Screen name="index"/>
            <Stack.Screen
                name="authHandler"
                options={{animation: "fade", animationDuration: 750}}
            />
        </Stack>
    );
}
