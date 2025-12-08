"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { UserRecord } from "@/lib/types";
import { isRoastMode } from "@/lib/auth-utils";

interface AuthState {
  user: UserRecord | null;
  setUser: (user: UserRecord) => void;
  clearUser: () => void;
  isRoastMode: typeof isRoastMode;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      isRoastMode,
    }),
    {
      name: "classguard-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
