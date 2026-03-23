import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, space } from "../../design/tokens";
import type { BottomTabParamList } from "../../navigation/BottomTabs";
import type { RootStackParamList } from "../../navigation/RootNavigator";

export type SecondaryMenuKey =
  | "settings"
  | "help"
  | "legal"
  | "contact"
  | "appInfo";

export function TopBar({
  onPressSecondaryItem
}: {
  onPressSecondaryItem?: (key: SecondaryMenuKey) => void;
}) {
  type Nav = CompositeNavigationProp<NativeStackNavigationProp<RootStackParamList>, BottomTabNavigationProp<BottomTabParamList>>;
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      [
        { key: "settings" as const, label: "Ayarlar" },
        { key: "help" as const, label: "Yardım / SSS" },
        { key: "legal" as const, label: "Yasal" },
        { key: "contact" as const, label: "İletişim / Geri bildirim" },
        { key: "appInfo" as const, label: "Uygulama bilgisi" }
      ] as const,
    []
  );

  return (
    <View style={styles.safe}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Menü"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>UcuzaBak</Text>
        </View>

        <View style={styles.rightIcons}>
          <Pressable
            style={styles.iconBtn}
            accessibilityLabel="Favoriler"
            onPress={() => navigation.navigate("Favorites")}
          >
            <Ionicons name="heart" size={22} color={colors.brand} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            accessibilityLabel="Bildirimler"
            onPress={() => {
              Alert.alert("Bildirimler", "Yakında.");
            }}
          >
            <Ionicons name="notifications" size={22} color={colors.textSubtle} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            accessibilityLabel="Profil"
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Menü</Text>
            <ScrollView>
              {items.map((it) => (
                <Pressable
                  key={it.key}
                  onPress={() => {
                    setOpen(false);
                    if (onPressSecondaryItem) {
                      onPressSecondaryItem(it.key);
                      return;
                    }
                    switch (it.key) {
                      case "settings":
                        navigation.navigate("Settings");
                        break;
                      case "help":
                        navigation.navigate("Help");
                        break;
                      case "legal":
                        navigation.navigate("Legal");
                        break;
                      case "contact":
                        navigation.navigate("Contact");
                        break;
                      case "appInfo":
                        navigation.navigate("AppInfo");
                        break;
                      default:
                        break;
                    }
                  }}
                  style={({ pressed }) => [styles.sheetItem, pressed ? styles.itemPressed : null]}
                >
                  <Text style={styles.sheetItemText}>{it.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.bg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle
  },
  pressed: { opacity: 0.8 },

  titleWrap: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: colors.text },

  rightIcons: { flexDirection: "row", gap: 8 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.border
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  sheetItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  itemPressed: { backgroundColor: colors.brandSoft },
  sheetItemText: { fontSize: 15, fontWeight: "600", color: colors.text }
});

