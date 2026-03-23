import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { colors, radius, type } from "../design/tokens";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { register } from "../api/services/auth";
import { setAuthTokens } from "../lib/authSession";

export function RegisterScreen() {
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const e = email.trim();
    const n = name.trim();
    if (!e || !n || !password) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== password2) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const tokens = await register({
        email: e,
        name: n,
        phone: phone.trim() ? phone.trim() : undefined,
        password
      });
      setAuthTokens(tokens);
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Ionicons name="create-outline" size={22} color={colors.brand} />
            <Text style={styles.title}>Kayıt Ol</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@eposta.com"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Ad Soyad</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ad Soyad" />

            <Text style={[styles.label, { marginTop: 12 }]}>Telefon (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder="(5xx) xxx xx xx"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Şifre</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="En az 8 karakter"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Şifre Tekrar</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password2}
              onChangeText={setPassword2}
              placeholder="Şifreyi tekrar gir"
            />

            {error ? (
              <Text style={styles.errorText} numberOfLines={3}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="Kayıt ol"
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading ? { opacity: 0.6 } : null,
                pressed ? { opacity: 0.85 } : null
              ]}
            >
              <Text style={styles.primaryBtnTxt}>{loading ? "Kaydediliyor..." : "Kayıt Ol"}</Text>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Text style={styles.secondaryTxt}>Zaten hesabınız var mı?</Text>
              <Pressable onPress={() => navigation.navigate("Login")} accessibilityLabel="Oturum aç">
                <Text style={styles.linkTxt}>Oturum Aç</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 12, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  title: { fontSize: type.title.fontSize, lineHeight: type.title.lineHeight, fontWeight: "700", color: colors.text },
  card: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  label: { color: colors.textSubtle, fontSize: 13, fontWeight: "700" },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg
  },
  errorText: { marginTop: 12, color: colors.danger, fontWeight: "700", fontSize: 13 },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "700" },
  secondaryRow: { marginTop: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  secondaryTxt: { color: colors.textSubtle, fontWeight: "700", fontSize: 13 },
  linkTxt: { color: colors.brand, fontWeight: "800", fontSize: 13 }
});

