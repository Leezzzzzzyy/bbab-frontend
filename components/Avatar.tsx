import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, ImageStyle, ViewStyle, StyleProp } from "react-native";
import colors from "@/assets/colors";
import { userAPI, getDisplayName, type User } from "@/services/api";

interface AvatarProps {
  user?: User | null;
  userId?: number | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export default function Avatar({ user, userId, size = 48, style, imageStyle }: AvatarProps) {
  const mountedRef = useRef(true);
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Always fetch avatar URL via userAPI.getAvatarUrl using userId (ignore profile_picture_key from user object)
    const id = (user && ((user.ID ?? user.id) as number)) ?? userId;
    if (!id) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const fetched = await userAPI.getAvatarUrl(id);
        if (!mountedRef.current || cancelled) return;
        setUrl(fetched);
      } catch (err) {
        console.warn("[Avatar] failed to load avatar for user", id, err);
        if (!mountedRef.current || cancelled) return;
        setUrl(null);
      } finally {
        if (mountedRef.current && !cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [ (user && (user.ID ?? user.id)) , userId]);

  const initials = getDisplayName(user)?.[0]?.toUpperCase() ?? (user?.username ?? "?")?.[0]?.toUpperCase() ?? "?";

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: "hidden",
    },
    style,
  ];

  const imageStyles: StyleProp<ImageStyle> = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    imageStyle,
  ];

  if (loading && url == null) {
    // show placeholder loading indicator
    return (
      <View style={containerStyle}>
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator color={colors.main} />
        </View>
      </View>
    );
  }

  if (url) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: url }} style={imageStyles} />
      </View>
    );
  }

  // fallback: initials in colored circle
  return (
    <View style={containerStyle}>
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initials, { fontSize: Math.round(size / 2) }]}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    backgroundColor: colors.main,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#1e1e1e",
    fontWeight: "700",
  },
});
