import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function AppInfoScreen() {
  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Hakkımızda</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UcuzaBak nedir?</Text>
          <Text style={styles.p}>
            UcuzaBak, aynı ürünü farklı satıcılarda karşılaştırmanıza yardımcı
            olan bir fiyat takip uygulamasıdır. Ürün arayın, en düşük fiyatları görün,
            favorilerinizi kaydedin ve fiyat düşüşlerini kaçırmayın.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Misyonumuz</Text>
          <Text style={styles.p}>
            Kullanıcıların doğru zamanda, doğru kararla alışveriş yapabilmesi için
            fiyat bilgilerini sade ve anlaşılır bir şekilde sunmak.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim</Text>
          <Text style={styles.p}>
            Görüş ve önerilerinizi uygulama içinden İletişim / Geri bildirim ekranına
            gönderebilirsiniz. Sorularınız için Yardım / SSS sayfasını da inceleyebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 100 },
  title: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  section: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  p: { marginTop: 10, color: colors.textSubtle, fontSize: 13, fontWeight: "600", lineHeight: 19 }
});

