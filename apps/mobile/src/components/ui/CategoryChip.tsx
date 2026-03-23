import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../design/tokens";
import { getCategoryIoniconName } from "../../lib/categoryIconMap";

export function CategoryChip({
  label,
  iconName,
  imageUrl,
  selected,
  onPress
}: {
  label: string;
  iconName?: string | null;
  imageUrl?: string | null;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null, selected ? styles.selected : null]}>
      <View style={styles.circle}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.icon} />
        ) : (
          <Ionicons name={getCategoryIoniconName(iconName, label)} size={22} color={colors.brand} />
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 76,
    alignItems: "center",
    marginRight: 12
  },
  pressed: { opacity: 0.85 },
  selected: { },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  icon: { width: 26, height: 26, resizeMode: "contain" },
  iconTxt: { color: colors.textSubtle, fontWeight: "700" },
  label: { fontSize: 12, color: colors.textSubtle, fontWeight: "600", textAlign: "center" }
});

