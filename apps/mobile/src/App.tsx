import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompareProvider } from "./store/compareStore";
import { FavoritesProvider } from "./store/favoritesStore";
import { RootNavigator } from "./navigation/RootNavigator";

const queryClient = new QueryClient();

export default function App() {
  return (
    <CompareProvider max={3}>
      <FavoritesProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </FavoritesProvider>
    </CompareProvider>
  );
}

