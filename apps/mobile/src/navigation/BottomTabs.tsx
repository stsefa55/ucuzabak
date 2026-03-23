import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../design/tokens";

export type BottomTabParamList = {
  Home: undefined;
  Kesfet: undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Ana",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />
        }}
      />
      <Tab.Screen
        name="Kesfet"
        component={SearchScreen}
        options={{
          tabBarLabel: "Keşfet",
          tabBarIcon: ({ color }) => (
            <DiscoveryTabIcon color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: "Favoriler",
          tabBarIcon: ({ color }) => <Ionicons name="heart-outline" size={22} color={color} />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profil",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

function DiscoveryTabIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, position: "relative", justifyContent: "center", alignItems: "center" }}>
      <Ionicons name="grid-outline" size={22} color={color} style={{ position: "absolute", top: 1, left: 1 }} />
      <Ionicons name="search-outline" size={14} color={color} style={{ position: "absolute", right: 1, bottom: 0 }} />
    </View>
  );
}

