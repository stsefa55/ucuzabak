import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";

export function HelpScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Yardım / SSS</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>Sık sorulan sorular ve destek bilgileri yakında.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardText}>Bu ekran sadece mock amaçlıdır.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 100 },
  title: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  card: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  cardText: { color: colors.textSubtle, fontSize: 13, fontWeight: "600" }
});

