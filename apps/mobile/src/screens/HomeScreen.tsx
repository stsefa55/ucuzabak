import React, { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { BottomTabParamList } from "../navigation/BottomTabs";
import { TopBar } from "../components/nav/TopBar";
import { SearchInput } from "../components/search/SearchInput";
import { CategoryChip } from "../components/ui/CategoryChip";
import { ProductCard } from "../components/product/ProductCard";
import { colors, type } from "../design/tokens";
import type { Product } from "../lib/types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { fetchCategories } from "../api/services/categories";
import { fetchProductsList, getProductListParamsTyped, type ProductListMode } from "../api/services/products";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function HomeScreen() {
  type Nav = CompositeNavigationProp<NativeStackNavigationProp<RootStackParamList>, BottomTabNavigationProp<BottomTabParamList>>;
  const navigation = useNavigation<Nav>();
  type ProductListParams = RootStackParamList["ProductList"];
  const productListNavLockRef = useRef(false);

  const { data: categories, isLoading: catsLoading, error: catsError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 0,
    refetchOnMount: true
  });

  const { data: priceDrops, isLoading: dealsLoading } = useQuery({
    queryKey: ["products", "list", { mode: "deals" }],
    queryFn: () => fetchProductsList({ mode: "deals" }),
    staleTime: 0,
    refetchOnMount: true
  });

  const { data: popularProducts, isLoading: popularLoading } = useQuery({
    queryKey: ["products", "list", { mode: "popular" }],
    queryFn: () => fetchProductsList({ mode: "popular" }),
    staleTime: 0,
    refetchOnMount: true
  });

  const { data: viewedProducts, isLoading: recentLoading } = useQuery({
    queryKey: ["products", "list", { mode: "recent" }],
    queryFn: () => fetchProductsList({ mode: "recent" }),
    staleTime: 0,
    refetchOnMount: true
  });

  const handleOpenProduct = (p: Product) => {
    navigation.navigate("ProductDetail", { product: p });
  };

  const handleSeeAll = (mode: ProductListMode) => {
    const params = getProductListParamsTyped(mode);
    if (productListNavLockRef.current) return;
    productListNavLockRef.current = true;
    navigation.navigate("ProductList", params as ProductListParams);
    setTimeout(() => {
      productListNavLockRef.current = false;
    }, 450);
  };

  const handleOpenCategory = (categoryId: string, categoryName: string) => {
    if (productListNavLockRef.current) return;
    productListNavLockRef.current = true;
    navigation.navigate("CategoriesFull", {
      initialParentSlug: categoryId,
      initialParentName: categoryName
    });
    setTimeout(() => {
      productListNavLockRef.current = false;
    }, 450);
  };

  const isAnyLoading = catsLoading || dealsLoading || popularLoading || recentLoading;

  useEffect(() => {
    if (!catsLoading) {
      console.log("[CATEGORIES DEBUG] categories loaded count:", (categories ?? []).length);
    }
  }, [catsLoading, categories]);

  return (
    <ScreenContainer style={styles.page}>
      <TopBar />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <SearchInput
            placeholder="Ürün ara"
            editable={false}
            onPress={() => navigation.navigate("Kesfet")}
            onSubmit={() => navigation.navigate("Kesfet")}
          />
        </View>

        {catsError ? <Text style={styles.errorText}>Kategori yüklenemedi.</Text> : null}
        {isAnyLoading ? <Text style={styles.loadingText}>Yükleniyor...</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {(categories ?? [])
            .map((c): React.ReactElement | null => {
              if (!c?.id || !c?.name) {
                console.log("CATEGORIES DEBUG: SKIP invalid backend category chip", c);
                return null;
              }
              console.log("CATEGORIES DEBUG: render category chip", c.id, c.name);
              return (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  iconName={c.iconName}
                  imageUrl={c.imageUrl}
                  onPress={() => handleOpenCategory(c.id, c.name)}
                />
              );
            })
            .filter((x): x is React.ReactElement => x != null)}
        </ScrollView>

        <SectionHeaderRow title="Fiyatı Düşenler" onPressSeeAll={() => handleSeeAll("deals")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {(priceDrops ?? []).map((p) => (
            <View key={p.id} style={styles.railCardWrap}>
              <ProductCard product={p} onPress={() => handleOpenProduct(p)} />
            </View>
          ))}
        </ScrollView>

        <SectionHeaderRow title="Popüler Ürünler" onPressSeeAll={() => handleSeeAll("popular")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {(popularProducts ?? []).map((p) => (
            <View key={p.id} style={styles.railCardWrap}>
              <ProductCard product={p} onPress={() => handleOpenProduct(p)} />
            </View>
          ))}
        </ScrollView>

        <SectionHeaderRow title="Son İncelediklerin" onPressSeeAll={() => handleSeeAll("recent")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {(viewedProducts ?? []).map((p) => (
            <View key={p.id} style={styles.railCardWrap}>
              <ProductCard product={p} onPress={() => handleOpenProduct(p)} />
            </View>
          ))}
        </ScrollView>

      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeaderRow({ title, onPressSeeAll }: { title: string; onPressSeeAll: () => void }) {
  return (
    <View style={styles.sectionTopRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable
        onPress={onPressSeeAll}
        hitSlop={10}
        style={({ pressed }) => [styles.seeAllBtn, pressed ? styles.seeAllBtnPressed : null]}
      >
        <Text style={styles.seeAllTxt}>Tümünü gör  ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 110 },
  searchWrap: { paddingHorizontal: 12, marginTop: 0, marginBottom: 12 },

  catsRow: { marginBottom: 16 },

  sectionTitle: {
    marginTop: 0,
    marginHorizontal: 12,
    fontSize: type.headline.fontSize,
    lineHeight: type.headline.lineHeight,
    fontWeight: "800",
    color: colors.text
  },

  rail: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12
  },
  railCardWrap: { width: 206, marginRight: 12 },

  sectionTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 6
  },
  seeAllBtn: {
    paddingRight: 4,
    paddingVertical: 4
  },
  seeAllBtnPressed: { opacity: 0.85 },
  seeAllTxt: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 12
  },
  loadingText: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: -6,
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: "700"
  },
  errorText: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: -6,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  }
});

