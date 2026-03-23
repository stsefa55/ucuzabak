import React from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../../design/tokens";

export function ScreenContainer({
  children,
  style
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" backgroundColor="#000" />
      {/* Status bar / notch alanını siyah yapıp içerikleri safe-area altından başlatıyoruz. */}
      <View style={{ height: insets.top, backgroundColor: "#000" }} />
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
        {children}
      </View>
    </View>
  );
}

