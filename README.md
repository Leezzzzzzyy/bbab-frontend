# Messenger frontend - Amber

Фронтенд для мессенджера, реализованное на базе Expo/React Native с использованием TypeScript. Интерфейс ориентирован на мобильные платформы и web (через `react-native-web`).

## Стек

- React Native (Expo)
- React 19, TypeScript
- Expo Router для маршрутизации
- Библиотеки: `react-native-gesture-handler`, `react-native-reanimated`, `expo-image`, `expo-image-picker` и другие, перечислённые в `package.json`.

## Ключевые возможности

- Аутентификация пользователя
- Список чатов и окно сообщений
- Загрузка и отображение изображений (аватар, вложения)
- Поддержка Android, iOS (через Expo) и веб-браузера

## Как запустить для разработки

1. Установите Node.js и менеджер пакетов (npm или yarn).
2. Установите зависимости:

```powershell
npm install
```

3. Запуск в режиме разработки (Metro/Expo):

```powershell
npm run start
```

4. Открыть в мобильном эмуляторе или в Expo Go на устройстве:

```powershell
npm run android     # запустить в Android-эмуляторе / устройстве
npm run ios         # запустить в iOS-симуляторе (macOS)
npm run web         # запустить в браузере
```

## Полезные скрипты

- `npm run reset-project` — специальный скрипт для сброса локальных артефактов проекта.
- `npm run lint` — запуск ESLint.
- `npm run typecheck` — проверка типов TypeScript.

## Публикация и деплой

В репозитории есть скрипт `deploy.sh`, который содержит процесс публикации/деплоя. На Windows его можно запускать в среде Bash (Git Bash, WSL) или на CI:

```bash
./deploy.sh
```

Альтернативно можно использовать инструменты Expo для публикации (например, `expo publish`) в зависимости от выбранного процесса сборки и релиза.

## Ссылка на бэкенд

Бэкенд проекта доступен по адресу: https://github.com/tush00nka/bbbab_messenger

## Авторы

- [@thatusualguy](https://github.com/thatusualguy)
- [@Leezzzzzzyy](https://github.com/Leezzzzzzyy)