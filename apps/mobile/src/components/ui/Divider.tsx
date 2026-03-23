import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../design/tokens";

export function Divider({ vertical = false }: { vertical?: boolean }) {
  return (
    <View
      style={[
        styles.base,
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: colors.border }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border
  },
  horizontal: {
    height: 1,
    width: "100%"
  },
  vertical: {
    width: 1,
    height: "100%"
  }
});

