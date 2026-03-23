import React, { useEffect, useRef, useState } from "react";
import { BackHandler, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SearchInput } from "../components/search/SearchInput";
import { colors } from "../design/tokens";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchPopularSearchQueries } from "../api/services/search";
import { addRecentSearchTerm, getRecentSearchTerms } from "../store/recentSearchStore";
import { fetchCategories } from "../api/services/categories";
import type { Category } from "../lib/types";
import { getCategoryIoniconName } from "../lib/categoryIconMap";

export function SearchScreen() {
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  type ProductListParams = RootStackParamList["ProductList"];

  const [q, setQ] = useState("");
  const [recentTerms, setRecentTerms] = useState<string[]>(() => getRecentSearchTerms());

  const trimmedQ = q.trim();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const isCategoryMode = !isSearchActive;
  const isSearchEmptyMode = isSearchActive && trimmedQ.length === 0;
  const isSearchWithTextMode = isSearchActive && trimmedQ.length > 0;

  // Keşfet tabına her dönüşte varsayılan "kategori keşfi" moduna dön.
  useFocusEffect(
    React.useCallback(() => {
      setIsSearchActive(false);
      setQ("");
    }, [])
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  const productListNavLockRef = useRef(false);
  const safeNavigateToProductList = (params: ProductListParams) => {
    if (productListNavLockRef.current) return;
    productListNavLockRef.current = true;

    navigation.navigate("ProductList", params);

    // Çok hızlı çift tap ile aynı ekrana üst üste stack atılmasını engeller.
    setTimeout(() => {
      productListNavLockRef.current = false;
    }, 450);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(trimmedQ), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQ]);

  useEffect(() => {
    console.log("[SEARCH DEBUG] search text changed:", trimmedQ ? trimmedQ : "<empty>");
  }, [trimmedQ]);

  const goToSearchResults = (term: string) => {
    const t = String(term).trim();
    if (!t) return;
    console.log("[SEARCH DEBUG] navigating to ProductList (mode=search):", t);

    addRecentSearchTerm(t);
    setRecentTerms(getRecentSearchTerms());
    setQ(t);

    safeNavigateToProductList({
      title: `"${t}" için sonuçlar`,
      mode: "search",
      q: t
    });
  };

  const submit = () => goToSearchResults(q);

  const {
    data: categories = [],
    isLoading: isLoadingCategories
  } = useQuery({
    queryKey: ["categories", "discovery-preview"],
    queryFn: fetchCategories,
    staleTime: 0,
    refetchOnMount: true
  });

  const previewCategories = categories;

  useEffect(() => {
    if (!isSearchActive) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Android hardware back: search modundan çıkar, metni temizler ve keyboard'ı kapatır.
      Keyboard.dismiss();
      setQ("");
      setIsSearchActive(false);
      return true; // handled
    });

    return () => sub.remove();
  }, [isSearchActive]);

  const handleCategoryPress = (c: Category) => {
    // Keşfet ekranındaki liste kök kategori listesi olarak kullanılır.
    // Kök kategori tıkı her zaman full kategori drill-down akışına gitmelidir.
    console.log("[SEARCH DEBUG] root category tapped -> CategoriesFull:", c.id, c.name);
    navigation.navigate("CategoriesFull", {
      initialParentSlug: c.id,
      initialParentName: c.name
    });
  };

  const {
    data: popularTerms = [],
    isFetching: isFetchingPopular
  } = useQuery({
    queryKey: ["search", "popular-queries"],
    enabled: isSearchEmptyMode,
    staleTime: 60_000,
    refetchOnMount: false,
    initialData: [],
    queryFn: async () => {
      console.log("[SEARCH DEBUG] popular queries URL used: GET /search/popular-queries?limit=10");
      return fetchPopularSearchQueries(10);
    }
  });

  const {
    data: suggestionTerms = [],
    isFetching: isFetchingSuggestions
  } = useQuery({
    queryKey: ["search", "popular-suggestions", debouncedQ],
    enabled: isSearchWithTextMode && debouncedQ.trim().length > 0,
    staleTime: 0,
    refetchOnMount: true,
    initialData: [],
    queryFn: async () => {
      const prefix = debouncedQ.trim();
      console.log(
        "[SEARCH DEBUG] suggestion queries URL used: GET /search/popular-queries?limit=5&prefix=" +
          encodeURIComponent(prefix)
      );
      return fetchPopularSearchQueries(5, prefix);
    }
  });

  return (
    <ScreenContainer style={styles.page}>
      <ScrollView
        contentContainerStyle={{
          ...styles.scroll,
          paddingBottom: 28 + insets.bottom
        }}
      >
        <View style={styles.header}>
          <SearchInput
            value={q}
            placeholder="Ürün ara"
            onChangeText={setQ}
            onSubmit={submit}
            onFocus={() => setIsSearchActive(true)}
            onBlur={() => {
              // Blur sırasında arama modunu kapatma: suggestion tıklamaları ve X temizleme akışlarını bozuyordu.
              // Search mode'u sadece explicit back / hardware back ile kapatıyoruz.
            }}
            onBack={() => {
              setIsSearchActive(false);
              // Back arrow: search mode'u kapat ve yazılan metni temizle.
              setQ("");
            }}
          />
        </View>

        {isSearchWithTextMode ? (
          <View style={styles.suggestionsWrap}>
            <View style={styles.section}>
              <Text style={styles.sub}>Öneriler</Text>
              <View style={styles.chipsRow}>
                {suggestionTerms.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {(isFetchingSuggestions || debouncedQ.trim().length === 0) ? "Yükleniyor..." : "Bu arama ile eşleşen popüler arama yok."}
                  </Text>
                ) : (
                  suggestionTerms.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => goToSearchResults(t)}
                      style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
                    >
                      <Text style={styles.chipTxt}>{t}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.suggestionsWrap}>
            {isSearchEmptyMode ? (
              <>
                {recentTerms.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Son aramalar</Text>
                    <View style={styles.chipsRow}>
                      {recentTerms.map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => goToSearchResults(t)}
                          style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
                        >
                          <Text style={styles.chipTxt}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.section}>
                  <View style={styles.sectionTopRow}>
                    <Text style={styles.sectionTitle}>Popüler aramalar</Text>
                  </View>
                  <View style={styles.chipsRow}>
                    {popularTerms.length === 0 ? (
                      <Text style={styles.emptyText}>
                        {isFetchingPopular ? "Yükleniyor..." : "Sitede henüz arama verisi yok."}
                      </Text>
                    ) : (
                      popularTerms.map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => goToSearchResults(t)}
                          style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
                        >
                          <Text style={styles.chipTxt}>{t}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionTopRow}>
                <Text style={styles.sectionTitle}>
                  {isSearchEmptyMode ? "Popüler Kategoriler" : "Kategoriler"}
                </Text>

                <Pressable
                  onPress={() => navigation.navigate("CategoriesFull")}
                  hitSlop={10}
                >
                  <Text style={styles.seeAllTxt}>Tümünü gör  ›</Text>
                </Pressable>
              </View>

              {isLoadingCategories ? (
                <Text style={styles.emptyText}>Yükleniyor...</Text>
              ) : previewCategories.length === 0 ? (
                <Text style={styles.emptyText}>Kategoriler bulunamadı.</Text>
              ) : (
                <View style={styles.catList}>
                  {previewCategories.map((c) => (
                    <Pressable key={c.id} onPress={() => handleCategoryPress(c)} style={({ pressed }) => [styles.catRow, pressed ? { opacity: 0.85 } : null]}>
                      <View style={styles.catIconWrap}>
                        {c.imageUrl ? (
                          <Image source={{ uri: c.imageUrl }} style={styles.catIconImg} />
                        ) : (
                          <Ionicons
                            name={getCategoryIoniconName(c.iconName, c.name)}
                            size={20}
                            color={colors.brand}
                          />
                        )}
                      </View>
                      <Text style={styles.catRowTitle} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 28 },
  header: { padding: 12 },
  sub: { paddingHorizontal: 12, paddingBottom: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" },
  suggestionsWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  section: { marginBottom: 10 },
  sectionTitle: { color: colors.textSubtle, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  sectionTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catsRow: { marginTop: 6 },
  seeAllTxt: { color: colors.textSubtle, fontSize: 12, fontWeight: "800" },
  catList: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 2
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  catIconImg: { width: 22, height: 22, borderRadius: 6, resizeMode: "cover" },
  catRowTitle: {
    flex: 1,
    marginLeft: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  chip: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipPressed: { opacity: 0.85 },
  chipTxt: { fontSize: 12, fontWeight: "800", color: colors.textSubtle },
  emptyText: { paddingHorizontal: 12, paddingTop: 8, color: colors.textSubtle, fontWeight: "700" }
});

