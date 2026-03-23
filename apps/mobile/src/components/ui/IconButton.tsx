import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";

export type IconButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  style?: ViewStyle;
  children: React.ReactNode;
};

export function IconButton({ onPress, disabled, size = 44, style, children }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, opacity: disabled ? 0.5 : 1 },
        pressed ? styles.pressed : null,
        style
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.04)"
  },
  pressed: {
    backgroundColor: "rgba(37, 99, 235, 0.10)"
  }
});

