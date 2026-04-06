"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { PropsWithChildren, useState } from "react";

let browserQueryClient: QueryClient | null = null;

/** Auth / misafir senkronu gibi provider dışı yerlerde cache invalidation için */
export function getBrowserQueryClient(): QueryClient | null {
  return browserQueryClient;
}

export function ReactQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: 1
        }
      }
    });
    browserQueryClient = c;
    return c;
  });

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

