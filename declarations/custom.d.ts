// Custom ambient module declarations to satisfy TS for some Expo packages

declare module "expo-router" {
  import * as React from "react";
  export const Stack: any;
  export const Tabs: any;
  export const Redirect: any;
  export const Link: any;
  export function useRouter(): any;
  export function useLocalSearchParams<T = any>(): T;
  export function useNavigation(): any;
  export function useSegments(): any;
  export function usePathname(): any;
  export default {} as any;
}

declare module "expo-font" {
  export function useFonts(fonts: Record<string, any>): [boolean, any];
}

declare module "expo-image-picker" {
  export const launchImageLibraryAsync: any;
  export const launchCameraAsync: any;
  export const requestMediaLibraryPermissionsAsync: any;
  export const requestCameraPermissionsAsync: any;
  export default any;
}

declare module "expo-image" {
  const _default: any;
  export default _default;
}
