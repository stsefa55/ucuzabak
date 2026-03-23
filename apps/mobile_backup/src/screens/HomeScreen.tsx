import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TopBar } from "../components/nav/TopBar";
import { SearchInput } from "../components/search/SearchInput";
import { CategoryChip } from "../components/ui/CategoryChip";
import { ProductCard } from "../components/product/ProductCard";
import { colors, type } from "../design/tokens";
import type { Product } from "../lib/types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { fetchCategories } from "../api/services/categories";
import { fetchProductsList, getProductListParamsTyped, type ProductListMode } from "../api/services/products";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: categories, isLoading: catsLoading, error: catsError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories
  });

  const { data: priceDrops, isLoading: dealsLoading } = useQuery({
    queryKey: ["products", "list", { mode: "deals" }],
    queryFn: () => fetchProductsList({ mode: "deals" })
  });

  const { data: popularProducts, isLoading: popularLoading } = useQuery({
    queryKey: ["products", "list", { mode: "popular" }],
    queryFn: () => fetchProductsList({ mode: "popular" })
  });

  const { data: viewedProducts, isLoading: recentLoading } = useQuery({
    queryKey: ["products", "list", { mode: "recent" }],
    queryFn: () => fetchProductsList({ mode: "recent" })
  });

  const handleOpenProduct = (p: Product) => {
    navigation.navigate("ProductDetail", { product: p });
  };

  const handleSeeAll = (mode: ProductListMode) => {
    const params = getProductListParamsTyped(mode);
    navigation.navigate("ProductList", params);
  };

  const handleOpenCategory = (categoryId: string, categoryName: string) => {
    navigation.navigate("ProductList", { title: categoryName, mode: "popular", categoryId });
  };

  const isAnyLoading = catsLoading || dealsLoading || popularLoading || recentLoading;

  return (
    <View style={styles.page}>
      <TopBar />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <SearchInput placeholder="Ürün ara" />
        </View>

        {catsError ? <Text style={styles.errorText}>Kategori yüklenemedi.</Text> : null}
        {isAnyLoading ? <Text style={styles.loadingText}>Yükleniyor...</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {(categories ?? []).map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              iconUrl={c.iconUrl}
              onPress={() => handleOpenCategory(c.id, c.name)}
            />
          ))}
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

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
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
  content: { paddingBottom: 28 },
  searchWrap: { paddingHorizontal: 12, marginTop: 4, marginBottom: 12 },

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
    marginTop: 16,
    marginBottom: 8
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

