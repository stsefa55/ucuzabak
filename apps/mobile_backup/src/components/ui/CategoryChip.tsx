import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../../design/tokens";

export function CategoryChip({
  label,
  iconUrl,
  selected,
  onPress
}: {
  label: string;
  iconUrl?: string | null;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null, selected ? styles.selected : null]}>
      <View style={styles.circle}>
        {iconUrl ? <Image source={{ uri: iconUrl }} style={styles.icon} /> : <Text style={styles.iconTxt}>◻</Text>}
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

