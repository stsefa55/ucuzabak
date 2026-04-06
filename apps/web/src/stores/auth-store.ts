"use client";

import { create } from "zustand";

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  /** Sunucudan gelmezse (eski oturum) doğrulanmış kabul edilir. */
  emailVerified?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  setSession: (token: string, user: UserInfo) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null })
}));

