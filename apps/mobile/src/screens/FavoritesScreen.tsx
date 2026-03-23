import React from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { colors, type } from "../design/tokens";
import type { Product } from "../lib/types";
import { ProductCard } from "../components/product/ProductCard";
import { useFavorites } from "../store/favoritesStore";
import { ScreenContainer } from "../components/ui/ScreenContainer";

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { products } = useFavorites();

  console.log("[FAVORITES DEBUG] screen items from local store:", products.length);

  const openProduct = (p: Product) => {
    navigation.navigate("ProductDetail", { product: p });
  };

  return (
    <ScreenContainer style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Favoriler</Text>
        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Şimdilik boş</Text>
            <Text style={styles.emptySub}>Beğendiğiniz ürünleri favorilere ekleyin.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            <FlatList
              data={products}
              keyExtractor={(it) => it.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.cell}>
                  <ProductCard product={item} onPress={() => openProduct(item)} />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
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
  emptySub: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "600" },
  listWrap: { marginTop: 12 },
  row: { justifyContent: "space-between" },
  cell: { width: "49%", marginBottom: 16 }
});

