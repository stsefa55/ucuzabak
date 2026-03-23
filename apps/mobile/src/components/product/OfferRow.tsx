import React from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, space, type } from "../../design/tokens";
import type { Offer } from "../../lib/types";
import { API_BASE_URL } from "../../api/client";

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
  const openTracked = async () => {
    const url = `${API_BASE_URL}/out/${encodeURIComponent(offer.id)}`;
    // Tracking akışı için her zaman /out/:offerId kullanılmalı.
    // Not: offer.url/affiliateUrl DOĞRUDAN açılmaz.
    console.log("[TRACKING DEBUG] openTracked invoked");
    console.log("[TRACKING DEBUG] offerId:", offer.id);
    console.log("[TRACKING DEBUG] storeName:", offer.storeName);
    console.log("[TRACKING DEBUG] tracking URL (full):", url);
    try {
      const ok = await Linking.canOpenURL(url);
      console.log("[TRACKING DEBUG] canOpenURL:", ok);
      if (!ok) {
        Alert.alert("Açılamadı", "Bağlantı açılamadı.");
        return;
      }
      console.log("[TRACKING DEBUG] opening tracking URL now...");
      await Linking.openURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("[TRACKING DEBUG] open tracked offer failed:", msg);
      Alert.alert("Açılamadı", "Bağlantı açılamadı.");
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.store} numberOfLines={1}>
          {offer.storeName}
        </Text>
        <Text style={styles.linkText} numberOfLines={1}>
          Satıcı teklifi
        </Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.price}>{formatTL(offer.price.amount)}</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          if (onPress) return onPress(offer.id);
          void openTracked();
        }}
        style={styles.cta}
        accessibilityLabel="Mağazaya git"
      >
        <Text style={styles.ctaTxt}>Mağazaya Git</Text>
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
  mid: { alignItems: "flex-end", marginRight: 12, minWidth: 92 },
  store: { fontSize: 14, fontWeight: "700", color: colors.text },
  linkText: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  cta: {
    backgroundColor: colors.brandSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    minWidth: 114,
    alignItems: "center"
  },
  ctaTxt: { color: colors.brand, fontWeight: "800", fontSize: 13 }
});

