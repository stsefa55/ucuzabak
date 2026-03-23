import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, space, type } from "../../design/tokens";
import type { Offer } from "../../lib/types";

function formatTL(amount: number) {
  const v = Math.round(amount * 100) / 100;
  return `${v.toFixed(v % 1 === 0 ? 0 : 2)} TL`;
}

export function OfferRow({
  offer,
  onPress
}: {
  offer: Offer;
  onPress?: (offerId: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.store}>{offer.storeName}</Text>
        <Text style={styles.linkText} numberOfLines={1}>
          Teklif
        </Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.price}>{formatTL(offer.price.amount)}</Text>
      </View>
      <TouchableOpacity onPress={() => onPress?.(offer.id)} style={styles.cta}>
        <Text style={styles.ctaTxt}>Git</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  left: { flex: 1, paddingRight: 10 },
  mid: { alignItems: "flex-end", marginRight: 10 },
  store: { fontSize: 14, fontWeight: "700", color: colors.text },
  linkText: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  cta: {
    backgroundColor: colors.brandSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)"
  },
  ctaTxt: { color: colors.brand, fontWeight: "800", fontSize: 13 }
});

