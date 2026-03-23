import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function ContactScreen() {
  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>İletişim / Geri Bildirim</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bize Ulaşın</Text>
          <Text style={styles.cardText}>E-posta: destek@ucuzabak.com</Text>
          <Text style={styles.cardText}>Çalışma saatleri: Hafta içi 09:00 - 18:00</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Geri Bildirim Konuları</Text>
          <Text style={styles.cardText}>- Yanlış fiyat / stok bilgisi</Text>
          <Text style={styles.cardText}>- Hesap ve giriş sorunları</Text>
          <Text style={styles.cardText}>- Uygulama performansı ve hata bildirimi</Text>
          <Text style={styles.cardText}>- Öneri ve geliştirme talepleri</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Not</Text>
          <Text style={styles.cardText}>
            Geri bildirimlerde ürün adı, mağaza adı ve ekran görüntüsü paylaşırsanız
            inceleme süreci hızlanır.
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

