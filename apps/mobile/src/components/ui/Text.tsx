import React from "react";
import { Text as RNText, TextProps } from "react-native";
import { colors, type } from "../../design/tokens";

type Variant = keyof typeof type;

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

export function Text({ variant = "body", color, style, ...rest }: AppTextProps) {
  const variantStyle = type[variant];
  return (
    <RNText
      {...rest}
      style={[
        { color: color ?? colors.text, ...(variantStyle ?? type.body) },
        style
      ]}
    />
  );
}

