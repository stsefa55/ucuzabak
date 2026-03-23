import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
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
  const compared = isSelected(product.id);
  const [localFav, setLocalFav] = useState(false);
  const hasOldPrice = product.oldPrice?.amount != null;

  const dropText = useMemo(() => {
    if (product.priceDropPercent === null || product.priceDropPercent === undefined) return null;
    const p = Math.round(product.priceDropPercent);
    if (!Number.isFinite(p)) return null;
    return `%${p} düştü`;
  }, [product.priceDropPercent]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.imageWrap}>
        <Image
          source={product.imageUrl ? { uri: product.imageUrl } : undefined}
          style={styles.image}
          resizeMode="cover"
        />

        <Pressable
          accessibilityLabel="Karşılaştır"
          onPress={(e) => {
            e.stopPropagation();
            toggle(product);
          }}
          style={({ pressed }) => [styles.compareBtn, pressed ? styles.iconPressed : null, compared ? styles.compareActive : null]}
        >
          <Text style={[styles.compareTxt, compared ? styles.compareTxtActive : null]}>⇄</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Favori"
          onPress={(e) => {
            e.stopPropagation();
            setLocalFav((v) => !v);
            onToggleFavorite?.(product.id);
          }}
          style={({ pressed }) => [styles.favBtn, pressed ? styles.iconPressed : null]}
        >
          <Text style={styles.favTxtOverlay}>{localFav ? "♥" : "♡"}</Text>
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
    backgroundColor: colors.bgSubtle,
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "100%",
    height: "100%"
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
  }
});

