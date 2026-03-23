import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { clearAuthTokens, getAuthRefreshToken, getAuthAccessToken, setAuthTokens, subscribeAuthTokens, waitForAuthSessionReady } from "../lib/authSession";
import { logout, me, refresh, type AuthUser } from "../api/services/auth";

export function SettingsScreen() {
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const [notifyDeals, setNotifyDeals] = useState(true);
  const [notifyPopular, setNotifyPopular] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    void waitForAuthSessionReady().then(() => {
      if (mounted) setIsLoggedIn(!!getAuthAccessToken());
    });
    const unsub = subscribeAuthTokens(() => {
      setIsLoggedIn(!!getAuthAccessToken());
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await waitForAuthSessionReady();
      const accessTok = getAuthAccessToken();
      if (!accessTok) {
        if (mounted) setUser(null);
        if (mounted) setLoadingUser(false);
        return;
      }
      setLoadingUser(true);
      try {
        const res = await me(accessTok);
        if (mounted) setUser(res.user);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          const rt = getAuthRefreshToken();
          if (!rt) {
            clearAuthTokens();
            if (mounted) setUser(null);
            return;
          }
          try {
            const tokens = await refresh(rt);
            setAuthTokens(tokens);
            const res2 = await me(tokens.accessToken);
            if (mounted) setUser(res2.user);
            return;
          } catch {
            clearAuthTokens();
            if (mounted) setUser(null);
            return;
          }
        }
        clearAuthTokens();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Oturumu kapatmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çık",
        style: "destructive",
        onPress: async () => {
          try {
            await logout(getAuthRefreshToken());
          } catch {
            // no-op
          } finally {
            clearAuthTokens();
            setUser(null);
            setIsLoggedIn(false);
          }
        }
      }
    ]);
  };

  const item = (
    title: string,
    subtitle: string | null,
    iconName: string,
    onPress: () => void
  ) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.item, pressed ? { opacity: 0.85 } : null]}
        accessibilityLabel={title}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemIconWrap}>
            <Ionicons name={iconName} size={20} color={colors.brand} />
          </View>
          <View>
            <Text style={styles.itemTitle}>{title}</Text>
            {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </Pressable>
    );
  };

  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ayarlar</Text>

        {loadingUser && isLoggedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>Kullanıcı bilgisi yükleniyor...</Text>
          </View>
        ) : null}

        {!loadingUser ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isLoggedIn ? "Hesabınız" : "Giriş Yapın"}</Text>
            {isLoggedIn && user ? (
              <Text style={styles.cardText}>
                {user.name} ({user.email})
              </Text>
            ) : (
              <Text style={styles.cardText}>Oturum açarak favorilerinizi senkronize edin.</Text>
            )}

            <View style={styles.btnRow}>
              {isLoggedIn ? (
                <Pressable onPress={handleLogout} style={({ pressed }) => [styles.secondaryBtn, pressed ? { opacity: 0.85 } : null]}>
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                  <Text style={styles.secondaryBtnTxt}>Çıkış Yap</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => navigation.navigate("Login")}
                    style={({ pressed }) => [styles.primaryBtn, pressed ? { opacity: 0.85 } : null]}
                  >
                    <Text style={styles.primaryBtnTxt}>Oturum Aç</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate("Register")}
                    style={({ pressed }) => [styles.secondaryBtn, pressed ? { opacity: 0.85 } : null]}
                  >
                    <Text style={styles.secondaryBtnTxt}>Kayıt Ol</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          {item("Yasal", null, "document-text-outline", () => navigation.navigate("Legal"))}
          {item("Yardım / SSS", null, "help-circle-outline", () => navigation.navigate("Help"))}
          {item("İletişim / Geri bildirim", null, "mail-outline", () => navigation.navigate("Contact"))}
        </View>

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Fiyatı Düşenler bildirimi</Text>
              <Text style={styles.toggleSub}>Fiyat düşüşlerinde sizi bilgilendirelim.</Text>
            </View>
            <Switch value={notifyDeals} onValueChange={setNotifyDeals} />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Popüler arama önerileri</Text>
              <Text style={styles.toggleSub}>Keşfet ekranında öneriler.</Text>
            </View>
            <Switch value={notifyPopular} onValueChange={setNotifyPopular} />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Gizlilik modu</Text>
              <Text style={styles.toggleSub}>Bazı kişisel verileri gizle (demo).</Text>
            </View>
            <Switch value={privacyMode} onValueChange={setPrivacyMode} />
          </View>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardText: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" },
  btnRow: { marginTop: 12, gap: 10 },
  primaryBtn: {
    borderRadius: 12,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  secondaryBtnTxt: { color: colors.brand, fontWeight: "800" },
  section: { marginTop: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSubtle, overflow: "hidden" },
  item: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIconWrap: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  itemTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  itemSubtitle: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textSubtle },
  toggleRow: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  toggleSub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textSubtle }
});

