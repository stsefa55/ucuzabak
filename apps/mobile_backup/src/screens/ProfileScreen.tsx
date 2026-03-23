import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";

export function ProfileScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Şimdilik boş</Text>
        <Text style={styles.emptySub}>Hesap bilgileri yakında.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 100 },
  title: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  empty: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptySub: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" }
});

