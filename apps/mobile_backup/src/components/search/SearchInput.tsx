import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, radius, space } from "../../design/tokens";
import { Text } from "../ui/Text";

export type SearchInputProps = {
  value?: string;
  placeholder?: string;
  onChangeText?: (t: string) => void;
  onSubmit?: () => void;
};

export function SearchInput({ value = "", placeholder = "Ürün ara", onChangeText, onSubmit }: SearchInputProps) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      <Pressable onPress={onSubmit} style={styles.iconBtn} accessibilityLabel="Ara">
        <Text style={styles.iconTxt}>⌕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: space[2],
    paddingVertical: 12
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.text
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft
  },
  iconTxt: { color: colors.brand, fontWeight: "800", fontSize: 18 }
});

