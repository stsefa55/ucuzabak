import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Product } from "../../lib/types";
import { colors, radius, space } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
import { Ionicons } from "@expo/vector-icons";

export function CompareBar({ onPressCompare }: { onPressCompare: () => void }) {
  const { products, remove, clear } = useCompare();
  if (products.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar} pointerEvents="auto">
        <View style={styles.left}>
          <View style={styles.thumbs}>
            {products.slice(0, 3).map((p: Product) => (
              <View key={p.id} style={styles.thumbWrap}>
                <Image
                  source={p.imageUrl ? { uri: p.imageUrl } : undefined}
                  style={styles.thumb}
                />
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
          <TouchableOpacity onPress={onPressCompare} style={[styles.cta, products.length === 0 && styles.ctaDisabled]}>
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
    bottom: Platform.select({ ios: 92, android: 78, default: 78 }),
    zIndex: 1000
  },
  bar: {
    margin: 12,
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

