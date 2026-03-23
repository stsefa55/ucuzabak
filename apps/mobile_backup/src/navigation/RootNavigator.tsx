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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Tabs: undefined;
  ProductList: { title: string; mode: "popular" | "deals" | "recent"; categoryId?: string };
  ProductDetail: { product: Product };
  Compare: undefined;
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
        <CompareBar onPressCompare={() => navigation.navigate("Compare")} />
      </>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsWithCompareBar} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="AppInfo" component={AppInfoScreen} />
    </Stack.Navigator>
  );
}

