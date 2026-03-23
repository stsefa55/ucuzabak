import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Product } from "../lib/types";
import { ProductCard } from "../components/product/ProductCard";
import { colors, type } from "../design/tokens";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { fetchProductsList } from "../api/services/products";

export function ProductListScreen() {
  type Props = NativeStackScreenProps<RootStackParamList, "ProductList">;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props["route"]>();
  const { title, mode, categoryId } = route.params;

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", "list", { mode, categoryId }],
    queryFn: () => fetchProductsList({ mode, categoryId }),
  });

  const openProduct = (p: Product) => {
    navigation.navigate("ProductDetail", { product: p });
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        {isLoading ? <Text style={styles.loadingText}>Yükleniyor...</Text> : null}
        {error ? <Text style={styles.errorText}>Liste yüklenemedi.</Text> : null}
      </View>

      <FlatList
        data={products ?? []}
        keyExtractor={(it) => it.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} onPress={() => openProduct(item)} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 10 },
  headerTitle: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text },
  list: { paddingHorizontal: 14, paddingBottom: 28 },
  row: { justifyContent: "space-between" },
  cell: { width: "49%", marginBottom: 16 },
  loadingText: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "700" },
  errorText: { marginTop: 8, color: colors.danger, fontSize: 13, fontWeight: "700" }
});

