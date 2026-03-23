import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { Product } from "../lib/types";
import { ProductCard } from "../components/product/ProductCard";
import { SearchInput } from "../components/search/SearchInput";
import { colors, type } from "../design/tokens";

function mockSearchProducts(): Product[] {
  return [
    {
      id: "s1",
      name: "Oral-B Elektrikli Diş Fırçası",
      imageUrl: null,
      ratingAvg: 4.6,
      ratingCount: 210,
      price: { amount: 2499, currency: "TRY" },
      oldPrice: { amount: 2799, currency: "TRY" },
      priceDropPercent: 11,
      storeCount: 9,
      specs: { Güç: "Orta" }
    },
    {
      id: "s2",
      name: "Philips Airfryer 4.5L",
      imageUrl: null,
      ratingAvg: 4.4,
      ratingCount: 140,
      price: { amount: 4599, currency: "TRY" },
      oldPrice: { amount: 5399, currency: "TRY" },
      priceDropPercent: 15,
      storeCount: 10,
      specs: { Kapasite: "4.5L" }
    }
  ];
}

export function SearchScreen() {
  const [q, setQ] = useState("");
  const products = useMemo(() => mockSearchProducts(), []);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <SearchInput
          value={q}
          placeholder="Ürün ara"
          onChangeText={setQ}
          onSubmit={() => {}}
        />
      </View>

      <Text style={styles.sub}>{q ? `"${q}" için sonuçlar` : "Popüler sonuçlar"}</Text>

      <FlatList
        data={products}
        keyExtractor={(it) => it.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 12 },
  sub: { paddingHorizontal: 12, paddingBottom: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" },
  list: { paddingBottom: 24, paddingHorizontal: 12 },
  row: { justifyContent: "space-between" },
  cell: { width: "48%", marginBottom: 12 }
});

