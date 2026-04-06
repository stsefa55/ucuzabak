import React, { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
import { colors, radius, type } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { clearAuthTokens, getAuthAccessToken, getAuthRefreshToken, setAuthTokens, subscribeAuthTokens, waitForAuthSessionReady } from "../lib/authSession";
import { logout, me, refresh, resendVerificationEmailForMe, type AuthUser } from "../api/services/auth";

export function ProfileScreen() {
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      await waitForAuthSessionReady();
      const accessTok = getAuthAccessToken();
      if (!accessTok) {
        if (mounted) setUser(null);
        if (mounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        try {
          const res = await me(accessTok);
          if (mounted) setUser(res.user);
          return;
        } catch (err) {
          const status = (err as { status?: number }).status;
          if (status !== 401) throw err;
        }

        const rt = getAuthRefreshToken();
        if (!rt) {
          clearAuthTokens();
          if (mounted) setUser(null);
          return;
        }

        const tokens = await refresh(rt);
        setAuthTokens(tokens);
        const res2 = await me(tokens.accessToken);
        if (mounted) setUser(res2.user);
      } catch {
        clearAuthTokens();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadUser();
    const unsub = subscribeAuthTokens(() => {
      void loadUser();
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const fullName = useMemo(() => {
    if (!user) return null;
    if (user.name?.trim()) return user.name.trim();
    return user.email;
  }, [user]);

  const emailVerified = user ? user.emailVerified !== false : true;

  const handleResendVerification = async () => {
    const tok = getAuthAccessToken();
    if (!tok) return;
    setResendBusy(true);
    try {
      const res = await resendVerificationEmailForMe(tok);
      Alert.alert("Bilgi", res.message);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İstek gönderilemedi.");
    } finally {
      setResendBusy(false);
    }
  };

  const menuItem = (
    title: string,
    icon: IoniconName,
    onPress: () => void
  ) => {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed ? { opacity: 0.85 } : null]}>
        <View style={styles.menuLeft}>
          <Ionicons name={icon} size={20} color={colors.brand} />
          <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </Pressable>
    );
  };

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Oturumu kapatmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çık",
        style: "destructive",
        onPress: async () => {
          try {
            const rt = getAuthRefreshToken();
            await logout(rt);
          } catch {
            // Logout başarısız olsa bile local session'i temizliyoruz.
          } finally {
            clearAuthTokens();
            setUser(null);
          }
        }
      }
    ]);
  };

  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Hesabım</Text>

        {loading && !user ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Yükleniyor...</Text>
          </View>
        ) : null}

        {!loading && !user ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Misafir</Text>
            <Text style={styles.cardSub}>Favori ürünlerinizi kaydetmek ve güncel fiyatları takip etmek için giriş yapın.</Text>

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

            <View style={styles.menuGroup}>
              {menuItem("Yardım / SSS", "help-circle-outline", () => navigation.navigate("Help"))}
              {menuItem("Yasal", "document-text-outline", () => navigation.navigate("Legal"))}
              {menuItem("Hakkımızda", "information-circle-outline", () => navigation.navigate("AppInfo"))}
              {menuItem("İletişim / Geri bildirim", "mail-outline", () => navigation.navigate("Contact"))}
            </View>
          </View>
        ) : null}

        {!loading && user ? (
          <View style={styles.card}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{fullName}</Text>
                <Text style={styles.cardSub}>{user.email}</Text>
                {user.phone ? <Text style={styles.cardSub}>Telefon: {user.phone}</Text> : null}
                <Text
                  style={[
                    styles.verifyBadge,
                    emailVerified ? styles.verifyBadgeOk : styles.verifyBadgeWarn
                  ]}
                >
                  {emailVerified ? "E-posta doğrulandı" : "E-posta doğrulanmadı"}
                </Text>
              </View>
            </View>

            {!emailVerified ? (
              <View style={styles.verifyCard}>
                <Text style={styles.verifyTitle}>E-postanızı doğrulayın</Text>
                <Text style={styles.verifyText}>
                  Fiyat alarmı gibi e-posta gerektiren özellikler için gelen kutunuzdaki bağlantıyı açın.
                </Text>
                <Pressable
                  onPress={handleResendVerification}
                  disabled={resendBusy}
                  style={({ pressed }) => [
                    styles.verifyBtn,
                    pressed ? { opacity: 0.88 } : null,
                    resendBusy ? { opacity: 0.6 } : null
                  ]}
                >
                  <Text style={styles.verifyBtnTxt}>
                    {resendBusy ? "Gönderiliyor…" : "Doğrulama e-postasını tekrar gönder"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.menuGroup}>
              {menuItem("Ayarlar", "settings-outline", () => navigation.navigate("Settings"))}
              {menuItem("Hakkımızda", "information-circle-outline", () => navigation.navigate("AppInfo"))}
              {menuItem("Yasal", "document-text-outline", () => navigation.navigate("Legal"))}
              {menuItem("Yardım / SSS", "help-circle-outline", () => navigation.navigate("Help"))}
              {menuItem("İletişim / Geri bildirim", "mail-outline", () => navigation.navigate("Contact"))}
            </View>

            <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, pressed ? { opacity: 0.85 } : null]}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutTxt}>Çıkış Yap</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
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

  card: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    padding: 16
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardSub: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" },

  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.bg
  },
  secondaryBtnTxt: { color: colors.brand, fontWeight: "800" },

  userRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },

  menuGroup: { marginTop: 14 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuTitle: { fontSize: 14, fontWeight: "800", color: colors.text },

  logoutBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
    backgroundColor: colors.bg
  },
  logoutTxt: { color: colors.danger, fontWeight: "800" },

  verifyBadge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  verifyBadgeOk: { color: "#15803d" },
  verifyBadgeWarn: { color: "#b45309" },

  verifyCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb"
  },
  verifyTitle: { fontSize: 14, fontWeight: "800", color: "#92400e", marginBottom: 6 },
  verifyText: { fontSize: 13, fontWeight: "600", color: "#78350f", lineHeight: 19, marginBottom: 10 },
  verifyBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  verifyBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 }
});

