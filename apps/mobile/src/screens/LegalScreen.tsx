import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function LegalScreen() {
  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Yasal</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KVKK / Gizlilik Politikası</Text>
          <Text style={styles.p}>
            UcuzaBak, kullanıcıların hizmetimizi kullanırken paylaştığı bilgileri
            yalnızca uygulama işleyişi ve hesap yönetimi için işler. Kişisel
            verilerinizi nasıl yönettiğimizi ve hangi amaçlarla kullandığımızı
            bu bölümde özetliyoruz.
          </Text>
          <Text style={styles.p}>
            Bu ekran mevcut haliyle bilgilendirme amaçlıdır. Resmi metinler
            daha sonra detaylandırılacaktır.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kullanım Koşulları</Text>
          <Text style={styles.p}>
            Uygulamada paylaşılan ürün ve fiyat bilgileri, ilgili kaynaklardan
            derlenir. Fiyatlar zaman içinde değişebilir. UcuzaBak, en doğru
            bilgiyi sunmaya çalışır ancak güncellemeler arasında farklılıklar
            görülebilir.
          </Text>
          <Text style={styles.p}>
            Bu ekran bilgilendirme amaçlıdır. Kullanım koşulları ve yasal
            sorumluluklar daha sonra resmi dokümanlar ile güncellenecektir.
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

