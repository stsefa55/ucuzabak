import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { colors, radius, space, type } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
import { useFavorites } from "../../store/favoritesStore";
import type { Product } from "../../lib/types";

function formatTL(amount: number) {
  const v = Math.round(amount * 100) / 100;
  return `${v.toFixed(v % 1 === 0 ? 0 : 2)} TL`;
}

export function ProductCard({
  product,
  onPress,
  onToggleFavorite
}: {
  product: Product;
  onPress?: () => void;
  onToggleFavorite?: (productId: string) => void;
}) {
  const { toggle, isSelected } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const compared = isSelected(product.id);
  const fav = isFavorite(product.id);
  const currentAmount = product.price.amount;
  const oldAmount = product.oldPrice?.amount;
  const hasOldPrice =
    oldAmount != null &&
    Number.isFinite(oldAmount) &&
    Number.isFinite(currentAmount) &&
    oldAmount > 0 &&
    currentAmount > 0 &&
    oldAmount > currentAmount;

  const dropText = useMemo(() => {
    // Badge rule (strict):
    // - old > current
    if (oldAmount == null) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: missing old/original price");
      return null;
    }

    if (!Number.isFinite(oldAmount) || !Number.isFinite(currentAmount)) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: invalid numeric old/current", {
        currentAmount,
        oldAmount
      });
      return null;
    }

    if (currentAmount <= 0) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: current <= 0", { currentAmount });
      return null;
    }

    if (oldAmount <= 0) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: old <= 0", { oldAmount });
      return null;
    }

    if (oldAmount <= currentAmount) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: old <= current", { currentAmount, oldAmount });
      return null;
    }

    const percent = ((oldAmount - currentAmount) / oldAmount) * 100;
    if (!Number.isFinite(percent) || percent <= 0) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: computed percent invalid", {
        currentAmount,
        oldAmount,
        percent
      });
      return null;
    }

    const rounded = Math.round(percent);
    if (!Number.isFinite(rounded) || rounded <= 0) {
      console.log("BADGE HIDDEN:", product.id, product.name, "reason: rounded percent invalid", {
        currentAmount,
        oldAmount,
        percent,
        rounded
      });
      return null;
    }

    console.log("BADGE SHOWN:", product.id, product.name, "current:", currentAmount, "old:", oldAmount, "computed %:", percent);
    return `%${rounded} düştü`;
  }, [product.id, product.name, oldAmount, currentAmount]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={24} color={colors.textSubtle} />
          </View>
        )}

        <Pressable
          accessibilityLabel="Karşılaştır"
          onPress={(e) => {
            e.stopPropagation();
            console.log("[COMPARE DEBUG] compare toggle from ProductCard:", product.id, product.name);
            const result = toggle(product);
            if (result === "max_reached") {
              Alert.alert("Karşılaştırma limiti", "En fazla 3 ürün karşılaştırabilirsiniz.");
            }
          }}
          style={({ pressed }) => [styles.compareBtn, pressed ? styles.iconPressed : null, compared ? styles.compareActive : null]}
        >
          <Text style={[styles.compareTxt, compared ? styles.compareTxtActive : null]}>⇄</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Favori"
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(product);
            onToggleFavorite?.(product.id);
          }}
          style={({ pressed }) => [styles.favBtn, pressed ? styles.iconPressed : null]}
        >
          <Text style={styles.favTxtOverlay}>{fav ? "♥" : "♡"}</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.priceBlock}>
          <Text style={styles.price}>{formatTL(product.price.amount)}</Text>

          <View style={styles.metaRow}>
            {hasOldPrice ? (
              <Text style={styles.oldPrice}>{formatTL(product.oldPrice!.amount)}</Text>
            ) : (
              <View style={styles.oldPriceSpacer} />
            )}

            {dropText ? (
              <View style={styles.dropBadge}>
                <Text style={styles.dropBadgeText}>{dropText}</Text>
              </View>
            ) : (
              <View style={styles.dropBadgeSpacer} />
            )}
          </View>
        </View>

        <Text style={styles.storeCaption}>{product.storeCount} mağazada</Text>

        {/* Compare action (explicit add/remove) */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            const result = toggle(product);
            if (result === "max_reached") {
              Alert.alert("Karşılaştırma limiti", "En fazla 3 ürün karşılaştırabilirsiniz.");
            }
          }}
          style={({ pressed }) => [
            styles.compareActionBtn,
            compared ? styles.compareActionBtnActive : null,
            pressed ? styles.compareActionBtnPressed : null
          ]}
          accessibilityLabel={compared ? "Karşılaştırmadan kaldır" : "Karşılaştır"}
        >
          <Text style={[styles.compareActionTxt, compared ? styles.compareActionTxtActive : null]}>
            {compared ? "Kaldır" : "Karşılaştır"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  pressed: {
    opacity: 0.9
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg
  },

  compareBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  compareActive: {
    backgroundColor: colors.brandSoft,
    borderColor: "rgba(37,99,235,0.35)"
  },
  compareTxt: { color: colors.textSubtle, fontWeight: "900", fontSize: 14, lineHeight: 14 },
  compareTxtActive: { color: colors.brand },

  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  favTxtOverlay: { color: colors.textSubtle, fontWeight: "900", fontSize: 16, lineHeight: 16 },

  iconPressed: { opacity: 0.8 },

  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 150
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.text,
    minHeight: 46
  },
  priceBlock: { marginTop: 8 },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 22
  },
  price: {
    ...type.price
  },
  oldPriceSpacer: {
    width: 70,
    height: 16
  },
  oldPrice: {
    ...type.caption,
    textDecorationLine: "line-through",
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16
  },
  dropBadgeSpacer: {
    width: 78,
    height: 22,
    borderRadius: 999
  },
  dropBadge: {
    backgroundColor: colors.brandSoft,
    borderColor: "rgba(37,99,235,0.25)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  dropBadgeText: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 15
  },
  storeCaption: {
    marginTop: 7,
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500"
  },
  compareActionBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    paddingVertical: 10,
    alignItems: "center"
  },
  compareActionBtnPressed: { opacity: 0.85 },
  compareActionBtnActive: {
    borderColor: "rgba(37,99,235,0.35)",
    backgroundColor: colors.brandSoft
  },
  compareActionTxt: { color: colors.textSubtle, fontWeight: "900", fontSize: 13 },
  compareActionTxtActive: { color: colors.brand }
});

