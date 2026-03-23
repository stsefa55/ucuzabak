import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Product } from "../lib/types";
import { BottomTabs } from "./BottomTabs";
import { CompareScreen } from "../components/compare/CompareScreen";
import { CompareBar } from "../components/compare/CompareBar";
import { SettingsScreen } from "../screens/SettingsScreen";
import { HelpScreen } from "../screens/HelpScreen";
import { LegalScreen } from "../screens/LegalScreen";
import { ContactScreen } from "../screens/ContactScreen";
import { AppInfoScreen } from "../screens/AppInfoScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { ProductListScreen } from "../screens/ProductListScreen";
import { CategoriesScreen } from "../screens/CategoriesScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Tabs: undefined;
  ProductList: { title: string; mode: "popular" | "deals" | "recent" | "search"; categoryId?: string; q?: string };
  ProductDetail: { product: Product };
  Compare: undefined;
  CategoriesFull: { initialParentSlug?: string; initialParentName?: string } | undefined;
  Login: undefined;
  Register: undefined;
  Settings: undefined;
  Help: undefined;
  Legal: undefined;
  Contact: undefined;
  AppInfo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  function TabsWithCompareBar({ navigation }: NativeStackScreenProps<RootStackParamList, "Tabs">) {
    return (
      <>
        <BottomTabs />
        <CompareBar
          onPressCompare={() => {
            console.log("[COMPARE DEBUG] navigating to Compare screen");
            navigation.navigate("Compare");
          }}
        />
      </>
    );
  }

  // CompareBar sadece "Tabs" içinde mount ediliyordu.
  // Ürün listesi / detay ekranlarında karşılaştırma seçimi yapılınca CTA'nın görünmemesi,
  // kullanıcı tarafında "compare çalışmıyor" hissi yaratıyordu.
  // Bu wrapper'lar ile CompareBar'ı ProductList/ProductDetail ekranlarına da overlay olarak ekliyoruz.
  function ProductListWithCompareBar(props: NativeStackScreenProps<RootStackParamList, "ProductList">) {
    return (
      <>
        <ProductListScreen />
        <CompareBar onPressCompare={() => props.navigation.navigate("Compare")} />
      </>
    );
  }

  function ProductDetailWithCompareBar(props: NativeStackScreenProps<RootStackParamList, "ProductDetail">) {
    return (
      <>
        <ProductDetailScreen />
        <CompareBar onPressCompare={() => props.navigation.navigate("Compare")} />
      </>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsWithCompareBar} />
      <Stack.Screen name="ProductList" component={ProductListWithCompareBar} />
      <Stack.Screen name="ProductDetail" component={ProductDetailWithCompareBar} />
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="CategoriesFull" component={CategoriesScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="AppInfo" component={AppInfoScreen} />
    </Stack.Navigator>
  );
}

