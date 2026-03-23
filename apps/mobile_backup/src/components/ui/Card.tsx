import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { colors } from "../../design/tokens";
import { shadow, radius } from "../../design/tokens";

export type CardProps = ViewProps & {
  padded?: boolean;
  rounded?: number;
};

export function Card({ padded = true, rounded = radius.lg, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          borderRadius: rounded,
          backgroundColor: colors.bg
        },
        shadow.card,
        padded ? styles.padded : null,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.border
  },
  padded: {
    padding: 16
  }
});

