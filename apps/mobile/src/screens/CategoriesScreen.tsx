import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { colors, space, type } from "../design/tokens";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryIoniconName } from "../lib/categoryIconMap";
import { fetchCategoryChildren, fetchCategories } from "../api/services/categories";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function CategoriesScreen() {
  type Props = NativeStackScreenProps<RootStackParamList, "CategoriesFull">;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props["route"]>();

  const initialParentSlug = route.params?.initialParentSlug ?? null;
  const initialParentName = route.params?.initialParentName ?? null;

  const [trail, setTrail] = React.useState<Array<{ slug: string; name: string }>>(() => {
    return initialParentSlug ? [{ slug: initialParentSlug, name: initialParentName ?? "" }] : [];
  });

  const parentSlug = trail.length > 0 ? trail[trail.length - 1].slug : null;
  const parentName = trail.length > 0 ? trail[trail.length - 1].name : null;
  const breadcrumbText = React.useMemo(() => {
    const parts = trail.map((t) => t.name).filter((x) => x && x.trim().length > 0);
    return parts.join(" > ");
  }, [trail]);

  const {
    data: rootCategories = [],
    isLoading: isLoadingRoot,
    refetch: refetchRoot
  } = useQuery({
    queryKey: ["categories", "roots"],
    queryFn: fetchCategories,
    staleTime: 0,
    refetchOnMount: true
  });

  const {
    data: childCategories = [],
    isLoading: isLoadingChildren
  } = useQuery({
    queryKey: ["categories", "children", parentSlug],
    queryFn: () => fetchCategoryChildren(parentSlug as string),
    enabled: !!parentSlug,
    staleTime: 0,
    refetchOnMount: true
  });

  const displayCategories = parentSlug ? childCategories : rootCategories;

  async function handleCategoryPress(c: { id: string; name: string }) {
    // Önce alt kategori var mı kontrol ediyoruz.
    const children = await fetchCategoryChildren(c.id);
    if (children.length > 0) {
      setTrail((t) => [...t, { slug: c.id, name: c.name }]);
      return;
    }
    navigation.navigate("ProductList", { title: c.name, mode: "popular", categoryId: c.id });
  }

  React.useEffect(() => {
    // Route param değişince başlangıç view'unu yeniden kuralım.
    setTrail(() => {
      return initialParentSlug ? [{ slug: initialParentSlug, name: initialParentName ?? "" }] : [];
    });
  }, [initialParentSlug, initialParentName]);

  React.useEffect(() => {
    // Debug
    if (!parentSlug && !isLoadingRoot) {
      console.log("[CATEGORIES DEBUG] root categories count:", rootCategories.length);
    }
  }, [parentSlug, isLoadingRoot, rootCategories]);

  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {parentSlug ? (
          <>
            <View style={styles.backRow}>
              <Pressable
                onPress={() => {
                  setTrail((t) => (t.length > 0 ? t.slice(0, -1) : t));
                }}
                style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.85 } : null]}
              >
                <Ionicons name="arrow-back" size={18} color={colors.brand} />
                <Text style={styles.backTxt}>Geri</Text>
              </Pressable>
              <Text style={styles.title} numberOfLines={1}>
                {parentName ?? "Alt kategoriler"}
              </Text>
            </View>
            <Text style={styles.breadcrumb} numberOfLines={2}>
              {breadcrumbText}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Kategoriler</Text>
            <Text style={styles.sub}>Hızlı seçim</Text>
          </>
        )}

        <View style={styles.listWrap}>
          {isLoadingRoot || isLoadingChildren ? <Text style={styles.loading}>Yükleniyor...</Text> : null}

          {displayCategories.map((c) => {
            if (!c?.id || !c?.name) {
              console.log("CATEGORIES DEBUG: SKIP invalid backend category chip", c);
              return null;
            }
            console.log("CATEGORIES DEBUG: rendered backend category", c.id, c.name);
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  void handleCategoryPress(c);
                }}
                style={({ pressed }) => [styles.listRow, pressed ? { opacity: 0.85 } : null]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={getCategoryIoniconName(c.iconName, c.name)} size={20} color={colors.brand} />
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              </Pressable>
            );
          })}
        </View>

        {(!isLoadingRoot && !isLoadingChildren && displayCategories.length === 0) ? (
          <Text style={styles.empty}>Kategoriler bulunamadı.</Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 12, paddingBottom: 100 },
  title: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  sub: { marginTop: 6, color: colors.textSubtle, fontSize: 13, fontWeight: "600", marginBottom: 10 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 2 },
  backTxt: { color: colors.brand, fontWeight: "800", fontSize: 13 },
  listWrap: { borderTopWidth: 1, borderTopColor: colors.border },
  breadcrumb: {
    paddingHorizontal: 0,
    paddingBottom: 10,
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700"
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle
  },
  rowTitle: { flex: 1, marginLeft: 12, color: colors.text, fontSize: 15, fontWeight: "800" },
  empty: { marginTop: 20, color: colors.textSubtle, fontWeight: "700" },
  loading: { marginTop: 10, color: colors.textSubtle, fontWeight: "700" }
});

