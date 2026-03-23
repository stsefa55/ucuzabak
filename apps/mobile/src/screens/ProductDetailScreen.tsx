import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Product } from "../lib/types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radius, shadow, space, type } from "../design/tokens";
import { OfferRow } from "../components/product/OfferRow";
import { useCompare } from "../store/compareStore";
import { useFavorites } from "../store/favoritesStore";
import { createProductDetailModel, fetchProductDetail } from "../api/services/products";
import { addRecentlyViewed } from "../store/recentViewedStore";
import { ScreenContainer } from "../components/ui/ScreenContainer";

function formatTL(amount: number) {
  const v = Math.round(amount * 100) / 100;
  return `${v.toFixed(v % 1 === 0 ? 0 : 2)} TL`;
}

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

export function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props["route"]>();
  const { product } = route.params;

  const { isSelected, toggle } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [alertOn, setAlertOn] = useState(false);
  const [tab, setTab] = useState<"offers" | "specs" | "history">("offers");

  const fav = isFavorite(product.id);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const initialDetail = useMemo(() => createProductDetailModel(product), [product]);
  const query = useQuery({
    queryKey: ["products", "detail", product.id],
    queryFn: () => fetchProductDetail(product),
    initialData: initialDetail,
  });

  // `initialData` setlediğimiz için `query.data` başlangıçtan itibaren dolu olur;
  // burada `query.data ?? initialDetail` gibi bir fallback kullanmayalım.
  const detail = query.data!;
  const detailProduct = detail.product;
  const oldAmount = detailProduct.oldPrice?.amount;
  const currentAmount = detailProduct.price.amount;
  const showOldPrice =
    oldAmount != null &&
    Number.isFinite(oldAmount) &&
    Number.isFinite(currentAmount) &&
    oldAmount > 0 &&
    currentAmount > 0 &&
    oldAmount > currentAmount;
  const galleryImages = detail.galleryImages;
  const offers = detail.offers;
  const bestOffer = detail.bestOffer;
  const history = detail.history;
  const error = query.error;
  const isFetching = query.isFetching;

  const scrollRef = useRef<ScrollView>(null);
  const offersTopRef = useRef<View>(null);
  const offersYRef = useRef(0);

  useEffect(() => {
    if (isFetching) return;
    addRecentlyViewed(detailProduct);
    queryClient.invalidateQueries({ queryKey: ["products", "list", { mode: "recent" }] });
  }, [detailProduct.id, isFetching]);

  const onPressStickyCta = () => {
    setTab("offers");

    // Smooth, minimal UX: Offers sekmesine geç ve hemen teklif bölümüne kaydır.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollView = scrollRef.current;
        if (!scrollView) return;
        scrollView.scrollTo({ y: Math.max(0, offersYRef.current - 8), animated: true });
      });
    });
  };

  const compared = isSelected(detailProduct.id);

  return (
    <ScreenContainer style={styles.page}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Geri"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed ? styles.backPressed : null]}
        >
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ürün</Text>
        <View style={{ width: 44 }} />
      </View>

      {error ? <Text style={styles.errorText}>Detay yüklenemedi.</Text> : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ ...styles.content, paddingBottom: styles.content.paddingBottom + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {isFetching ? <Text style={styles.loadingText}>Yükleniyor...</Text> : null}
        {/* Gallery */}
        <View style={styles.galleryWrap}>
          {galleryImages.length > 0 ? (
            <FlatList
              data={galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri) => uri}
              renderItem={({ item }) => (
                <View style={[styles.galleryPage, { width }]}>
                  <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="contain" />
                </View>
              )}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / width);
                setActiveIndex(idx);
              }}
            />
          ) : (
            <View style={[styles.galleryPage, { width }]}>
              <View style={styles.noImageWrap}>
                <Text style={styles.noImageText}>Görsel bulunamadı</Text>
              </View>
            </View>
          )}

          {galleryImages.length > 1 ? (
            <View style={styles.dots}>
              {galleryImages.map((_, i) => {
                const active = i === activeIndex;
                return <View key={i} style={[styles.dot, active ? styles.dotActive : null]} />;
              })}
            </View>
          ) : null}
        </View>

        {/* Main info */}
        <View style={styles.infoCard}>
          <Text style={styles.name} numberOfLines={3}>
            {detailProduct.name}
          </Text>

          {/* Rating */}
          {detailProduct.ratingAvg != null ? (
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>
                {detailProduct.ratingAvg.toFixed(1)}{" "}
                <Text style={styles.ratingCount}>({detailProduct.ratingCount ?? 0})</Text>
              </Text>
            </View>
          ) : null}

          {/* Price */}
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{formatTL(detailProduct.price.amount)}</Text>
            <View style={styles.priceMetaRow}>
              {showOldPrice ? <Text style={styles.oldPrice}>{formatTL(oldAmount!)}</Text> : null}
              {(() => {
                if (oldAmount == null) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: missing old/original price");
                  return null;
                }

                if (!Number.isFinite(oldAmount) || !Number.isFinite(currentAmount)) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: invalid numeric old/current", {
                    currentAmount,
                    oldAmount
                  });
                  return null;
                }

                if (currentAmount <= 0) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: current <= 0", { currentAmount });
                  return null;
                }

                if (oldAmount <= 0) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: old <= 0", { oldAmount });
                  return null;
                }

                if (oldAmount <= currentAmount) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: old <= current", {
                    currentAmount,
                    oldAmount
                  });
                  return null;
                }

                const percent = ((oldAmount - currentAmount) / oldAmount) * 100;
                if (!Number.isFinite(percent) || percent <= 0) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: computed percent invalid", {
                    currentAmount,
                    oldAmount,
                    percent
                  });
                  return null;
                }

                const rounded = Math.round(percent);
                if (!Number.isFinite(rounded) || rounded <= 0) {
                  console.log("BADGE HIDDEN:", detailProduct.id, detailProduct.name, "reason: rounded percent invalid", {
                    rounded,
                    percent
                  });
                  return null;
                }

                console.log("BADGE SHOWN:", detailProduct.id, detailProduct.name, "current:", currentAmount, "old:", oldAmount, "computed %:", percent);
                return (
                  <View style={styles.dropBadge}>
                    <Text style={styles.dropBadgeText}>{`%${rounded} düştü`}</Text>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, fav ? styles.actionActive : null]}
              onPress={() => toggleFavorite(detailProduct)}
              accessibilityLabel="Favori"
            >
              <Text style={styles.actionIcon}>{fav ? "♥" : "♡"}</Text>
              <Text style={styles.actionLabel}>Favori</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, compared ? styles.actionActive : null]}
              onPress={() => {
                console.log("[COMPARE DEBUG] compare toggle from ProductDetail:", detailProduct.id, detailProduct.name);
                const result = toggle(detailProduct);
                if (result === "max_reached") {
                  Alert.alert("Karşılaştırma limiti", "En fazla 3 ürün karşılaştırabilirsiniz.");
                }
              }}
              accessibilityLabel={compared ? "Karşılaştırmadan kaldır" : "Karşılaştır"}
            >
              <Text style={styles.actionIcon}>⇄</Text>
              <Text style={styles.actionLabel}>{compared ? "Kaldır" : "Karşılaştır"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, alertOn ? styles.actionActive : null]}
              onPress={() => {
                setAlertOn((v) => {
                  const next = !v;
                  Alert.alert("Fiyat alarmı", next ? "Alarm açıldı." : "Alarm kapatıldı.");
                  return next;
                });
              }}
              accessibilityLabel="Fiyat alarmı"
            >
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionLabel}>Fiyat alarmı</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setTab("offers")}
              style={({ pressed }) => [styles.tab, pressed ? styles.tabPressed : null, tab === "offers" ? styles.tabActive : null]}
            >
              <Text style={[styles.tabTxt, tab === "offers" ? styles.tabTxtActive : null]}>Teklifler</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("specs")}
              style={({ pressed }) => [styles.tab, pressed ? styles.tabPressed : null, tab === "specs" ? styles.tabActive : null]}
            >
              <Text style={[styles.tabTxt, tab === "specs" ? styles.tabTxtActive : null]}>Özellikler</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("history")}
              style={({ pressed }) => [styles.tab, pressed ? styles.tabPressed : null, tab === "history" ? styles.tabActive : null]}
            >
              <Text style={[styles.tabTxt, tab === "history" ? styles.tabTxtActive : null]}>Fiyat geçmişi</Text>
            </Pressable>
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            <View
              ref={offersTopRef}
              onLayout={(e) => {
                offersYRef.current = e.nativeEvent.layout.y;
              }}
            >
              {tab === "offers" ? (
                <View>
                  {offers.length === 0 ? (
                    <Text style={styles.emptyText}>Şu anda bu ürün için aktif teklif bulunamadı.</Text>
                  ) : (
                    offers.map((o) => (
                      <OfferRow key={o.id} offer={o} />
                    ))
                  )}
                </View>
              ) : null}
            </View>

            {tab === "specs" ? (
              <View>
                {Object.entries(detailProduct.specs ?? {}).length === 0 ? (
                  <Text style={styles.emptyText}>Şimdilik özellik yok.</Text>
                ) : (
                  Object.entries(detailProduct.specs ?? {}).map(([k, v]) => (
                    <View key={k} style={styles.specRow}>
                      <Text style={styles.specKey}>{k}</Text>
                      <Text style={styles.specVal} numberOfLines={2}>
                        {String(v ?? "-")}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {tab === "history" ? (
              <View>
                {history.map((h, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{h.label}</Text>
                    <Text style={styles.historyPrice}>{formatTL(h.price)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyBar, shadow.floating, { bottom: insets.bottom }]}>
        <View style={styles.stickyLeft}>
          <Text style={styles.stickySmall}>En düşük fiyat</Text>
          <Text style={styles.stickyPrice}>
            {bestOffer ? formatTL(bestOffer.price.amount) : formatTL(detailProduct.price.amount)}
          </Text>
        </View>
        <TouchableOpacity style={styles.stickyBtn} onPress={onPressStickyCta} accessibilityLabel="En iyi teklifi gör">
          <Text style={styles.stickyBtnTxt}>Teklifleri Gör</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backPressed: { opacity: 0.85 },
  backTxt: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.text },

  content: {
    paddingBottom: 110,
  },

  galleryWrap: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  galleryPage: {
    padding: 0,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: "100%",
    aspectRatio: 4 / 3, // ecommerce-friendly (wider than 1:1)
    resizeMode: "contain",
  },
  noImageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg
  },
  noImageText: { color: colors.textSubtle, fontSize: 13, fontWeight: "700" },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.2)",
  },
  dotActive: {
    backgroundColor: colors.brand,
  },

  infoCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 16,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  star: { color: "#F59E0B", fontWeight: "900" },
  ratingText: { color: colors.textSubtle, fontSize: 13, fontWeight: "700" },
  ratingCount: { color: colors.textSubtle, fontWeight: "600" },

  priceBlock: { marginBottom: 14 },
  price: { ...type.price, color: colors.text },
  priceMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  oldPrice: { ...type.caption, textDecorationLine: "line-through", color: colors.textSubtle },
  dropBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  dropBadgeText: { color: colors.brand, fontWeight: "800", fontSize: 12, lineHeight: 16 },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  actionActive: { backgroundColor: colors.brandSoft, borderColor: "rgba(37,99,235,0.25)" },
  actionIcon: { fontSize: 16, marginBottom: 4, fontWeight: "900", color: colors.text },
  actionLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: "700" },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: { opacity: 0.85 },
  tabActive: { backgroundColor: colors.bg, borderBottomWidth: 2, borderBottomColor: colors.brand },
  tabTxt: { fontSize: 12, fontWeight: "800", color: colors.textSubtle },
  tabTxtActive: { color: colors.text },

  tabContent: {
    marginTop: 12,
  },
  emptyText: { color: colors.textSubtle, fontWeight: "600", fontSize: 13, paddingVertical: 12 },

  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  specKey: { fontSize: 13, fontWeight: "800", color: colors.textSubtle },
  specVal: { fontSize: 13, fontWeight: "700", color: colors.text, flex: 1 },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyLabel: { fontSize: 13, fontWeight: "800", color: colors.textSubtle },
  historyPrice: { fontSize: 13, fontWeight: "900", color: colors.text },

  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stickyLeft: { flex: 1 },
  stickySmall: { fontSize: 12, fontWeight: "700", color: colors.textSubtle },
  stickyPrice: { fontSize: 18, fontWeight: "900", color: colors.text, marginTop: 4, lineHeight: 22 },
  stickyBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  stickyBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 13 },

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
  },
});

