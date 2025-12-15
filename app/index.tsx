import { Redirect } from "expo-router";
import React from "react";

// Всегда отправляем пользователя на экран авторизации при старте приложения
export default function Index() {
  return <Redirect href="/(auth)" />;
}
