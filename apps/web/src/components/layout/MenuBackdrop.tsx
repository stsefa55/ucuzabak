"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Unregister = () => void;

const MenuBackdropContext = createContext<{
  register: () => Unregister;
}>({ register: () => () => {} });

export function useMenuBackdrop() {
  return useContext(MenuBackdropContext);
}

export function MenuBackdropProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <MenuBackdropContext.Provider value={{ register }}>
      {children}
      {count > 0 && (
        <div
          className="menu-backdrop"
          role="presentation"
          aria-hidden
          style={{ pointerEvents: "auto" }}
        />
      )}
    </MenuBackdropContext.Provider>
  );
}
