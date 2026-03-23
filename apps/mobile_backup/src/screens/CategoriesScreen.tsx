import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, space, type } from "../design/tokens";
import { CategoryChip } from "../components/ui/CategoryChip";

const categories = [
  { id: "c1", name: "Anne, Bebek" },
  { id: "c2", name: "Oyuncak" },
  { id: "c3", name: "Elektronik" },
  { id: "c4", name: "Kozmetik" },
  { id: "c5", name: "Süpermarket" },
  { id: "c6", name: "Yapı Market" }
];

export function CategoriesScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Kategoriler</Text>
      <Text style={styles.sub}>Hızlı seçim</Text>

      <View style={styles.grid}>
        {categories.map((c) => (
          <CategoryChip key={c.id} label={c.name} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 100 },
  title: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  sub: { marginTop: 6, color: colors.textSubtle, fontSize: 13, fontWeight: "600", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" }
});

