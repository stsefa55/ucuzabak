import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, space } from "../../design/tokens";
import { Text } from "../ui/Text";

export type SearchInputProps = {
  value?: string;
  placeholder?: string;
  editable?: boolean;
  onPress?: () => void;
  onChangeText?: (t: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};

export function SearchInput({
  value,
  placeholder = "Ürün ara",
  editable = true,
  onPress,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onBack
}: SearchInputProps) {
  // `value` verilmezse component kendi state'i ile çalışsın (HomeScreen'de yazı sıfırlanmasın).
  const [innerValue, setInnerValue] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (typeof value === "string") setInnerValue(value);
  }, [value]);

  const currentValue = useMemo(() => (typeof value === "string" ? value : innerValue), [value, innerValue]);
  const hasText = currentValue.trim().length > 0;
  const showBack = isFocused && !!onBack;
  const showClear = isFocused && hasText;

  const input = (
    <>
      <View style={styles.leftBtnSlot}>
        {showBack ? (
          <Pressable
            onPress={() => {
              // Arama modunu kapat: klavye kapanır ve dış state yönetilir.
              onBack?.();
              inputRef.current?.blur();
            }}
            style={({ pressed }) => [styles.leftIconBtn, pressed ? styles.leftIconBtnPressed : null]}
            accessibilityLabel="Geri"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <TextInput
        ref={(r) => {
          inputRef.current = r;
        }}
        style={[styles.input, showBack ? styles.inputWithBack : null]}
        value={currentValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        onChangeText={(t) => {
          if (typeof value !== "string") setInnerValue(t);
          onChangeText?.(t);
        }}
        editable={editable}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
      />
      {showClear ? (
        <Pressable
          onPress={() => {
            // Sadece text'i temizle; input odakta kalmaya devam etsin.
            onChangeText?.("");
            inputRef.current?.focus();
          }}
          style={styles.iconBtn}
          accessibilityLabel="Aramayı temizle"
        >
          <Ionicons name="close" size={18} color={colors.brand} />
        </Pressable>
      ) : (
        <Pressable
          onPress={(e) => {
            // Input odağı yoksa klavyeyi açalım; bu sayede tüm alan "tıklanabilir" hissi verir.
            inputRef.current?.focus();
            if (onPress) e?.stopPropagation?.();
            onSubmit?.();
          }}
          style={styles.iconBtn}
          accessibilityLabel="Ara"
        >
          <Ionicons name="search" size={20} color={colors.brand} />
        </Pressable>
      )}
    </>
  );

  // Home'de tüm alan tıklanabilir launcher olsun diye Pressable kullanıyoruz.
  // SearchScreen'de onPress verilmediği için wrapper View oluyor: TextInput dokunuşları engellenmesin.
  return onPress ? (
    <Pressable onPress={onPress} style={styles.wrap}>
      {input}
    </Pressable>
  ) : (
    <Pressable
      onPress={() => {
        inputRef.current?.focus();
      }}
      style={styles.wrap}
    >
      {input}
    </Pressable>
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
  inputWithBack: {
    // Arama modunda sol taraftaki geri ok ile yazı arası mesafe.
    paddingLeft: 6
  },
  leftBtnSlot: {
    width: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  leftIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle
  },
  leftIconBtnPressed: { opacity: 0.85 },
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

