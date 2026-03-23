import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Product } from "../../lib/types";
import { colors, radius, space } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function CompareBar({ onPressCompare }: { onPressCompare: () => void }) {
  const { products, remove, clear } = useCompare();
  const insets = useSafeAreaInsets();
  if (products.length === 0) return null;
  // CompareBar, BottomTabNavigator'ın içinde çalışmadığı için useBottomTabBarHeight güvenilir değil.
  // Sabit tab yüksekliği + safe-area insets ile konumlandırıyoruz.
  const baseBottom = Platform.select({ ios: 94, android: 82, default: 82 }) ?? 82;
  const bottom = baseBottom + insets.bottom + 6;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar} pointerEvents="auto">
        <View style={styles.left}>
          <View style={styles.thumbs}>
            {products.slice(0, 3).map((p: Product) => (
              <View key={p.id} style={styles.thumbWrap}>
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="image-outline" size={14} color={colors.textSubtle} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => remove(p.id)}
                  style={styles.thumbRemove}
                  accessibilityLabel="Karşılaştırmadan kaldır"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.countText}>
            {products.length} ürün seçildi
          </Text>
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            onPress={() => {
              console.log("[COMPARE DEBUG] compare count (CompareBar CTA):", products.length);
              onPressCompare();
            }}
            style={[styles.cta, products.length === 0 && styles.ctaDisabled]}
          >
            <Text style={styles.ctaText}>Karşılaştır</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clear} style={styles.clearBtn} accessibilityLabel="Seçimi temizle">
            <Text style={styles.clearText}>Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const THUMB_SIZE = 42;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000
  },
  bar: {
    marginHorizontal: 12,
    marginVertical: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  left: {
    flex: 1,
    paddingRight: 12
  },
  thumbs: {
    flexDirection: "row"
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle
  },
  thumb: {
    width: "100%",
    height: "100%"
  },
  thumbFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle
  },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(17,24,39,0.85)",
    alignItems: "center",
    justifyContent: "center"
  },
  thumbRemoveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12
  },
  countText: {
    marginTop: 6,
    color: colors.textSubtle,
    fontSize: 12
  },
  right: {
    alignItems: "flex-end"
  },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  ctaDisabled: {
    opacity: 0.6
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700"
  },
  clearBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  clearText: {
    color: colors.textSubtle,
    fontSize: 12
  }
});

