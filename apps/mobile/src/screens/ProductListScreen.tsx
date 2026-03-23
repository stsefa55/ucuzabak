import React from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Product } from "../lib/types";
import { ProductCard } from "../components/product/ProductCard";
import { colors, radius, type } from "../design/tokens";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { fetchProductsList } from "../api/services/products";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ProductListScreen() {
  type Props = NativeStackScreenProps<RootStackParamList, "ProductList">;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props["route"]>();
  const { title, mode, categoryId, q } = route.params;
  const insets = useSafeAreaInsets();

  // Kategori ağacından (leaf) gelindiğinde dikey liste daha okunabilir olur.
  // Search (q) akışı ise mevcut grid düzeninde kalsın.
  const isCategoryDrivenList = !!categoryId && mode !== "search";

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", "list", { mode, categoryId, q }],
    queryFn: () => fetchProductsList({ mode, categoryId, q }),
    staleTime: 0,
    refetchOnMount: true
  });

  const [filterOpen, setFilterOpen] = React.useState(false);

  const extractBrand = (p: Product): string | null => {
    const specs = p.specs ?? {};
    for (const [k, v] of Object.entries(specs)) {
      const key = k.toLowerCase();
      const isBrandKey = key === "marka" || key === "brand" || key.includes("marka") || key.includes("brand");
      if (!isBrandKey) continue;
      if (typeof v === "string") {
        const t = v.trim();
        return t ? t : null;
      }
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
    }
    return null;
  };

  const brandOptions = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of products ?? []) {
      const b = extractBrand(p);
      if (b) s.add(b);
      if (s.size >= 12) break;
    }
    return Array.from(s);
  }, [products]);

  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [priceMin, setPriceMin] = React.useState<string>("");
  const [priceMax, setPriceMax] = React.useState<string>("");
  const [brand, setBrand] = React.useState<string | null>(null);

  const filteredProducts = React.useMemo(() => {
    const list = products ?? [];

    const min = priceMin.trim() ? Number(priceMin) : null;
    const max = priceMax.trim() ? Number(priceMax) : null;
    const minOk = min == null ? null : Number.isFinite(min) ? min : null;
    const maxOk = max == null ? null : Number.isFinite(max) ? max : null;

    let out = list;
    if (brand) {
      out = out.filter((p) => {
        const b = extractBrand(p);
        return b != null && b.toLowerCase() === brand.toLowerCase();
      });
    }
    if (minOk != null) out = out.filter((p) => p.price.amount >= minOk);
    if (maxOk != null) out = out.filter((p) => p.price.amount <= maxOk);

    out = out.slice().sort((a, b) => {
      if (sortDir === "asc") return a.price.amount - b.price.amount;
      return b.price.amount - a.price.amount;
    });

    return out;
  }, [products, sortDir, priceMin, priceMax, brand]);

  const openProduct = (p: Product) => {
    navigation.navigate("ProductDetail", { product: p });
  };

  return (
    <ScreenContainer style={styles.page}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Geri"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed ? styles.filterBtnPressed : null]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.textSubtle} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable
          accessibilityLabel="Filtrele"
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [styles.filterBtn, pressed ? styles.filterBtnPressed : null]}
        >
          <Ionicons name="options-outline" size={18} color={colors.textSubtle} />
        </Pressable>
        {isLoading ? <Text style={styles.loadingText}>Yükleniyor...</Text> : null}
        {error ? <Text style={styles.errorText}>Liste yüklenemedi.</Text> : null}
      </View>

      <FlatList
        data={filteredProducts ?? []}
        keyExtractor={(it) => it.id}
        numColumns={isCategoryDrivenList ? 1 : 2}
        columnWrapperStyle={isCategoryDrivenList ? undefined : styles.row}
        contentContainerStyle={{ ...styles.list, paddingBottom: 28 + insets.bottom }}
        renderItem={({ item }) => (
          <View style={isCategoryDrivenList ? styles.verticalCell : styles.cell}>
            <ProductCard product={item} onPress={() => openProduct(item)} />
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {mode === "search"
                  ? "Aramanızla eşleşen ürün bulunamadı."
                  : categoryId
                    ? "Bu kategoride henüz ürün bulunamadı."
                    : "Bu filtrede ürün bulunamadı."}
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
          accessibilityLabel="Filtre kapat"
        />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.modalTopRow}>
            <Text style={styles.modalTitle}>Filtreler</Text>
            <Pressable onPress={() => setFilterOpen(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color={colors.textSubtle} />
            </Pressable>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Sırala</Text>
            <View style={styles.modalOptionsRow}>
              <Pressable
                onPress={() => setSortDir("asc")}
                style={({ pressed }) => [styles.optBtn, pressed ? styles.optBtnPressed : null, sortDir === "asc" ? styles.optBtnActive : null]}
              >
                <Text style={styles.optTxt}>Fiyat: Artan</Text>
              </Pressable>
              <Pressable
                onPress={() => setSortDir("desc")}
                style={({ pressed }) => [styles.optBtn, pressed ? styles.optBtnPressed : null, sortDir === "desc" ? styles.optBtnActive : null]}
              >
                <Text style={styles.optTxt}>Fiyat: Azalan</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Fiyat aralığı</Text>
            <View style={styles.rangeRow}>
              <TextInput
                value={priceMin}
                onChangeText={setPriceMin}
                placeholder="Min"
                keyboardType="numeric"
                style={styles.rangeInput}
              />
              <TextInput
                value={priceMax}
                onChangeText={setPriceMax}
                placeholder="Maks"
                keyboardType="numeric"
                style={styles.rangeInput}
              />
            </View>
          </View>

          {brandOptions.length > 0 ? (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Marka</Text>
              <View style={styles.brandChips}>
                {brandOptions.slice(0, 10).map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBrand(b)}
                    style={({ pressed }) => [
                      styles.brandChip,
                      pressed ? styles.brandChipPressed : null,
                      brand?.toLowerCase() === b.toLowerCase() ? styles.brandChipActive : null
                    ]}
                  >
                    <Text style={styles.brandChipTxt}>{b}</Text>
                  </Pressable>
                ))}
                {brand ? (
                  <Pressable onPress={() => setBrand(null)} style={styles.brandClearLink}>
                    <Text style={styles.brandClearTxt}>Temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              onPress={() => {
                setSortDir("asc");
                setPriceMin("");
                setPriceMax("");
                setBrand(null);
              }}
              style={({ pressed }) => [styles.actionBtn, pressed ? styles.actionBtnPressed : null]}
            >
              <Text style={styles.actionTxt}>Temizle</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterOpen(false)}
              style={({ pressed }) => [styles.actionBtnPrimary, pressed ? styles.actionBtnPrimaryPressed : null]}
            >
              <Text style={styles.actionTxtPrimary}>Uygula</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10
  },
  headerTitle: { fontSize: type.headline.fontSize, lineHeight: type.headline.lineHeight, fontWeight: "700", color: colors.text, flex: 1 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    marginRight: 8
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    marginLeft: 8
  },
  filterBtnPressed: { opacity: 0.85 },
  list: { paddingHorizontal: 14, paddingBottom: 28 },
  row: { justifyContent: "space-between" },
  cell: { width: "49%", marginBottom: 16 },
  verticalCell: { width: "100%", marginBottom: 14 },
  loadingText: { marginTop: 8, color: colors.textSubtle, fontSize: 13, fontWeight: "700" },
  errorText: { marginTop: 8, color: colors.danger, fontSize: 13, fontWeight: "700" },
  emptyWrap: { paddingTop: 40, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSubtle, fontSize: 13, fontWeight: "700" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 12
  },
  modalTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "900", color: colors.text },
  modalCloseBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalSection: { marginTop: 14 },
  modalLabel: { fontSize: 12, fontWeight: "900", color: colors.textSubtle, marginBottom: 8 },
  modalOptionsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  optBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgSubtle
  },
  optBtnPressed: { opacity: 0.85 },
  optBtnActive: { backgroundColor: colors.brandSoft, borderColor: "rgba(37,99,235,0.35)" },
  optTxt: { fontSize: 12, fontWeight: "800", color: colors.textSubtle },

  rangeRow: { flexDirection: "row", gap: 10 },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgSubtle,
    fontWeight: "700",
    color: colors.text
  },

  brandChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  brandChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bgSubtle
  },
  brandChipPressed: { opacity: 0.85 },
  brandChipActive: { backgroundColor: colors.brandSoft, borderColor: "rgba(37,99,235,0.35)" },
  brandChipTxt: { fontSize: 12, fontWeight: "800", color: colors.textSubtle },
  brandClearLink: { marginTop: 8 },
  brandClearTxt: { color: colors.brand, fontWeight: "900", fontSize: 12 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 18, paddingBottom: 6 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    paddingVertical: 12,
    alignItems: "center"
  },
  actionBtnPressed: { opacity: 0.9 },
  actionBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    alignItems: "center"
  },
  actionBtnPrimaryPressed: { opacity: 0.9 },
  actionTxt: { color: colors.textSubtle, fontWeight: "900", fontSize: 13 },
  actionTxtPrimary: { color: "#fff", fontWeight: "900", fontSize: 13 }
});

