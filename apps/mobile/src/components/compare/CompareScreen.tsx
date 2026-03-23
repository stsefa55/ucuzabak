import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, space } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
import type { Product } from "../../lib/types";
import { ScreenContainer } from "../ui/ScreenContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Var" : "Yok";
  return String(v);
}

export function CompareScreen() {
  const navigation = useNavigation();
  const { products, remove } = useCompare();
  const [diffOnly, setDiffOnly] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log("[COMPARE DEBUG] compare screen received products count:", products.length);
  }, [products.length]);

  const getSafePriceAmount = (p: Product) => {
    const amt = p?.price?.amount;
    return typeof amt === "number" && Number.isFinite(amt) ? amt : 0;
  };

  const specKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of products) {
      const specs = p.specs ?? {};
      Object.keys(specs).forEach((k) => keys.add(k));
    }
    return Array.from(keys).slice(0, 25); // keep it readable
  }, [products]);

  const rows = useMemo(() => {
    const rows: { key: string; label: string }[] = [
      { key: "price", label: "Fiyat" },
      ...specKeys.map((k) => ({ key: k, label: k }))
    ];
    return rows;
  }, [specKeys]);

  if (products.length === 0) {
    return (
      <ScreenContainer style={styles.wrap}>
        <ScrollView contentContainerStyle={[styles.center, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.title}>Karşılaştırma boş</Text>
          <Text style={styles.sub}>Ürün seçip tekrar deneyin.</Text>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Geri"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.85 } : null]}
        >
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Karşılaştır</Text>
          <Text style={styles.sub}>En fazla 3 ürün</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>Sadece farkları göster</Text>
        <Switch value={diffOnly} onValueChange={setDiffOnly} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
      >
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.col0, styles.cell]}>
              <Text style={[styles.cellText, styles.cellLabel]}>Özellik</Text>
            </View>
            {products.map((p: Product) => (
              <View key={p.id} style={[styles.col, styles.cell]}>
                <Text numberOfLines={1} style={[styles.cellText, styles.cellLabel]}>{p.name}</Text>
                <Text style={styles.priceMini}>
                  {getSafePriceAmount(p).toFixed(2)} TL
                </Text>
                <Text style={styles.removeLink} onPress={() => remove(p.id)}>Kaldır</Text>
              </View>
            ))}
          </View>

          {rows.map((row) => {
            const values = products.map((p: Product) => {
              if (row.key === "price") return valueToString(getSafePriceAmount(p));
              return valueToString(p.specs?.[row.key]);
            });
            const allSame = values.every((v) => v === values[0]);
            if (diffOnly && allSame) return null;

            return (
              <View key={row.key} style={styles.tableRow}>
                <View style={[styles.col0, styles.cell]}>
                  <Text style={[styles.cellText, styles.cellKey]}>{row.label}</Text>
                </View>
                {values.map((v, idx) => {
                  const differs = !allSame && v !== values[0];
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.col,
                        styles.cell,
                        differs ? styles.diffCell : null
                      ]}
                    >
                      <Text style={styles.cellText}>{v}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSubtle },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { paddingHorizontal: space[3], paddingTop: space[4], paddingBottom: space[2], flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg
  },
  backTxt: { fontSize: 20, fontWeight: "800", color: colors.text },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: colors.text },
  sub: { marginTop: 4, color: colors.textSubtle, fontSize: 13 },

  toggleRow: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg
  },
  toggleText: { fontSize: 15, fontWeight: "600", color: colors.text },

  table: {
    minWidth: 720,
    backgroundColor: colors.bg
  },
  tableHeader: {
    flexDirection: "row"
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  col0: { width: 160 },
  col: { width: 180 },
  cell: { padding: space[2], borderRightWidth: 1, borderRightColor: colors.border },
  cellText: { fontSize: 13, color: colors.text },
  cellLabel: { fontWeight: "700" },
  cellKey: { color: colors.textSubtle, fontWeight: "600" },
  diffCell: { backgroundColor: colors.brandSoft },

  priceMini: { marginTop: 6, fontSize: 12, color: colors.textSubtle },
  removeLink: { marginTop: 8, fontSize: 12, color: colors.danger, fontWeight: "600" }
});

