import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function HelpScreen() {
  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Yardım / SSS</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sık Sorulan Sorular</Text>
          <Text style={styles.cardText}>1) Fiyatlar ne sıklıkla güncelleniyor?</Text>
          <Text style={styles.cardText}>Mağaza akışlarına göre gün içinde düzenli olarak güncellenir.</Text>
          <Text style={styles.cardText}>2) Favorilerim kaybolur mu?</Text>
          <Text style={styles.cardText}>Hesabınızla oturum açtığınızda favorileriniz korunur.</Text>
          <Text style={styles.cardText}>3) Fiyat alarmı nasıl çalışır?</Text>
          <Text style={styles.cardText}>Belirlediğiniz ürün fiyatı hedefe indiğinde bildirim alırsınız.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destek</Text>
          <Text style={styles.cardText}>
            Hesap, fiyat ve ürün karşılaştırma ile ilgili sorunlar için
            "İletişim / Geri Bildirim" ekranından bize yazabilirsiniz.
          </Text>
          <Text style={styles.cardText}>
            Geri dönüşler en kısa sürede e-posta üzerinden paylaşılır.
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
  card: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  cardText: { color: colors.textSubtle, fontSize: 13, fontWeight: "600" }
});

