import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, space } from "../../design/tokens";
import { useCompare } from "../../store/compareStore";
import type { Product } from "../../lib/types";

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
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.title}>Karşılaştırma boş</Text>
        <Text style={styles.sub}>Ürün seçip tekrar deneyin.</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Karşılaştır</Text>
        <Text style={styles.sub}>En fazla 3 ürün</Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>Sadece farkları göster</Text>
        <Switch value={diffOnly} onValueChange={setDiffOnly} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.col0, styles.cell]}>
              <Text style={[styles.cellText, styles.cellLabel]}>Özellik</Text>
            </View>
            {products.map((p: Product) => (
              <View key={p.id} style={[styles.col, styles.cell]}>
                <Text numberOfLines={1} style={[styles.cellText, styles.cellLabel]}>{p.name}</Text>
                <Text style={styles.priceMini}>
                  {p.price.amount.toFixed(2)} TL
                </Text>
                <Text style={styles.removeLink} onPress={() => remove(p.id)}>Kaldır</Text>
              </View>
            ))}
          </View>

          {rows.map((row) => {
            const values = products.map((p: Product) => {
              if (row.key === "price") return valueToString(p.price.amount);
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSubtle },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { paddingHorizontal: space[3], paddingTop: space[4], paddingBottom: space[2] },
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

